export default function LogoMark({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M6 14H34C44 14 44 26 34 26H22C12 26 12 38 22 38H46" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M40 50L47 57L60 42" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
