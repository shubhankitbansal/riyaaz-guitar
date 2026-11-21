import { useCallback, useEffect, useRef, useState } from 'react';
import { TUNINGS } from '../data/tunings';
import { detectPitch, median, rmsOf } from '../audio/pitch';
import { getAudioContext, playFreq } from '../audio/synth';
import { midiToFreq, noteNameToMidi, freqToNote, centsBetween } from '../music/theory';
import { useLocalStorage } from '../hooks';
import { APP_PAUSE_EVENT } from '../native';
import { useT } from '../i18n';

const IN_TUNE_CENTS = 5;
const HOLD_MS = 700; // stay in the green zone this long to tick a string
const STALE_MS = 1500; // dim the reading after this much silence
const HISTORY = 7; // median filter length (frames)
const FAR_CENTS = 450; // further than this from every string = not an open string
const ATTACK_MS = 70; // a fresh pluck rings sharp for a moment: skip it
const REF_MUTE_MS = 1600; // ignore the mic while our own reference note plays

/** Short two-tone chime when a string is in tune (high enough that the tuner ignores it). */
function chime() {
  const ac = getAudioContext();
  const t0 = ac.currentTime;
  [2093, 2637].forEach((f, i) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t0 + i * 0.09);
    g.gain.linearRampToValueAtTime(0.12, t0 + i * 0.09 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.09 + 0.35);
    o.connect(g).connect(ac.destination);
    o.start(t0 + i * 0.09);
    o.stop(t0 + i * 0.09 + 0.4);
  });
  try {
    navigator.vibrate?.(35);
  } catch {
    /* no vibration */
  }
}

