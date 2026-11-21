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
import { formatSize, type BaseData, type FormatKey, type Template } from "../../engine";
import { imageFor, loadFonts, preloadImages } from "./media";

export const QUALITY = { standard: QUALITY_MEDIUM, high: QUALITY_HIGH, max: QUALITY_VERY_HIGH };
export type QualityKey = keyof typeof QUALITY;

export interface ExportOptions {
  format: FormatKey;
  fps: number;
  quality: QualityKey;
  repeat: number;
  onProgress?: (p: number) => void;
  signal?: AbortSignal;
}

export async function exportVideo<D extends BaseData>(t: Template<D>, data: D, o: ExportOptions): Promise<Blob> {
  const d = { ...data, format: o.format, fps: o.fps };
  const [W, H] = formatSize(o.format);
  await loadFonts();
  await preloadImages(t.images(d));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false })!;

  const codec = await getFirstEncodableVideoCodec(["avc", "hevc", "vp9", "av1"], { width: W, height: H });
  if (!codec) throw new Error("This browser can't encode video. Try Chrome or Edge.");

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const source = new CanvasSource(canvas, { codec, bitrate: QUALITY[o.quality] });
  output.addVideoTrack(source, { frameRate: o.fps });
  await output.start();

  const env = { width: W, height: H, fps: o.fps, image: imageFor };
  const loop = t.frames(d);
  const total = loop * o.repeat;
  for (let i = 0; i < total; i++) {
    if (o.signal?.aborted) {
      await output.cancel();
      throw new DOMException("Export cancelled", "AbortError");
    }
    t.draw(ctx, i % loop, d, env);
    await source.add(i / o.fps, 1 / o.fps);
    o.onProgress?.((i + 1) / total);
  }
  await output.finalize();
  return new Blob([output.target.buffer!], { type: "video/mp4" });
}

export async function exportStill<D extends BaseData>(t: Template<D>, data: D, format: FormatKey, frame: number): Promise<Blob> {
  const d = { ...data, format };
  const [W, H] = formatSize(format);
  await loadFonts();
  await preloadImages(t.images(d));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  t.draw(canvas.getContext("2d")!, frame, d, { width: W, height: H, fps: d.fps, image: imageFor });
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG failed"))), "image/png"));
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
