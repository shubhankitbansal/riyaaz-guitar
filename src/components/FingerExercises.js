import { useEffect, useMemo, useRef, useState } from 'react';
import { FINGER_EXERCISES, buildFingerExercise, fingerMidi, fingerTabColumns, spanOf } from '../music/fingers';
import { makeTab } from '../music/tab';
import Fretboard from './Fretboard';
import { createTicker } from '../audio/ticker';
import { getAudioContext, playMidi, click } from '../audio/synth';
import { useLocalStorage, dayKey } from '../hooks';
import { APP_PAUSE_EVENT } from '../native';
import { useT } from '../i18n';

const PER_BEAT = [
  [1, 'fingers.quarter'],
  [2, 'fingers.eighth'],
  [4, 'fingers.sixteenth'],
];
const AFTER = ['repeat', 'climb', 'next', 'stop'];
const MAX_FRET = 15;
export const EMPTY_FINGER_STATS = { total: 0, byEx: {}, days: {}, secs: {} };

/** Left-hand finger exercises: positions with finger numbers, play-along, climbing up the neck, counters. */
export default function FingerExercises() {
  const t = useT();
  const [exId, setExId] = useLocalStorage('riyaaz.fingers.ex', 'chromatic');
  const [pos, setPos] = useLocalStorage('riyaaz.fingers.pos', 1);
  const [bpm, setBpm] = useLocalStorage('riyaaz.fingers.bpm', 60);
  const [perBeat, setPerBeat] = useLocalStorage('riyaaz.fingers.perBeat', 2);
  const [guide, setGuide] = useLocalStorage('riyaaz.fingers.guide', true);
  const [clickOn, setClickOn] = useLocalStorage('riyaaz.fingers.click', true);
  const [after, setAfter] = useLocalStorage('riyaaz.fingers.after', 'repeat');
  const [counter, setCounter] = useLocalStorage('riyaaz.fingers.counter', 0);
  const [stats, setStats] = useLocalStorage('riyaaz.fingers.stats', EMPTY_FINGER_STATS);

  const [running, setRunning] = useState(false);
  const [idx, setIdx] = useState(-1);
  const [count, setCount] = useState(0);
  const [round, setRound] = useState(1);
  const [runPos, setRunPos] = useState(null); // position while climbing
  const [runEx, setRunEx] = useState(null); // exercise while "next" moves on

  const ex = FINGER_EXERCISES.find((e) => e.id === (runEx || exId)) || FINGER_EXERCISES[0];
  const shownPos = Math.max(ex.minPos || 1, runPos ?? pos);
  const notes = useMemo(() => buildFingerExercise(ex.id, shownPos), [ex.id, shownPos]);
  const tab = useMemo(() => makeTab(fingerTabColumns(notes, perBeat * 4)), [notes, perBeat]);

  const live = useRef({});
  live.current = { bpm, guide, clickOn, after, exId, pos, perBeat };

  const countDone = (id) => {
    const day = dayKey();
    setCounter((n) => n + 1);
    setStats((st) => ({
      ...st,
      total: (st.total || 0) + 1,
      byEx: { ...st.byEx, [id]: (st.byEx?.[id] || 0) + 1 },
      days: { ...st.days, [day]: (st.days?.[day] || 0) + 1 },
    }));
  };
  const countRef = useRef(countDone);
  countRef.current = countDone;

  useEffect(() => {
    if (!running) return undefined;
    const L = live.current;
    const pb = L.perBeat;
    const pre = 4 * pb; // one bar of count-in
    const st = { ex: L.exId, pos: Math.max((FINGER_EXERCISES.find((e) => e.id === L.exId) || {}).minPos || 1, L.pos), dir: 1, i: 0 };
    st.notes = buildFingerExercise(st.ex, st.pos);
    const began = Date.now();

    const ticker = createTicker({
      getBpm: () => live.current.bpm,
      stepsPerBeat: pb,
      onStep: (step, time) => {
        if (step < pre) {
          if (step % pb === 0) {
            click(time, step === 0 ? 'accent' : 'beat');
            ticker.at(time, () => setCount(step / pb + 1));
          }
          return;
        }
        if (st.i >= st.notes.length) {
          // One full play-through.
          const doneEx = st.ex;
          ticker.at(time, () => countRef.current(doneEx));
          const mode = live.current.after;
          if (mode === 'stop') {
            ticker.at(time, () => setRunning(false));
            st.i = Infinity;
            return;
          }
          if (mode === 'climb') {
            const ex0 = FINGER_EXERCISES.find((e) => e.id === st.ex);
            const lo = ex0.minPos || 1;
            const span = spanOf(st.notes, st.pos);
            if (st.pos + st.dir + span > MAX_FRET || st.pos + st.dir < lo) st.dir = -st.dir;
            st.pos += st.dir;
          } else if (mode === 'next') {
            const k = FINGER_EXERCISES.findIndex((e) => e.id === st.ex);
            st.ex = FINGER_EXERCISES[(k + 1) % FINGER_EXERCISES.length].id;
            st.pos = Math.max(FINGER_EXERCISES.find((e) => e.id === st.ex).minPos || 1, live.current.pos);
          }
          st.notes = buildFingerExercise(st.ex, st.pos);
          st.i = 0;
          const p = st.pos;
          const e = st.ex;
          ticker.at(time, () => {
            setRunPos(p);
            setRunEx(e);
            setRound((r) => r + 1);
          });
        }
        if (st.i === Infinity) return;
        const n = st.notes[st.i];
        const { guide: g, clickOn: c, bpm: b } = live.current;
        if (g) playMidi(fingerMidi(n), { when: time, gain: n.tech ? 0.32 : 0.45, duration: (60 / b / pb) * 1.4 + 0.25 });
        if (c && (step - pre) % pb === 0) click(time, (step - pre) % (pb * 4) === 0 ? 'accent' : 'sub');
        const at = st.i;
        ticker.at(time, () => {
          setCount(0);
          setIdx(at);
        });
        st.i += 1;
      },
    });
    ticker.start();
    return () => {
      ticker.stop();
      setIdx(-1);
      setCount(0);
      setRunPos(null);
      setRunEx(null);
      const secs = Math.round((Date.now() - began) / 1000);
      const day = dayKey();
      if (secs > 0) setStats((s) => ({ ...s, secs: { ...s.secs, [day]: (s.secs?.[day] || 0) + secs } }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(() => {
    const onPause = () => setRunning(false);
    window.addEventListener(APP_PAUSE_EVENT, onPause);
    return () => window.removeEventListener(APP_PAUSE_EVENT, onPause);
  }, []);

  const start = () => {
    getAudioContext(); // inside the tap, so audio may start
    setRound(1);
    setRunning(true);
  };

  const cur = idx >= 0 ? notes[idx] : null;
  const dots = notes.map((n, i) => ({ string: n.string, fret: n.fret, label: String(n.finger), active: i === idx }));
  const today = dayKey();

  return (
    <div className="page fingers">
      <a className="back" href="#/learn">
        ← {t('nav.learn')}
      </a>
      <header className="page-head">
        <h1>{t('fingers.title')}</h1>
        <p>{t('fingers.subtitle')}</p>
      </header>

      <section className="card">
        <label className="field">
          <span>{t('fingers.exercise')}</span>
          <select value={exId} disabled={running} onChange={(e) => setExId(e.target.value)}>
            {FINGER_EXERCISES.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
                {stats.byEx?.[e.id] ? ` (×${stats.byEx[e.id]})` : ''}
              </option>
            ))}
          </select>
        </label>
        <p className="muted small fingers-tip">💡 {ex.tip}</p>

        <div className="fingers-now">
          {count > 0 ? (
            <span className="sargam-big">{count}</span>
          ) : cur ? (
            <>
              <span className="finger-big">{cur.finger}</span>
              <span className="muted">
                {t('fingers.where', { s: cur.string, f: cur.fret })}
                {cur.tech === 'h' ? ` · ${t('fingers.hammer')}` : cur.tech === 'p' ? ` · ${t('fingers.pull')}` : ''}
              </span>
            </>
          ) : (
            <span className="muted small">{t('fingers.legend')}</span>
          )}
        </div>

        <div className="sargam-board">
          <Fretboard dots={dots} />
        </div>
        {running && after !== 'stop' && (
          <div className="muted small sargam-round">
            {t('sargam.round', { n: round })}
            {after === 'climb' ? ` · ${t('fingers.atFret', { n: shownPos })}` : ''}
            {after === 'next' ? ` · ${ex.name}` : ''}
          </div>
        )}

        <div className="sargam-count" aria-live="polite">
          <div className="sc-main">
            <span className="sc-num">{counter}</span>
            <span className="sc-label">{t('sargam.countNow')}</span>
            <button type="button" className="sc-reset" disabled={!counter} onClick={() => window.confirm(t('sargam.resetAsk')) && setCounter(0)}>
              ↺ {t('sargam.reset')}
            </button>
          </div>
          <div className="sc-cell">
            <strong>{stats.days?.[today] || 0}</strong>
            <span>{t('sargam.countToday')}</span>
          </div>
          <div className="sc-cell">
            <strong>{stats.byEx?.[ex.id] || 0}</strong>
            <span>{t('sargam.countThis')}</span>
          </div>
          <div className="sc-cell">
            <strong>{stats.total || 0}</strong>
            <span>{t('sargam.countAll')}</span>
          </div>
          <div className="sc-cell">
            <strong>{Math.floor((stats.secs?.[today] || 0) / 60)}</strong>
            <span>{t('sargam.countMins')}</span>
          </div>
        </div>

        <div className="sargam-row finger-row">
          {notes.map((n, i) => (
            <span key={i} className={`swar finger-chip ${i === idx ? 'now' : ''} ${n.tech ? 'legato' : ''}`}>
              {n.tech ? <em>{n.tech}</em> : null}
              {n.finger}
              <small>
                {n.string}·{n.fret}
              </small>
            </span>
          ))}
        </div>

        <div className="actions">
          <button type="button" className={`btn big ${running ? '' : 'primary'}`} onClick={() => (running ? setRunning(false) : start())}>
            {running ? t('metro.stop') : t('metro.start')}
          </button>
        </div>
      </section>

      <section className="card">
        <h3>{t('sargam.setup')}</h3>
        <div className="toolbar">
          <div className="field">
            <span>{t('fingers.position')}</span>
            <div className="stepper">
              <button type="button" disabled={running} onClick={() => setPos((p) => Math.max(1, p - 1))} aria-label="−">
                −
              </button>
              <span>{t('fingers.fret', { n: shownPos })}</span>
              <button type="button" disabled={running} onClick={() => setPos((p) => Math.min(12, p + 1))} aria-label="+">
                +
              </button>
            </div>
          </div>
          <div className="field">
            <span>{t('fingers.speed')}</span>
            <div className="stepper">
              <button type="button" onClick={() => setBpm((b) => Math.max(30, b - 5))} aria-label="−">
                −
              </button>
              <span>{bpm} BPM</span>
              <button type="button" onClick={() => setBpm((b) => Math.min(200, b + 5))} aria-label="+">
                +
              </button>
            </div>
          </div>
        </div>
        <div className="field">
          <span>{t('fingers.notesPerBeat')}</span>
          <div className="seg-control">
            {PER_BEAT.map(([v, l]) => (
              <button key={v} type="button" className={perBeat === v ? 'on' : ''} disabled={running} onClick={() => setPerBeat(v)}>
                {t(l)}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>{t('sargam.after')}</span>
          <div className="seg-control wrap">
            {AFTER.map((a) => (
              <button key={a} type="button" className={after === a ? 'on' : ''} onClick={() => setAfter(a)}>
                {t(`fingers.after.${a}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="chips-row">
          <button type="button" className={`chip ${guide ? 'on' : ''}`} onClick={() => setGuide((v) => !v)}>
            ♪ {t('fingers.guide')}
          </button>
          <button type="button" className={`chip ${clickOn ? 'on' : ''}`} onClick={() => setClickOn((v) => !v)}>
            🥁 {t('fingers.click')}
          </button>
        </div>
      </section>

      <section className="card">
        <h3>{t('fingers.tab')}</h3>
        <pre className="tab">{tab}</pre>
        <p className="muted small">{t('fingers.tabHint')}</p>
      </section>
    </div>
  );
}
