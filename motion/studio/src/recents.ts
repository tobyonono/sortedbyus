// What you opened recently, per person: kept in this browser only (like Harvey's Recents).
// Shared activity ("an agent made this") is the Needs review list, not this.
export type RecentItem = { id: string; kind: "composition" | "reel" };

const KEY = "motion.recent.v1";
const MAX = 8;

export function readRecents(): RecentItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((r) => r && typeof r.id === "string" && (r.kind === "composition" || r.kind === "reel")) : [];
  } catch {
    return [];
  }
}

export function pushRecent(item: RecentItem): RecentItem[] {
  const next = [item, ...readRecents().filter((r) => r.id !== item.id)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private window or blocked storage: Recent falls back to last edited
  }
  return next;
}
