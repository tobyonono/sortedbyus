// Reading compositions from Sanity, shared by the composition editor and reels.
import { compositionSource, normalise, templateField, type BaseData, type PlayableSource } from "../../engine";
import { templateById } from "./templates";

export type Doc = { _id: string; title: string; template: string; data: BaseData };
export type StoredDoc = Pick<Doc, "_id" | "title" | "template"> & Record<string, unknown>;

export const baseId = (id: string) => id.replace(/^drafts\./, "");
export const isDraft = (id: string) => id.startsWith("drafts.");

/** A stored composition with its data repaired against the current template. */
export function readComposition(doc: StoredDoc): Doc {
  const template = templateById(doc.template);
  // Older compositions stored every template under `data`.
  const stored = doc[templateField(doc.template)] ?? doc.data;
  return { _id: doc._id, title: doc.title, template: doc.template, data: template ? normalise(template, stored) : (stored as BaseData) };
}

/** The composition's playable source, or null for an unknown template. */
export function sourceOf(doc: Doc): PlayableSource | null {
  const template = templateById(doc.template);
  return template ? compositionSource(template, doc.data) : null;
}

/** Keep one document per composition, preferring the draft (agents and unpublished edits). */
export function preferDrafts<T extends { _id: string }>(docs: T[]): Map<string, T> {
  const byBase = new Map<string, T>();
  for (const d of docs) {
    const key = baseId(d._id);
    if (!byBase.has(key) || isDraft(d._id)) byBase.set(key, d);
  }
  return byBase;
}

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "video";
