// Dev-only stand-in for the Sanity client, so the harness can exercise the
// full studio (list, drafts, links, export link, publish) without a login.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = Record<string, any> & { _id: string };

export function fakeSanity(seed: Doc[]) {
  const store = new Map<string, Doc>(seed.map((d) => [d._id, { _updatedAt: new Date().toISOString(), ...d }]));
  const touch = (d: Doc) => ((d._updatedAt = new Date().toISOString()), d);
  const client = {
    store,
    async fetch(query: string, params: Record<string, any> = {}) {
      if (query.includes('"exports"')) {
        const d = store.get(params.id);
        return d ? { exports: (d.exports ?? []).map((e: any) => ({ ...e, url: e.file?.asset?._ref, size: 1_000_000 })) } : null;
      }
      if (query.includes("sanity.imageAsset")) return [];
      return [...store.values()]
        .filter((d) => d._type === "motionComposition")
        .map((d) => ({ _id: d._id, title: d.title, template: d.template, _updatedAt: d._updatedAt, screens: (d.sortFlash?.beats ?? d.cardJourney?.stops ?? d.data?.beats ?? []).length }));
    },
    async getDocument(id: string) {
      const d = store.get(id);
      return d ? structuredClone(d) : undefined;
    },
    async create(doc: Doc) {
      const id = `c${Math.random().toString(36).slice(2, 8)}`;
      store.set(id, touch({ ...doc, _id: id }));
      return store.get(id);
    },
    patch(id: string) {
      const ops: ((d: Doc) => void)[] = [];
      const p = {
        set: (o: object) => (ops.push((d) => Object.assign(d, o)), p),
        unset: (keys: string[]) => (ops.push((d) => keys.forEach((k) => delete d[k])), p),
        setIfMissing: (o: Record<string, any>) => (ops.push((d) => Object.keys(o).forEach((k) => (d[k] ??= o[k]))), p),
        append: (k: string, items: any[]) => (ops.push((d) => (d[k] = [...(d[k] ?? []), ...items])), p),
        commit: async () => {
          const d = store.get(id)!;
          ops.forEach((f) => f(d));
          return touch(d);
        },
      };
      return p;
    },
    transaction() {
      const ops: (() => void)[] = [];
      const t = {
        createOrReplace: (doc: Doc) => (ops.push(() => store.set(doc._id, touch({ ...doc }))), t),
        delete: (id: string) => (ops.push(() => store.delete(id)), t),
        commit: async () => ops.forEach((f) => f()),
      };
      return t;
    },
    assets: {
      async upload(_type: string, blob: Blob, opts: { filename?: string }) {
        return { _id: `file-${opts.filename}`, url: URL.createObjectURL(blob), size: blob.size };
      },
    },
  };
  return client;
}
