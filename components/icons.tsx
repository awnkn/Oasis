/**
 * Shared icon set — governed by design-system/oasis/MASTER.md §6.
 *
 * No emoji, and no typographic glyphs standing in for icons. Every icon is a
 * 24x24 outline drawn with currentColor at 1.6 stroke, so it inherits text
 * colour and stays visually consistent with the display type.
 *
 * Icons are decorative by default (aria-hidden). When an icon is the only
 * content of a control, label the control, not the icon.
 */

export type IconProps = {
  className?: string;
  /** Set when the icon carries meaning no adjacent text conveys. */
  title?: string;
};

function base(title?: string) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...(title ? { role: "img" as const } : { "aria-hidden": true }),
  };
}

function Svg({
  className = "h-4 w-4",
  title,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg {...base(title)} className={className}>
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function ArrowRight(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 12h15" />
      <path d="M13 6l6 6-6 6" />
    </Svg>
  );
}

export function ArrowLeft(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </Svg>
  );
}

export function ArrowUpRight(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 17L17 7" />
      <path d="M8 7h9v9" />
    </Svg>
  );
}

export function Check(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 12.5l5 5 10-11" />
    </Svg>
  );
}

export function CheckCircle(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.2l2.3 2.3 4.7-4.8" />
    </Svg>
  );
}

export function Calendar(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3.5v3M16 3.5v3" />
    </Svg>
  );
}

export function MapPin(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </Svg>
  );
}

export function Ticket(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h14a1.5 1.5 0 0 1 1.5 1.5v2a2.2 2.2 0 0 0 0 3v2A1.5 1.5 0 0 1 19 17H5a1.5 1.5 0 0 1-1.5-1.5v-2a2.2 2.2 0 0 0 0-3z" />
      <path d="M14 7.5v9" strokeDasharray="1.6 2.2" />
    </Svg>
  );
}

/** Replaces the flower emoji used on gentle notes. */
export function Blossom(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="2.1" />
      <path d="M12 9.9c0-2.2.9-3.9 2-3.9s2 1.2 2 2.7-1.6 2.6-4 3.3" />
      <path d="M14.1 12c2.2 0 3.9.9 3.9 2s-1.2 2-2.7 2-2.6-1.6-3.3-4" />
      <path d="M12 14.1c0 2.2-.9 3.9-2 3.9s-2-1.2-2-2.7 1.6-2.6 4-3.3" />
      <path d="M9.9 12c-2.2 0-3.9-.9-3.9-2s1.2-2 2.7-2 2.6 1.6 3.3 4" />
    </Svg>
  );
}

/** Replaces the sparkle emoji used on optional flourish fields. */
export function Sparkle(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4l1.7 4.8L18.5 10.5 13.7 12.2 12 17l-1.7-4.8L5.5 10.5l4.8-1.7z" />
      <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </Svg>
  );
}

/** Separator between inline facts. Replaces the four-pointed star glyph. */
export function Diamond(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z" />
    </Svg>
  );
}

export function SortAscending(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </Svg>
  );
}

export function SortDescending(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 5v14" />
      <path d="M6 13l6 6 6-6" />
    </Svg>
  );
}

export function SortNone(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 10l4-4 4 4" />
      <path d="M8 14l4 4 4-4" />
    </Svg>
  );
}

export function Whatsapp(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 11.5a7.9 7.9 0 0 1-11.9 6.8L4 19.5l1.3-3.9A7.9 7.9 0 1 1 20 11.5z" />
      <path d="M9.2 9.1c.3-.7.6-.7.9-.7h.6c.2 0 .4.1.6.6l.6 1.4c.1.2 0 .4-.1.5l-.4.5c-.1.2-.2.3 0 .6a5.4 5.4 0 0 0 2.4 2.1c.3.1.4 0 .6-.1l.5-.6c.2-.2.3-.1.5 0l1.3.7c.2.1.4.2.4.4s0 .8-.3 1.1a2 2 0 0 1-1.5.6c-1 0-2.7-.7-4-2a8 8 0 0 1-2.2-3.4 2.5 2.5 0 0 1 .1-2.1z" />
    </Svg>
  );
}
