import { useEffect, useRef, useState } from 'react';
import { useLocalStorage, useMyPatterns, useStrumCounts } from '../hooks';
import { useStrumLoop } from '../audio/useStrumLoop';
import {
  parsePattern,
  formatPattern,
  nextSymbol,
  reshapePattern,
  cleanSlots,
  parseProgression,
  PRESET_PATTERNS,
} from '../music/strum';
import { isChord } from '../music/theory';
import { StrumGrid, StrumCounter, patternPreview } from './StrumPattern';
import { useT } from '../i18n';

const PROGRESSIONS = ['G D Em C', 'C G Am F', 'Am F C G', 'D A Bm G', 'Em C G D', 'G Em C D'];
const BARS = [
  [0.5, '½'],
  [1, '1'],
  [2, '2'],
  [4, '4'],
];

export default function StrumStudio({ route = [] }) {
  const t = useT();
  const [pattern, setPattern] = useLocalStorage('riyaaz.strum.pattern', 'D-DU-UDU');
  const [progText, setProgText] = useLocalStorage('riyaaz.strum.chords', 'G D Em C');
  const [bpm, setBpm] = useLocalStorage('riyaaz.strum.bpm', 76);
  const [barsPerChord, setBarsPerChord] = useLocalStorage('riyaaz.strum.bars', 1);
  const [guide, setGuide] = useLocalStorage('riyaaz.strum.guide', true);
  const [metronome, setMetronome] = useLocalStorage('riyaaz.strum.click', true);
  const [countIn, setCountIn] = useLocalStorage('riyaaz.strum.countIn', true);
  const [mine, setMine] = useMyPatterns();
  const [name, setName] = useState('');
  const [typed, setTyped] = useState(null); // text being typed into the pattern box
  const [saved, setSaved] = useState(false);

  // #/strum/<pattern>/<chords> — opened from a song.
  const routeKey = route.join('/');
  const applied = useRef('');
  useEffect(() => {
    if (!route[0] || applied.current === routeKey) return;
    applied.current = routeKey;
    setPattern(formatPattern(parsePattern(route[0])));
    if (route[1]) setProgText(parseProgression(route[1]).join(' '));
  }, [routeKey, route, setPattern, setProgText]);

  const p = parsePattern(pattern);
  const allChords = parseProgression(progText);
  const chords = allChords.filter(isChord);
  const bad = allChords.filter((c) => !isChord(c));
  const counts = useStrumCounts();
  const loop = useStrumLoop({ pattern, chords, barsPerChord, bpm, guide, metronome, countIn, onBar: () => counts.add(pattern) });
  const badge = (pt) => {
    const n = counts.forPattern(formatPattern(parsePattern(pt)));
    return n ? <span className="count-badge">×{n}</span> : null;
  };
  const pos = loop.pos;

  const update = (np) => {
    setPattern(formatPattern(np));
    setSaved(false);
  };
  const tapSlot = (i) => update({ ...p, slots: p.slots.map((s, k) => (k === i ? nextSymbol(s) : s)) });
  const changeBpm = (d) => setBpm((b) => Math.min(220, Math.max(30, b + d)));

  const commitTyped = () => {
    if (typed === null) return;
    const slots = cleanSlots(typed);
    if (slots.length) {
      const prefix = p.sub === 4 ? '16:' : '';
      update(parsePattern(prefix + slots.join('')));
    }
    setTyped(null);
  };

  const save = () => {
    const label = name.trim() || patternPreview(pattern);
    setMine((list) => {
      const existing = list.find((x) => x.name.toLowerCase() === label.toLowerCase());
      if (existing) return list.map((x) => (x === existing ? { ...x, pattern } : x));
      return [...list, { id: `u-${Date.now().toString(36)}`, name: label, pattern }];
    });
    setName(label);
    setSaved(true);
  };

  const load = (item) => {
    setPattern(item.pattern);
    setName(item.id.startsWith('u-') ? item.name : '');
    setSaved(false);
  };

  const currentChord = pos && pos.count === 0 ? chords[pos.chord] : chords[0];
  const nextChord = pos && pos.count === 0 ? chords[pos.next] : chords[1 % Math.max(1, chords.length)];

  return (
    <div className="page strum-studio">
      <header className="page-head">
        <h1>{t('studio.title')}</h1>
        <p>{t('studio.subtitle')}</p>
      </header>

      <section className="card studio-player">
        <div className="studio-now">
          {pos && pos.count > 0 ? (
            <div className="studio-count">{pos.count}</div>
          ) : (
            <>
              <div>
                <div className="eyebrow">{t('studio.now')}</div>
                <div className="studio-chord">{currentChord || '—'}</div>
              </div>
              {chords.length > 1 && (
                <div className="studio-next">
                  <div className="eyebrow">{t('studio.next')}</div>
                  <div className="studio-chord small">{nextChord}</div>
                </div>
              )}
            </>
          )}
        </div>

        <StrumGrid pattern={pattern} active={pos ? pos.step : -1} onTap={tapSlot} />
        <StrumCounter pattern={pattern} counts={counts} full />
        <p className="muted small studio-legend">{t('studio.legend')}</p>

        <div className="studio-transport">
          <button type="button" className="btn primary big" onClick={loop.toggle} disabled={!chords.length}>
            {loop.playing ? t('strum.stop') : t('strum.play')}
          </button>
          <div className="bpm-mini">
            <button type="button" className="round" onClick={() => changeBpm(-2)} aria-label="Slower">
              −
            </button>
            <span>
              <strong>{bpm}</strong> BPM
            </span>
            <button type="button" className="round" onClick={() => changeBpm(2)} aria-label="Faster">
              +
            </button>
          </div>
        </div>
        <input
          className="wide-range"
          type="range"
          min="30"
          max="220"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          aria-label="Tempo"
        />
        <div className="chip-row">
          <button type="button" className={`chip ${guide ? 'on' : ''}`} onClick={() => setGuide((x) => !x)}>
            {t('studio.guide')}
          </button>
          <button type="button" className={`chip ${metronome ? 'on' : ''}`} onClick={() => setMetronome((x) => !x)}>
            {t('studio.click')}
          </button>
          <button type="button" className={`chip ${countIn ? 'on' : ''}`} onClick={() => setCountIn((x) => !x)}>
            {t('studio.countIn')}
          </button>
        </div>
        <p className="muted small">{t('studio.guideHint')}</p>
      </section>

      <section className="card">
        <h3>{t('studio.pattern')}</h3>
        <div className="toolbar">
          <div className="field">
            <span>{t('metro.beats')}</span>
            <div className="seg-control">
              {[2, 3, 4, 6].map((n) => (
                <button key={n} type="button" className={p.beats === n ? 'on' : ''} onClick={() => update(reshapePattern(p, n))}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>{t('studio.steps')}</span>
            <div className="seg-control">
              <button type="button" className={p.sub === 2 ? 'on' : ''} onClick={() => update(reshapePattern(p, p.beats, 2))}>
                {t('studio.eighths')}
              </button>
              <button type="button" className={p.sub === 4 ? 'on' : ''} onClick={() => update(reshapePattern(p, p.beats, 4))}>
                {t('studio.sixteenths')}
              </button>
            </div>
          </div>
        </div>
        <div className="form-row">
          <label className="field grow">
            <span>{t('studio.typeIt')}</span>
            <input
              className="mono"
              value={typed ?? p.slots.join('')}
              onChange={(e) => setTyped(e.target.value)}
              onBlur={commitTyped}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              spellCheck={false}
              autoCapitalize="characters"
              placeholder="D-DU-UDU"
            />
          </label>
        </div>
        <p className="muted small">{t('studio.typeHint')}</p>
        <div className="form-row studio-save">
          <label className="field grow">
            <span>{t('studio.name')}</span>
            <input value={name} onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }} placeholder={t('studio.namePh')} />
          </label>
          <button type="button" className="btn primary" onClick={save}>
            {saved ? t('settings.saved') : t('studio.save')}
          </button>
          <button type="button" className="btn" onClick={() => update({ ...p, slots: p.slots.map(() => '-') })}>
            {t('studio.clear')}
          </button>
        </div>
      </section>

      <section className="card">
        <h3>{t('studio.chords')}</h3>
        <div className="form-row">
          <label className="field grow">
            <span>{t('studio.progression')}</span>
            <input value={progText} onChange={(e) => setProgText(e.target.value)} placeholder="G D Em C" spellCheck={false} />
          </label>
          <div className="field">
            <span>{t('studio.barsPerChord')}</span>
            <div className="seg-control">
              {BARS.map(([v, l]) => (
                <button key={v} type="button" className={barsPerChord === v ? 'on' : ''} onClick={() => setBarsPerChord(v)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        {bad.length > 0 && <p className="error small">{t('studio.badChords', { list: bad.join(', ') })}</p>}
        <div className="chip-row">
          {PROGRESSIONS.map((pr) => (
            <button key={pr} type="button" className={`chip ${progText.trim() === pr ? 'on' : ''}`} onClick={() => setProgText(pr)}>
              {pr}
            </button>
          ))}
        </div>
      </section>

      {mine.length > 0 && (
        <section className="card">
          <h3>{t('studio.mine')}</h3>
          <ul className="pattern-list">
            {mine.map((item) => (
              <li key={item.id} className={item.pattern === pattern ? 'on' : ''}>
                <button type="button" className="pattern-pick" onClick={() => load(item)}>
                  <strong>{item.name}</strong>
                  <span className="mono">{patternPreview(item.pattern)}</span>
                  {badge(item.pattern)}
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t('studio.delete')}
                  onClick={() => window.confirm(t('studio.confirmDelete', { name: item.name })) && setMine((l) => l.filter((x) => x.id !== item.id))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3>{t('studio.presets')}</h3>
        {counts.total > 0 && (
          <button
            type="button"
            className="link-btn small"
            onClick={() => window.confirm(t('strum.resetAllAsk')) && counts.resetAll()}
          >
            ↺ {t('strum.resetAll')}
          </button>
        )}
        <ul className="pattern-list">
          {PRESET_PATTERNS.map((item) => (
            <li key={item.id} className={item.pattern === pattern ? 'on' : ''}>
              <button type="button" className="pattern-pick" onClick={() => load(item)}>
                <strong>{t(`strum.p.${item.id}`)}</strong>
                <span className="mono">{patternPreview(item.pattern)}</span>
                {badge(item.pattern)}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
