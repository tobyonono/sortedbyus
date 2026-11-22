// Anything the studio can play and export: a single composition (template + data)
// or a reel that sequences compositions. The stage, exporter and previews only
// talk to this, so new kinds of playable plug in without touching them.
import type { BaseData, Ctx2D, DrawEnv, FormatKey, Segment, Template } from "./index";
import type { SceneElement } from "./scene";

export interface Playable {
  format: FormatKey;
  fps: number;
  /** Total frames for one loop. */
  frames(): number;
  /** Image values it will draw, so they can be loaded first. */
  images(): string[];
  /** Timeline sections for the scrubber. */
  segments(): Segment[];
  draw(ctx: Ctx2D, frame: number, env: DrawEnv): void;
  /** The frame as named elements, if the template can describe it (smart animate needs both sides). */
  scene?(ctx: Ctx2D, frame: number, env: DrawEnv): SceneElement[];
}

/** Builds a playable in a given format and frame rate (export can choose any). */
export type PlayableSource = (format: FormatKey, fps: number) => Playable;

/** A composition as a playable source: its template drawing its data. */
export function compositionSource<D extends BaseData>(template: Template<D>, data: D): PlayableSource {
  return (format, fps) => {
    const d = { ...data, format, fps };
    return {
      format,
      fps,
      frames: () => template.frames(d),
      images: () => template.images(d),
      segments: () => template.segments(d),
      draw: (ctx, frame, env) => template.draw(ctx, frame, d, env),
      scene: template.scene ? (ctx, frame, env) => template.scene!(ctx, frame, d, env) : undefined,
    };
  };
}
