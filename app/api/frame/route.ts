import { NextRequest, NextResponse } from "next/server";
import { FrameRequest, getFrameMessage } from "@coinbase/onchainkit";
import { config } from "@/config/config";
import { writeContract } from "@wagmi/core";
import { wagmiConfig } from "@/config/wagmi";
import { base, polygonMumbai } from "@wagmi/core/chains";
import { privateKeyToAccount } from "viem/accounts";
import { uploadMetadataToIpfs } from "@/utils/uploadMetadata";
import { BaseAbi, BaseContractAddress, TestAbi, TestContractAddress } from "@/contract";

async function getResponse(req: NextRequest): Promise<NextResponse> {
  let btnText: string | undefined = "";
  let accountAddress: string | undefined = "";
  // let txHash: string | undefined = "";

  const searchParams = req.nextUrl.searchParams;
  const imageUrl = searchParams.get("imageUrl") || "";
  const tokenUri = searchParams.get("tokenUri") || "";
  const minterAddress = searchParams.get("minterAddress") || "";
  const txHash = searchParams.get("txHash") || "";
  const isLike = searchParams.get("isLike") || "";
  const isRecast = searchParams.get("isRecast") || "";
  const isFollow = searchParams.get("isFollow") || "";

  console.log("quries-> ", {
    imageUrl,
    tokenUri,
    minterAddress,
    txHash,
    isLike,
    isRecast,
    isFollow,
  });

  console.log("req url->  ", req.url);

  console.log("req.body-> ", req.body);

  const body: FrameRequest = await req.json();
  const { isValid, message } = await getFrameMessage(body, {
    neynarApiKey: config?.neynar?.apiKey,
  });

  if (isValid) {
    accountAddress = message.interactor.verified_accounts[0];
  } else {
    return new NextResponse("No wallet found");
  }

  console.log("Extracted address from FID-> ", accountAddress);

  console.log("frame message-> ", message);

  // redirect to Tx explorer --> (redirect url should be same as host url)
  // if (message?.button === 1) {
  //   console.log(
  //     "redirecting to explorer",
  //     `https://mumbai.polygonscan.com/tx/${accountAddress}`
  //   );
  //   return NextResponse.redirect(
  //     config?.APP_URL + "/redirect/" + accountAddress,
  //     {
  //       status: 302,
  //     }
  //   );
  // }

  // redirect to Lenspost --> (redirect url should be same as host url)
  if (message?.button === 2) {
    console.log("redirecting to Lenspost", config?.APP_URL + "/redirect");
    return NextResponse.redirect(config?.APP_URL + "/redirect", {
      status: 302,
    });
  }

  // check if post is liked | recasted | following
  // if (!message?.liked || !message?.recasted || !message?.following) {
  //   console.log("User didn't like or recasted or following");
  //   return new NextResponse(`User didn't like or recast or follow the post`);
  // }

  try {
    // NFT minting
    const result = await writeContract(wagmiConfig, {
      abi: config?.environment === "development" ? TestAbi : BaseAbi,
      address:
        config?.environment === "development"
          ? TestContractAddress
          : BaseContractAddress,
      functionName: "mint",
      args: [accountAddress, tokenUri],
      account:
        config?.environment === "development"
          ? privateKeyToAccount(config?.testWallet)
          : privateKeyToAccount(config?.wallet),
      chainId:
        config?.environment === "development" ? polygonMumbai.id : base.id,
    });

    console.log("NFT minted successfully!", result);

    btnText = "under maintenance";

    return new NextResponse(`
          <!DOCTYPE html><html><head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${imageUrl}" />
          <meta property="fc:frame:button:1" content="${btnText}" />
          <meta property="fc:frame:button:2" content="Remix on Lenspost" />
          <meta property="fc:frame:button:2:action" content="post_redirect">
        </head>
        </html>
          `);
  } catch (error) {
    console.log("Error minting NFT-> ", error);
    btnText = "Try Again";
    return new NextResponse(`
      <!DOCTYPE html><html><head>
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content="${imageUrl}" />
      <meta property="fc:frame:button:1" content="${btnText}" />
    </head></html>
      `);
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  return getResponse(req);
}

export const dynamic = "force-dynamic";
