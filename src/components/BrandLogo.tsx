/**
 * Brand assets taken verbatim from the design bundle (`smm_rapid_logo`).
 * Mark: indigo execution-core gradient tile with the dispatch bolt.
 */

export function BrandMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  const id = 'rapid_grad';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} />
      <path d="M22 8L13 22H21L19.5 32L29 18H21L22 8Z" fill="#ffffff" />
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BrandLogo({
  size = 36,
  showTagline = false,
  className = '',
}: {
  size?: number;
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark size={size} />
      <span className="flex-col leading-tight">
        <span className="brand-wordmark text-[1.05rem] text-slate-900 dark:text-slate-200">
          SMM<span>RAPID</span>
        </span>
        {showTagline && (
          <span className="font-mono text-[0.625rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            High Velocity Core
          </span>
        )}
      </span>
    </span>
  );
}
