"use client";

import { Card } from "@/components/ui/card";
import { SolanaQRCode } from "@/components/qr-code";
import { useEffect, useState } from "react";
import { DevnetAlert } from "@/components/devnet-alert";

export default function Pages() {
  const apiPath = "/api/actions/nft-mint";
  const [, setApiEndpoint] = useState("");

  useEffect(() => {
    setApiEndpoint(new URL(apiPath, window.location.href).toString());

    return () => {
      setApiEndpoint(new URL(apiPath, window.location.href).toString());
    };
  }, []);

  return (
    <section
      id="action"
      className={
        "container space-y-12 bg-slate-50 py-8 dark:bg-transparent md:py-12 lg:py-24"
      }
    >
      <DevnetAlert />

      <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-6 text-center">
        <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
          NFT Mint 5
        </h2>
        <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
          The following example demonstrates how to mint an NFT
          on-chain using an Action and the SPL Token program.
        </p>
      </div>

      <Card className="group-hover:border-primary max-w-[80vw] md:max-w-[400px] aspect-square rounded overflow-clip text-center flex items-center justify-center mx-auto">
        <SolanaQRCode
          url={apiPath}
          color="white"
          background="black"
          size={400}
          className="rounded-lg aspect-square [&>svg]:scale-75 md:[&>svg]:scale-100"
        />
      </Card>
    </section>
  );
}
