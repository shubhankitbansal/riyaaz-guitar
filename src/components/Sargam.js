import { useEffect, useMemo, useRef, useState } from 'react';
import { NOTE_NAMES } from '../music/theory';
import { SCALES, EXERCISES, buildExercise, customExercise, swarMidi, swarLabel, centsToTarget, saStringOptions, boxPositions } from '../music/sargam';
import Fretboard from './Fretboard';
import { melodyPositions, melodyToTab, midiLabel } from '../music/melody';
import { createTicker } from '../audio/ticker';
import { getAudioContext, playMidi, click } from '../audio/synth';
import { useMicPitch } from '../audio/useMicPitch';
import { useLocalStorage } from '../hooks';
import { APP_PAUSE_EVENT } from '../native';
import { useI18n } from '../i18n';

const OCTAVES = [
  [2, 'sargam.low'],
  [3, 'sargam.mid'],
  [4, 'sargam.high'],
];
const IN_TUNE = 35; // cents
const HOLD_MS = 250; // how long you must hold the note in "wait for me" mode

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Sargam() {
  const { t, lang } = useI18n();
  const [sa, setSa] = useLocalStorage('riyaaz.sargam.sa', 'C');
  const [octave, setOctave] = useLocalStorage('riyaaz.sargam.oct', 3);
  const [scaleId, setScaleId] = useLocalStorage('riyaaz.sargam.scale', 'bilawal');
  const [exId, setExId] = useLocalStorage('riyaaz.sargam.ex', 'aaroh');
  const [bpm, setBpm] = useLocalStorage('riyaaz.sargam.bpm', 60);
  const [perBeat, setPerBeat] = useLocalStorage('riyaaz.sargam.perBeat', 1);
  const [guide, setGuide] = useLocalStorage('riyaaz.sargam.guide', true);
  const [drone, setDrone] = useLocalStorage('riyaaz.sargam.drone', true);
  const [check, setCheck] = useLocalStorage('riyaaz.sargam.check', false);
  const [mode, setMode] = useLocalStorage('riyaaz.sargam.mode', 'tempo'); // 'tempo' | 'wait'
  const [after, setAfter] = useLocalStorage('riyaaz.sargam.after', 'repeat'); // 'repeat' | 'next' | 'stop'
  const [customText, setCustomText] = useLocalStorage('riyaaz.sargam.custom', 'Sa Re Ga Ga Re Sa');
  const [customClimb, setCustomClimb] = useLocalStorage('riyaaz.sargam.customClimb', true);
  const [saString, setSaString] = useLocalStorage('riyaaz.sargam.saString', 0); // 0 = auto (near the nut)
  const [runKey, setRunKey] = useState(0);
  const [round, setRound] = useState(1);
  // Practice log: how many times each exercise was played through, per day, and minutes practised.
  const [stats, setStats] = useLocalStorage('riyaaz.sargam.stats', { total: 0, byEx: {}, days: {}, secs: {} });
  // Your own counter: saved on the phone, keeps counting across sessions until you reset it.
  const [sessionDone, setSessionDone] = useLocalStorage('riyaaz.sargam.counter', 0);
  const [devanagari, setDevanagari] = useLocalStorage('riyaaz.sargam.hindi', lang === 'hi');

  const [running, setRunning] = useState(false);
  const [idx, setIdx] = useState(-1);
  const [count, setCount] = useState(0);
  const [marks, setMarks] = useState([]); // true = hit, false = missed, undefined = not yet
  const mic = useMicPitch();

  const scale = SCALES.find((s) => s.id === scaleId) || SCALES[0];
  const exercise = useMemo(
    () => (exId === 'custom' ? customExercise(customText, customClimb) : EXERCISES.find((e) => e.id === exId) || EXERCISES[0]),
    [exId, customText, customClimb]
  );
  const saMidi = 12 * (octave + 1) + NOTE_NAMES.indexOf(sa);
  const notes = useMemo(() => buildExercise(exercise, scale.notes), [exercise, scale]);
  const midis = useMemo(() => notes.map((n) => swarMidi(n, saMidi)), [notes, saMidi]);
  // One fixed position per pitch (worked out low → high, so the hand stays in one place).
  const saOptions = useMemo(() => saStringOptions(saMidi), [saMidi]);
  const posByMidi = useMemo(() => {
    const distinct = [...new Set(midis)].sort((a, b) => a - b);
    const pos =
      (saString && boxPositions(distinct, saMidi, saString)) || melodyPositions(distinct.map((m) => ({ midi: m, beats: 1 })));
    return new Map(distinct.map((m, i) => [m, pos[i]]));
  }, [midis, saMidi, saString]);
  const scaleNotes = useMemo(() => {
    // Every swar this exercise uses, in pitch order, for the "where to play" chart.
    const seen = new Map();
    notes.forEach((n, i) => seen.set(midis[i], n));
    return [...seen.entries()].sort((a, b) => a[0] - b[0]).map(([m, n]) => ({ midi: m, note: n, pos: posByMidi.get(m) }));
  }, [notes, midis, posByMidi]);
  const tab = useMemo(
    () => melodyToTab(midis.map((m) => ({ midi: m, beats: 1 / perBeat })), 4, midis.map((m) => posByMidi.get(m))),
    [midis, perBeat, posByMidi]
  );

  const live = useRef({});
  live.current = { bpm, guide, check, midis };
  const targetRef = useRef(-1);
  const afterRef = useRef(after);
  afterRef.current = after;
  const onFinishedRef = useRef(null);
  const score = useRef({ hits: 0, frames: 0 });
  const label = (n) => swarLabel(n, devanagari);

  const finishNote = (i) => {
    if (i < 0 || !live.current.check) return;
    const { hits, frames } = score.current;
    const ok = frames > 0 && hits / frames >= 0.3;
    setMarks((m) => {
      const out = [...m];
      out[i] = ok;
      return out;
    });
  };

  const stopAll = () => {
    setRunning(false);
  };

  /** One full play-through of the current exercise. */
  const countDone = () => {
    const day = todayKey();
    setSessionDone((n) => n + 1);
    setStats((st) => ({
      ...st,
      total: (st.total || 0) + 1,
      byEx: { ...st.byEx, [exId]: (st.byEx?.[exId] || 0) + 1 },
      days: { ...st.days, [day]: (st.days?.[day] || 0) + 1 },
    }));
  };
  const countRef = useRef(countDone);
  countRef.current = countDone;

  /** Called when the last swar is done. Returns the index to continue from, or -1 to stop. */
  const onFinished = () => {
    countDone();
    if (after === 'repeat') {
      setRound((r) => r + 1);
      return 0;
    }
    if (after === 'next') {
      const list = EXERCISES.map((e) => e.id);
      const k = list.indexOf(exId);
      setExId(list[(k + 1) % list.length]);
      setRound((r) => r + 1);
      setRunKey((x) => x + 1); // restart with the new exercise (after a fresh count-in)
      return -2;
    }
    return -1;
  };

  onFinishedRef.current = onFinished;

  // ---------- Tempo mode: the app keeps time, you follow ----------
  useEffect(() => {
    if (!running || mode !== 'tempo') return undefined;
    const pre = 4 * perBeat; // one bar of count-in
    const total = midis.length;
    const ticker = createTicker({
      getBpm: () => live.current.bpm,
      stepsPerBeat: perBeat,
      onStep: (step, time) => {
        if (step < pre) {
          if (step % perBeat === 0) {
            click(time, step === 0 ? 'accent' : 'beat');
            ticker.at(time, () => setCount(step / perBeat + 1));
          }
          return;
        }
        let i = step - pre;
        if (i >= total) {
          if (afterRef.current !== 'repeat') {
            if (i === total)
              ticker.at(time, () => {
                finishNote(total - 1);
                targetRef.current = -1;
                setIdx(-1);
                if (onFinishedRef.current() === -1) setRunning(false);
              });
            return;
          }
          if (i % total === 0)
            ticker.at(time, () => {
              countRef.current();
              setRound((r) => r + 1);
            });
          i %= total;
        }
        const m = live.current.midis[i];
        if (live.current.guide) playMidi(m, { when: time, gain: 0.5, duration: (60 / live.current.bpm / perBeat) * 1.6 + 0.4 });
        if (step % perBeat === 0) click(time, 'sub');
        ticker.at(time, () => {
          finishNote(targetRef.current);
          if (i === 0) setMarks([]);
          score.current = { hits: 0, frames: 0 };
          targetRef.current = i;
          setCount(0);
          setIdx(i);
        });
      },
    });
    ticker.start();
    return () => ticker.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, perBeat, runKey, midis.length]);

  // ---------- Wait mode: the app waits until you hit each note ----------
  useEffect(() => {
    if (!running || mode !== 'wait') return undefined;
    setIdx(0);
    targetRef.current = 0;
    return undefined;
  }, [running, mode]);

  const heardAt = useRef(0);
  const holdStart = useRef(0);
  const playTarget = (i) => {
    const m = midis[i];
    if (m === undefined) return;
    getAudioContext();
    playMidi(m, { gain: 0.5, duration: 1.4 });
    heardAt.current = performance.now(); // ignore the mic while our own note rings
  };
  useEffect(() => {
    if (running && mode === 'wait' && idx >= 0 && guide) playTarget(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, idx]);

  // ---------- Mic scoring (both modes) ----------
  useEffect(() => {
    if (!mic.on || !running) return undefined;
    let raf;
    const loopFn = () => {
      const i = targetRef.current;
      const { freq, time } = mic.latest.current;
      if (i >= 0) {
        const target = live.current.midis[i];
        const cents = freq ? centsToTarget(freq, target) : null;
        const good = cents !== null && Math.abs(cents) <= IN_TUNE;
        if (mode === 'tempo') {
          score.current.frames += 1;
          if (good) score.current.hits += 1;
        } else if (time - heardAt.current > 1300) {
          if (good) {
            if (!holdStart.current) holdStart.current = time;
            if (time - holdStart.current >= HOLD_MS) {
              holdStart.current = 0;
              setMarks((m) => {
                const out = [...m];
                out[i] = true;
                return out;
              });
              const next = i + 1;
              if (next >= live.current.midis.length) {
                const r = onFinishedRef.current();
                if (r === 0) {
                  targetRef.current = 0;
                  setMarks([]);
                  setIdx(0);
                } else if (r === -2) {
                  targetRef.current = 0;
                  setMarks([]);
                  setIdx(0);
                } else {
                  targetRef.current = -1;
                  setIdx(-1);
                  setRunning(false);
                }
              } else {
                targetRef.current = next;
                setIdx(next);
              }
            }
          } else holdStart.current = 0;
        }
      }
      raf = requestAnimationFrame(loopFn);
    };
    raf = requestAnimationFrame(loopFn);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.on, running, mode]);

  // ---------- Tanpura-style drone: Pa, Sa′, Sa′, Sa (low) ----------
  useEffect(() => {
    if (!running || !drone) return undefined;
    const ac = getAudioContext();
    const cycle = [saMidi - 5, saMidi, saMidi, saMidi - 12];
    let next = ac.currentTime + 0.05;
    let k = 0;
    const id = setInterval(() => {
      while (next < ac.currentTime + 0.3) {
        playMidi(cycle[k % 4], { when: next, gain: k % 4 === 3 ? 0.2 : 0.14, duration: 3.2 });
        next += k % 4 === 3 ? 1.1 : 0.55;
        k += 1;
      }
    }, 100);
    return () => clearInterval(id);
  }, [running, drone, saMidi]);

  // Stop when the app goes to the background or this screen closes.
  useEffect(() => {
    const onPause = () => {
      setRunning(false);
      mic.stop();
    };
    window.addEventListener(APP_PAUSE_EVENT, onPause);
    return () => window.removeEventListener(APP_PAUSE_EVENT, onPause);
  }, [mic]);

  useEffect(() => {
    if (!running) {
      setCount(0);
      if (mode === 'tempo') {
        targetRef.current = -1;
        setIdx(-1);
      }
      if (mic.on) mic.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Practice time: add the minutes of each run to today's total.
  useEffect(() => {
    if (!running) return undefined;
    const began = Date.now();
    return () => {
      const secs = Math.round((Date.now() - began) / 1000);
      const day = todayKey();
      if (secs > 0) setStats((st) => ({ ...st, secs: { ...st.secs, [day]: (st.secs?.[day] || 0) + secs } }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const start = async () => {
    getAudioContext(); // inside the tap, so audio may start
    setMarks([]);
    setRound(1);
    score.current = { hits: 0, frames: 0 };
    if (!midis.length) return;
    if (check || mode === 'wait') {
      const ok = await mic.start();
      if (!ok) return;
    }
    setRunning(true);
  };

  const cur = idx >= 0 ? notes[idx] : null;
  const curMidi = idx >= 0 ? midis[idx] : null;
  const pos = idx >= 0 ? posByMidi.get(curMidi) : null;
  const posText = (p) => (p ? (p.fret === 0 ? t('sargam.openString', { s: p.string }) : t('sargam.where', { s: p.string, f: p.fret })) : '');
  const cents = mic.reading?.freq && curMidi !== null ? centsToTarget(mic.reading.freq, curMidi) : null;
  const hitCount = marks.filter(Boolean).length;
  const judged = marks.filter((m) => m !== undefined).length;

  return (
    <div className="page sargam">
      <a className="back" href="#/learn">
        {t('learn.all')}
      </a>
      <header className="page-head">
        <h1>{t('sargam.title')}</h1>
        <p>{t('sargam.subtitle')}</p>
      </header>

      <section className="card sargam-stage">
        <div className="sargam-now">
          {count > 0 ? (
            <div className="sargam-big">{count}</div>
          ) : cur ? (
            <>
              <div className="sargam-big">{label(cur)}</div>
              <div className="muted">
                {midiLabel(curMidi)}
                {pos && ` · ${posText(pos)}`}
              </div>
            </>
          ) : (
            <>
              <div className="sargam-big dim">{label({ letter: 'S', octave: 0 })}</div>
              <div className="muted">{t('sargam.saIs', { n: midiLabel(saMidi) })}</div>
            </>
          )}
        </div>

        {mic.on && cur && (
          <div className="sargam-meter" aria-live="polite">
            <div className="sargam-meter-track">
              <span className="zone" />
              {cents !== null && (
                <span
                  className={`needle ${Math.abs(cents) <= IN_TUNE ? 'good' : ''}`}
                  style={{ left: `${50 + Math.max(-50, Math.min(50, cents / 2))}%` }}
                />
              )}
            </div>
            <div className="muted small">
              {cents === null
                ? t('sargam.listening')
                : Math.abs(cents) <= IN_TUNE
                ? t('sargam.good')
                : cents < 0
                ? t('sargam.low2', { n: Math.round(-cents) })
                : t('sargam.high2', { n: Math.round(cents) })}
            </div>
          </div>
        )}

        <div className="field sargam-sapos">
          <span>{t('sargam.saOn')}</span>
          <div className="seg-control wrap">
            <button type="button" className={!saOptions.some((o) => o.string === saString) ? 'on' : ''} disabled={running} onClick={() => setSaString(0)}>
              {t('sargam.saAuto')}
            </button>
            {saOptions.map((o) => (
              <button key={o.string} type="button" className={saString === o.string ? 'on' : ''} disabled={running} onClick={() => setSaString(o.string)}>
                {t('sargam.saPos', { s: o.string, f: o.fret })}
              </button>
            ))}
          </div>
        </div>
        <div className="sargam-board">
          <Fretboard
            dots={scaleNotes.map(({ midi, note, pos: p }) => p && { ...p, label: label(note), active: midi === curMidi })}
          />
        </div>
        {!running && (
          <div className="sargam-where">
            <div className="eyebrow">{t('sargam.whereTitle')}</div>
            <ul>
              {scaleNotes.map(({ midi, note, pos: p }) => (
                <li key={midi}>
                  <strong>{label(note)}</strong>
                  <span className="muted small">{midiLabel(midi)}</span>
                  <span>{posText(p)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {running && after !== 'stop' && <div className="muted small sargam-round">{t('sargam.round', { n: round })}</div>}
        <div className="sargam-count" aria-live="polite">
          <div className="sc-main">
            <span className="sc-num">{sessionDone}</span>
            <span className="sc-label">{t('sargam.countNow')}</span>
            <button
              type="button"
              className="sc-reset"
              disabled={!sessionDone}
              onClick={() => window.confirm(t('sargam.resetAsk')) && setSessionDone(0)}
            >
              ↺ {t('sargam.reset')}
            </button>
          </div>
          <div className="sc-cell">
            <strong>{stats.days?.[todayKey()] || 0}</strong>
            <span>{t('sargam.countToday')}</span>
          </div>
          <div className="sc-cell">
            <strong>{stats.byEx?.[exId] || 0}</strong>
            <span>{t('sargam.countThis')}</span>
          </div>
          <div className="sc-cell">
            <strong>{stats.total || 0}</strong>
            <span>{t('sargam.countAll')}</span>
          </div>
          <div className="sc-cell">
            <strong>{Math.floor((stats.secs?.[todayKey()] || 0) / 60)}</strong>
            <span>{t('sargam.countMins')}</span>
          </div>
        </div>
        <div className="sargam-row">
          {notes.map((n, i) => {
            const p = posByMidi.get(midis[i]);
            return (
              <span key={i} className={`swar ${i === idx ? 'now' : ''} ${marks[i] === true ? 'hit' : marks[i] === false ? 'miss' : ''}`}>
                {label(n)}
                {p && <small>{p.string}·{p.fret}</small>}
              </span>
            );
          })}
        </div>
        {!notes.length && <p className="error small">{t('sargam.customEmpty')}</p>}
        {check && judged > 0 && !running && (
          <p className="sargam-score">{t('sargam.score', { hit: hitCount, total: judged })}</p>
        )}

        <div className="actions">
          <button type="button" className={`btn big ${running ? '' : 'primary'}`} onClick={() => (running ? stopAll() : start())}>
            {running ? t('metro.stop') : t('metro.start')}
          </button>
          {mode === 'wait' && cur && (
            <button type="button" className="btn" onClick={() => playTarget(idx)}>
              🔊 {t('sargam.hear')}
            </button>
          )}
        </div>
        {(mic.error || (check && guide && mode === 'tempo')) && (
          <p className={`small ${mic.error ? 'error' : 'muted'}`}>
            {mic.error === 'denied' ? t('karaoke.micDenied') : mic.error ? t('karaoke.noRecorder') : t('sargam.earphones')}
          </p>
        )}
      </section>

      <section className="card">
        <h3>{t('sargam.setup')}</h3>
        <div className="field">
          <span>{t('sargam.sa')}</span>
          <div className="seg-control wrap">
            {NOTE_NAMES.map((n) => (
              <button key={n} type="button" className={sa === n ? 'on' : ''} disabled={running} onClick={() => setSa(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="toolbar">
          <div className="field">
            <span>{t('sargam.range')}</span>
            <div className="seg-control">
              {OCTAVES.map(([o, l]) => (
                <button key={o} type="button" className={octave === o ? 'on' : ''} disabled={running} onClick={() => setOctave(o)}>
                  {t(l)}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>{t('sargam.names')}</span>
            <div className="seg-control">
              <button type="button" className={!devanagari ? 'on' : ''} onClick={() => setDevanagari(false)}>
                Sa Re Ga
              </button>
              <button type="button" className={devanagari ? 'on' : ''} onClick={() => setDevanagari(true)}>
                सा रे ग
              </button>
            </div>
          </div>
        </div>
        <div className="form-row">
          <label className="field grow">
            <span>{t('sargam.scale')}</span>
            <select value={scale.id} disabled={running} onChange={(e) => setScaleId(e.target.value)}>
              {SCALES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field grow">
            <span>{t('sargam.exercise')}</span>
            <select value={exercise.id} disabled={running} onChange={(e) => setExId(e.target.value)}>
              {EXERCISES.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
              <option value="custom">✏️ {t('sargam.custom')}</option>
            </select>
          </label>
        </div>
        {exId === 'custom' && (
          <div className="sargam-custom">
            <label className="field">
              <span>{t('sargam.customLabel')}</span>
              <input
                value={customText}
                disabled={running}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Sa Re Ga Ga Re Sa"
                spellCheck={false}
                autoCapitalize="words"
              />
            </label>
            <div className="seg-control">
              <button type="button" className={customClimb ? 'on' : ''} disabled={running} onClick={() => setCustomClimb(true)}>
                {t('sargam.climb')}
              </button>
              <button type="button" className={!customClimb ? 'on' : ''} disabled={running} onClick={() => setCustomClimb(false)}>
                {t('sargam.asTyped')}
              </button>
            </div>
            <p className="muted small">{t('sargam.customHint')}</p>
          </div>
        )}
      </section>

      <section className="card">
        <h3>{t('sargam.practice')}</h3>
        <div className="toolbar">
          <div className="field">
            <span>{t('sargam.mode')}</span>
            <div className="seg-control">
              <button type="button" className={mode === 'tempo' ? 'on' : ''} disabled={running} onClick={() => setMode('tempo')}>
                {t('sargam.modeTempo')}
              </button>
              <button type="button" className={mode === 'wait' ? 'on' : ''} disabled={running} onClick={() => setMode('wait')}>
                {t('sargam.modeWait')}
              </button>
            </div>
          </div>
          {mode === 'tempo' && (
            <div className="field">
              <span>{t('sargam.speed')}</span>
              <div className="seg-control">
                {[
                  [1, t('sargam.speed1')],
                  [2, t('sargam.speed2')],
                ].map(([v, l]) => (
                  <button key={v} type="button" className={perBeat === v ? 'on' : ''} disabled={running} onClick={() => setPerBeat(v)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {mode === 'tempo' && (
          <label className="range sargam-bpm">
            <span>{bpm} BPM</span>
            <input type="range" min="30" max="160" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
          </label>
        )}
        <p className="muted small">{mode === 'tempo' ? t('sargam.modeTempoHint') : t('sargam.modeWaitHint')}</p>
        <div className="chip-row">
          <button type="button" className={`chip ${guide ? 'on' : ''}`} onClick={() => setGuide((x) => !x)}>
            {t('sargam.guide')}
          </button>
          <button type="button" className={`chip ${drone ? 'on' : ''}`} onClick={() => setDrone((x) => !x)}>
            {t('sargam.drone')}
          </button>
          {mode === 'tempo' && (
            <button type="button" className={`chip ${check ? 'on' : ''}`} disabled={running} onClick={() => setCheck((x) => !x)}>
              🎤 {t('sargam.check')}
            </button>
          )}
        </div>
        <div className="field sargam-after">
          <span>{t('sargam.after')}</span>
          <div className="seg-control">
            {[
              ['repeat', 'sargam.afterRepeat'],
              ['next', 'sargam.afterNext'],
              ['stop', 'sargam.afterStop'],
            ].map(([v, l]) => (
              <button key={v} type="button" className={after === v ? 'on' : ''} onClick={() => setAfter(v)}>
                {t(l)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h3>{t('sargam.onGuitar')}</h3>
        <p className="muted small">{t('sargam.onGuitarHint', { n: midiLabel(saMidi) })}</p>
        <pre className="tab">{tab}</pre>
      </section>
    </div>
  );
}
