import { useEffect, useRef, useState } from 'react';
import { createTicker } from '../audio/ticker';
import { click } from '../audio/synth';
import { useLocalStorage } from '../hooks';
import { useT } from '../i18n';

const tempoName = (b) =>
  b < 60 ? 'Largo' : b < 76 ? 'Adagio' : b < 108 ? 'Andante' : b < 120 ? 'Moderato' : b < 168 ? 'Allegro' : 'Presto';

export default function Metronome() {
  const t = useT();
  const [bpm, setBpm] = useLocalStorage('riyaaz.bpm', 80);
  const [beats, setBeats] = useLocalStorage('riyaaz.beats', 4);
  const [sub, setSub] = useLocalStorage('riyaaz.sub', 1);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const taps = useRef([]);

  useEffect(() => {
    if (!running) return undefined;
    const ticker = createTicker({
      getBpm: () => bpmRef.current,
      stepsPerBeat: sub,
      onStep: (step, time) => {
        const s = step % sub;
        const b = Math.floor(step / sub) % beats;
        click(time, s !== 0 ? 'sub' : b === 0 ? 'accent' : 'beat');
        if (s === 0) ticker.at(time, () => setBeat(b));
      },
    });
    ticker.start();
    return () => {
      ticker.stop();
      setBeat(-1);
    };
  }, [running, beats, sub]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        setRunning((r) => !r);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const change = (d) => setBpm((b) => Math.min(240, Math.max(30, b + d)));

  const tap = () => {
    const now = performance.now();
    taps.current = [...taps.current.filter((t) => now - t < 2500), now].slice(-5);
    if (taps.current.length >= 2) {
      const iv = (taps.current[taps.current.length - 1] - taps.current[0]) / (taps.current.length - 1);
      setBpm(Math.round(Math.min(240, Math.max(30, 60000 / iv))));
    }
  };

  return (
    <div className="page metronome">
      <header className="page-head">
        <h1>{t('metro.title')}</h1>
        <p>{t('metro.subtitle')}</p>
      </header>

      <section className="card metro-main">
        <div className="beat-dots">
          {Array.from({ length: beats }, (_, i) => (
            <span key={i} className={`beat-dot ${i === 0 ? 'accent' : ''} ${beat === i ? 'on' : ''}`} />
          ))}
        </div>
        <div className="bpm-display">
          <button type="button" className="round" onClick={() => change(-1)} aria-label="Slower">−</button>
          <div>
            <div className="bpm-num">{bpm}</div>
            <div className="muted">BPM · {tempoName(bpm)}</div>
          </div>
          <button type="button" className="round" onClick={() => change(1)} aria-label="Faster">+</button>
        </div>
        <input
          className="wide-range"
          type="range"
          min="30"
          max="240"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          aria-label="Tempo"
        />
        <div className="actions center">
          <button type="button" className="btn primary big" onClick={() => setRunning((r) => !r)}>
            {running ? t('metro.stop') : t('metro.start')}
          </button>
          <button type="button" className="btn" onClick={tap}>
            {t('metro.tap')}
          </button>
        </div>
      </section>

      <section className="card">
        <div className="toolbar">
          <div className="field">
            <span>{t('metro.beats')}</span>
            <div className="seg-control">
              {[2, 3, 4, 6].map((n) => (
                <button key={n} type="button" className={beats === n ? 'on' : ''} onClick={() => setBeats(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>{t('metro.sub')}</span>
            <div className="seg-control">
              {[
                [1, '♩'],
                [2, '♪♪'],
                [3, '3'],
                [4, '♬♬'],
              ].map(([n, l]) => (
                <button key={n} type="button" className={sub === n ? 'on' : ''} onClick={() => setSub(n)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>{t('metro.presets')}</span>
            <div className="seg-control">
              {[60, 72, 90, 110].map((n) => (
                <button key={n} type="button" className={bpm === n ? 'on' : ''} onClick={() => setBpm(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="muted small">{t('metro.note')}</p>
      </section>
    </div>
  );
}
