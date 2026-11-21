import { useCallback, useEffect, useRef, useState } from 'react';
import { createTicker } from './ticker';
import { strumChord, chuck, click } from './synth';
import { parsePattern } from '../music/strum';

const TICKS_PER_BEAT = 4; // the ticker always runs in sixteenths; eighth patterns act on every other tick

/**
 * Loops a strumming pattern over a chord progression for play-along practice.
 * Everything (pattern, chords, tempo, sound options) is read live, so edits apply while playing.
 *
 * pos: { step, chord, next, count } — count is the count-in beat (1…n) or 0 once playing.
 * onBar() is called each time the whole pattern has been played once.
 */
export function useStrumLoop({ pattern, chords, barsPerChord = 1, bpm, guide = true, metronome = true, countIn = false, onBar }) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(null);
  const live = useRef({});
  live.current = { p: parsePattern(pattern), chords: chords.length ? chords : ['G'], barsPerChord, bpm, guide, metronome };
  const onBarRef = useRef(onBar);
  onBarRef.current = onBar;
  const countInRef = useRef(countIn);
  countInRef.current = countIn;

  useEffect(() => {
    if (!playing) return undefined;
    const startBeats = countInRef.current ? live.current.p.beats : 0;
    let n = -startBeats * TICKS_PER_BEAT; // ticks since the pattern started (negative during count-in)
    const ticker = createTicker({
      getBpm: () => live.current.bpm,
      stepsPerBeat: TICKS_PER_BEAT,
      onStep: (_, time) => {
        const tick = n++;
        const { p, chords: list, barsPerChord: bpc, guide: g, metronome: m } = live.current;
        if (tick < 0) {
          if (tick % TICKS_PER_BEAT === 0) {
            const beat = startBeats + tick / TICKS_PER_BEAT; // 0-based
            click(time, beat === 0 ? 'accent' : 'beat');
            ticker.at(time, () => setPos({ step: -1, chord: 0, next: 0, count: beat + 1 }));
          }
          return;
        }
        const tps = TICKS_PER_BEAT / p.sub;
        if (tick % tps) return;
        const stepNo = tick / tps;
        const slot = stepNo % p.slots.length;
        const stepsPerChord = Math.max(1, Math.round(p.slots.length * bpc));
        const ci = Math.floor(stepNo / stepsPerChord) % list.length;
        const chord = list[ci];
        const s = p.slots[slot];
        if (g) {
          if (s === 'D' || s === 'U') {
            const accent = slot === 0 ? 0.4 : slot % p.sub === 0 ? 0.32 : 0.26;
            strumChord(chord, { when: time, direction: s === 'D' ? 'down' : 'up', gain: accent });
          } else if (s === 'X') chuck(time);
        }
        if (m && slot % p.sub === 0) click(time, slot === 0 ? 'accent' : 'beat');
        ticker.at(time, () => {
          setPos({ step: slot, chord: ci, next: (ci + 1) % list.length, count: 0 });
          if (slot === p.slots.length - 1) onBarRef.current?.();
        });
      },
    });
    ticker.start();
    return () => {
      ticker.stop();
      setPos(null);
    };
  }, [playing]);

  const toggle = useCallback(() => setPlaying((x) => !x), []);
  const stop = useCallback(() => setPlaying(false), []);
  return { playing, pos, toggle, stop };
}
