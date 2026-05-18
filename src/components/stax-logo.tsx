type Props = {
  size?: number;
  className?: string;
};

/**
 * Stax app mark — three stacked plates inside a rounded square.
 * Pure SVG, no external deps. Drops directly into PWA icon paths
 * once we wire next-pwa.
 */
export function StaxLogo({ size = 96, className }: Props) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Stax"
    >
      <rect x="0" y="0" width="200" height="200" rx="36" fill="#0B0F14" />
      <rect x="68" y="56" width="64" height="20" rx="6" fill="#C8FF3E" />
      <rect x="54" y="88" width="92" height="20" rx="6" fill="#C8FF3E" />
      <rect x="40" y="120" width="120" height="20" rx="6" fill="#C8FF3E" />
    </svg>
  );
}
