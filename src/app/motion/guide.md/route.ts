import { motionGuideMarkdown } from "@/lib/motion-guide";

export const dynamic = "force-static";

/** /motion/guide.md: how an AI agent makes and renders motion studio videos. Generated from the templates. */
export function GET() {
  return new Response(motionGuideMarkdown(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}
