import { OPEN_STRING_MIDI } from './chords';

// Sargam (Indian solfège). Notation used in the app:
//   S R G M P D N   shuddh swaras        r g d n   komal Re/Ga/Dha/Ni        m   tivra Ma
//   .N  = mandra (lower) octave          S'  = taar (upper) octave
// Exercises are written on scale degrees, so the same alankar works in any thaat or raga.

export const SWARAS = {
  S: { semi: 0, name: 'Sa', hi: 'सा' },
  r: { semi: 1, name: 're', hi: 'रे॒', komal: true },
  R: { semi: 2, name: 'Re', hi: 'रे' },
  g: { semi: 3, name: 'ga', hi: 'ग॒', komal: true },
  G: { semi: 4, name: 'Ga', hi: 'ग' },
  M: { semi: 5, name: 'Ma', hi: 'म' },
  m: { semi: 6, name: 'Ma′', hi: 'म॑', tivra: true },
  P: { semi: 7, name: 'Pa', hi: 'प' },
  d: { semi: 8, name: 'dha', hi: 'ध॒', komal: true },
  D: { semi: 9, name: 'Dha', hi: 'ध' },
  n: { semi: 10, name: 'ni', hi: 'नि॒', komal: true },
  N: { semi: 11, name: 'Ni', hi: 'नि' },
};

/** Scales: letters for the degrees, low to high (7 for thaats, 5 for pentatonic ragas). */
export const SCALES = [
  { id: 'bilawal', name: 'Bilawal (shuddh, like major)', notes: 'SRGMPDN' },
  { id: 'kalyan', name: 'Kalyan / Yaman (tivra Ma)', notes: 'SRGmPDN' },
  { id: 'khamaj', name: 'Khamaj (komal Ni)', notes: 'SRGMPDn' },
  { id: 'kafi', name: 'Kafi (komal Ga, Ni)', notes: 'SRgMPDn' },
  { id: 'asavari', name: 'Asavari (komal Ga, Dha, Ni)', notes: 'SRgMPdn' },
  { id: 'bhairav', name: 'Bhairav (komal Re, Dha)', notes: 'SrGMPdN' },
  { id: 'bhupali', name: 'Bhupali (5 notes: S R G P D)', notes: 'SRGPD' },
  { id: 'malkauns', name: 'Malkauns (5 notes: S g M d n)', notes: 'SgMdn' },
];

/**
 * Alankars on scale degrees (0 = Sa, 7 = taar Sa for a 7-note scale; negative = mandra).
 * `pattern` is a figure that climbs one degree at a time from Sa until it reaches taar Sa,
 * then (if `descend`) the mirror image comes back down.
 */
export const EXERCISES = [
  { id: 'aaroh', name: 'Sa Re Ga Ma Pa Dha Ni Sa′ (aaroh – avroh)', kind: 'scale' },
  { id: 'pairs', name: 'Sa Sa, Re Re, Ga Ga … (double)', pattern: [0, 0] },
  { id: 'triples', name: 'Sa Sa Sa, Re Re Re … (triple)', pattern: [0, 0, 0] },
  { id: 'two', name: 'Sa Re, Re Ga, Ga Ma …', pattern: [0, 1] },
  { id: 'three', name: 'Sa Re Ga, Re Ga Ma …', pattern: [0, 1, 2] },
  { id: 'four', name: 'Sa Re Ga Ma, Re Ga Ma Pa …', pattern: [0, 1, 2, 3] },
  { id: 'five', name: 'Sa Re Ga Ma Pa, Re Ga Ma Pa Dha …', pattern: [0, 1, 2, 3, 4] },
  { id: 'srs', name: 'Sa Re Sa, Re Ga Re …', pattern: [0, 1, 0] },
  { id: 'srgrs', name: 'Sa Re Ga Re Sa, Re Ga Ma Ga Re …', pattern: [0, 1, 2, 1, 0] },
  { id: 'srggrs', name: 'Sa Re Ga Ga Re Sa, Re Ga Ma Ma Ga Re …', pattern: [0, 1, 2, 2, 1, 0] },
  { id: 'srgr', name: 'Sa Re Ga Re, Re Ga Ma Ga …', pattern: [0, 1, 2, 1] },
  { id: 'srgmgr', name: 'Sa Re Ga Ma Ga Re, Re Ga Ma Pa Ma Ga …', pattern: [0, 1, 2, 3, 2, 1] },
  { id: 'srsrg', name: 'Sa Re Sa Re Ga, Re Ga Re Ga Ma …', pattern: [0, 1, 0, 1, 2] },
  { id: 'ssrrgg', name: 'Sa Sa Re Re Ga Ga, Re Re Ga Ga Ma Ma …', pattern: [0, 0, 1, 1, 2, 2] },
  { id: 'skip', name: 'Sa Ga, Re Ma, Ga Pa … (skip one)', pattern: [0, 2] },
  { id: 'sgrg', name: 'Sa Ga Re Ga, Re Ma Ga Ma …', pattern: [0, 2, 1, 2] },
  { id: 'srgs', name: 'Sa Ga Re Sa, Re Ma Ga Re …', pattern: [0, 2, 1, 0] },
  { id: 'jump', name: 'Sa Ma, Re Pa, Ga Dha … (skip two)', pattern: [0, 3] },
  { id: 'sa', name: 'Sa – Pa – Sa′ (tuning your ear)', kind: 'anchor' },
];

