import { NextRequest, NextResponse } from "next/server";
import { FrameRequest, getFrameMessage } from "@coinbase/onchainkit";
import { config } from "@/config/config";
import { writeContract } from "@wagmi/core";
import { wagmiConfig } from "@/config/wagmi";
import { base, baseSepolia } from "@wagmi/core/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  BaseAbi,
  BaseContractAddress,
  TestAbi,
  TestContractAddress,
} from "@/contract";
import axios from "axios";
import { getFrame } from "@/utils";

async function getResponse(req: NextRequest): Promise<NextResponse> {
  let btnText: string | undefined = "";
  let accountAddress: string | undefined = "";
  let txHash: string | undefined = "";
  let imageUrl: string | undefined = "";
  let tokenUri: string | undefined = "";
  let minters:
    | {
        minterAddress: string;
        txHash: string;
      }[]
    | undefined = [{ minterAddress: "", txHash: "" }];
  let owner: string | undefined = "";
  let isTopUp: boolean | undefined = false;
  let allowedMints: number | undefined = 0;
  let isLike: boolean | undefined = false;
  let isRecast: boolean | undefined = false;
  let isFollow: boolean | undefined = false;
  let noOfNftsMinited: number = 0;

  const noOfFreeMints = 10;

  const searchParams = req.nextUrl.searchParams;
  const frameId = searchParams.get("frameId");

  // get frame data
  try {
    const res = await axios.get(
      `${config?.BACKEND_URL}/util/get-frame-data?frameId=${frameId}`
    );

    const data = res.data?.data;

    imageUrl = data?.imageUrl;
    tokenUri = data?.tokenUri;
    minters = data?.minters;
    owner = data?.owner;
    isTopUp = data?.isTopUp;
    allowedMints = data?.allowedMints;
    isLike = data?.isLike;
    isRecast = data?.isRecast;
    isFollow = data?.isFollow;

    noOfNftsMinited = minters?.length || 0;
  } catch (error) {
    console.log("Error getting frame data-> ", error);
    btnText = "Error - Try again";
    return new NextResponse(getFrame(accountAddress, false, imageUrl, btnText));
  }

  console.log("quries-> ", {
    imageUrl,
    tokenUri,
    minters,
    owner,
    isTopUp,
    allowedMints,
    isLike,
    isRecast,
    isFollow,
  });

  console.log("req.body-> ", req.body);

  // get frame request data from Farcaster client
  const body: FrameRequest = await req.json();

  console.log("frame request-> ", body);

  const { isValid, message } = await getFrameMessage(body, {
    neynarApiKey: config?.neynar?.apiKey,
  });

  console.log("frame message-> ", message);

  // get user's wallet address from FID
  if (isValid) {
    accountAddress = message.interactor.verified_accounts[0];
  } else {
    btnText = "No Wallet Found";
    return new NextResponse(getFrame(accountAddress, false, imageUrl, btnText));
  }

  console.log("Extracted address from FID-> ", accountAddress);

  // check if user has already minted
  // const minter = minters?.find((m) => m?.minterAddress === accountAddress);
  // if (minter) {
  //   console.log("User has already minted-> ", minter);
  //   btnText = "Already Minted";
  //   return new NextResponse(getFrame(accountAddress, false, imageUrl, btnText));
  // }

  // check if mint has exceeded
  if (noOfNftsMinited === allowedMints) {
    console.log("Mint has exceeded");
    btnText = `Mint has exceeded ${minters?.length}/${allowedMints}`;
    return new NextResponse(getFrame(accountAddress, false, imageUrl, btnText));
  }

  // check if this is a old frame frameId < 114
  if (frameId && parseInt(frameId) < 114) {
    console.log("Old frame is not mintable");
    btnText = "Old Frame is not mintable";
    return new NextResponse(getFrame(accountAddress, false, imageUrl, btnText));
  }

  // check gate with like
  if (isLike) {
    if (message?.liked) {
      console.log("User liked the post");
    } else {
      console.log("User didn't like the post");
      btnText = "Like and Mint";
      return new NextResponse(
        getFrame(accountAddress, false, imageUrl, btnText)
      );
    }
  }

  // check gate with recast
  if (isRecast) {
    if (message?.recasted) {
      console.log("User recasted the post");
    } else {
      console.log("User didn't recast the post");
      btnText = "Recast and Mint";
      return new NextResponse(
        getFrame(accountAddress, false, imageUrl, btnText)
      );
    }
  }

  // check gate with follow
  if (isFollow) {
    if (message?.following) {
      console.log("User followed the post");
    } else {
      console.log("User didn't follow the post");
      btnText = "Follow and Mint";
      return new NextResponse(
        getFrame(accountAddress, false, imageUrl, btnText)
      );
    }
  }

  try {
    const res = await axios.post(`${config?.TEST_BACKEND_URL}/mint`, {
      frameId: frameId,
      recipientAddress: accountAddress,
    });

    txHash = res.data?.tx;

    btnText = "View tx";

    console.log("NFT minted successfully!", txHash);

    // update frame data with txHash and minterAddress
    if (txHash) {
      const res = await axios.post(
        `${config?.BACKEND_URL}/util/update-frame-data`,
        {
          frameId: frameId,
          minterAddress: accountAddress,
          txHash: txHash,
        }
      );
      console.log("Frame data updated-> ", res.data);
    }

    return new NextResponse(
      getFrame(accountAddress, txHash, imageUrl, btnText)
    );
  } catch (error) {
    console.log("Error minting NFT-> ", error);
    btnText = "Error - Try again";
    return new NextResponse(getFrame(accountAddress, false, imageUrl, btnText));
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  return getResponse(req);
}

export const dynamic = "force-dynamic";
