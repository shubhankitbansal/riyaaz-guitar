// Melody notation: space-separated tokens, each a note with optional length in beats.
//   E4  G4:0.5  A4:2  C#5:1.5  -  -:2      ("-" or "r" is a rest; default length is 1 beat)
//   5@1  3@2:0.5   fret@string: an exact guitar position (string 1 = high e … 6 = low E), kept in the tab
// Notes are concert pitch. melodyToTab() picks playable guitar positions automatically (unless given).

import { noteIndex, NOTE_NAMES } from './theory';
import { OPEN_STRING_MIDI } from './chords';
import { makeTab } from './tab';

const TOKEN = /^(?:([A-G][#b]?)(-?\d)|(-|r|rest))(?::(\d*\.?\d+))?$/;
const FRET_TOKEN = /^(\d{1,2})@([1-6])(?::(\d*\.?\d+))?$/;
const isToken = (t) => TOKEN.test(t) || FRET_TOKEN.test(t);

export function parseMelodyToken(tok) {
  const f = FRET_TOKEN.exec(tok);
  if (f) {
    const fret = Number(f[1]);
    const string = Number(f[2]);
    return { midi: OPEN_STRING_MIDI[6 - string] + fret, beats: f[3] ? Number(f[3]) : 1, pos: { string, fret } };
  }
  const m = TOKEN.exec(tok);
  if (!m) return null;
  const beats = m[4] ? Number(m[4]) : 1;
  if (m[3]) return { midi: null, beats };
  const idx = noteIndex(m[1]);
  if (idx < 0) return null;
  return { midi: (Number(m[2]) + 1) * 12 + idx, beats };
}

export function parseMelodyLine(line) {
  return line
    .trim()
    .split(/\s+/)
    .filter((t) => t && t !== '|')
    .map(parseMelodyToken)
    .filter(Boolean);
}

export const isMelodyLine = (line) => {
  const toks = line.trim().split(/\s+/).filter((t) => t && t !== '|');
  return toks.length > 0 && toks.every(isToken);
};

export const midiLabel = (midi) => NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);

export function noteToToken(n) {
  const len = n.beats === 1 ? '' : `:${+n.beats.toFixed(3)}`;
  if (n.pos) return `${n.pos.fret}@${n.pos.string}${len}`;
  return (n.midi === null ? '-' : midiLabel(n.midi)) + len;
}

const LOWEST = OPEN_STRING_MIDI[0];
const HIGHEST = OPEN_STRING_MIDI[5] + 15;

/** Choose a (string, fret) for every note, keeping the hand in one area of the neck. */
export function melodyPositions(notes) {
  let hand = null;
  return notes.map((n) => {
    if (n.midi === null) return null;
    let midi = n.midi;
    while (midi < LOWEST) midi += 12;
    while (midi > HIGHEST) midi -= 12;
    let best = null;
    for (let s = 0; s < 6; s++) {
      const fret = midi - OPEN_STRING_MIDI[s];
      if (fret < 0 || fret > 15) continue;
      const centre = hand ?? 2;
      // Stay near the current hand position; slight preference for open strings and lower frets.
      const cost = Math.abs((fret || centre) - centre) + (fret === 0 ? -0.3 : 0) + fret * 0.05;
      if (!best || cost < best.cost) best = { string: 6 - s, fret, cost };
    }
    if (best.fret > 0) hand = best.fret;
    return { string: best.string, fret: best.fret };
  });
}

/** ASCII tab for a melody, with a bar line every `beatsPerBar` beats. */
export function melodyToTab(notes, beatsPerBar = 4, positions = null) {
  const auto = positions || melodyPositions(notes);
  const pos = notes.map((n, i) => n.pos || auto[i]);
  const cols = [];
  let beat = 0;
  notes.forEach((n, i) => {
    if (pos[i]) cols.push([pos[i].string, pos[i].fret]);
    beat += n.beats;
    if (beat >= beatsPerBar - 1e-6 && i < notes.length - 1) {
      cols.push('|');
      beat -= beatsPerBar;
    }
  });
  return cols.length ? makeTab(cols) : '';
}

export const transposeMelody = (notes, semis) =>
  semis
    ? notes.map((n) => {
        if (n.midi === null) return n;
        const out = { ...n, midi: n.midi + semis };
        // Keep a written position on the same string when it still fits on the neck.
        if (n.pos) {
          const fret = n.pos.fret + semis;
          if (fret >= 0 && fret <= 20) out.pos = { ...n.pos, fret };
          else delete out.pos;
        }
        return out;
      })
    : notes;
