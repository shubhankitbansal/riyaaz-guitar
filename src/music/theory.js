// Core music-theory helpers: note names, chord parsing, transposition, frequency math.

export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

const ALIASES = {
  Db: 'C#', 'D#': 'Eb', Gb: 'F#', Ab: 'G#', 'A#': 'Bb',
  Cb: 'B', Fb: 'E', 'E#': 'F', 'B#': 'C',
};

export function noteIndex(name) {
  if (!name) return -1;
  return NOTE_NAMES.indexOf(ALIASES[name] || name);
}

export function transposeNote(name, semitones) {
  const i = noteIndex(name);
  if (i < 0 || !semitones) return name;
  return NOTE_NAMES[(((i + semitones) % 12) + 12) % 12];
}

const CHORD_RE = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/;
const SUFFIX_RE = /^(?:maj|min|m|M|dim|aug|sus|add|\+|°|ø|\d+|[b#]\d+|\(|\))*$/;

/** Parse a chord symbol like "F#m7/C#". Returns null if it is not a chord. */
export function parseChord(token) {
  if (!token) return null;
  const m = CHORD_RE.exec(token.trim());
  if (!m || !SUFFIX_RE.test(m[2])) return null;
  return { root: m[1], suffix: m[2], bass: m[3] || null };
}

export const isChord = (token) => parseChord(token) !== null;

export function isMinorSuffix(suffix) {
  return /^m(?!aj)/.test(suffix) || suffix.startsWith('min');
}

export function transposeChord(token, semitones) {
  if (!semitones) return token;
  const c = parseChord(token);
  if (!c) return token;
  return (
    transposeNote(c.root, semitones) +
    c.suffix +
    (c.bass ? '/' + transposeNote(c.bass, semitones) : '')
  );
}

/** Map the many ways people write chord qualities onto a small canonical set. */
export function normalizeSuffix(suffix) {
  let s = suffix.replace(/[()]/g, '');
  s = s
    .replace(/^min/, 'm')
    .replace(/^M(?=\d|$)/, 'maj')
    .replace(/^\+$/, 'aug')
    .replace(/^°7?$/, (x) => (x.endsWith('7') ? 'dim7' : 'dim'))
    .replace(/^ø7?$/, 'm7b5');
  if (s === 'maj') return '';
  if (s === 'sus') return 'sus4';
  if (s === '2') return 'sus2';
  return s;
}

export function noteNameToMidi(name) {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`Bad note name: ${name}`);
  return (Number(m[2]) + 1) * 12 + noteIndex(m[1]);
}

export const midiToFreq = (midi, a4 = 440) => a4 * 2 ** ((midi - 69) / 12);

export const midiToName = (midi) =>
  NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);

export function freqToNote(freq, a4 = 440) {
  const exact = 69 + 12 * Math.log2(freq / a4);
  const midi = Math.round(exact);
  return {
    midi,
    name: NOTE_NAMES[((midi % 12) + 12) % 12],
    octave: Math.floor(midi / 12) - 1,
    cents: (exact - midi) * 100,
  };
}

export const centsBetween = (freq, ref) => 1200 * Math.log2(freq / ref);
