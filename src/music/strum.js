// Strumming patterns.
//
// A pattern string lists one symbol per step: D = down strum, U = up strum,
// X = muted chuck, - = rest. Plain strings use eighth-note steps (2 per beat),
// e.g. "D-DU-UDU" is one 4/4 bar. A "16:" prefix switches to sixteenth-note
// steps (4 per beat), e.g. "16:D-DU-UDUD-DU-UDU".

export const STRUM_SYMBOLS = ['D', 'U', 'X', '-'];
export const MAX_STEPS = 32;

/** Parse a pattern string into { sub, slots, beats }. Unknown characters are dropped. */
export function parsePattern(str) {
  let s = String(str || '').trim();
  let sub = 2;
  const m = s.match(/^(8|16)\s*:/);
  if (m) {
    sub = m[1] === '16' ? 4 : 2;
    s = s.slice(m[0].length);
  }
  const slots = cleanSlots(s).slice(0, MAX_STEPS);
  if (!slots.length) return { sub: 2, slots: ['D', '-', 'D', 'U', '-', 'U', 'D', 'U'], beats: 4 };
  while (slots.length % sub) slots.push('-');
  return { sub, slots, beats: slots.length / sub };
}

/** Normalise what a person types: arrows, lower case and dots are accepted; spaces and bar lines ignored. */
export function cleanSlots(text) {
  const out = [];
  for (const ch of String(text)) {
    const c = ch.toUpperCase();
    if (c === 'D' || ch === '↓') out.push('D');
    else if (c === 'U' || ch === '↑') out.push('U');
    else if (c === 'X' || ch === '✕' || ch === '×' || c === 'M') out.push('X');
    else if (ch === '-' || ch === '.' || ch === '_' || ch === '0') out.push('-');
  }
  return out;
}

export function formatPattern({ sub, slots }) {
  const body = slots.join('');
  return sub === 4 ? `16:${body}` : body;
}

/** Next symbol when a slot is tapped: D → U → X → rest → D. */
export function nextSymbol(s) {
  return STRUM_SYMBOLS[(STRUM_SYMBOLS.indexOf(s) + 1) % STRUM_SYMBOLS.length];
}

/** Resize a pattern to a new beat count / subdivision, keeping what fits. */
export function reshapePattern({ sub, slots }, beats, newSub = sub) {
  let src = slots;
  if (newSub !== sub) {
    // 8ths → 16ths: put each eighth on the even sixteenth. 16ths → 8ths: keep the on-eighth steps.
    src = newSub > sub ? slots.flatMap((s) => [s, '-']) : slots.filter((_, i) => i % 2 === 0);
  }
  const n = Math.min(MAX_STEPS, beats * newSub);
  const out = src.slice(0, n);
  while (out.length < n) out.push('-');
  return { sub: newSub, slots: out, beats: n / newSub };
}

/** Count label for a step: 1 & 2 & … for eighths, 1 e & a … for sixteenths. */
export function stepLabel(i, sub) {
  const beat = Math.floor(i / sub) + 1;
  const k = i % sub;
  if (k === 0) return String(beat);
  if (sub === 2) return '&';
  return ['', 'e', '&', 'a'][k];
}

export const PRESET_PATTERNS = [
  { id: 'p-common', name: 'Classic pop / Keherwa feel', pattern: 'D-DU-UDU' },
  { id: 'p-downs', name: 'All downs (beginner)', pattern: 'D-D-D-D-' },
  { id: 'p-dudu', name: 'Steady down-ups', pattern: 'DUDUDUDU' },
  { id: 'p-busy', name: 'Busy pop', pattern: 'D-DUDUDU' },
  { id: 'p-chuck1', name: 'Chuck basics (D X D X)', pattern: 'D-X-D-X-' },
  { id: 'p-chuck2', name: 'Chuck + up (D XU D XU)', pattern: 'D-XUD-XU' },
  { id: 'p-chuck', name: 'Percussive with chucks', pattern: 'D-XU-UXU' },
  { id: 'p-ballad', name: 'Slow ballad', pattern: 'D---D-DU' },
  { id: 'p-offbeat', name: 'Off-beat (reggae)', pattern: '-U-U-U-U' },
  { id: 'p-waltz', name: '3/4 waltz', pattern: 'D-DUDU' },
  { id: 'p-dadra', name: 'Dadra 6/8 (bhajan, ghazal)', pattern: 'D-UD-U' },
  { id: 'p-funk', name: '16th groove', pattern: '16:D-DU-UDUD-DU-UDU' },
];

/** Split "G D Em C" / "G | D | Em C" into chord names. */
export function parseProgression(text) {
  return String(text || '')
    .split(/[\s,|]+/)
    .map((c) => c.trim())
    .filter(Boolean);
}
