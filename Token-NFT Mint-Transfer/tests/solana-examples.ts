import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { publicKey } from "@metaplex-foundation/umi";
import { getOrCreateAssociatedTokenAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { SolanaExamples } from "../target/types/solana_examples";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { findMasterEditionPda, findMetadataPda, mplTokenMetadata, MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { BN } from "bn.js";
import { Keypair } from "@solana/web3.js";
import fs from "fs";

describe("solana-examples", async () =>
{
  	const provider = anchor.AnchorProvider.env();
	anchor.setProvider(provider);

	const program = anchor.workspace.SolanaExamples as Program<SolanaExamples>;
	const signer = provider.wallet;
	const umi = createUmi("https://api.devnet.solana.com").use(walletAdapterIdentity(signer)).use(mplTokenMetadata());
	const mint = anchor.web3.Keypair.generate();

	const associatedTokenAccount = await getAssociatedTokenAddress(
		mint.publicKey,
		signer.publicKey
	);

	let metadataAccount = findMetadataPda(umi, {
		mint: publicKey(mint.publicKey),
	})[0];

	let masterEditionAccount = findMasterEditionPda(umi, {
		mint: publicKey(mint.publicKey),
	})[0];

	const metadata = {
		name: "Test",
		symbol: "TST",
		uri: "https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/nft.json",
	};

	it("Mint NFT!", async () =>
	{
		const tx = await program.methods
				.mintNft(metadata.name, metadata.symbol, metadata.uri)
				.accounts({
					signer: provider.publicKey,
					mint: mint.publicKey,
					associatedTokenAccount,
					metadataAccount,
					masterEditionAccount,
					tokenProgram: TOKEN_PROGRAM_ID,
					associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
					tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
					systemProgram: anchor.web3.SystemProgram.programId,
					rent: anchor.web3.SYSVAR_RENT_PUBKEY,
				})
				.signers([mint])
				.rpc();

		console.log(`mint nft tx: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
		console.log(`minted nft: https://explorer.solana.com/address/${mint.publicKey}?cluster=devnet`);
	});

	it("Mint Token!", async () =>
	{
		const tx = await program.methods
				.mintToken(9, metadata.name, metadata.symbol, metadata.uri, new BN(10 * 1000000000))
				.accounts({
					signer: provider.publicKey,
					mint: mint.publicKey,
					associatedTokenAccount,
					metadataAccount,
					tokenProgram: TOKEN_PROGRAM_ID,
					associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
					tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
					systemProgram: anchor.web3.SystemProgram.programId,
					rent: anchor.web3.SYSVAR_RENT_PUBKEY,
				})
				.signers([mint])
				.rpc();

		console.log(`mint token tx: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
		console.log(`minted token: https://explorer.solana.com/address/${mint.publicKey}?cluster=devnet`);
	});

	it("Transfer NFT!", async () =>
	{
		var mint = new anchor.web3.PublicKey("H7PgWoocCVm17rdrWEZXghsAaQQj56zKuExcbMii4W2c");
		var toUserAddress = new anchor.web3.PublicKey("Ggg31TYu5hzH8x7x47W4ZXLqnEPSSqV1nF4YbJAfJyNi");
		var fromWallet = loadKeypairFromFile("/home/home/.config/solana/id.json");
		
		const fromAta = await getAssociatedTokenAddress(
			mint,
			signer.publicKey
		);

		const toAta = await getOrCreateAssociatedTokenAccount(
			provider.connection,
			fromWallet,
			mint,
			toUserAddress
		);

		const tx = await program.methods
				.transferTokens(new BN(1))
				.accounts({
					from: fromWallet.publicKey,
					fromAta: fromAta,
					toAta: toAta.address,
					tokenProgram: TOKEN_PROGRAM_ID
				}).
				signers([fromWallet])
				.rpc();

		console.log(`transfer nft tx: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
	});

	it("Transfer Token!", async () =>
	{
		var mint = new anchor.web3.PublicKey("2oAzfYi29d1QP4UMzAULWbT2ZihPKbdy77hfvaxs2o2w");
		var toUserAddress = new anchor.web3.PublicKey("Ggg31TYu5hzH8x7x47W4ZXLqnEPSSqV1nF4YbJAfJyNi");
		var fromWallet = loadKeypairFromFile("/home/home/.config/solana/id.json");
		
		const fromAta = await getAssociatedTokenAddress(
			mint,
			signer.publicKey
		);

		const toAta = await getOrCreateAssociatedTokenAccount(
			provider.connection,
			fromWallet,
			mint,
			toUserAddress
		);

		const tx = await program.methods
				.transferTokens(new BN(5 * 100000000))
				.accounts({
					from: fromWallet.publicKey,
					fromAta: fromAta,
					toAta: toAta.address,
					tokenProgram: TOKEN_PROGRAM_ID
				}).
				signers([fromWallet])
				.rpc();

		console.log(`transfer token tx: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
	});
});

function loadKeypairFromFile(filename: string): Keypair {
  
  const secret = JSON.parse(fs.readFileSync(filename).toString()) as number[];
  const secretKey = Uint8Array.from(secret);
  return Keypair.fromSecretKey(secretKey);
}