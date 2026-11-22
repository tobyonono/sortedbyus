import { useLayoutEffect, useRef, type ReactNode } from "react";

export function Modal({ label, className, dismissible = true, onClose, children }: {
  label: string;
  className?: string;
  dismissible?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal-scrim"
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const dialog = event.currentTarget;
        const controls = [...dialog.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href], [tabindex]")]
          .filter((el) => !el.matches(":disabled") && !el.closest("[inert]") && el.tabIndex >= 0 && el.getClientRects().length);
        const first = controls[0];
        const last = controls.at(-1);
        const active = document.activeElement;
        if (active === (event.shiftKey ? first : last)) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        }
      }}
    >
      <div className={className ? `modal ${className}` : "modal"}>{children}</div>
    </dialog>
  );
}
