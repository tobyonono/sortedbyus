// "New composition": pick a template. Each card plays a small live preview of
// the template with its default content, so you can see what it does.
import { Modal } from "./Modal";
import { compositionSource } from "../../engine";
import { PlayablePreview } from "./PlayablePreview";
import { TEMPLATES } from "./templates";

export function NewComposition({ onPick, onPickReel, onClose }: { onPick: (templateId: string) => void; onPickReel?: () => void; onClose: () => void }) {
  return (
    <Modal className="new-comp" label="New composition" onClose={onClose}>
      <header className="modal-head">
        <h2>New</h2>
        <button className="btn ghost small" onClick={onClose}>
          Close
        </button>
      </header>
      <div className="template-grid">
        {onPickReel && (
          <button className="template-card" onClick={onPickReel}>
            <span className="template-preview reel-card" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <span className="template-name">Reel</span>
            <span className="template-desc">Put compositions in order, with transitions between them, for a longer video.</span>
          </button>
        )}
        {TEMPLATES.map((t) => (
          <button key={t.id} className="template-card" onClick={() => onPick(t.id)}>
            <PlayablePreview className="template-preview" playable={compositionSource(t, t.defaults)("portrait", t.defaults.fps)} width={288} />
            <span className="template-name">{t.name}</span>
            <span className="template-desc">{t.description}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
