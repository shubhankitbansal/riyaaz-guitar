import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext } from './synth';
import { detectPitch, median, rmsOf } from './pitch';

/**
 * Live pitch from the microphone for singing/playing practice.
 * `latest` (a ref) is updated every animation frame: { freq|null, rms, time }.
 * `reading` (state) is the same, throttled for display.
 */
export function useMicPitch() {
  const [on, setOn] = useState(false);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(null);
  const latest = useRef({ freq: null, rms: 0, time: 0 });
  const live = useRef(null);

  const stop = useCallback(() => {
    const l = live.current;
    live.current = null;
    if (l) {
      cancelAnimationFrame(l.raf);
      l.stream.getTracks().forEach((tr) => tr.stop());
      l.source.disconnect();
    }
    latest.current = { freq: null, rms: 0, time: 0 };
    setReading(null);
    setOn(false);
  }, []);

  const start = useCallback(async () => {
    setError('');
    if (live.current) return true;
    const ac = getAudioContext();
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('unsupported');
      return false;
    }
    try {
      // Echo cancellation lets the phone ignore its own speaker (the guide notes) as much as it can.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
      });
      const source = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 4096;
      source.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      const l = { stream, source, raf: 0, noise: 0.003, peak: 0, hist: [], lastUi: 0 };
      const tick = (now) => {
        analyser.getFloatTimeDomainData(buf);
        const rms = rmsOf(buf);
        l.noise = rms < l.noise ? rms : l.noise * 1.004 + 1e-7;
        l.peak = Math.max(rms, l.peak * 0.993);
        const gate = Math.max(0.0015, l.noise * 2.5, l.peak * 0.08);
        const res = rms > gate ? detectPitch(buf, ac.sampleRate, { minRms: 0, minFreq: 70, maxFreq: 1100 }) : null;
        if (res && res.confidence >= 0.75) {
          l.hist.push(res.freq);
          if (l.hist.length > 5) l.hist.shift();
        } else l.hist = [];
        const freq = l.hist.length >= 3 ? median(l.hist) : null;
        latest.current = { freq, rms, time: now };
        if (now - l.lastUi > 70) {
          l.lastUi = now;
          setReading({ freq, rms });
        }
        l.raf = requestAnimationFrame(tick);
      };
      l.raf = requestAnimationFrame(tick);
      live.current = l;
      setOn(true);
      return true;
    } catch {
      setError('denied');
      return false;
    }
  }, []);

  useEffect(() => stop, [stop]);
  return { on, error, reading, latest, start, stop };
}
