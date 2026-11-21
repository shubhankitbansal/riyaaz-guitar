import { useCallback, useEffect, useRef, useState } from 'react';
import { createTicker } from './ticker';
import { getAudioContext, strumChord, chuck, click, playMidi, stopVoices } from './synth';
import { transposeChord } from '../music/theory';
import { parsePattern } from '../music/strum';

/**
 * Plays a whole song arrangement: every chord event strummed with the song's pattern,
 * and/or the melody line. Reports the chord being played so the UI can highlight it.
 */
export function useSongPlayer() {
  const [state, setState] = useState({ mode: null, pos: null, count: 0 }); // mode: 'song' | 'melody' | null
  const active = useRef(null);

  const stop = useCallback(() => {
    const a = active.current;
    active.current = null;
    if (a) a.stop();
    setState({ mode: null, pos: null, count: 0 });
  }, []);

  useEffect(() => stop, [stop]);

  /** events: [{chord, beats, pos}] from buildTimeline. */
  const playSong = useCallback(
    ({ events, pattern = 'D-DU-UDU', bpm = 80, getBpm, semis = 0, countIn = 0 }) => {
      stop();
      if (!events.length) return;
      const { slots, sub } = parsePattern(pattern);
      const steps = [];
      events.forEach((ev, i) => {
        const n = Math.max(1, Math.round(ev.beats * sub)); // pattern steps (eighths or sixteenths)
        for (let k = 0; k < n; k++) steps.push({ ev: i, first: k === 0 });
      });

      const ticker = createTicker({
        getBpm: () => (getBpm ? getBpm() : bpm), // read live, so tempo can change while playing
        stepsPerBeat: sub,
        onStep: (rawStep, time) => {
          const pre = countIn * sub;
          if (rawStep < pre) {
            if (rawStep % sub === 0) {
              const beat = rawStep / sub;
              click(time, beat === 0 ? 'accent' : 'beat');
              ticker.at(time, () => active.current === handle && setState({ mode: 'song', pos: null, count: beat + 1 }));
            }
            return;
          }
          const step = rawStep - pre;
          if (step >= steps.length) {
            if (step === steps.length) ticker.at(time + 1.5, stop);
            return;
          }
          const { ev, first } = steps[step];
          const chord = transposeChord(events[ev].chord, semis);
          const s = slots[step % slots.length];
          if (s === 'D' || s === 'U') strumChord(chord, { when: time, direction: s === 'D' ? 'down' : 'up' });
          else if (s === 'X') chuck(time);
          else if (first) strumChord(chord, { when: time, gain: 0.22 }); // chord change on a rest: soft strum
          if (first) ticker.at(time, () => active.current === handle && setState({ mode: 'song', pos: events[ev].pos, count: 0 }));
        },
      });
      const handle = { stop: () => ticker.stop() };
      active.current = handle;
      setState({ mode: 'song', pos: countIn ? null : events[0].pos, count: 0 });
      ticker.start();
    },
    [stop]
  );

  /** notes: [{midi|null, beats}] */
  const playMelody = useCallback(
    ({ notes, bpm = 80, getBpm, semis = 0 }) => {
      stop();
      if (!notes.length) return;
      const ac = getAudioContext();
      const tempo = () => (getBpm ? getBpm() : bpm);
      // Schedule a little ahead at a time, reading the tempo for each note, so speed changes apply at once.
      let i = 0;
      let t = ac.currentTime + 0.1;
      const voices = [];
      let endTimer = null;
      const pump = () => {
        while (i < notes.length && t < ac.currentTime + 0.15) {
          const n = notes[i];
          const spb = 60 / tempo();
          if (n.midi !== null) {
            voices.push(playMidi(n.midi + semis, { when: t, gain: 0.55, duration: Math.max(0.3, n.beats * spb + 0.3) }));
          }
          t += n.beats * spb;
          i += 1;
        }
        if (i >= notes.length && !endTimer) {
          endTimer = setTimeout(() => active.current === handle && stop(), (t - ac.currentTime + 0.8) * 1000);
        }
      };
      const timer = setInterval(pump, 25);
      const handle = {
        stop: () => {
          clearInterval(timer);
          clearTimeout(endTimer);
          stopVoices(voices);
        },
      };
      active.current = handle;
      setState({ mode: 'melody', pos: null, count: 0 });
      pump();
    },
    [stop]
  );

  return { ...state, playSong, playMelody, stop };
}
