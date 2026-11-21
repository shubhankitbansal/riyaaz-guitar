// Turn a parsed song into a playable timeline of chord events.
// Rules: every chord in a lyric line gets one bar; a chord-bar line "| C | G Am |" gives one bar
// per cell, split evenly between the chords in it; "%" repeats the previous bar.

import { isChord } from './theory';

/** Position key shared by SongBody (rendering) and the player (highlighting). */
export const lyricPos = (si, li, segIdx) => `${si}-${li}-${segIdx}`;
export const barPos = (si, li, bi, ti) => `${si}-${li}-${bi}-${ti}`;

export function buildTimeline(sections, beatsPerBar = 4) {
  const events = [];
  sections.forEach((sec, si) => {
    if (sec.isTab || sec.isMelody) return;
    sec.lines.forEach((ln, li) => {
      if (ln.type === 'lyric') {
        ln.segments.forEach((seg, gi) => {
          if (seg.chord && isChord(seg.chord)) events.push({ chord: seg.chord, beats: beatsPerBar, pos: lyricPos(si, li, gi) });
        });
      } else if (ln.type === 'bars') {
        ln.bars.forEach((bar, bi) => {
          const chords = bar.map((tok, ti) => ({ tok, ti })).filter(({ tok }) => isChord(tok));
          if (!chords.length) {
            if (bar.includes('%') && events.length) {
              const prev = events[events.length - 1];
              events.push({ chord: prev.chord, beats: beatsPerBar, pos: prev.pos });
            }
            return;
          }
          const each = beatsPerBar / chords.length;
          chords.forEach(({ tok, ti }) => events.push({ chord: tok, beats: each, pos: barPos(si, li, bi, ti) }));
        });
      }
    });
  });
  return events;
}

/** All melody notes in the song, in order. */
export function collectMelody(sections) {
  return sections.filter((s) => s.isMelody).flatMap((s) => s.lines.filter((l) => l.type === 'melody').flatMap((l) => l.notes));
}

export const timelineSeconds = (events, bpm) => (events.reduce((a, e) => a + e.beats, 0) * 60) / bpm;
