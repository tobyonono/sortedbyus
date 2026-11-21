import { useState, type ReactNode } from "react";
import { brand, get, set, settleTime, springPreset, type BaseData, type Control, type SpringValue, type Template } from "../../engine";
import { SpringEditor } from "./SpringEditor";
import { resolveImage } from "./media";

type ListItem = Record<string, string> & { _key: string };

export function Controls({
  template,
  data,
  onChange,
  onPickImage,
  children,
}: {
  template: Template<BaseData>;
  data: BaseData;
  onChange: (next: BaseData) => void;
  onPickImage: (apply: (value: string) => void) => void;
  /** Extra sections after the controls (the exports list). */
  children?: ReactNode;
}) {
  const controls = template.controls.filter((c) => c.type !== "format" && c.type !== "fps");
  const groups = [...new Set(controls.map((c) => c.group))];
  const update = (key: string, value: unknown) => onChange(set(data, key, value));

  return (
    <aside className="panel">
      <div className="panel-head">
        <p className="panel-kind">{template.kind}</p>
        <p className="panel-desc">{template.description}</p>
      </div>
      {groups.map((g) => (
        <Section key={g} title={g}>
          {controls
            .filter((c) => c.group === g)
            .map((c) => (
              <Field key={c.key} control={c} value={get(data, c.key)} onChange={(v) => update(c.key, v)} onPickImage={onPickImage} />
            ))}
        </Section>
      ))}
      {children}
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className={`section${open ? "" : " is-closed"}`}>
      <button className="section-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{title}</span>
        <svg viewBox="0 0 16 16" aria-hidden><path d="m4 6 4 4 4-4" /></svg>
      </button>
      {open && <div className="section-body">{children}</div>}
    </section>
  );
}

