"use client";

import { useEffect, useRef } from "react";
import {
  SILK_COLORS,
  SILK_RIBBONS,
  SILK_SLICES,
  SILK_VIEW,
  silkBands,
  silkGradientShift,
  type SilkBand,
} from "@/lib/silk-weave";

const IRID_STOPS = [
  SILK_COLORS.deep,
  SILK_COLORS.violet,
  SILK_COLORS.pink,
  SILK_COLORS.yellow,
  SILK_COLORS.aqua,
  SILK_COLORS.sky,
  SILK_COLORS.lilac,
];

function stopsFor(index: number): string[] {
  const stops: string[] = [];
  for (let step = 0; step < IRID_STOPS.length; step += 1) {
    stops.push(IRID_STOPS[(index + step) % IRID_STOPS.length]);
  }
  return stops;
}

function paint(svg: SVGSVGElement, frame: SilkBand[], t: number) {
  for (const item of frame) {
    svg.querySelector(`#silk-band-${item.ribbon}`)?.setAttribute("d", item.d);
    svg.querySelector(`#silk-crease-${item.ribbon}`)?.setAttribute("d", item.crease);
    svg.querySelector(`#silk-glint-${item.ribbon}`)?.setAttribute("d", item.glint);
  }
  SILK_RIBBONS.forEach((_, index) => {
    const grad = svg.querySelector(`[data-irid="${index}"]`);
    if (!grad) return;
    const shift = silkGradientShift(index, t);
    grad.setAttribute("x1", shift.x1.toFixed(1));
    grad.setAttribute("y1", shift.y1.toFixed(1));
    grad.setAttribute("x2", shift.x2.toFixed(1));
    grad.setAttribute("y2", shift.y2.toFixed(1));
  });
}

export function WeaveSilk() {
  const svgRef = useRef<SVGSVGElement>(null);
  const still = silkBands(0);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    paint(svg, silkBands(0), 0);
    if (reduce) return;

    let raf = 0;
    let offset = 0;
    let pausedAt = 0;
    const loop = (now: number) => {
      const seconds = (now - offset) / 1000;
      paint(svg, silkBands(seconds), seconds);
      raf = window.requestAnimationFrame(loop);
    };
    const start = () => {
      raf = window.requestAnimationFrame(loop);
    };
    const onVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(raf);
        pausedAt = performance.now();
        return;
      }
      offset += performance.now() - pausedAt;
      start();
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className="weave-silk"
      viewBox={`0 0 ${SILK_VIEW.w} ${SILK_VIEW.h}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="silk-ground" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={SILK_COLORS.violet} />
          <stop offset="48%" stopColor={SILK_COLORS.lilac} />
          <stop offset="100%" stopColor={SILK_COLORS.deep} />
        </linearGradient>
        <filter id="silk-fold-shadow" x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="2.2" stdDeviation="1.5" floodColor="#3a2d78" floodOpacity="0.58" />
        </filter>
        {SILK_RIBBONS.map((ribbon, index) => (
          <linearGradient key={`fold-${ribbon.y0}`} id={`silk-fold-${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ribbon.ridge} />
            <stop offset="38%" stopColor={ribbon.body} />
            <stop offset="78%" stopColor={ribbon.hem} />
            <stop offset="100%" stopColor={SILK_COLORS.deep} />
          </linearGradient>
        ))}
        {SILK_RIBBONS.map((ribbon, index) => (
          <linearGradient
            key={`irid-${ribbon.y0}`}
            id={`silk-irid-${index}`}
            data-irid={index}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="100"
            y2="30"
          >
            {stopsFor(index).map((color, step) => (
              <stop
                key={color + step}
                offset={`${(step / (IRID_STOPS.length - 1)) * 100}%`}
                stopColor={color}
              />
            ))}
          </linearGradient>
        ))}
        {SILK_SLICES.map((slice) => (
          <clipPath key={slice.id} id={`silk-clip-${slice.id}`}>
            <polygon points={slice.points} />
          </clipPath>
        ))}
        {still.map((band) => (
          <path key={`band-${band.ribbon}`} id={`silk-band-${band.ribbon}`} d={band.d} />
        ))}
        {still.map((band) => (
          <path key={`crease-${band.ribbon}`} id={`silk-crease-${band.ribbon}`} d={band.crease} />
        ))}
        {still.map((band) => (
          <path key={`glint-${band.ribbon}`} id={`silk-glint-${band.ribbon}`} d={band.glint} />
        ))}
      </defs>
      <rect width={SILK_VIEW.w} height={SILK_VIEW.h} fill="url(#silk-ground)" />
      {SILK_SLICES.map((slice, segment) => {
        const order = SILK_RIBBONS.map((_, index) => index);
        if (segment % 2 === 1) order.reverse();
        return (
          <g key={slice.id} clipPath={`url(#silk-clip-${slice.id})`}>
            {order.map((ribbon, depth) => {
              const front = depth >= order.length - 2;
              return (
                <g key={`${slice.id}-${ribbon}`} filter={front ? "url(#silk-fold-shadow)" : undefined}>
                  <use href={`#silk-band-${ribbon}`} fill={`url(#silk-fold-${ribbon})`} />
                  <use
                    href={`#silk-band-${ribbon}`}
                    fill={`url(#silk-irid-${ribbon})`}
                    opacity="0.5"
                    style={{ mixBlendMode: "overlay" }}
                  />
                  {front ? (
                    <use
                      href={`#silk-crease-${ribbon}`}
                      fill="none"
                      stroke={SILK_COLORS.deep}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  ) : null}
                  {front ? (
                    <use
                      href={`#silk-glint-${ribbon}`}
                      fill="none"
                      stroke="rgba(255,255,255,0.55)"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      style={{ mixBlendMode: "screen" }}
                    />
                  ) : null}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
