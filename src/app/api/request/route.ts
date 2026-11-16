import { createClient } from "@sanity/client";
import { projectId, dataset, apiVersion } from "@/sanity/env";

const FIELDS = ["form", "name", "phone", "email", "service", "subject", "when", "where", "message", "page"] as const;
const MAX: Record<string, number> = { message: 4000, page: 200 };

/**
 * Website form submissions -> a "Website request" document in Sanity (Studio → Website requests → New).
 * Uses the SANITY_WRITE_TOKEN secret (Cloudflare secret in production, .env.local / .dev.vars locally).
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
  // honeypot: real people never fill the hidden "website" field
  if (typeof body.website === "string" && body.website.trim()) return Response.json({ ok: true });

  const clean: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = body[f];
    if (typeof v === "string" && v.trim()) clean[f] = v.trim().slice(0, MAX[f] ?? 300);
  }
  if (!clean.name || !(clean.phone || clean.email)) {
    return Response.json({ ok: false, error: "Name and a phone number or email are required." }, { status: 422 });
  }

  const token = process.env.SANITY_WRITE_TOKEN;
  if (!token) return Response.json({ ok: false, error: "Not configured" }, { status: 503 });

  const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });
  await client.create({ _type: "request", status: "new", receivedAt: new Date().toISOString(), ...clean });
  return Response.json({ ok: true });
}
