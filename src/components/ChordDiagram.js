import { getChordShape } from '../music/chords';
import { strumChord } from '../audio/synth';

export function ChordDiagram({ shape, size = 1 }) {
  if (!shape) return <div className="chord-missing">?</div>;
  const { frets, fingers = [], barre } = shape;
  const played = frets.filter((f) => f > 0);
  const maxF = played.length ? Math.max(...played) : 0;
  const minF = played.length ? Math.min(...played) : 1;
  const base = shape.baseFret ?? (maxF <= 5 ? 1 : minF);

  const sx = 16;
  const fy = 20;
  const left = 22;
  const top = 24;
  const nFrets = 5;
  const W = left + sx * 5 + 14;
  const H = top + fy * nFrets + 8;
  const x = (i) => left + i * sx;
  const yMid = (f) => top + (f - base + 0.5) * fy;

  return (
    <svg className="chord-svg" viewBox={`0 0 ${W} ${H}`} width={W * size} height={H * size} aria-hidden="true">
      {base === 1 ? (
        <rect x={left - 1} y={top - 4} width={sx * 5 + 2} height={4} className="nut" />
      ) : (
        <text x={left - 7} y={top + fy * 0.5 + 4} textAnchor="end" className="fret-num">
          {base}
        </text>
      )}
      {Array.from({ length: nFrets + 1 }, (_, j) => (
        <line key={`f${j}`} x1={left} x2={left + sx * 5} y1={top + j * fy} y2={top + j * fy} className="fret-line" />
      ))}
      {frets.map((_, i) => (
        <line key={`s${i}`} x1={x(i)} x2={x(i)} y1={top} y2={top + fy * nFrets} className="string-line" />
      ))}
      {frets.map((f, i) =>
        f < 0 ? (
          <text key={`m${i}`} x={x(i)} y={top - 9} textAnchor="middle" className="mute-mark">
            ×
          </text>
        ) : f === 0 ? (
          <circle key={`m${i}`} cx={x(i)} cy={top - 13} r={4} className="open-mark" />
        ) : null
      )}
      {barre && (
        <rect
          x={x(barre.from) - 7}
          y={yMid(barre.fret) - 7}
          width={x(barre.to) - x(barre.from) + 14}
          height={14}
          rx={7}
          className="dot"
        />
      )}
      {frets.map((f, i) =>
        f > 0 ? (
          <g key={`d${i}`}>
            <circle cx={x(i)} cy={yMid(f)} r={7} className="dot" />
            {fingers[i] ? (
              <text x={x(i)} y={yMid(f) + 3.5} textAnchor="middle" className="finger">
                {fingers[i]}
              </text>
            ) : null}
          </g>
        ) : null
      )}
    </svg>
  );
}

export function ChordCard({ name, shape: custom, label, size = 1 }) {
  const shape = custom || getChordShape(name);
  return (
    <button
      type="button"
      className="chord-card"
      onClick={() => shape && strumChord(shape)}
      title={`Play ${label || name}`}
    >
      <span className="chord-name">
        {label || name}
        {shape?.approx && (
          <sup title="Simplified voicing" className="approx">
            *
          </sup>
        )}
      </span>
      <ChordDiagram shape={shape} size={size} />
    </button>
  );
}
