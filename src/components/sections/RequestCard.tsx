"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Calendar from "@/components/ui/Calendar";
import { whatsappHref } from "@/lib/site";
import styles from "./RequestCard.module.css";

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

const cities = ["Lagos", "Abuja", "Elsewhere in Nigeria", "From abroad"];

const shortFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

type Step = 1 | 2 | "sent";

/**
 * Two-step request form.
 * Step 1: what / when / where. Step 2: name, WhatsApp number and an optional message.
 * Submitting saves the request to Sanity (Website requests) via /api/request. If that fails, it falls back to
 * opening WhatsApp with the request written out, so nothing is lost.
 * Rendered in the hero (id="request") and in the slide-over RequestPanel; `initialService` pre-fills step 1.
 */
export default function RequestCard({
  id,
  title,
  initialService = "",
  services = defaultServices,
  className = "",
}: {
  /** Options for "What do you need?" (the homepage passes the services from Sanity). */
  services?: string[];
  id?: string;
  /** Optional serif heading at the top of the card (the hero uses one; the panel has its own). */
  title?: string;
  initialService?: string;
  className?: string;
}) {
  const uid = useId();
  const [step, setStep] = useState<Step>(1);
  const [service, setService] = useState(services.includes(initialService) ? initialService : "");
  const [where, setWhere] = useState("Lagos");
  const [when, setWhen] = useState<"today" | "date">("today");
  const [date, setDate] = useState<Date | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  const [today, setToday] = useState<Date | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [viaWhatsApp, setViaWhatsApp] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const whenRef = useRef<HTMLDivElement>(null);
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  // "Today" is computed on the client so the prerendered page never shows a stale date.
  useEffect(() => {
    const id = requestAnimationFrame(() => setToday(new Date()));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!calOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!whenRef.current?.contains(e.target as Node)) setCalOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [calOpen]);

  // Move focus to the new step's first field/heading when the step changes.
  useEffect(() => {
    if (step === 1) return;
    stepRef.current?.querySelector<HTMLElement>("input, h2")?.focus();
  }, [step]);

  const closeCal = () => {
    setCalOpen(false);
    dateBtnRef.current?.focus();
  };

  const whenLabel = when === "today" ? "Today (urgent)" : date ? shortFmt.format(date) : "";

  const next = () => {
    if (!service) return setError("Choose what you need.");
    if (when === "date" && !date) return setError("Pick a date, or choose Today.");
    setError("");
    setStep(2);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (step === 1) return next();
    if (!name.trim()) return setError("Add your name.");
    if (phone.replace(/\D/g, "").length < 7) return setError("Add a WhatsApp or phone number so we can reply.");
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>('input[name="website"]')?.value, form: "Quick request", service, when: whenLabel, where, name: name.trim(), phone: phone.trim(), message: message.trim(), page: location.pathname }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setViaWhatsApp(false);
      setStep("sent");
      return;
    } catch {
      // fall back to WhatsApp so the request still reaches us
    } finally {
      setSending(false);
    }
    const text = [
      `Hi Sorted by Us, I'd like to make a request.`,
      ``,
      `Service: ${service}`,
      `When: ${whenLabel}`,
      `Where: ${where}`,
      `Name: ${name.trim()}`,
      `Phone: ${phone.trim()}`,
      message.trim() ? `\n${message.trim()}` : "",
    ].join("\n");
    window.open(whatsappHref(text), "_blank", "noopener");
    setViaWhatsApp(true);
    setStep("sent");
  };

  return (
    <form className={`${styles.card} ${className}`} id={id} onSubmit={submit} noValidate aria-label={title}>
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
          <Select
            label="What do you need?"
            placeholder="What do you need?"
            options={services}
            value={service}
            onChange={(v) => {
              setService(v);
              setError("");
            }}
          />

          <div className={styles.when} ref={whenRef} role="group" aria-labelledby={`${uid}-when`}>
            <p id={`${uid}-when`} className={styles.groupLabel}>
              When do you need it?
            </p>
            <div className={styles.tiles}>
              <button
                type="button"
                className={styles.tile}
                aria-pressed={when === "today"}
                onClick={() => {
                  setWhen("today");
                  setCalOpen(false);
                  setError("");
                }}
              >
                <span className={styles.tileBig}>Today</span>
                <span className={styles.tileSmall}>Same day</span>
              </button>
              <button
                ref={dateBtnRef}
                type="button"
                className={styles.tile}
                aria-pressed={when === "date"}
                aria-expanded={calOpen}
                aria-haspopup="dialog"
                onClick={() => {
                  setWhen("date");
                  setCalOpen((o) => !o);
                }}
              >
                <span className={styles.tileBig}>{date ? shortFmt.format(date) : "Pick a date"}</span>
                <span className={styles.tileSmall}>
                  <CalendarIcon /> {date ? "Change date" : "Choose a day"}
                </span>
              </button>
            </div>
            {calOpen && today && (
              <Calendar
                value={date}
                min={today}
                onSelect={(d) => {
                  setDate(d);
                  setError("");
                  closeCal();
                }}
                onClose={closeCal}
              />
            )}
          </div>

          <div className={styles.group}>
            <p className={styles.groupLabel} aria-hidden="true">
              Where?
            </p>
            <Select label="Where?" options={cities} value={where} onChange={setWhere} />
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
          <button type="button" className={styles.summary} onClick={() => setStep(1)} aria-label="Edit your request details">
            <span>
              {service} · {whenLabel} · {where}
            </span>
            <span className="link">Edit</span>
          </button>

          <label className={styles.field}>
            <span>Your name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </label>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
          <label className={styles.field}>
            <span>WhatsApp or phone number</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" placeholder="+234" required />
          </label>
          <label className={styles.field}>
            <span>
              Anything else? <em>Optional</em>
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Details, budget, links…"
            />
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
          <button
            type="button"
            className={`${styles.restart} link`}
            onClick={() => {
              setStep(1);
              setMessage("");
            }}
          >
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
