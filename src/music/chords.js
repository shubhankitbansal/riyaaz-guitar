// Chord shapes: a hand-written table of open chords, plus movable E-shape / A-shape
// barre templates so that ANY chord (including transposed ones) gets a playable diagram.
// Strings are indexed 0 = low E (6th string) ... 5 = high e (1st string).

import { parseChord, noteIndex, normalizeSuffix, NOTE_NAMES } from './theory';

export const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64];
const X = -1;

const OPEN = {
  C: { frets: [X, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  Cmaj7: { frets: [X, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
  C7: { frets: [X, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  Cadd9: { frets: [X, 3, 2, 0, 3, 0], fingers: [0, 2, 1, 0, 3, 0] },
  Csus4: { frets: [X, 3, 3, 0, 1, 1], fingers: [0, 3, 4, 0, 1, 1] },
  D: { frets: [X, X, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  Dm: { frets: [X, X, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  D7: { frets: [X, X, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  Dmaj7: { frets: [X, X, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 1, 1] },
  Dm7: { frets: [X, X, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1] },
  Dsus2: { frets: [X, X, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 3, 0] },
  Dsus4: { frets: [X, X, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4] },
  E: { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  E7: { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  Em7: { frets: [0, 2, 2, 0, 3, 0], fingers: [0, 1, 2, 0, 3, 0] },
  Emaj7: { frets: [0, 2, 1, 1, 0, 0], fingers: [0, 3, 1, 2, 0, 0] },
  Esus4: { frets: [0, 2, 2, 2, 0, 0], fingers: [0, 2, 3, 4, 0, 0] },
  E5: { frets: [0, 2, 2, X, X, X], fingers: [0, 2, 3, 0, 0, 0] },
  Fmaj7: { frets: [X, X, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  G7: { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  Gmaj7: { frets: [3, 2, 0, 0, 0, 2], fingers: [3, 2, 0, 0, 0, 1] },
  A: { frets: [X, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  Am: { frets: [X, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  A7: { frets: [X, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
  Am7: { frets: [X, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
  Amaj7: { frets: [X, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0] },
  Asus2: { frets: [X, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0] },
  Asus4: { frets: [X, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0] },
  A5: { frets: [X, 0, 2, 2, X, X], fingers: [0, 0, 1, 2, 0, 0] },
  B7: { frets: [X, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
};

// Movable templates: offsets relative to the root fret (X = muted).
const E_SHAPES = {
  '': { o: [0, 2, 2, 1, 0, 0], f: [1, 3, 4, 2, 1, 1] },
  m: { o: [0, 2, 2, 0, 0, 0], f: [1, 3, 4, 1, 1, 1] },
  7: { o: [0, 2, 0, 1, 0, 0], f: [1, 3, 1, 2, 1, 1] },
  m7: { o: [0, 2, 0, 0, 0, 0], f: [1, 3, 1, 1, 1, 1] },
  maj7: { o: [0, X, 1, 1, 0, X], f: [1, 0, 3, 4, 2, 0] },
  sus4: { o: [0, 2, 2, 2, 0, 0], f: [1, 2, 3, 4, 1, 1] },
  '7sus4': { o: [0, 2, 0, 2, 0, 0], f: [1, 3, 1, 4, 1, 1] },
  5: { o: [0, 2, 2, X, X, X], f: [1, 3, 4, 0, 0, 0] },
};

const A_SHAPES = {
  '': { o: [X, 0, 2, 2, 2, 0], f: [0, 1, 3, 3, 3, 1] },
  m: { o: [X, 0, 2, 2, 1, 0], f: [0, 1, 3, 4, 2, 1] },
  7: { o: [X, 0, 2, 0, 2, 0], f: [0, 1, 3, 1, 4, 1] },
  m7: { o: [X, 0, 2, 0, 1, 0], f: [0, 1, 3, 1, 2, 1] },
  maj7: { o: [X, 0, 2, 1, 2, 0], f: [0, 1, 3, 2, 4, 1] },
  sus2: { o: [X, 0, 2, 2, 0, 0], f: [0, 1, 3, 4, 1, 1] },
  sus4: { o: [X, 0, 2, 2, 3, 0], f: [0, 1, 2, 3, 4, 1] },
  add9: { o: [X, 0, 2, 4, 2, 0], f: [0, 1, 2, 4, 3, 1] },
  dim: { o: [X, 0, 1, 2, 1, X], f: [0, 1, 2, 4, 3, 0] },
  m7b5: { o: [X, 0, 1, 0, 1, X], f: [0, 1, 3, 2, 4, 0] },
  6: { o: [X, 0, 2, 2, 2, 2], f: [0, 1, 3, 3, 3, 3] },
  5: { o: [X, 0, 2, 2, X, X], f: [0, 1, 3, 4, 0, 0] },
};

// Qualities we have no template for fall back to the closest simpler chord.
const FALLBACK = {
  aug: '', 9: '7', 11: '7', 13: '7', m9: 'm7', m11: 'm7', m6: 'm',
  mmaj7: 'm', dim7: 'dim', add11: '', '7b9': '7', '7#9': '7', maj9: 'maj7',
};

function fromTemplate(rootFret, tpl) {
  const frets = tpl.o.map((o) => (o === X ? X : rootFret + o));
  const barreStrings = tpl.o
    .map((o, i) => (o === 0 && tpl.f[i] === 1 ? i : -1))
    .filter((i) => i >= 0);
  const barre =
    barreStrings.length > 1
      ? { fret: rootFret, from: barreStrings[0], to: barreStrings[barreStrings.length - 1] }
      : null;
  return { frets, fingers: tpl.f, barre };
}

function generate(rootIdx, suffix) {
  const candidates = [];
  for (const [shapes, openIdx] of [[E_SHAPES, 4], [A_SHAPES, 9]]) {
    const tpl = shapes[suffix];
    if (!tpl) continue;
    let rf = (rootIdx - openIdx + 12) % 12;
    if (rf === 0) rf = 12;
    candidates.push({ rf, tpl });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.rf - b.rf);
  return fromTemplate(candidates[0].rf, candidates[0].tpl);
}

const cache = new Map();

/** Return a chord shape { frets, fingers, barre, approx } for any chord name, or null. */
export function getChordShape(name) {
  if (cache.has(name)) return cache.get(name);
  const c = parseChord(name);
  if (!c) return null;
  const rootIdx = noteIndex(c.root);
  const root = NOTE_NAMES[rootIdx];
  let suffix = normalizeSuffix(c.suffix);
  let approx = false;

  let shape = OPEN[root + suffix] || generate(rootIdx, suffix);
  if (!shape) {
    approx = true;
    suffix = FALLBACK[suffix] ?? (/^m(?!aj)/.test(suffix) ? 'm' : '');
    shape = OPEN[root + suffix] || generate(rootIdx, suffix);
  }
  const result = shape ? { ...shape, approx: approx || !!c.bass } : null;
  cache.set(name, result);
  return result;
}

export function shapeToMidi(shape) {
  return shape.frets
    .map((f, i) => (f < 0 ? null : OPEN_STRING_MIDI[i] + f))
    .filter((m) => m !== null);
}

export function chordNoteNames(shape) {
  const seen = [];
  for (const m of shapeToMidi(shape)) {
    const n = NOTE_NAMES[m % 12];
    if (!seen.includes(n)) seen.push(n);
  }
  return seen;
}