/** Exercise for a pattern the user typed. climb = repeat the figure up and down the scale like an alankar. */
export function customExercise(text, climb) {
  return { id: 'custom', name: 'custom', kind: 'custom', notes: parseSargam(text), climb };
}

const NAME_TO_LETTER = {
  sa: 'S', s: 'S', सा: 'S', re: 'R', r: 'R', रे: 'R', ga: 'G', g: 'G', ग: 'G', ma: 'M', m: 'M', म: 'M',
  pa: 'P', p: 'P', प: 'P', dha: 'D', d: 'D', ध: 'D', ni: 'N', n: 'N', नि: 'N',
};
const KOMAL = { R: 'r', G: 'g', D: 'd', N: 'n' };

/**
 * Parse typed sargam: "Sa Re Ga Ga Re Sa", "S R G M P D N S'", "सा रे ग म", ".Ni Sa Re".
 * Case doesn't matter. Komal: add k or _ (re_ / Rek / ga(k)); tivra Ma: ma# or Ma(t).
 * Taar (upper) octave: ' after the note; mandra (lower): . before it.
 */
export function parseSargam(text) {
  const out = [];
  const tokens = String(text || '')
    .replace(/[,|;]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  for (const raw of tokens) {
    const m = raw.match(/^(\.*)([^'’.()_#]+?)(\(k\)|\(t\)|_|k|#)?(['’]*)$/i);
    if (!m) continue;
    const name = m[2].toLowerCase();
    let letter = NAME_TO_LETTER[name];
    if (!letter) continue;
    const mod = (m[3] || '').toLowerCase();
    if ((mod === '_' || mod === 'k' || mod === '(k)') && KOMAL[letter]) letter = KOMAL[letter];
    if ((mod === '#' || mod === '(t)') && letter === 'M') letter = 'm';
    out.push({ letter, octave: m[4].length - m[1].length });
  }
  return out;
}

/** Plain-letter form of a note list, e.g. "S R G G R S" (for the custom-pattern box). */
export const sargamText = (notes) => notes.map((n) => swarLabel(n)).join(' ');

/** Degree index → { letter, octave } for a scale of n notes. */
export function degreeToSwar(scale, deg) {
  const n = scale.length;
  const oct = Math.floor(deg / n);
  const letter = scale[((deg % n) + n) % n];
  return { letter, octave: oct };
}

/** Build the note list for an exercise: [{ letter, octave }]. */
export function buildExercise(exercise, scaleNotes) {
  const scale = scaleNotes.split('');
  const n = scale.length;
  const top = n; // taar Sa
  const at = (deg) => degreeToSwar(scale, deg);

  if (exercise.kind === 'custom') {
    const typed = exercise.notes || [];
    if (!typed.length) return [];
    if (!exercise.climb) return typed;
    // Turn the typed figure into scale degrees, then climb it like an alankar.
    const degOf = ({ letter, octave }) => {
      let i = scale.indexOf(letter);
      if (i < 0) i = scale.findIndex((x) => x.toUpperCase() === letter.toUpperCase());
      if (i < 0) {
        // Not in this raga (e.g. Ma in Bhupali): use the nearest swar that is.
        const want = SWARAS[letter].semi;
        i = scale.reduce((best, x, k) => (Math.abs(SWARAS[x].semi - want) < Math.abs(SWARAS[scale[best]].semi - want) ? k : best), 0);
      }
      return i + n * octave;
    };
    const degs = typed.map(degOf);
    const first = degs[0];
    return buildExercise({ pattern: degs.map((d) => d - first) }, scaleNotes);
  }
  if (exercise.kind === 'anchor') {
    const pa = scale.indexOf('P');
    const mid = pa >= 0 ? pa : Math.floor(n / 2);
    return [0, mid, top, mid, 0].map(at);
  }
  if (exercise.kind === 'scale' || !exercise.pattern) {
    // Aaroh ends on taar Sa and avroh starts from it again: Sa … Ni Sa' | Sa' Ni … Sa.
    const up = Array.from({ length: n + 1 }, (_, i) => i);
    return [...up, ...[...up].reverse()].map(at);
  }
  const p = exercise.pattern;
  const span = Math.max(...p);
  const low = Math.min(0, ...p);
  const upDegs = [];
  for (let start = -low; start + span <= top; start++) p.forEach((x) => upDegs.push(start + x));
  if (upDegs[upDegs.length - 1] !== top) upDegs.push(top);
  const downDegs = [];
  for (let start = top + low; start - span >= 0; start--) p.forEach((x) => downDegs.push(start - x));
  if (downDegs[downDegs.length - 1] !== 0) downDegs.push(0);
  // Don't repeat taar Sa where the climb meets the descent.
  if (downDegs[0] === upDegs[upDegs.length - 1] && p.length === 1) downDegs.shift();
  return [...upDegs, ...downDegs].map(at);
}

/** MIDI number of a swar, given Sa's MIDI number. */
export const swarMidi = ({ letter, octave }, saMidi) => saMidi + SWARAS[letter].semi + 12 * octave;

/** Text label: "Sa", "Re", ".Ni" (mandra), "Sa'" (taar); Devanagari if hindi. */
export function swarLabel({ letter, octave }, hindi = false) {
  const base = hindi ? SWARAS[letter].hi : SWARAS[letter].name;
  if (octave < 0) return hindi ? `${base}\u0323` : `.${base}`; // dot below = mandra
  if (octave > 0) return hindi ? `${base}\u0307` : `${base}'`; // dot above = taar
  return base;
}

/** Signed cents from `freq` to the target, ignoring which octave was sung (for voices). */
export function centsToTarget(freq, targetMidi, anyOctave = true) {
  const midi = 69 + 12 * Math.log2(freq / 440);
  let diff = (midi - targetMidi) * 100;
  if (anyOctave) diff = ((((diff + 600) % 1200) + 1200) % 1200) - 600;
  return diff;
}

/** Strings (6 = low E … 1 = high e) where Sa can be fretted, with the fret, e.g. [{ string: 3, fret: 5 }]. */
export function saStringOptions(saMidi) {
  const out = [];
  for (let s = 0; s < 6; s++) {
    const fret = saMidi - OPEN_STRING_MIDI[s];
    if (fret >= 0 && fret <= 12) out.push({ string: 6 - s, fret });
  }
  return out;
}

/**
 * Positions in one hand box, starting with Sa on `saString`: every note stays within
 * one fret below to three frets above Sa's fret, on the thickest string that allows it.
 * e.g. Sa = C4 on string 3 → Sa 3·5, Re 3·7, Ga 2·5, Ma 2·6, Pa 2·8, Dha 1·5, Ni 1·7, Sa′ 1·8.
 * Returns null if Sa can't be played on that string.
 */
export function boxPositions(midis, saMidi, saString) {
  const base = saMidi - OPEN_STRING_MIDI[6 - saString];
  if (!(base >= 0 && base <= 12)) return null;
  const lo = base - 1;
  const hi = base + 3;
  return midis.map((midi) => {
    if (midi === null || midi === undefined) return null;
    let best = null;
    for (let s = 0; s < 6; s++) {
      const fret = midi - OPEN_STRING_MIDI[s];
      if (fret < 0 || fret > 17) continue;
      const inBox = (fret >= lo && fret <= hi) || (fret === 0 && base <= 3);
      const cost = inBox ? s * 0.01 : 10 + Math.min(Math.abs(fret - lo), Math.abs(fret - hi)) + s * 0.01;
      if (!best || cost < best.cost) best = { string: 6 - s, fret, cost };
    }
    return best && { string: best.string, fret: best.fret };
  });
}