function Field({
  control: c,
  value,
  onChange,
  onPickImage,
}: {
  control: Control;
  value: unknown;
  onChange: (v: unknown) => void;
  onPickImage: (apply: (value: string) => void) => void;
}) {
  switch (c.type) {
    case "text":
      return (
        <label className="field">
          <span className="field-label">{c.label}</span>
          <input className="input" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        </label>
      );
    case "number": {
      const n = Number(value);
      const decimals = c.step < 0.1 ? 2 : c.step < 1 ? 1 : 0;
      return (
        <label className="field">
          <span className="field-label">
            {c.label}
            <span className="field-value">
              {n.toFixed(decimals)}
              {c.unit ? ` ${c.unit}` : ""}
            </span>
          </span>
          <input
            type="range"
            className="slider"
            min={c.min}
            max={c.max}
            step={c.step}
            value={n}
            style={{ ["--p" as string]: `${((n - c.min) / (c.max - c.min)) * 100}%` }}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </label>
      );
    }
    case "colour": {
      const name = value as string;
      const hex = (brand.palette as Record<string, string>)[name];
      return (
        <div className="field">
          <span className="field-label">
            {c.label}
            <span className="field-value">
              <i className="chip" style={{ background: hex }} />
              {name} <code>{hex}</code>
            </span>
          </span>
          <div className="swatches" role="radiogroup" aria-label={c.label}>
            {Object.entries(brand.palette).map(([k, v]) => (
              <button
                key={k}
                role="radio"
                aria-checked={k === name}
                aria-label={k}
                title={`${k} ${v}`}
                className={`swatch${k === name ? " is-on" : ""}`}
                style={{ background: v }}
                onClick={() => onChange(k)}
              />
            ))}
          </div>
        </div>
      );
    }
    case "choice":
      return (
        <div className="field">
          <span className="field-label">{c.label}</span>
          <div className="seg full">
            {c.options.map((o) => (
              <button key={o.value} className={o.value === value ? "is-on" : ""} onClick={() => onChange(o.value)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      );
    case "spring":
      return <SpringField control={c} value={value as SpringValue} onChange={onChange} />;
    case "list":
      return <ListField control={c} items={(value as ListItem[]) ?? []} onChange={onChange} onPickImage={onPickImage} />;
    default:
      return null;
  }
}

function ListField({
  control: c,
  items,
  onChange,
  onPickImage,
}: {
  control: Extract<Control, { type: "list" }>;
  items: ListItem[];
  onChange: (v: unknown) => void;
  onPickImage: (apply: (value: string) => void) => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  // Rows only become draggable while the grip is held, so dragging inside a text field selects text.
  const [armed, setArmed] = useState<number | null>(null);
  const texts = c.item.filter((i) => i.type === "text");
  const imageKey = c.item.find((i) => i.type === "image")?.key;
  const colourKey = c.item.find((i) => i.type === "colour")?.key;
  const name = (it: ListItem, i: number) => (texts.length ? it[texts[texts.length - 1].key] : "") || `item ${i + 1}`;
  const patch = (i: number, key: string, v: string) => onChange(items.map((it, j) => (j === i ? { ...it, [key]: v } : it)));
  const move = (from: number, to: number) => {
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };
  const blank = (): ListItem => {
    const last = items[items.length - 1] ?? ({} as ListItem);
    const item: ListItem = { _key: crypto.randomUUID().slice(0, 8) };
    for (const f of c.item) item[f.key] = f.type === "text" ? (f === texts[texts.length - 1] ? "Something new" : "") : (last[f.key] ?? (f.type === "colour" ? "cream" : ""));
    return item;
  };

  return (
    <div className="field">
      <span className="field-label">
        {c.label}
        <span className="field-value">
          {items.length} / {c.max}
        </span>
      </span>
      <p className="hint">Drag to reorder{imageKey ? " · click a photo to change it" : ""}</p>
      <ol className="list">
        {items.map((it, i) => (
          <li
            key={it._key}
            className={`list-row${drag === i ? " is-dragging" : ""}`}
            draggable={armed === i}
            onDragStart={() => setDrag(i)}
            onDragEnd={() => {
              setDrag(null);
              setArmed(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (drag !== null && drag !== i) {
                move(drag, i);
                setDrag(i);
              }
            }}
          >
            <span className="grip" aria-hidden onPointerDown={() => setArmed(i)} onPointerUp={() => setArmed(null)}>
              ⋮⋮
            </span>
            <span className="list-index">{i + 1}</span>
            {imageKey && (
              <button
                className="thumb"
                aria-label={`Change photo for ${name(it, i)}`}
                style={{ backgroundImage: resolveImage(it[imageKey]) ? `url("${resolveImage(it[imageKey])}")` : undefined }}
                onClick={() => onPickImage((v) => patch(i, imageKey, v))}
              />
            )}
            {colourKey && (
              <label className="colour-pick" title={it[colourKey]}>
                <i className="chip" style={{ background: (brand.palette as Record<string, string>)[it[colourKey]] }} />
                <select aria-label={`Card colour for ${name(it, i)}`} value={it[colourKey]} onChange={(e) => patch(i, colourKey, e.target.value)}>
                  {Object.keys(brand.palette).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <span className="list-fields">
              {texts.map((t, ti) => (
                <input
                  key={t.key}
                  className={`input input-inline${ti < texts.length - 1 ? " input-small" : ""}`}
                  placeholder={t.label}
                  aria-label={t.label}
                  value={it[t.key] ?? ""}
                  onChange={(e) => patch(i, t.key, e.target.value)}
                />
              ))}
            </span>
            <button
              className="icon-btn subtle"
              aria-label="Remove"
              disabled={items.length <= 1}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <svg viewBox="0 0 16 16"><path d="m4 4 8 8M12 4l-8 8" /></svg>
            </button>
          </li>
        ))}
      </ol>
      <button className="btn ghost full" disabled={items.length >= c.max} onClick={() => onChange([...items, blank()])}>
        + Add {c.label.toLowerCase().replace(/s$/, "")}
      </button>
    </div>
  );
}

function SpringField({ control: c, value, onChange }: { control: Extract<Control, { type: "spring" }>; value: SpringValue; onChange: (v: unknown) => void }) {
  const [editing, setEditing] = useState(false);
  const spring = value ?? springPreset("card");
  return (
    <div className="field">
      <span className="field-label">
        {c.label}
        <span className="field-value">settles in {settleTime(spring).toFixed(2)} s</span>
      </span>
      <div className="spring-row">
        <select
          className="input"
          aria-label={c.label}
          value={spring.preset ?? "custom"}
          onChange={(e) => e.target.value !== "custom" && onChange(springPreset(e.target.value))}
        >
          {Object.entries(brand.springs).map(([k, p]) => (
            <option key={k} value={k}>
              {p.label}
            </option>
          ))}
          <option value="custom" disabled>
            Custom
          </option>
        </select>
        <button className="icon-btn" aria-label={`Edit ${c.label.toLowerCase()}`} title="Edit spring" onClick={() => setEditing(true)}>
          <svg viewBox="0 0 16 16"><path d="M2 13c3 0 3-10 6-10 2 0 2 4 3.5 4S13 5 14 5" /></svg>
        </button>
      </div>
      {c.hint && <p className="hint">{c.hint}</p>}
      {editing && (
        <SpringEditor
          value={spring}
          onClose={() => setEditing(false)}
          onUse={(v) => {
            onChange(v);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
