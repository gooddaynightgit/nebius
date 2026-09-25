/** Flowing silk behind the weaving messages. The still image lives on the card itself. */
export function WeaveSilk() {
  return (
    <div className="weave-silk weave-silk--flow" aria-hidden="true">
      <svg className="weave-silk__defs" width="0" height="0" focusable="false">
        <filter
          id="weave-silk-displace"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.005"
            numOctaves="2"
            seed="2"
            result="silkNoise"
          >
            <animate
              attributeName="baseFrequency"
              dur="28s"
              values="0.004;0.0075;0.004"
              calcMode="spline"
              keyTimes="0;0.5;1"
              keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="silkNoise"
            scale="32"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      <div className="weave-silk__motion">
        <div className="weave-silk__sheet" />
      </div>
    </div>
  );
}
