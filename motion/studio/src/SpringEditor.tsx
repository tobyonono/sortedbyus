// Spring editor, after the NeueHaus studio's: start from a brand preset, set the
// spring by physics or by duration + bounce, see the curve, how long it takes to
// settle and a live preview, copy the code, then use it.
import { useEffect, useRef, useState } from "react";
import { useEscape } from "./useEscape";
import { brand, durationOf, settleTime, springAt, springCode, springFromDuration, springPreset, type SpringValue } from "../../engine";

const PRESETS = Object.entries(brand.springs) as [string, { label: string }][];

export function SpringEditor({ value, onUse, onClose }: { value: SpringValue; onUse: (v: SpringValue) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<SpringValue>(value);
  const [mode, setMode] = useState<"physics" | "duration">("physics");
  const [copied, setCopied] = useState(false);
  useEscape(onClose);
  const settle = settleTime(draft);
  const { duration, bounce } = durationOf(draft);
  const set = (patch: Partial<SpringValue>) => setDraft((d) => ({ ...d, ...patch, preset: undefined }));

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal spring" role="dialog" aria-label="Spring">
        <header className="modal-head">
          <h2>Spring</h2>
          <button className="btn ghost small" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="spring-body">
          <div className="spring-left">
            <Curve spring={draft} settle={settle} />
            <p className="hint">
              Settles in <strong>{settle.toFixed(2)} s</strong>. A movement on this spring takes this long.
            </p>
          </div>
          <div className="spring-right">
            <label className="field">
              <span className="field-label">Start from</span>
              <select
                className="input"
                value={draft.preset ?? "custom"}
                onChange={(e) => e.target.value !== "custom" && setDraft(springPreset(e.target.value))}
              >
                {PRESETS.map(([k, p]) => (
                  <option key={k} value={k}>
                    {p.label}
                  </option>
                ))}
                <option value="custom" disabled>
                  Custom
                </option>
              </select>
            </label>
            <div className="field">
              <span className="field-label">Set by</span>
              <div className="seg full">
                <button className={mode === "duration" ? "is-on" : ""} onClick={() => setMode("duration")}>
                  Duration and bounce
                </button>
                <button className={mode === "physics" ? "is-on" : ""} onClick={() => setMode("physics")}>
                  Physics
                </button>
              </div>
            </div>
            {mode === "physics" ? (
              <>
                <Slider label="Stiffness" min={5} max={1000} step={1} value={draft.stiffness} onChange={(v) => set({ stiffness: v })} />
                <Slider label="Damping" min={1} max={100} step={0.01} value={draft.damping} onChange={(v) => set({ damping: v })} />
                <Slider label="Mass" min={0.1} max={5} step={0.1} value={draft.mass} onChange={(v) => set({ mass: v })} />
                <Slider label="Velocity" min={-20} max={20} step={0.5} value={draft.velocity} onChange={(v) => set({ velocity: v })} />
              </>
            ) : (
              <>
                <Slider
                  label="Duration"
                  unit="s"
                  min={0.1}
                  max={3}
                  step={0.01}
                  value={duration}
                  onChange={(v) => set({ ...springFromDuration(v, bounce, draft.mass), velocity: draft.velocity })}
                />
                <Slider
                  label="Bounce"
                  min={0}
                  max={0.9}
                  step={0.01}
                  value={bounce}
                  onChange={(v) => set({ ...springFromDuration(duration, v, draft.mass), velocity: draft.velocity })}
                />
              </>
            )}
            <Preview spring={draft} settle={settle} />
            <div className="code-row">
              <code>{springCode(draft)}</code>
              <button
                className="btn ghost small"
                onClick={() => {
                  navigator.clipboard?.writeText(springCode(draft));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
        <footer className="modal-foot">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => onUse(draft)}>
            Use this spring
          </button>
        </footer>
      </div>
    </div>
  );
}

function Slider({ label, unit, min, max, step, value, onChange }: { label: string; unit?: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  const decimals = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return (
    <label className="field">
      <span className="field-label">
        {label}
        <span className="field-value">
          {value.toFixed(decimals)}
          {unit ? ` ${unit}` : ""}
        </span>
      </span>
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ["--p" as string]: `${((value - min) / (max - min)) * 100}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Curve({ spring, settle }: { spring: SpringValue; settle: number }) {
  const W = 340;
  const H = 300;
  const T = Math.max(settle * 1.25, 0.3);
  const pts: [number, number][] = [];
  for (let i = 0; i <= 120; i++) pts.push([(T * i) / 120, springAt(spring, (T * i) / 120)]);
  const lo = Math.min(0, ...pts.map((p) => p[1]));
  const hi = Math.max(1.15, ...pts.map((p) => p[1]));
  const x = (t: number) => 20 + (t / T) * (W - 40);
  const y = (v: number) => H - 30 - ((v - lo) / (hi - lo)) * (H - 60);
  return (
    <svg className="spring-curve" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Spring curve">
      <line x1={20} x2={W - 20} y1={y(0)} y2={y(0)} className="axis" />
      <line x1={20} x2={W - 20} y1={y(1)} y2={y(1)} className="target" />
      <line x1={x(settle)} x2={x(settle)} y1={14} y2={H - 20} className="settle" />
      <polyline points={pts.map(([t, v]) => `${x(t)},${y(v)}`).join(" ")} className="curve" />
    </svg>
  );
}

function Preview({ spring, settle }: { spring: SpringValue; settle: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const cycle = settle + 0.7;
    const tick = (now: number) => {
      const t = ((now - start) / 1000) % cycle;
      const p = springAt(spring, t);
      if (ref.current) ref.current.style.transform = `translateX(calc(${p} * (var(--track) - 22px)))`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spring, settle]);
  return (
    <div className="spring-preview" aria-hidden>
      <div ref={ref} className="spring-dot" />
    </div>
  );
}
