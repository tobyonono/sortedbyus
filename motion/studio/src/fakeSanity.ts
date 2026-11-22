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
      // the site's services (request form list)
      if (query.includes('_type == "service"')) return ["Shopping & Sourcing", "Travel & Holidays", "Gifts & Celebrations", "Home & Lifestyle", "Errands & Admin", "Events & Experiences"].map((title) => ({ _id: `service-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title }));
      const docs = [...store.values()];
      const refs = (d: Doc) => (d.screens ?? []).map((x: any) => x.composition?._ref);
      // campaigns that reference a composition or reel
      if (query.includes('_type == "campaign"') && !params.id) {
        return docs.filter((d) => d._type === "campaign").map((d) => ({ _id: d._id, title: d.title, status: d.status, motion: (d.motion ?? []).map((m: any) => m._ref) }));
      }
      if (query.includes('_type == "campaign"')) {
        const mentions = (d: Doc) => JSON.stringify(d).includes(`"${params.id}"`) || JSON.stringify(d).includes(`"${params.draft}"`);
        return docs.filter((d) => d._type === "campaign" && mentions(d)).map((d) => ({ _id: d._id, title: d.title, status: d.status }));
      }
      // which reels use a composition
      if (query.includes("references(")) {
        return docs.filter((d) => d._type === "motionReel" && refs(d).some((r: string) => r === params.id || r === params.draft)).map((d) => ({ _id: d._id, title: d.title }));
      }
      // reel list
      if (/motionReel"\] \| order\(_updatedAt desc\)$/.test(query)) return docs.filter((d) => d._type === "motionReel").map((d) => structuredClone(d));
      if (query.includes('_type == "motionReel"')) {
        return docs.filter((d) => d._type === "motionReel").map((d) => ({ _id: d._id, title: d.title, _updatedAt: d._updatedAt, screens: (d.screens ?? []).length }));
      }
      // compositions by id (reel editor) or every composition (add a screen)
      if (query.includes("_id in $ids")) return docs.filter((d) => params.ids.includes(d._id)).map((d) => structuredClone(d));
      if (query.includes('_type == "motionComposition"] | order(_updatedAt desc)`') || /motionComposition"\] \| order\(_updatedAt desc\)$/.test(query)) {
        return docs.filter((d) => d._type === "motionComposition").map((d) => structuredClone(d));
      }
      return docs
        .filter((d) => d._type === "motionComposition")
        .map((d) => ({ _id: d._id, title: d.title, template: d.template, _updatedAt: d._updatedAt, screens: (d.sortFlash?.beats ?? d.cardJourney?.stops ?? d.titleCard?.lines ?? d.photoMosaic?.tiles ?? d.wordRoll?.words ?? d.data?.beats ?? []).length || null }));
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
        set: (o: Record<string, any>) =>
          (ops.push((d) => {
            for (const [k, v] of Object.entries(o)) {
              // exports[_key=="abc"].approvedFor
              const m = /^(\w+)\[_key=="([^"]+)"\]\.(\w+)$/.exec(k);
              if (m) {
                const item = (d[m[1]] ?? []).find((x: any) => x._key === m[2]);
                if (item) item[m[3]] = v;
              } else d[k] = v;
            }
          }),
          p),
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
    observable: {
      assets: {
        upload(type: string, blob: Blob, options: { filename?: string }) {
          return {
            subscribe(observer: { next: (event: unknown) => void; error: (error: unknown) => void; complete: () => void }) {
              let closed = false;
              const cleanups: (() => void)[] = [];
              const unsubscribe = () => {
                closed = true;
                cleanups.splice(0).forEach((cleanup) => cleanup());
              };
              void client.assets.upload(type, blob, options).then((document) => {
                if (closed) return;
                observer.next({ type: "response", body: { document } });
                observer.complete();
              }, (error) => {
                if (!closed) observer.error(error);
              }).finally(unsubscribe);
              return { unsubscribe, add: (cleanup: () => void) => cleanups.push(cleanup) };
            },
          };
        },
      },
    },
  };
  return client;
}
