import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { QuickSolang } from "../target/types/quick_solang";
import { PublicKey, Keypair, Transaction, SystemProgram } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import expect from "expect";
import fs from "fs";
// local wallet
const privateKey = JSON.parse(
  fs.readFileSync("/home/chuo/.config/solana/id.json", "utf8"),
);
const idl = JSON.parse(
  fs.readFileSync("./target/idl/quick_solang.json", "utf8"),
);

describe('Simple collectible', function () {
    this.timeout(500000);
    async function create_account(account: Keypair, programId: PublicKey, space: number) {
      const provider = anchor.AnchorProvider.env();
      const lamports = await provider.connection.getMinimumBalanceForRentExemption(space);
  
      const transaction = new Transaction();
  
      transaction.add(
          SystemProgram.createAccount({
              fromPubkey: provider.wallet.publicKey,
              newAccountPubkey: account.publicKey,
              lamports,
              space,
              programId,
          }));
  
      console.log(await provider.sendAndConfirm(transaction, [account]));
      console.log("created account", account.publicKey.toBase58());
      return account.publicKey;
  }
    
    it('nft example', async function mint_nft() {
        
        

        const providerTest = anchor.AnchorProvider.env();
        anchor.setProvider(providerTest);
        const connection = providerTest.connection;
        const payer = Keypair.fromSecretKey(new Uint8Array(privateKey));

        const programId = new anchor.web3.PublicKey(
          "3hnqLxpAhYvtisxRqgumwpZu8ybYggMPAf38zRwPrr9A",
        );

        const mint_authority = Keypair.generate();
        const freezeAuthority = Keypair.generate();
        
       

        // Create and initialize a new mint based on the funding account and a mint authority
        const mint = await createMint(
            connection,
            payer,
            mint_authority.publicKey,
            freezeAuthority.publicKey,
            0
        );
        console.log("created mint", mint.toBase58());
        

        const nft_owner = Keypair.generate();
        const metadata_authority = Keypair.generate();
       
        // On Solana, an account must have an associated token account to save information about how many tokens
        // the owner account owns. The associated account depends on both the mint account and the owner
        const owner_token_account = await getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            mint, // Mint account
            nft_owner.publicKey // Owner account
        );
        console.log("created owner token account", owner_token_account.address.toBase58());
      
        const program = new Program(idl, programId, providerTest);

        // Each contract in this example is a unique NFT
        //const { provider, program, storage } = await loadContractAndCallConstructor('SimpleCollectible', [mint, metadata_authority.publicKey]);
        const storageAccount = Keypair.generate();
        const storage = await create_account(storageAccount, programId, 8192);
       

        await program.methods.new(mint, metadata_authority.publicKey)
        .accounts({ dataAccount: storageAccount.publicKey })
        .rpc().catch((err) => { console.log(err); return});

     
        const nft_uri = "https://quicknode.myfilebase.com/ipfs/QmcR6f2CxfVsuCTsxdi2MiH1fvLydrWyUrK5gBxqoouosK";

        // Create a collectible for an owner given a mint authority.
        await program.methods.createCollectible(
            nft_uri,
            mint_authority.publicKey,
            owner_token_account.address)
            .accounts({ dataAccount: storageAccount.publicKey })
            .remainingAccounts([
                { pubkey: mint, isSigner: false, isWritable: true },
                { pubkey: owner_token_account.address, isSigner: false, isWritable: true },
                { pubkey: mint_authority.publicKey, isSigner: true, isWritable: false },
                { pubkey: metadata_authority.publicKey, isSigner: true, isWritable: true }
            ])
            .signers([mint_authority, metadata_authority])
            .rpc()
            .catch((err) => { console.log(err); });
        

        const new_owner = Keypair.generate();

        // A new owner must have an associated token account
        const new_owner_token_account = await getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            mint, // Mint account associated to the NFT
            new_owner.publicKey // New owner account
        );

   

        // Transfer ownership to another owner
        await program.methods.transferOwnership(
            owner_token_account.address,
            new_owner_token_account.address)
            .accounts({ dataAccount: storageAccount.publicKey })
            .remainingAccounts([
                { pubkey: new_owner_token_account.address, isSigner: false, isWritable: true },
                { pubkey: owner_token_account.address, isSigner: false, isWritable: true },
                { pubkey: nft_owner.publicKey, isSigner: true, isWritable: false },
            ])
            .signers([nft_owner])
            .rpc()
            .catch((err) => { console.log(err); });
       

        // Confirm that the ownership transference worked
        const verify_transfer_result = await program.methods.isOwner(
            new_owner.publicKey,
            new_owner_token_account.address)
            .accounts({ dataAccount: storageAccount.publicKey })
            .remainingAccounts([
                { pubkey: new_owner_token_account.address, isSigner: false, isWritable: false },
            ])
            .view().catch((err) => { console.log(err); });
      

        expect(verify_transfer_result).toBe(true);
          
        // Retrieve information about the NFT
        const token_uri = await program.methods.getNftUri()
            .accounts({ dataAccount: storageAccount.publicKey })
            .view();
            console.log(token_uri);

        expect(token_uri).toBe(nft_uri);

        // Update the NFT URI
        const new_uri = "https://quicknode.myfilebase.com/ipfs/QmPcVA8Cw7rdVHxWtuHT4exQVYPZqhutwJhGwvEpSQjygc";
        await program.methods.updateNftUri(new_uri)
            .accounts({ dataAccount: storageAccount.publicKey })
            .remainingAccounts([
                { pubkey: metadata_authority.publicKey, isSigner: true, isWritable: true },
            ])
            .signers([metadata_authority])
            .rpc().catch((err) => { console.log(err); });
       

        const new_uri_saved = await program.methods.getNftUri()
            .accounts({ dataAccount: storageAccount.publicKey })
            .view().catch((err) => { console.log(err); });
       
        expect(new_uri_saved).toBe(new_uri);
    });
});

/*
describe("quick-solang", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const dataAccount = anchor.web3.Keypair.generate();
  const wallet = provider.wallet;

  const program = anchor.workspace.QuickSolang as Program<QuickSolang>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.new(wallet.publicKey)
      .accounts({ dataAccount: dataAccount.publicKey })
      .signers([dataAccount]).rpc();
    console.log("Your transaction signature", tx);

    const val1 = await program.methods.get()
      .accounts({ dataAccount: dataAccount.publicKey })
      .view();

    console.log("state", val1);

    await program.methods.flip()
      .accounts({ dataAccount: dataAccount.publicKey })
      .rpc();

    const val2 = await program.methods.get()
      .accounts({ dataAccount: dataAccount.publicKey })
      .view();

    console.log("state", val2);  });
});
*/