function nearestString(freq, targets) {
  let best = 0;
  let bestDist = Infinity;
  targets.forEach((t, i) => {
    const d = Math.abs(centsBetween(freq, t));
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

function polar(cents, r) {
  const a = ((cents / 50) * 60 * Math.PI) / 180;
  return [150 + r * Math.sin(a), 150 - r * Math.cos(a)];
}

function arcPath(from, to, r) {
  const [x1, y1] = polar(from, r);
  const [x2, y2] = polar(to, r);
  return `M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`;
}

function Gauge({ cents, active }) {
  const c = Math.max(-50, Math.min(50, cents ?? 0));
  const state = !active ? 'idle' : Math.abs(c) < IN_TUNE_CENTS ? 'good' : Math.abs(c) < 15 ? 'close' : 'off';
  const ticks = [];
  for (let v = -50; v <= 50; v += 5) {
    const inner = v % 25 === 0 ? 100 : v % 10 === 0 ? 106 : 111;
    const [x1, y1] = polar(v, 120);
    const [x2, y2] = polar(v, inner);
    ticks.push(<line key={v} x1={x1} y1={y1} x2={x2} y2={y2} className={v === 0 ? 'tick zero' : 'tick'} />);
  }
  const labels = [-50, -25, 0, 25, 50].map((v) => {
    const [lx, ly] = polar(v, 86);
    return (
      <text key={v} x={lx} y={ly + 4} textAnchor="middle" className="gauge-label">
        {v > 0 ? `+${v}` : v}
      </text>
    );
  });
  return (
    <svg viewBox="0 0 300 165" className={`gauge ${state}`} aria-hidden="true">
      <path d={arcPath(-50, 50, 130)} className="gauge-track" />
      <path d={arcPath(-IN_TUNE_CENTS, IN_TUNE_CENTS, 130)} className="gauge-zone" />
      {ticks}
      {labels}
      <g
        className="needle"
        style={{
          transform: `rotate(${active ? (c / 50) * 60 : 0}deg)`,
          transformOrigin: '150px 150px',
          transformBox: 'view-box',
          opacity: active ? 1 : 0.25,
        }}
      >
        <line x1="150" y1="150" x2="150" y2="34" />
        <circle cx="150" cy="150" r="8" />
      </g>
    </svg>
  );
}

export default function Tuner() {
  const t = useT();
  const [tuningId, setTuningId] = useLocalStorage('riyaaz.tuning', 'standard');
  const [a4, setA4] = useLocalStorage('riyaaz.a4', 440);
  const tuning = TUNINGS.find((x) => x.id === tuningId) || TUNINGS[0];
  const targets = tuning.notes.map((n) => midiToFreq(noteNameToMidi(n), a4));
  const plain = (i) => tuning.notes[i].replace(/\d/, '');

  const [mode, setMode] = useState('auto'); // 'auto' or string index 0..5
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(null);
  const [level, setLevel] = useState(0);
  const [quiet, setQuiet] = useState(false);
  const [tuned, setTuned] = useState(() => Array(6).fill(false));
  const [autoNext, setAutoNext] = useLocalStorage('riyaaz.tuner.autoNext', true);
  const [sound, setSound] = useLocalStorage('riyaaz.tuner.chime', true);

  const live = useRef(null);
  const cfg = useRef({});
  cfg.current = { mode, targets, a4, autoNext, sound };

  useEffect(() => {
    setTuned(Array(6).fill(false));
    if (live.current) live.current.done = {};
  }, [tuningId, a4]);
  useEffect(() => {
    if (live.current) {
      live.current.history = [];
      live.current.idx = null;
      live.current.cents = null;
    }
  }, [mode, tuningId]);

  const stop = useCallback(() => {
    const l = live.current;
    if (l) {
      cancelAnimationFrame(l.raf);
      l.stream.getTracks().forEach((tr) => tr.stop());
      l.source.disconnect();
    }
    live.current = null;
    setListening(false);
    setReading(null);
    setLevel(0);
    setQuiet(false);
  }, []);

  useEffect(() => {
    // Release the microphone when the app is backgrounded (Android) or the screen unmounts.
    window.addEventListener(APP_PAUSE_EVENT, stop);
    return () => {
      window.removeEventListener(APP_PAUSE_EVENT, stop);
      stop();
    };
  }, [stop]);

  const start = async () => {
    setError('');
    // Create/resume the audio context inside the tap, before the permission prompt.
    const ac = getAudioContext();
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t('tuner.errInsecure'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      if (ac.state !== 'running') await ac.resume();
      const source = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 4096;
      source.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      const l = {
        stream, source, raf: 0, history: [], idx: null, cents: null,
        noise: 0.003, peak: 0, prevRms: 0, skipUntil: 0, lastHeard: performance.now(), lastUi: 0, holdIdx: -1, holdSince: 0, stale: false,
      };
      live.current = l;
      setListening(true);

      const tick = () => {
        if (live.current !== l) return;
        analyser.getFloatTimeDomainData(buf);
        const now = performance.now();
        const rms = rmsOf(buf);

        // Adaptive noise floor: falls instantly, rises slowly. Only analyse clearly-louder sound.
        l.noise = rms < l.noise ? rms : l.noise * 1.004 + 1e-7;
        // Track the loudness of the current note; a new pluck raises it instantly, it decays slowly.
        l.peak = Math.max(rms, l.peak * 0.993);
        // Ignore the noisy tail of a dying note (below ~-24 dB of its peak) and anything near the noise floor.
        const gate = Math.max(0.0012, l.noise * 2.5, l.peak * 0.06);
        // A new pluck: its first few milliseconds are sharp and noisy, and the old note's readings no longer apply.
        if (rms > gate && rms > l.prevRms * 1.8 + 0.002) {
          l.skipUntil = Math.max(l.skipUntil, now + ATTACK_MS);
          l.history = [];
        }
        l.prevRms = rms;
        const { mode: m0, targets: tg0 } = cfg.current;
        // Locked to one string: only look for pitches near it, so overtones can't fool the tuner.
        const range = m0 === 'auto' ? { minFreq: 60, maxFreq: 1100 } : { minFreq: tg0[m0] / 1.5, maxFreq: tg0[m0] * 1.5 };
        const res = rms > gate && now >= l.skipUntil ? detectPitch(buf, ac.sampleRate, { minRms: 0, ...range }) : null;

        if (now - l.lastUi > 90) {
          l.lastUi = now;
          setLevel(Math.max(0, Math.min(1, (Math.log10(rms + 1e-6) + 3.3) / 2.6)));
          setQuiet(now - l.lastHeard > 4000);
        }

        if (res && res.confidence > 0.72 && res.freq > 60 && res.freq < 1100) {
          l.history.push(res.freq);
          if (l.history.length > HISTORY) l.history.shift();
          const f = median(l.history);
          const { mode: m, targets: tg, a4: ref } = cfg.current;

          let idx = m === 'auto' ? nearestString(f, tg) : m;
          // Hysteresis: don't jump to a neighbouring string on a borderline reading.
          if (m === 'auto' && l.idx !== null && idx !== l.idx) {
            const cur = Math.abs(centsBetween(f, tg[l.idx]));
            const next = Math.abs(centsBetween(f, tg[idx]));
            if (cur - next < 60) idx = l.idx;
          }
          const raw = centsBetween(f, tg[idx]);
          l.cents = l.idx === idx && l.cents !== null && Math.abs(raw - l.cents) < 30 ? l.cents * 0.6 + raw * 0.4 : raw;
          l.idx = idx;
          l.lastHeard = now;
          l.stale = false;

          const far = m === 'auto' && Math.abs(l.cents) > FAR_CENTS;
          if (!far && Math.abs(l.cents) < IN_TUNE_CENTS) {
            if (l.holdIdx !== idx) {
              l.holdIdx = idx;
              l.holdSince = now;
            } else if (now - l.holdSince > HOLD_MS && !l.done?.[idx]) {
              l.done = { ...l.done, [idx]: true };
              if (cfg.current.sound) chime();
              setTuned((tu) => {
                const next = tu.map((v, i) => (i === idx ? true : v));
                // Locked mode: move on to the next string that still needs tuning.
                if (cfg.current.autoNext && m !== 'auto') {
                  const order = [0, 1, 2, 3, 4, 5];
                  const nextIdx = order.find((i) => i > idx && !next[i]) ?? order.find((i) => !next[i]);
                  if (nextIdx !== undefined) {
                    setTimeout(() => {
                      l.skipUntil = performance.now() + 500; // let the tuned string fade first
                      setMode(nextIdx);
                    }, 900);
                  }
                }
                return next;
              });
            }
          } else {
            l.holdIdx = -1;
          }
          setReading({ freq: f, idx, cents: l.cents, far, stale: false, note: freqToNote(f, ref) });
        } else if (!l.stale && now - l.lastHeard > STALE_MS) {
          // Keep the last reading on screen (dimmed) so the player can see where the string ended.
          l.stale = true;
          l.history = [];
          l.holdIdx = -1;
          setReading((r) => (r ? { ...r, stale: true } : r));
        }
        l.raf = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      setError(e.name === 'NotAllowedError' ? t('tuner.errDenied') : t('tuner.errGeneric', { msg: e.message }));
    }
  };

  const live_ = reading && !reading.stale;
  const activeIdx = reading ? reading.idx : mode === 'auto' ? null : mode;
  const cents = reading?.cents;
  const good = live_ && !reading.far && Math.abs(cents) < IN_TUNE_CENTS;

  let status = t('tuner.idle');
  if (listening && (!reading || reading.stale)) {
    status = mode === 'auto' ? t('tuner.pluckAny') : t('tuner.pluckString', { n: 6 - mode, note: plain(mode) });
  }
  if (live_) {
    status = reading.far ? t('tuner.farOff') : good ? t('tuner.inTune') : cents < 0 ? t('tuner.tooLow') : t('tuner.tooHigh');
  }

  // While our own reference note plays, the mic would hear it and "tune" the string by itself.
  const muteMic = (ms) => {
    if (live.current) {
      live.current.skipUntil = performance.now() + ms;
      live.current.history = [];
    }
  };

  const pickString = (i) => {
    setMode(i);
    muteMic(REF_MUTE_MS);
    playFreq(targets[i], { gain: 0.6 });
  };

  const playAll = () => {
    const ac = getAudioContext();
    muteMic(REF_MUTE_MS + 3000);
    targets.forEach((f, i) => playFreq(f, { when: ac.currentTime + i * 0.6, gain: 0.55, duration: 1.4 }));
  };

  const resetTuned = () => {
    setTuned(Array(6).fill(false));
    if (live.current) live.current.done = {};
  };
  const allTuned = tuned.every(Boolean);

  const peg = (i) => (
    <button
      key={i}
      type="button"
      className={`peg ${activeIdx === i ? 'active' : ''} ${tuned[i] ? 'tuned' : ''}`}
      onClick={() => pickString(i)}
      title={`${6 - i}: ${tuning.notes[i]}`}
    >
      <span className="peg-note">{plain(i)}</span>
      <span className="peg-num">{tuned[i] ? '✓' : 6 - i}</span>
      {activeIdx === i && live_ && !reading.far && !good && (
        <span className={`peg-turn ${cents < 0 ? 'up' : 'down'}`}>{cents < 0 ? '↑' : '↓'}</span>
      )}
    </button>
  );

  return (
    <div className="page tuner">
      <header className="page-head">
        <h1>{t('tuner.title')}</h1>
        <p>{t('tuner.subtitle')}</p>
      </header>

      <div className="toolbar">
        <label className="field">
          <span>{t('tuner.tuning')}</span>
          <select value={tuningId} onChange={(e) => setTuningId(e.target.value)}>
            {TUNINGS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>{t('tuner.a4')}</span>
          <div className="stepper">
            <button type="button" onClick={() => setA4((v) => Math.max(430, v - 1))} aria-label="−">−</button>
            <span>{a4} Hz</span>
            <button type="button" onClick={() => setA4((v) => Math.min(450, v + 1))} aria-label="+">+</button>
          </div>
        </div>
      </div>

      <section className={`card tuner-display ${good ? 'is-good' : ''}`}>
        <div className="target-label">
          {activeIdx !== null && activeIdx !== undefined
            ? t('tuner.target', { n: 6 - activeIdx, note: tuning.notes[activeIdx], hz: targets[activeIdx].toFixed(1) })
            : t('tuner.auto')}
        </div>
        <Gauge cents={reading?.far ? 0 : cents} active={!!live_ && !reading.far} />
        <div className={`readout ${reading?.stale ? 'stale' : ''}`}>
          <span className={`big-note ${reading ? '' : 'placeholder'}`}>
            {reading ? reading.note.name : '–'}
            {reading && <sub>{reading.note.octave}</sub>}
          </span>
          <span className="cents-value">
            {reading && !reading.far ? t('tuner.cents', { c: `${cents > 0 ? '+' : ''}${cents.toFixed(0)}` }) : ' '}
          </span>
        </div>
        <div className={`status ${good ? 'good' : live_ ? 'off' : ''}`}>{status}</div>
        <div className="freq">{reading ? `${reading.freq.toFixed(1)} Hz` : ' '}</div>
        {listening && (
          <div className="level-row" aria-label={t('tuner.level')}>
            <span className="muted small">{t('tuner.level')}</span>
            <div className="level-bar">
              <span style={{ width: `${level * 100}%` }} />
            </div>
          </div>
        )}
        {listening && quiet && <div className="muted small quiet-hint">{t('tuner.quiet')}</div>}
      </section>

      <section className="headstock-wrap" aria-label="Strings">
        <div className="peg-col">{[2, 1, 0].map(peg)}</div>
        <div className="headstock">
          <div className="headstock-logo">RIYAAZ</div>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`hs-string ${activeIdx === i ? 'active' : ''}`} style={{ left: `${22 + i * 11.2}%` }} />
          ))}
        </div>
        <div className="peg-col">{[3, 4, 5].map(peg)}</div>
      </section>

      <div className="actions">
        <button type="button" className="btn primary big" onClick={listening ? stop : start}>
          {listening ? `■ ${t('tuner.stop')}` : `🎙 ${t('tuner.start')}`}
        </button>
        <button type="button" className={`chip ${mode === 'auto' ? 'on' : ''}`} onClick={() => setMode('auto')}>
          {t('tuner.autoDetect')}
        </button>
        <button type="button" className="chip" onClick={playAll}>
          ♪ {t('tuner.playAll')}
        </button>
        <button type="button" className={`chip ${autoNext ? 'on' : ''}`} onClick={() => setAutoNext((v) => !v)}>
          ⏭ {t('tuner.autoNext')}
        </button>
        <button type="button" className={`chip ${sound ? 'on' : ''}`} onClick={() => setSound((v) => !v)}>
          🔔 {t('tuner.chime')}
        </button>
        <button type="button" className="chip" onClick={resetTuned}>
          {t('tuner.reset')}
        </button>
      </div>
      {allTuned && <div className="alert good-alert">{t('tuner.allTuned')}</div>}

      {error && <div className="alert">{error}</div>}

      <section className="card tips">
        <h3>{t('tuner.tipsTitle')}</h3>
        <ul>
          <li>{t('tuner.tip1')}</li>
          <li>{t('tuner.tip2')}</li>
          <li>{t('tuner.tip3')}</li>
          <li>{t('tuner.tip4')}</li>
        </ul>
      </section>
    </div>
  );
}
