/**
 * The brand's ribbon motif, revealed behind the photograph as the card opens.
 *
 * Three broad blurred strokes running from the lower left to the upper right,
 * exactly as the reference drew them. The drift is CSS (`wave-drift`), driven by
 * the card's open state rather than by a prop, so this stays a server component
 * with no JavaScript of its own.
 */

const WAVES = [
  "M-90 500 C 30 450 72 350 190 285 S 355 150 485 34",
  "M-145 420 C -8 378 48 278 164 214 S 338 78 460 -42",
  "M-210 325 C -65 300 14 208 125 143 S 286 22 420 -105",
];

export function WavePattern() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="wave-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <g className="wave-drift">
        {WAVES.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth={46}
            strokeLinecap="round"
            opacity={0.44}
            filter="url(#wave-soft)"
          />
        ))}
      </g>
    </svg>
  );
}
