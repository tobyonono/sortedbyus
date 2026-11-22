"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Calendar from "@/components/ui/Calendar";
import { whatsappHref } from "@/lib/site";
import RequestCardView, { shortFmt, type RequestStep } from "./RequestCardView";

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
  const [step, setStep] = useState<RequestStep>(1);
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
    <RequestCardView
      id={id}
      title={title}
      className={className}
      services={services}
      cities={cities}
      step={step}
      service={service}
      where={where}
      when={when}
      date={date}
      whenLabel={whenLabel}
      calOpen={calOpen}
      calendar={
        calOpen &&
        today && (
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
        )
      }
      name={name}
      phone={phone}
      message={message}
      error={error}
      sending={sending}
      viaWhatsApp={viaWhatsApp}
      whenRef={whenRef}
      dateBtnRef={dateBtnRef}
      stepRef={stepRef}
      onSubmit={submit}
      onService={(v) => {
        setService(v);
        setError("");
      }}
      onToday={() => {
        setWhen("today");
        setCalOpen(false);
        setError("");
      }}
      onPickDate={() => {
        setWhen("date");
        setCalOpen((o) => !o);
      }}
      onWhere={setWhere}
      onEditDetails={() => setStep(1)}
      onName={setName}
      onPhone={setPhone}
      onMessage={setMessage}
      onRestart={() => {
        setStep(1);
        setMessage("");
      }}
    />
  );
}
