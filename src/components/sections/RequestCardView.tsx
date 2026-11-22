import { useId, type CSSProperties, type FormEvent, type ReactNode, type Ref } from "react";
import { Button } from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import styles from "./RequestCard.module.css";

/** Options for "What do you need?" when the page doesn't pass the services from Sanity. */
export const defaultServices = [
  "Shopping & Sourcing",
  "Travel & Holidays",
  "Gifts & Celebrations",
  "Home & Lifestyle",
  "Errands & Admin",
  "Events & Experiences",
  "Corporate",
  "Something else",
];

export const cities = ["Lagos", "Abuja", "Elsewhere in Nigeria", "From abroad"];

export const shortFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

export type RequestStep = 1 | 2 | "sent";

export type RequestCardViewProps = {
  id?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
  services: string[];
  cities: string[];
  step: RequestStep;
  service: string;
  where: string;
  when: "today" | "date";
  date: Date | null;
  whenLabel: string;
  calOpen?: boolean;
  /** The open date picker, rendered under the "When" tiles. */
  calendar?: ReactNode;
  name?: string;
  phone?: string;
  message?: string;
  error?: string;
  sending?: boolean;
  viaWhatsApp?: boolean;
  whenRef?: Ref<HTMLDivElement>;
  dateBtnRef?: Ref<HTMLButtonElement>;
  stepRef?: Ref<HTMLDivElement>;
  onSubmit?: (e: FormEvent) => void;
  onService?: (v: string) => void;
  onToday?: () => void;
  onPickDate?: () => void;
  onWhere?: (v: string) => void;
  onEditDetails?: () => void;
  onName?: (v: string) => void;
  onPhone?: (v: string) => void;
  onMessage?: (v: string) => void;
  onRestart?: () => void;
};

const noop = () => {};

/**
 * How the request card looks, from props alone. RequestCard holds the state and sends the request;
 * the motion studio renders this with scripted props to make videos of the card.
 */
export default function RequestCardView({
  id, title, className, style, services, cities, step, service, where, when, date, whenLabel, calOpen, calendar,
  name = "", phone = "", message = "", error, sending, viaWhatsApp, whenRef, dateBtnRef, stepRef,
  onSubmit, onService, onToday, onPickDate, onWhere, onEditDetails, onName, onPhone, onMessage, onRestart,
}: RequestCardViewProps) {
  const uid = useId();
  return (
    <form className={`${styles.card} ${className ?? ""}`} id={id} style={style} onSubmit={onSubmit ?? ((e) => e.preventDefault())} noValidate aria-label={title}>
      {title && (
        <h2 className={styles.title} aria-hidden="true">
          {title}
        </h2>
      )}
      <div className={styles.progress} aria-hidden={step === "sent"}>
        <span>{step === 1 ? "Step 1 of 2" : step === 2 ? "Step 2 of 2" : "Done"}</span>
        <span className={styles.bar}>
          <i style={{ transform: `scaleX(${step === 1 ? 0.5 : 1})` }} />
        </span>
      </div>

      {step === 1 && (
        <div className={styles.step} key="s1">
          <Select label="What do you need?" placeholder="What do you need?" options={services} value={service} onChange={onService ?? noop} />

          <div className={styles.when} ref={whenRef} role="group" aria-labelledby={`${uid}-when`}>
            <p id={`${uid}-when`} className={styles.groupLabel}>
              When do you need it?
            </p>
            <div className={styles.tiles}>
              <button type="button" className={styles.tile} aria-pressed={when === "today"} onClick={onToday}>
                <span className={styles.tileBig}>Today</span>
                <span className={styles.tileSmall}>Same day</span>
              </button>
              <button
                ref={dateBtnRef}
                type="button"
                className={styles.tile}
                aria-pressed={when === "date"}
                aria-expanded={!!calOpen}
                aria-haspopup="dialog"
                onClick={onPickDate}
              >
                <span className={styles.tileBig}>{date ? shortFmt.format(date) : "Pick a date"}</span>
                <span className={styles.tileSmall}>
                  <CalendarIcon /> {date ? "Change date" : "Choose a day"}
                </span>
              </button>
            </div>
            {calendar}
          </div>

          <div className={styles.group}>
            <p className={styles.groupLabel} aria-hidden="true">
              Where?
            </p>
            <Select label="Where?" options={cities} value={where} onChange={onWhere ?? noop} />
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" arrow full>
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className={styles.step} key="s2" ref={stepRef}>
          <button type="button" className={styles.summary} onClick={onEditDetails} aria-label="Edit your request details">
            <span>
              {service} · {whenLabel} · {where}
            </span>
            <span className="link">Edit</span>
          </button>

          <label className={styles.field}>
            <span>Your name</span>
            <input value={name} onChange={(e) => onName?.(e.target.value)} autoComplete="name" required />
          </label>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
          <label className={styles.field}>
            <span>WhatsApp or phone number</span>
            <input value={phone} onChange={(e) => onPhone?.(e.target.value)} autoComplete="tel" inputMode="tel" placeholder="+234" required />
          </label>
          <label className={styles.field}>
            <span>
              Anything else? <em>Optional</em>
            </span>
            <textarea value={message} onChange={(e) => onMessage?.(e.target.value)} rows={3} placeholder="Preferences, budget, links…" />
          </label>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" arrow full disabled={sending}>
            {sending ? "Sending…" : "Send request"}
          </Button>
          <p className={styles.note}>We’ll reply on WhatsApp, usually within the hour during the day.</p>
        </div>
      )}

      {step === "sent" && (
        <div className={styles.step} key="s3" ref={stepRef}>
          <h2 className={styles.sentHeading} tabIndex={-1}>
            Thanks, {name.trim().split(" ")[0]}.
          </h2>
          <p className={styles.sentBody}>
            {viaWhatsApp
              ? "Your request is ready in WhatsApp — hit send and we’ll get back to you shortly. Consider it sorted."
              : "We’ve got your request and will be in touch on WhatsApp shortly. Consider it sorted."}
          </p>
          <button type="button" className={`${styles.restart} link`} onClick={onRestart}>
            Make another request
          </button>
        </div>
      )}
    </form>
  );
}

function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <rect x="0.75" y="1.75" width="10.5" height="9.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M0.75 4.75h10.5M3.5 0v3M8.5 0v3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
