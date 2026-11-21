// Sample-accurate step scheduler (look-ahead pattern) used by the metronome and strum player.

import { getAudioContext } from './synth';

export function createTicker({ getBpm, stepsPerBeat = 1, onStep }) {
  const ac = getAudioContext();
  const timeouts = new Set();
  let timer = null;
  let nextTime = 0;
  let step = 0;

  function schedule() {
    while (nextTime < ac.currentTime + 0.12) {
      onStep(step, nextTime);
      nextTime += 60 / getBpm() / stepsPerBeat;
      step++;
    }
  }

  return {
    start() {
      if (timer) return;
      step = 0;
      nextTime = ac.currentTime + 0.06;
      schedule();
      timer = setInterval(schedule, 25);
    },
    stop() {
      clearInterval(timer);
      timer = null;
      timeouts.forEach(clearTimeout);
      timeouts.clear();
    },
    /** Run a UI callback when the audio clock reaches `time`. */
    at(time, fn) {
      const id = setTimeout(() => {
        timeouts.delete(id);
        fn();
      }, Math.max(0, (time - ac.currentTime) * 1000));
      timeouts.add(id);
    },
  };
}
