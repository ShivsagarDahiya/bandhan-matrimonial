import { HttpAgent } from "@icp-sdk/core/agent";
import { useCallback, useState } from "react";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";
import { useInternetIdentity } from "./useInternetIdentity";

export function useStorageUpload() {
  const { identity } = useInternetIdentity();
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const uploadFile = useCallback(
    async (file: File): Promise<string> => {
      setUploading(true);
      setProgress(0);
      try {
        const config = await loadConfig();
        const agent = new HttpAgent({
          identity: identity ?? undefined,
          host: config.backend_host,
        });
        if (config.backend_host?.includes("localhost")) {
          await agent.fetchRootKey();
        }
        const storageClient = new StorageClient(
          config.bucket_name,
          config.storage_gateway_url,
          config.backend_canister_id,
          config.project_id,
          agent,
        );
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { hash } = await storageClient.putFile(bytes, (pct) =>
          setProgress(Math.round(pct)),
        );
        const url = await storageClient.getDirectURL(hash);
        return url;
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [identity],
  );

  return { uploadFile, uploading, progress };
}
