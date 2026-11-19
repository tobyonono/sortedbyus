/**
 * A script that runs while the browser parses the HTML, before the first paint (next/script's beforeInteractive
 * only queues it until Next's JavaScript loads, which is after paint). On the client it renders as text/plain,
 * so React doesn't warn about rendering a <script>; suppressHydrationWarning accepts the type difference.
 */
export default function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
