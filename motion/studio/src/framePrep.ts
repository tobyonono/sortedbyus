// For playables that need frames prepared before drawing (site blocks captured from HTML):
// prepare the newest frame asked for, one at a time, and call onReady when it lands so the
// caller redraws. Frames asked for while one is preparing are skipped, so playback keeps up.
import type { DrawEnv, Playable } from "../../engine";

export function framePreparer(onReady: () => void) {
  let busy = false;
  let want: { p: Playable; frame: number; env: DrawEnv } | null = null;
  let done: { p: Playable; frame: number } | null = null;

  const run = async () => {
    if (busy || !want) return;
    const w = want;
    want = null;
    busy = true;
    try {
      await w.p.prepare!(w.frame, w.env);
    } catch {
      // a frame that fails to capture just isn't shown; the next one tries again
    }
    busy = false;
    done = { p: w.p, frame: w.frame };
    onReady();
    void run();
  };

  return (p: Playable, frame: number, env: DrawEnv) => {
    if (!p.prepare || (done?.p === p && done.frame === frame)) return;
    want = { p, frame, env };
    // Start after the current React update: capturing renders a component, which React can't do mid-render.
    queueMicrotask(() => void run());
  };
}
