/** Wide silk ribbons for the weaving screen. Coordinates are a 100×180 viewBox. */

export const SILK_VIEW = { w: 100, h: 180 } as const;

export const SILK_COLORS = {
  lilac: "#C9B6F2",
  pink: "#F4B8E4",
  violet: "#A98BF0",
  aqua: "#9FE6EE",
  sky: "#B7DDFB",
  yellow: "#FFF1A8",
  deep: "#7E6FD6",
} as const;

export type SilkRibbon = {
  y0: number;
  slope: number;
  amp1: number;
  freq1: number;
  phase1: number;
  speed1: number;
  amp2: number;
  freq2: number;
  phase2: number;
  speed2: number;
  drift: number;
  width: number;
  ridge: string;
  body: string;
  hem: string;
};

/** Eight wide folds. Speeds are incommensurate so the loop never shows a seam. */
export const SILK_RIBBONS: SilkRibbon[] = [
  { y0: 8, slope: 0.22, amp1: 16, freq1: 0.052, phase1: 0.4, speed1: 0.37, amp2: 5.5, freq2: 0.12, phase2: 1.1, speed2: 0.63, drift: 0.17, width: 40, ridge: SILK_COLORS.yellow, body: SILK_COLORS.pink, hem: SILK_COLORS.lilac },
  { y0: 32, slope: -0.26, amp1: 14, freq1: 0.046, phase1: 2.2, speed1: 0.29, amp2: 6, freq2: 0.1, phase2: 0.3, speed2: 0.71, drift: 0.21, width: 44, ridge: SILK_COLORS.pink, body: SILK_COLORS.lilac, hem: SILK_COLORS.violet },
  { y0: 54, slope: 0.14, amp1: 15, freq1: 0.06, phase1: 1.3, speed1: 0.44, amp2: 4.5, freq2: 0.15, phase2: 2.4, speed2: 0.58, drift: 0.19, width: 38, ridge: SILK_COLORS.aqua, body: SILK_COLORS.sky, hem: SILK_COLORS.lilac },
  { y0: 78, slope: -0.18, amp1: 13, freq1: 0.041, phase1: 3.4, speed1: 0.33, amp2: 7, freq2: 0.09, phase2: 0.8, speed2: 0.66, drift: 0.15, width: 46, ridge: SILK_COLORS.violet, body: SILK_COLORS.pink, hem: SILK_COLORS.deep },
  { y0: 100, slope: 0.2, amp1: 16, freq1: 0.057, phase1: 0.9, speed1: 0.41, amp2: 5, freq2: 0.13, phase2: 1.7, speed2: 0.52, drift: 0.24, width: 42, ridge: SILK_COLORS.yellow, body: SILK_COLORS.aqua, hem: SILK_COLORS.sky },
  { y0: 124, slope: -0.12, amp1: 12, freq1: 0.049, phase1: 4.1, speed1: 0.27, amp2: 6.5, freq2: 0.11, phase2: 2.8, speed2: 0.74, drift: 0.2, width: 40, ridge: SILK_COLORS.sky, body: SILK_COLORS.lilac, hem: SILK_COLORS.violet },
  { y0: 146, slope: 0.24, amp1: 14, freq1: 0.044, phase1: 1.8, speed1: 0.48, amp2: 4, freq2: 0.14, phase2: 0.6, speed2: 0.6, drift: 0.16, width: 44, ridge: SILK_COLORS.pink, body: SILK_COLORS.yellow, hem: SILK_COLORS.lilac },
  { y0: 168, slope: -0.2, amp1: 15, freq1: 0.053, phase1: 5.2, speed1: 0.35, amp2: 5.5, freq2: 0.1, phase2: 3.3, speed2: 0.69, drift: 0.23, width: 42, ridge: SILK_COLORS.aqua, body: SILK_COLORS.violet, hem: SILK_COLORS.deep },
];

const SAMPLES = 16;

