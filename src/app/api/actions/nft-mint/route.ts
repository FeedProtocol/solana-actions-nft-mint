import { ActionGetResponse, ActionPostRequest, ActionPostResponse, ACTIONS_CORS_HEADERS, createPostResponse, } from "@solana/actions"
import {
  getMintLen, ExtensionType, TYPE_SIZE, LENGTH_SIZE, TOKEN_2022_PROGRAM_ID, createInitializeNonTransferableMintInstruction,
  createInitializeMintInstruction, createInitializeMetadataPointerInstruction, getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, createMintToCheckedInstruction, createSetAuthorityInstruction, AuthorityType
} from "@solana/spl-token";

import { TokenMetadata, pack, createInitializeInstruction } from "@solana/spl-token-metadata";
import { clusterApiUrl, Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

export const GET = async (req: Request) => {

  const payload: ActionGetResponse = {
    icon: new URL("/logo.jpeg", new URL(req.url).origin).toString(),
    label: "Congragulations",
    description: "NFT Mint",
    title: "NFT Mint"
  };

  return Response.json(payload, {
    headers: ACTIONS_CORS_HEADERS,
  });
};

// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = GET;

export const POST = async (req: Request) => {
  try {
    const body: ActionPostRequest = await req.json();

    const user = new PublicKey(body.account);


    const connection = new Connection(clusterApiUrl("devnet"));


    const mintKeypair = Keypair.generate();
    const token_mint = mintKeypair.publicKey;
    const decimals = 0;
    const mintAuthority = user;


    const metaData: TokenMetadata = {
      updateAuthority: SystemProgram.programId,
      mint: token_mint,
      name: "2024 ISTANBUL",
      symbol: "Bounty",
      uri: "https://gist.githubusercontent.com/caglarGokce/a96891de8fef395af6943c83127a9110/raw/1d15120336665dc2bf3c0eccf04190c787a7b0f0/bountyhunt2024.json",
      additionalMetadata: [],
    };

    // Size of Mint Account with extensions
    const mintLen = getMintLen([ExtensionType.NonTransferable, ExtensionType.MetadataPointer]);
    const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
    // Size of metadata
    const metadataLen = pack(metaData).length;
    // Minimum lamports required for Mint Account
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataExtension + metadataLen);

    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: user, // Account that will transfer lamports to created account
      newAccountPubkey: token_mint, // Address of the account to create
      space: mintLen, // Amount of bytes to allocate to the created account
      lamports, // Amount of lamports transferred to created account
      programId: TOKEN_2022_PROGRAM_ID, // Program assigned as owner of created account
    });

    const initializeNonTransferableConfig =
      createInitializeNonTransferableMintInstruction(
        token_mint,
        TOKEN_2022_PROGRAM_ID
      );

    const initializeMintInstruction = createInitializeMintInstruction(
      token_mint, // Mint Account Address
      decimals, // Decimals of Mint
      mintAuthority, // Designated Mint Authority
      mintAuthority, // Optional Freeze Authority
      TOKEN_2022_PROGRAM_ID, // Token Extension Program ID
    );

    const initializeMetadataInstruction = createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
      metadata: token_mint, // Account address that holds the metadata
      updateAuthority: mintAuthority, // Authority that can update the metadata
      mint: token_mint, // Mint Account address
      mintAuthority: mintAuthority, // Designated Mint Authority
      name: metaData.name,
      symbol: metaData.symbol,
      uri: metaData.uri,
    });

    const initializeMetadataPointerInstruction =
      createInitializeMetadataPointerInstruction(
        token_mint, // Mint Account address
        SystemProgram.programId, // Authority that can set the metadata address
        token_mint, // Account address that holds the metadata
        TOKEN_2022_PROGRAM_ID,
      );

    const user_ata = getAssociatedTokenAddressSync(token_mint, user, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

    let create_ata = createAssociatedTokenAccountInstruction(user, user_ata, user, token_mint, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

    let mint_ix = createMintToCheckedInstruction(token_mint, user_ata, mintAuthority, 1, 0, [], TOKEN_2022_PROGRAM_ID);

    let transfer_mint_auth = createSetAuthorityInstruction(
      token_mint,
      mintAuthority,
      AuthorityType.MintTokens, // authority type
      null,
      [],
      TOKEN_2022_PROGRAM_ID
    )

    const transaction = new Transaction();

    transaction.add(createAccountInstruction);
    transaction.add(initializeMetadataPointerInstruction)
    transaction.add(initializeNonTransferableConfig)
    transaction.add(initializeMintInstruction)
    transaction.add(initializeMetadataInstruction)
    transaction.add(create_ata)
    transaction.add(mint_ix)
    transaction.add(transfer_mint_auth)

    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction
      },
      signers: [mintKeypair]
    })

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS })
  } catch (err) {
    console.log(err);
    let message = "An unknown error occurred";
    if (typeof err == "string") message = err;
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};
