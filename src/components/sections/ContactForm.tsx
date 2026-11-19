"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import d from "@/styles/pages.module.css";

/**
 * Contact page form. Saves to Sanity (Website requests) via /api/request.
 * A link from a service card (/contact?service=…&item=…) pre-fills the type of request and the message.
 */
export default function ContactForm({ services }: { services: { title: string; slug: string }[] }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const typeRef = useRef<HTMLSelectElement>(null);
  const msgRef = useRef<HTMLTextAreaElement>(null);

  // pre-fill from the link (done in the browser so the page itself stays a ready-made file)
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const svc = services.find((s) => s.slug === q.get("service"));
    const item = q.get("item")?.slice(0, 80);
    if (svc && typeRef.current) typeRef.current.value = svc.title;
    if (item && msgRef.current && !msgRef.current.value) msgRef.current.value = `${item}: `;
  }, [services]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    if (!get("name")) return setError("Add your name.");
    if (!get("phone") && !get("email")) return setError("Add a phone number or email so we can reply.");
    if (!get("message")) return setError("Tell us what you need.");
    setError("");
    setState("sending");
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form: "Contact page",
          website: get("website"),
          name: get("name"),
          phone: get("phone"),
          email: get("email"),
          subject: get("subject"),
          service: get("service"),
          message: get("message"),
          page: location.pathname + location.search,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("sent");
    } catch {
      setState("error");
    }
  };

  if (state === "sent") {
    return (
      <div className={d.form} role="status">
        <h3 className={d.rowHeading} style={{ fontSize: 32 }}>Thanks, we’ve got it.</h3>
        <p className={d.rowBody}>We’ll reply on WhatsApp or by email, usually within the hour during the day.</p>
      </div>
    );
  }

  return (
    <form className={d.form} onSubmit={submit} noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
      <label className={d.field}>Your name<input name="name" placeholder="Full name" autoComplete="name" required /></label>
      <label className={d.field}>Phone or WhatsApp<input name="phone" placeholder="+234" autoComplete="tel" inputMode="tel" /></label>
      <label className={`${d.field} ${d.fieldFull}`}>Email<input name="email" type="email" placeholder="you@example.com" autoComplete="email" /></label>
      <label className={`${d.field} ${d.fieldFull}`}>Subject
        <select name="subject" defaultValue="Something I need sorted"><option>Something I need sorted</option><option>General question</option><option>Corporate enquiry</option><option>Partnership</option><option>Press</option></select>
      </label>
      <label className={`${d.field} ${d.fieldFull}`}>Type of request
        <select name="service" ref={typeRef} defaultValue="">
          <option value="">Choose one (optional)</option>
          {services.map((x) => <option key={x.slug}>{x.title}</option>)}
          <option>Something else</option>
        </select>
      </label>
      <label className={`${d.field} ${d.fieldFull}`}>Message
        <textarea name="message" ref={msgRef} placeholder="What do you need, where and when? Add your budget if you have one." required />
      </label>
      {(error || state === "error") && (
        <p role="alert" style={{ color: "#a33", fontSize: 15 }}>
          {error || "Sorry, that didn’t send. Please try again, or message us on WhatsApp."}
        </p>
      )}
      <div className={d.formFoot}>
        <span>We’ll only use your details to reply.</span>
        <Button type="submit" variant="primary" arrow disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send message"}</Button>
      </div>
    </form>
  );
}
