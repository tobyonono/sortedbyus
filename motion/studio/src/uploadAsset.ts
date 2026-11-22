import type { SanityAssetDocument, SanityClient, UploadClientConfig } from "@sanity/client";

export function uploadAsset(
  client: SanityClient, type: "file" | "image", blob: Blob, options: UploadClientConfig, signal?: AbortSignal,
): Promise<SanityAssetDocument> {
  if (!signal) return client.assets.upload(type, blob, options);
  signal.throwIfAborted();
  // The observable upload aborts its HTTP request when unsubscribed.
  return new Promise((resolve, reject) => {
    const subscription = client.observable.assets.upload(type, blob, options).subscribe({
      next: (event) => {
        if (event.type === "response") resolve(event.body.document);
      },
      error: reject,
      complete: () => reject(new Error("Sanity returned no uploaded asset.")),
    });
    const abort = () => {
      subscription.unsubscribe();
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    subscription.add(() => signal.removeEventListener("abort", abort));
  });
}
