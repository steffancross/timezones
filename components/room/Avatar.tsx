// Initials avatar with a stable per-participant hue, so two same-named people
// read as distinct. The hue derivation matches RecoveryPicker (spec 2); the
// oklch lightness/chroma mirror the design mock's `.av`.

const SIZES = {
  sm: 'size-5 text-[9px]',
  md: 'size-[26px] text-[10.5px]',
  lg: 'size-[34px] text-[13px]',
} as const;

/** Stable hue [0,360) from a participant id. */
export function hueFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

interface Props {
  id: string;
  name: string;
  size?: keyof typeof SIZES;
}

export function Avatar({ id, name, size = 'md' }: Props) {
  const h = hueFor(id);
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full border font-mono font-semibold ${SIZES[size]}`}
      style={{
        color: `oklch(0.3 0.04 ${h})`,
        background: `oklch(0.9 0.045 ${h})`,
        borderColor: `oklch(0.8 0.05 ${h})`,
      }}
    >
      {initials(name)}
    </span>
  );
}
