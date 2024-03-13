import { NextPage } from "next";
import { getFrameMetadata } from "@coinbase/onchainkit";
import type { Metadata, ResolvingMetadata } from "next";
import { config } from "@/config/config";
import axios from "axios";
import { FrameData } from "@/types/types";
import Default from "@/components/Default";
import { getFrameData } from "@/utils";
import Image from "next/image";
import Button from "@/components/Button";

type Props = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id;
  console.log("id", id);

  const { imageUrl, isLike, isFollow, isRecast } = await getFrameData(id);

  const frameMetadata = getFrameMetadata({
    buttons: [
      {
        label: `${[
          isLike ? "Like" : "",
          isRecast ? "Recast" : "",
          isFollow ? "Follow" : "",
        ]
          .filter(Boolean) // Remove empty strings
          .join(", ")} ${isLike || isRecast || isFollow ? `👉` : ""} Mint`,
      },

      {
        action: "tx",
        label: "Send Base Sepolia",
        target: `${config?.APP_URL}/api/tx`,
      },
    ],
    image: {
      src: imageUrl,
      aspectRatio: "1:1",
    },
    post_url: `${config?.APP_URL}/api/frame?frameId=${id}`,
  });

  return {
    title: "Frames Lenspost",
    description: "Share farcater frames from Lenspost",
    openGraph: {
      title: "Frames Lenspost",
      description: "Share farcater frames from Lenspost",
      images: [imageUrl],
    },
    other: {
      ...frameMetadata,
    },
    metadataBase: new URL(config?.APP_URL || ""),
  };
}

const Home = async ({ params }: Props) => {
  const {
    frameId,
    imageUrl,
    allowedMints,
    isFollow,
    isLike,
    isRecast,
    isTopUp,
    noOfNftsMinited,
    owner,
    contract_address,
  } = await getFrameData(params.id);

  if (!frameId) {
    return <Default text="Invalid FrameID" />;
  }

  return (
    <main className="p-3 h-screen w-screen gap-3 flex flex-col justify-start items-center lg:flex-row lg:justify-center lg:items-center lg:p-8">
      <Image
        src={imageUrl}
        alt="Frame Image"
        width={500}
        height={500}
        className="object-contain rounded-lg"
      />

      <div className="flex flex-col gap-3">
        <div>
          <div className="flex flex-col lg:flex-row lg:gap-3">
            <p className="font-semibold">Contract Address:</p>
            <p className="truncate">{contract_address}</p>
          </div>
          <div className="flex gap-3">
            <p className="font-semibold">Network:</p>
            <p>Base (8453)</p>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row lg:gap-3">
          <p className="font-semibold">Owner:</p>
          <p>{owner}</p>
        </div>
        {isLike || isFollow || isRecast ? (
          <div>
            <p className="font-semibold">Gated with:</p>
            {isLike && <p>Like</p>}
            {isRecast && <p>Recast</p>}
            {isFollow && <p>Follow</p>}
          </div>
        ) : null}
        <div>
          <div className="flex gap-3">
            <p className="font-semibold">Allowed Mints:</p>
            <p>{allowedMints}</p>
          </div>
          <div className="flex gap-3">
            <p className="font-semibold">No of NFTs Minted:</p>
            <p>{noOfNftsMinited}</p>
          </div>
        </div>
        <div className="flex justify-between gap-1">
          {/* <Button
            title="Cast to Mint"
            target={`https://warpcast.com/~/compose?text=https://frames.lenspost.xyz/frame/${frameId}`}
            className="w-full p-2 text-center bg-purple-500  text-white rounded-tl-2xl"
          /> */}
          <Button
            title="Remix on Lenspost"
            target="https://app.lenspost.xyz"
            className="w-full p-2 text-center bg-purple-500  text-white rounded-tl-2xl rounded-br-2xl"
          />
        </div>
      </div>
    </main>
  );
};

export default Home;
