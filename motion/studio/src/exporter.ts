// MP4 export in the browser: draw each frame with the template, encode with
// WebCodecs through mediabunny. Same draw call as the preview.
import {
  BufferTarget,
  CanvasSource,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_MEDIUM,
  QUALITY_VERY_HIGH,
} from "mediabunny";
import { formatSize, type FormatKey, type PlayableSource } from "../../engine";
import { imageFor, loadFonts, preloadImages } from "./media";

export const QUALITY = { standard: QUALITY_MEDIUM, high: QUALITY_HIGH, max: QUALITY_VERY_HIGH };
export type QualityKey = keyof typeof QUALITY;

interface ExportMediaOptions {
  signal?: AbortSignal;
  allowMissingImages?: boolean;
}

export interface ExportOptions extends ExportMediaOptions {
  format: FormatKey;
  fps: number;
  quality: QualityKey;
  repeat: number;
  onProgress?: (p: number) => void;
}

export class MissingExportImages extends Error {
  constructor(readonly values: string[]) {
    super(`Couldn’t load ${values.length === 1 ? "a photo" : `${values.length} photos`}: ${values.join(", ")}`);
  }
}

export async function prepareExportImages(values: string[], { signal, allowMissingImages }: ExportMediaOptions = {}) {
  signal?.throwIfAborted();
  const ready = preloadImages(values, !allowMissingImages);
  let abort: (() => void) | undefined;
  try {
    const missing = signal
      ? await Promise.race([ready, new Promise<never>((_, reject) => {
          abort = () => reject(signal.reason);
          signal.addEventListener("abort", abort, { once: true });
        })])
      : await ready;
    signal?.throwIfAborted();
    if (missing.length && !allowMissingImages) throw new MissingExportImages(missing);
  } finally {
    if (abort) signal?.removeEventListener("abort", abort);
  }
}

export async function exportVideo(input: PlayableSource, o: ExportOptions): Promise<Blob> {
  const p = input(o.format, o.fps);
  const [W, H] = formatSize(o.format);
  await Promise.all([loadFonts(), prepareExportImages(p.images(), o)]);
  o.signal?.throwIfAborted();

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false })!;

  const codec = await getFirstEncodableVideoCodec(["avc", "hevc", "vp9", "av1"], { width: W, height: H });
  o.signal?.throwIfAborted();
  if (!codec) throw new Error("This browser can't encode video. Try Chrome or Edge.");

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const source = new CanvasSource(canvas, { codec, bitrate: QUALITY[o.quality] });
  output.addVideoTrack(source, { frameRate: o.fps });
  const env = { width: W, height: H, fps: o.fps, image: imageFor };
  const loop = Math.max(1, p.frames());
  const total = loop * o.repeat;
  try {
    await output.start();
    for (let i = 0; i < total; i++) {
      o.signal?.throwIfAborted();
      await p.prepare?.(i % loop, env);
      p.draw(ctx, i % loop, env);
      await source.add(i / o.fps, 1 / o.fps);
      o.onProgress?.((i + 1) / total);
    }
    o.signal?.throwIfAborted();
    await output.finalize();
  } catch (error) {
    await output.cancel();
    throw error;
  }
  o.signal?.throwIfAborted();
  return new Blob([output.target.buffer!], { type: "video/mp4" });
}

export async function exportStill(
  source: PlayableSource, format: FormatKey, fps: number, frame: number, options: ExportMediaOptions = {},
): Promise<Blob> {
  const p = source(format, fps);
  const [W, H] = formatSize(format);
  await Promise.all([loadFonts(), prepareExportImages(p.images(), options)]);
  options.signal?.throwIfAborted();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const env = { width: W, height: H, fps, image: imageFor };
  await p.prepare?.(frame, env);
  p.draw(canvas.getContext("2d")!, frame, env);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG failed"))), "image/png"),
  );
  options.signal?.throwIfAborted();
  return blob;
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
