const SILK_LAYERS = [1, 2, 3, 4] as const;

/** Full-viewport silk photos. Motion is CSS only, so mobile GPUs never facet the image. */
export function WeavePhotos() {
  return (
    <div className="weave-photos" aria-hidden="true">
      {SILK_LAYERS.map((layer) => (
        <picture key={layer} className={`weave-photos__layer weave-photos__layer--${layer}`}>
          <source srcSet={`/weave-silk-${layer}.webp`} type="image/webp" />
          <img src={`/weave-silk-${layer}.jpg`} alt="" draggable={false} />
        </picture>
      ))}
      <div className="weave-photos__glow" />
    </div>
  );
}
