import type { ReactNode } from "react";

type Name =
  | "ledger"
  | "target"
  | "scale"
  | "brackets"
  | "route"
  | "pin"
  | "lock"
  | "settings"
  | "left"
  | "right"
  | "menu"
  | "close"
  | "search"
  | "plus"
  | "spark";

const paths: Record<Name, ReactNode> = {
  ledger: (
    <>
      <path d="M4.5 4.5A1.5 1.5 0 0 1 6 3h13v16H6a1.5 1.5 0 0 0 0 3h13" />
      <path d="M8 7h6M8 10.5h4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4v16M6 20h12M4 9h16" />
      <path d="M7 9l-3 6h6L7 9ZM17 9l-3 6h6l-3-6Z" />
    </>
  ),
  brackets: (
    <>
      <path d="M8 4H4v16h4M16 4h4v16h-4" />
      <path d="M9 12h6" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3" />
      <path d="M14 6h4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>
  ),
  left: <path d="m14 6-6 6 6 6" />,
  right: <path d="m10 6 6 6-6 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  spark: <path d="M12 3v4M12 17v4M4.5 12h4M15.5 12h4M6.7 6.7l2.8 2.8M14.5 14.5l2.8 2.8M17.3 6.7l-2.8 2.8M9.5 14.5l-2.8 2.8" />,
};

export function Icon({
  name,
  size = 16,
  className,
}: {
  name: Name;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="4.5" y="9" width="14" height="14" rx="4" />
      <rect x="13.5" y="9" width="14" height="14" rx="4" />
      <path d="M11 16h10" />
    </svg>
  );
}