export type SilkBand = {
  ribbon: number;
  d: string;
  crease: string;
  glint: string;
};

/** Slanted slices. Odd slices flip paint order so ribbons pass over, then under. */
export const SILK_SLICES = [
  { id: "s0", points: "-30,-60 26,-60 8,240 -42,240" },
  { id: "s1", points: "6,-60 44,-60 56,240 12,240" },
  { id: "s2", points: "30,-60 66,-60 80,240 38,240" },
  { id: "s3", points: "54,-60 90,-60 104,240 62,240" },
  { id: "s4", points: "78,-60 118,-60 132,240 88,240" },
  { id: "s5", points: "104,-60 150,-60 160,240 114,240" },
] as const;

type Sample = { x: number; y: number; nx: number; ny: number };

function centerY(ribbon: SilkRibbon, x: number, t: number): number {
  return (
    ribbon.y0 +
    ribbon.slope * (x - 50) +
    Math.sin(t * ribbon.drift + ribbon.phase1) * 7 +
    ribbon.amp1 * Math.sin(ribbon.freq1 * x + ribbon.phase1 + t * ribbon.speed1) +
    ribbon.amp2 * Math.sin(ribbon.freq2 * x + ribbon.phase2 + t * ribbon.speed2)
  );
}

function samplesFor(ribbon: SilkRibbon, t: number): Sample[] {
  const pts: Sample[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const x = -16 + (132 * i) / (SAMPLES - 1);
    const y = centerY(ribbon, x, t);
    const y2 = centerY(ribbon, x + 1, t);
    const dx = 1;
    const dy = y2 - y;
    const len = Math.hypot(dx, dy) || 1;
    pts.push({ x, y, nx: -dy / len, ny: dx / len });
  }
  return pts;
}

function fmt(n: number): string {
  return n.toFixed(1);
}

function edge(points: Array<[number, number]>, move: boolean): string {
  let d = `${move ? "M" : "L"} ${fmt(points[0][0])} ${fmt(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const c = points[i];
    const n = points[i + 1];
    d += ` Q ${fmt(c[0])} ${fmt(c[1])} ${fmt((c[0] + n[0]) / 2)} ${fmt((c[1] + n[1]) / 2)}`;
  }
  const last = points[points.length - 1];
  d += ` L ${fmt(last[0])} ${fmt(last[1])}`;
  return d;
}

function band(pts: Sample[], half: number): string {
  const top = pts.map((p) => [p.x + p.nx * half, p.y + p.ny * half] as [number, number]);
  const bot = pts.map((p) => [p.x - p.nx * half, p.y - p.ny * half] as [number, number]).reverse();
  return `${edge(top, true)} ${edge(bot, false)} Z`;
}

function strokeAlong(pts: Sample[], offset: number): string {
  const line = pts.map((p) => [p.x + p.nx * offset, p.y + p.ny * offset] as [number, number]);
  return edge(line, true);
}

/** One continuous band per ribbon. Slices in the component pass them over and under. */
export function silkBands(t: number): SilkBand[] {
  return SILK_RIBBONS.map((ribbon, ribbonIndex) => {
    const pts = samplesFor(ribbon, t);
    const half = ribbon.width / 2;
    return {
      ribbon: ribbonIndex,
      d: band(pts, half),
      crease: strokeAlong(pts, -half * 0.78),
      glint: strokeAlong(pts, half * 0.46),
    };
  });
}

/** Slow iridescent slide. Sine keeps the gradient from popping when it would wrap. */
export function silkGradientShift(index: number, t: number): { x1: number; y1: number; x2: number; y2: number } {
  const slide = Math.sin(t * 0.23 + index * 0.8) * 42;
  const tilt = Math.sin(t * 0.14 + index * 1.3) * 28;
  return {
    x1: -30 + slide,
    y1: 10 + tilt,
    x2: 90 + slide,
    y2: 36 - tilt,
  };
}
