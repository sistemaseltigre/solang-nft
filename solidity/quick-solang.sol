// DISCLAIMER: This file is an example of how to mint and transfer NFTs on Solana. It is not production ready and has not been audited for security.
// Use it at your own risk.
import 'solana-library/spl_token.sol';

@program_id("3hnqLxpAhYvtisxRqgumwpZu8ybYggMPAf38zRwPrr9A")
contract quick_solang {

    address private mintAccount;
    address private metadataAuthority;
    string private uri;

    // These events log on the blockchain transactions made with this NFT
    event NFTMinted(address owner, address mintAccount);
    event NFTSold(address from, address to);

    // The mint account will identify the NFT in this example
    constructor (address _mintAccount, address _metadataAuthority) {
        mintAccount = _mintAccount;
        metadataAuthority = _metadataAuthority;
    }

    function createCollectible(string memory tokenURI, address mintAuthority, address ownerTokenAccount) public {
        SplToken.TokenAccountData token_data = SplToken.get_token_account_data(ownerTokenAccount);
         assert(mintAccount == token_data.mintAccount);
        SplToken.MintAccountData mint_data = SplToken.get_mint_account_data(token_data.mintAccount);
        // Ensure the supply is zero. Otherwise, this is not an NFT.
        assert(mint_data.supply == 0);
        SplToken.mint_to(token_data.mintAccount, ownerTokenAccount, mintAuthority, 1);
        updateNftUri(tokenURI);
        SplToken.remove_mint_authority(mintAccount, mintAuthority);
        emit NFTMinted(token_data.owner, token_data.mintAccount);
    }

    function transferOwnership(address oldTokenAccount, address newTokenAccount) public {
        SplToken.TokenAccountData old_data = SplToken.get_token_account_data(oldTokenAccount);
        SplToken.TokenAccountData new_data = SplToken.get_token_account_data(newTokenAccount);
        SplToken.transfer(oldTokenAccount, newTokenAccount, old_data.owner, 1);
        emit NFTSold(old_data.owner, new_data.owner);
    }

    /// Return the URI of this NFT
    function getNftUri() public view returns (string memory) {
        return uri;
    }

    function isOwner(address owner, address tokenAccount) public view returns (bool) {
        SplToken.TokenAccountData data = SplToken.get_token_account_data(tokenAccount);
        return owner == data.owner && mintAccount == data.mintAccount && data.balance == 1;
    }

    /// Updates the NFT URI
    function updateNftUri(string newUri) public {
        requireMetadataSigner();
        uri = newUri;
    }

    /// Requires the signature of the metadata authority.
    function requireMetadataSigner() private {
        for(uint32 i=0; i < tx.accounts.length; i++) {
            if (tx.accounts[i].key == metadataAuthority) {
                require(tx.accounts[i].is_signer, "the metadata authority must sign the transaction");
                return;
            }
        }

        revert("The metadata authority is missing");
    }
    
}
