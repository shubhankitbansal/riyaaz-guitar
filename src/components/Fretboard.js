// Horizontal fretboard (high e string on top, like tab) with labelled note dots.

const STRING_NAMES = ['e', 'B', 'G', 'D', 'A', 'E'];

/** dots: [{ string: 1–6, fret, label, active }] */
export default function Fretboard({ dots }) {
  const used = dots.filter(Boolean);
  const fretted = used.map((d) => d.fret).filter((f) => f > 0);
  const minF = fretted.length ? Math.min(...fretted) : 1;
  const maxF = fretted.length ? Math.max(...fretted) : 4;
  const start = minF <= 4 ? 0 : minF - 1; // show the nut when the notes are near it
  const end = Math.max(start + 4, maxF);
  const open = start === 0;

  const left = open ? 44 : 30;
  const fw = 58; // fret width
  const sh = 30; // string spacing
  const top = 18;
  const width = left + (end - start) * fw + 14;
  const height = top + 5 * sh + 34;
  const y = (s) => top + (s - 1) * sh;
  const x = (f) => (f === 0 ? left - 22 : left + (f - start - 0.5) * fw);
  const marks = [3, 5, 7, 9, 15, 17].filter((f) => f > start && f <= end);

  // One dot per position, even if the note is played several times.
  const seen = new Map();
  for (const d of used) {
    const k = `${d.string}-${d.fret}`;
    const prev = seen.get(k);
    seen.set(k, prev ? { ...prev, active: prev.active || d.active } : d);
  }

  return (
    <svg className="fretboard" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Fretboard">
      {marks.map((f) => (
        <circle key={`m${f}`} cx={x(f)} cy={top + 2.5 * sh} r="5" className="fb-inlay" />
      ))}
      {open && <rect x={left - 4} y={top - 2} width="5" height={5 * sh + 4} className="fb-nut" />}
      {Array.from({ length: end - start + 1 }, (_, i) => (
        <line key={`f${i}`} x1={left + i * fw} x2={left + i * fw} y1={top} y2={top + 5 * sh} className="fb-fret" />
      ))}
      {STRING_NAMES.map((n, i) => (
        <g key={n + i}>
          <line x1={open ? left : left - 10} x2={left + (end - start) * fw} y1={y(i + 1)} y2={y(i + 1)} className="fb-string" style={{ strokeWidth: 1 + i * 0.35 }} />
          <text x={4} y={y(i + 1) + 4} className="fb-sname">
            {n}
          </text>
        </g>
      ))}
      {Array.from({ length: end - start }, (_, i) => (
        <text key={`n${i}`} x={left + (i + 0.5) * fw} y={height - 6} className="fb-fnum">
          {start + i + 1}
        </text>
      ))}
      {[...seen.values()].map((d) => (
        <g key={`${d.string}-${d.fret}`} className={`fb-dot ${d.active ? 'active' : ''} ${d.fret === 0 ? 'open' : ''}`}>
          <circle cx={x(d.fret)} cy={y(d.string)} r={d.active ? 14 : 12.5} />
          <text x={x(d.fret)} y={y(d.string) + 4}>
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
