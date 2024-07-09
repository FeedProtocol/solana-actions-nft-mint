import { ActionGetResponse, ActionPostRequest, ActionPostResponse, ACTIONS_CORS_HEADERS, createPostResponse, } from "@solana/actions"
import {
  getMintLen, ExtensionType, TYPE_SIZE, LENGTH_SIZE, TOKEN_2022_PROGRAM_ID, createInitializeNonTransferableMintInstruction,
  createInitializeMintInstruction, createInitializeMetadataPointerInstruction, getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, createMintToCheckedInstruction, createSetAuthorityInstruction, AuthorityType,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";

import { TokenMetadata, pack, createInitializeInstruction } from "@solana/spl-token-metadata";
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";


export const GET = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);


    const payload: ActionGetResponse = {
      title: "Actions Example - Transfer Native SOL",
      icon: new URL("/logo.jpeg", requestUrl.origin).toString(),
      description: "Transfer SOL to another Solana wallet",
      label: "Transfer", // this value will be ignored since `links.actions` exists

    };

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
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

// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = GET;

export const POST = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);


    const body: ActionPostRequest = await req.json();

    // validate the client provided input
    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      return new Response('Invalid "account" provided', {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    const connection = new Connection(
      process.env.SOLANA_RPC! || clusterApiUrl("devnet"),
    );

    //const toPubkey = new PublicKey("4YbLBRXwseG1NuyJbteSD5u81Q2QjFqJBp6JmxwYBKYm")
    const toPubkey = Keypair.generate();


    const transaction = simpleTransaction(account,toPubkey.publicKey);



    // set the end user as the fee payer
    transaction.feePayer = account;

    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        message: `Send 0.1 SOL to ${toPubkey.publicKey.toBase58()}`,
      },
      signers: [toPubkey],
    });

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
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


function getTransaction(token_mint:PublicKey,user:PublicKey,metaData:TokenMetadata,lamports:number){

  const tx = new Transaction();

  const decimals = 0;
  const mintAuthority = user;
  
  const mintLen = getMintLen([ExtensionType.NonTransferable, ExtensionType.MetadataPointer]);


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

  return tx;
}

function simpleTransaction(account:PublicKey,token_mint:PublicKey){

  const transaction = new Transaction()

  const ix = SystemProgram.createAccount({
    fromPubkey:account,
    newAccountPubkey:token_mint,
    space:0,
    lamports:LAMPORTS_PER_SOL*0.01,
    programId:TOKEN_PROGRAM_ID
  })

  transaction.add(ix)

  return transaction;

}