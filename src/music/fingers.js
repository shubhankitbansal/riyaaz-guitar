// Left-hand finger exercises. Every exercise is generated for a hand position (the fret where
// finger 1 sits), so the same drill can be played anywhere on the neck and "climbed" up it.
// Strings: 1 = high e … 6 = low E. Fingers: 1 = index … 4 = little finger.
// tech: 'h' = hammer-on, 'p' = pull-off (don't pick that note).

import { OPEN_STRING_MIDI } from './chords';

const DOWN = [6, 5, 4, 3, 2, 1]; // low E → high e (moving "down" towards the floor)
const UP = [1, 2, 3, 4, 5, 6];

const note = (string, pos, finger, extra = 0, tech) => ({ string, fret: pos + finger - 1 + extra, finger, ...(tech ? { tech } : {}) });

/** One finger order on every string, low E → high e, then the reverse order back up. */
function acrossStrings(order, pos) {
  const out = [];
  DOWN.forEach((s) => order.forEach((f) => out.push(note(s, pos, f))));
  const back = [...order].reverse();
  UP.forEach((s) => back.forEach((f) => out.push(note(s, pos, f))));
  return out;
}

export const FINGER_EXERCISES = [
  {
    id: 'chromatic',
    name: '1-2-3-4 chromatic (the classic warm-up)',
    tip: 'One finger per fret. Keep each finger down until the next one has played, and keep your thumb behind the neck.',
    build: (pos) => acrossStrings([1, 2, 3, 4], pos),
  },
  {
    id: 'p1324',
    name: '1-3-2-4 (finger independence)',
    tip: 'Skipping a finger trains each finger to move on its own. Go slowly; accuracy before speed.',
    build: (pos) => acrossStrings([1, 3, 2, 4], pos),
  },
  {
    id: 'p1423',
    name: '1-4-2-3',
    tip: 'The jump from 1 to 4 is a stretch: let the wrist relax, don’t squeeze the neck.',
    build: (pos) => acrossStrings([1, 4, 2, 3], pos),
  },
  {
    id: 'p2413',
    name: '2-4-1-3',
    tip: 'A hard one for coordination. Say the finger numbers out loud while you play.',
    build: (pos) => acrossStrings([2, 4, 1, 3], pos),
  },
  {
    id: 'p4321',
    name: '4-3-2-1 (reverse chromatic)',
    tip: 'Place all four fingers first, then lift them one by one: 4, 3, 2, 1.',
    build: (pos) => acrossStrings([4, 3, 2, 1], pos),
  },
  {
    id: 'spider',
    name: 'Spider walk (two strings at a time)',
    tip: 'Fingers 1 and 3 on one string, 2 and 4 on the next. Only one finger moves at a time — like a spider walking.',
    build: (pos) => {
      const out = [];
      for (let s = 6; s >= 2; s--) {
        out.push(note(s, pos, 1), note(s - 1, pos, 2), note(s, pos, 3), note(s - 1, pos, 4));
      }
      for (let s = 1; s <= 5; s++) {
        out.push(note(s, pos, 4), note(s + 1, pos, 3), note(s, pos, 2), note(s + 1, pos, 1));
      }
      return out;
    },
  },
  {
    id: 'skip',
    name: 'String skipping (1-2-3-4, skip a string)',
    tip: 'Strings 6-4-5-3-4-2-3-1. Mute the strings you skip with the side of your picking hand.',
    build: (pos) => {
      const order = [6, 4, 5, 3, 4, 2, 3, 1];
      const out = [];
      order.forEach((s) => [1, 2, 3, 4].forEach((f) => out.push(note(s, pos, f))));
      [...order].reverse().forEach((s) => [4, 3, 2, 1].forEach((f) => out.push(note(s, pos, f))));
      return out;
    },
  },
  {
    id: 'legato',
    name: 'Hammer-ons & pull-offs (legato)',
    tip: 'Pick only the first note on each string. Hammer the next fingers down hard (h); flick off sideways to pull off (p).',
    build: (pos) => {
      const out = [];
      DOWN.forEach((s) => {
        out.push(note(s, pos, 1), note(s, pos, 2, 0, 'h'), note(s, pos, 3, 0, 'h'), note(s, pos, 4, 0, 'h'));
      });
      UP.forEach((s) => {
        out.push(note(s, pos, 4), note(s, pos, 3, 0, 'p'), note(s, pos, 2, 0, 'p'), note(s, pos, 1, 0, 'p'));
      });
      return out;
    },
  },
  {
    id: 'trills',
    name: 'Finger pairs (trills on the G string)',
    tip: 'Each pair four times: 1-2, 2-3, 3-4, 1-3, 2-4, 1-4. The weak pairs (3-4) need the most work.',
    build: (pos) => {
      const pairs = [
        [1, 2],
        [2, 3],
        [3, 4],
        [1, 3],
        [2, 4],
        [1, 4],
      ];
      const out = [];
      pairs.forEach(([a, b]) => {
        for (let k = 0; k < 4; k++) out.push(note(3, pos, a), note(3, pos, b, 0, 'h'));
      });
      return out;
    },
  },
  {
    id: 'stairs',
    name: 'Diagonal staircase',
    tip: 'One finger per string, moving across the neck: 1 on the low E, 2 on A, 3 on D, 4 on G — then the next step.',
    build: (pos) => {
      const out = [];
      [6, 5, 4].forEach((top) => [0, 1, 2, 3].forEach((k) => out.push(note(top - k, pos, k + 1))));
      [1, 2, 3].forEach((top) => [0, 1, 2, 3].forEach((k) => out.push(note(top + k, pos, 4 - k))));
      return out;
    },
  },
  {
    id: 'stretch',
    name: 'Wide stretch (frets 1-3-5-6 shape)',
    tip: 'Best played higher up first (5th fret or above), then move down as your hand opens up. Stop if it hurts.',
    minPos: 3,
    build: (pos) => {
      const shape = [0, 2, 4, 5];
      const out = [];
      DOWN.forEach((s) => shape.forEach((d, i) => out.push({ string: s, fret: pos + d, finger: i + 1 })));
      UP.forEach((s) => [...shape].reverse().forEach((d, i) => out.push({ string: s, fret: pos + d, finger: 4 - i })));
      return out;
    },
  },
];

/** Highest fret the exercise reaches above its position (to keep climbing on the neck). */
export const spanOf = (notes, pos) => Math.max(...notes.map((n) => n.fret)) - pos;

export function buildFingerExercise(id, pos) {
  const ex = FINGER_EXERCISES.find((e) => e.id === id) || FINGER_EXERCISES[0];
  return ex.build(Math.max(ex.minPos || 1, pos));
}

export const fingerMidi = (n) => OPEN_STRING_MIDI[6 - n.string] + n.fret;

/** Columns for makeTab(): legato notes are written "h6" / "p5". */
export const fingerTabColumns = (notes, perBar = 8) => {
  const cols = [];
  notes.forEach((n, i) => {
    if (i && i % perBar === 0) cols.push('|');
    cols.push([n.string, `${n.tech || ''}${n.fret}`]);
  });
  return cols;
};
