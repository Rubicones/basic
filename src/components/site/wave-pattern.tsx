/**
 * The brand's ribbon motif, revealed behind the photograph as the card opens.
 *
 * The reference drew three fixed strokes and used them on every card, so a grid
 * of eighteen showed the same wallpaper eighteen times — the giveaway that the
 * decoration was printed rather than made. Here each card draws its own: the
 * strokes enter at different heights, bend by different amounts, leave at
 * different angles, and the whole set sits at a slightly different tilt.
 *
 * The variation is seeded from the product's slug, so it is stable. The same card
 * looks the same on every render and on both sides of hydration — random here
 * means "unlike its neighbours", not "different each time you look".
 */

const VIEWBOX = 400;
const CENTRE = VIEWBOX / 2;

/**
 * Half the card's diagonal, plus room for the blur. The ribbons are drawn in a
 * centred space and then rotated, so they have to be long enough to still cross
 * the card at any angle — otherwise a rotation of 40° leaves a bare corner.
 */
const REACH = 340;

export function WavePattern({ seed }: { seed: string }) {
  const random = mulberry32(hash(seed));

  // The whole set turns. Before this every card ran lower-left to upper-right,
  // which is what made eighteen different drawings still look like one stencil.
  const angle = random() * 360;
  const id = `wave-${hash(seed).toString(36)}`;

  /* The gap between ribbons, and where the middle one sits relative to centre.
     Kept close to the stroke width on purpose: the reference's ribbons nearly
     touched, and the blur smeared the three into one wash rather than leaving
     three stripes with cream between them. */
  const gap = 62 + random() * 24;
  const drift = (random() - 0.5) * 120;

  const strokes = [-1, 0, 1].map((band) => {
    // Drawn as a band running left to right through the centred space; the angle
    // is applied to the group, so this stays one simple shape to reason about.
    const offset = band * gap + drift + (random() - 0.5) * 34;
    const y0 = offset + (random() - 0.5) * 40;
    const y1 = offset + (random() - 0.5) * 40;

    // Two bends, opposed, so one ribbon is lazy and the next is eager.
    const bend1 = (random() - 0.5) * 150;
    const bend2 = (random() - 0.5) * 150;

    return {
      d:
        `M${-REACH} ${round(y0)} ` +
        `C${round(-REACH * 0.45)} ${round(y0 + bend1)}, ` +
        `${round(-REACH * 0.1)} ${round(offset - bend1 * 0.5)}, ` +
        `${round(REACH * 0.15)} ${round(offset)} ` +
        `S${round(REACH * 0.6)} ${round(offset + bend2)}, ` +
        `${REACH} ${round(y1)}`,
      width: 62 + random() * 18,
      opacity: 0.36 + random() * 0.16,
    };
  });

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Per-card id. The reference hardcoded one, so eighteen cards declared
            eighteen filters with the same name and every one of them resolved to
            whichever happened to be first in the document. */}
        {/* Room for the blur to spread: at stdDeviation 18 a region of 200% clips
            the softest part of the edge and gives the ribbon a visible boundary. */}
        <filter id={id} x="-75%" y="-75%" width="250%" height="250%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>
      <g className="wave-drift">
        <g transform={`translate(${CENTRE} ${CENTRE}) rotate(${round(angle)})`}>
          {strokes.map((stroke) => (
            <path
              key={stroke.d}
              d={stroke.d}
              fill="none"
              stroke="currentColor"
              strokeWidth={round(stroke.width)}
              strokeLinecap="round"
              opacity={round(stroke.opacity, 2)}
              filter={`url(#${id})`}
            />
          ))}
        </g>
      </g>
    </svg>
  );
}

const round = (value: number, places = 1) => Number(value.toFixed(places));

/** FNV-1a. Short, stable, and no dependency for what is decoration. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/** Mulberry32: one seeded generator, so the same slug always draws the same card. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
