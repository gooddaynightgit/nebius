const BUBBLE_COUNT = 3;
const DROP_COUNT = 7;

/** Rising bubbles from the weaving loader. Three bubbles, seven drops each. */
export function WeaveBubbles() {
  return (
    <div className="weave-bubbles" aria-hidden="true">
      {Array.from({ length: BUBBLE_COUNT }, (_, bubble) => (
        <div className="weave-bubbles__bubble" key={bubble}>
          {Array.from({ length: DROP_COUNT }, (_, drop) => (
            <div className="weave-bubbles__drop" key={drop} />
          ))}
        </div>
      ))}
    </div>
  );
}
