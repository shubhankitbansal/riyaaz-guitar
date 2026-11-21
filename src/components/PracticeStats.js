import { useLocalStorage, useMyPatterns, useStrumCounts, dayKey } from '../hooks';
import { EXERCISES } from '../music/sargam';
import { PRESET_PATTERNS, parsePattern, formatPattern } from '../music/strum';
import { patternPreview } from './StrumPattern';
import { FINGER_EXERCISES } from '../music/fingers';
import { EMPTY_FINGER_STATS } from './FingerExercises';
import { useT } from '../i18n';

const EMPTY_SARGAM = { total: 0, byEx: {}, days: {}, secs: {} };
const norm = (p) => formatPattern(parsePattern(p));

/** Every practice counter in one place: sargam and strumming, with resets. */
export default function PracticeStats() {
  const t = useT();
  const [counter, setCounter] = useLocalStorage('riyaaz.sargam.counter', 0);
  const [sargam, setSargam] = useLocalStorage('riyaaz.sargam.stats', EMPTY_SARGAM);
  const strum = useStrumCounts();
  const [fCounter, setFCounter] = useLocalStorage('riyaaz.fingers.counter', 0);
  const [fingers, setFingers] = useLocalStorage('riyaaz.fingers.stats', EMPTY_FINGER_STATS);
  const fRows = Object.entries(fingers.byEx || {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const fName = (id) => FINGER_EXERCISES.find((e) => e.id === id)?.name || id;
  const [mine] = useMyPatterns();
  const today = dayKey();
  const ask = (msg, fn) => window.confirm(msg) && fn();

  const exName = (id) => (id === 'custom' ? t('sargam.customName') : EXERCISES.find((e) => e.id === id)?.name || id);
  const exRows = Object.entries(sargam.byEx || {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  const patName = (p) => {
    const preset = PRESET_PATTERNS.find((x) => norm(x.pattern) === p);
    if (preset) return t(`strum.p.${preset.id}`);
    const own = mine.find((x) => norm(x.pattern) === p);
    return own ? own.name : t('stats.otherPattern');
  };
  const patRows = Object.entries(strum.byPattern)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  // Last 7 days, both kinds of practice together.
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      sargam: sargam.days?.[k] || 0,
      strum: strum.days?.[k] || 0,
      fingers: fingers.days?.[k] || 0,
      today: k === today,
    };
  });
  const peak = Math.max(1, ...week.map((d) => d.sargam + d.strum + d.fingers));

  return (
    <div className="page practice-stats">
      <a className="back" href="#/learn">
        ← {t('nav.learn')}
      </a>
      <header className="page-head">
        <h1>{t('stats.title')}</h1>
        <p>{t('stats.subtitle')}</p>
      </header>

      <section className="card">
        <h3>{t('stats.week')}</h3>
        <div className="week-bars">
          {week.map((d) => (
            <div key={d.label + d.today} className={`week-day ${d.today ? 'today' : ''}`}>
              <div className="week-stack" title={`${d.sargam + d.strum + d.fingers}`}>
                <span className="wb-fingers" style={{ height: `${(d.fingers / peak) * 100}%` }} />
                <span className="wb-strum" style={{ height: `${(d.strum / peak) * 100}%` }} />
                <span className="wb-sargam" style={{ height: `${(d.sargam / peak) * 100}%` }} />
              </div>
              <span className="week-num">{d.sargam + d.strum + d.fingers || ''}</span>
              <span className="week-label">{d.label}</span>
            </div>
          ))}
        </div>
        <div className="week-legend muted small">
          <span><i className="wb-sargam" /> {t('stats.sargam')}</span>
          <span><i className="wb-strum" /> {t('stats.strum')}</span>
          <span><i className="wb-fingers" /> {t('stats.fingers')}</span>
        </div>
      </section>

      <section className="card">
        <div className="stats-head">
          <h3>सा {t('stats.sargam')}</h3>
          <a className="btn small" href="#/learn/sargam">{t('stats.practise')} →</a>
        </div>
        <div className="sargam-count">
          <div className="sc-main">
            <span className="sc-num">{counter}</span>
            <span className="sc-label">{t('sargam.countNow')}</span>
            <button type="button" className="sc-reset" disabled={!counter} onClick={() => ask(t('sargam.resetAsk'), () => setCounter(0))}>
              ↺ {t('sargam.reset')}
            </button>
          </div>
          <div className="sc-cell">
            <strong>{sargam.days?.[today] || 0}</strong>
            <span>{t('sargam.countToday')}</span>
          </div>
          <div className="sc-cell">
            <strong>{sargam.total || 0}</strong>
            <span>{t('sargam.countAll')}</span>
          </div>
          <div className="sc-cell">
            <strong>{Math.floor((sargam.secs?.[today] || 0) / 60)}</strong>
            <span>{t('sargam.countMins')}</span>
          </div>
          <div className="sc-cell">
            <strong>{Math.round(Object.values(sargam.secs || {}).reduce((a, b) => a + b, 0) / 60)}</strong>
            <span>{t('stats.minsAll')}</span>
          </div>
        </div>
        {exRows.length ? (
          <ul className="stats-list">
            {exRows.map(([id, n]) => (
              <li key={id}>
                <span>{exName(id)}</span>
                <strong>×{n}</strong>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t('sargam.reset')}
                  onClick={() => ask(t('stats.resetOne', { name: exName(id) }), () => setSargam((s) => ({ ...s, byEx: { ...s.byEx, [id]: 0 } })))}
                >
                  ↺
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">{t('stats.noneYet')}</p>
        )}
        {(sargam.total > 0 || counter > 0) && (
          <button
            type="button"
            className="link-btn small"
            onClick={() => ask(t('stats.resetSargamAsk'), () => {
              setSargam(EMPTY_SARGAM);
              setCounter(0);
            })}
          >
            ↺ {t('stats.resetSargam')}
          </button>
        )}
      </section>

      <section className="card">
        <div className="stats-head">
          <h3>🎸 {t('stats.strum')}</h3>
          <a className="btn small" href="#/strum">{t('stats.practise')} →</a>
        </div>
        <div className="sargam-count strum-count">
          <div className="sc-main">
            <span className="sc-num">{strum.today}</span>
            <span className="sc-label">{t('strum.countToday')}</span>
          </div>
          <div className="sc-cell">
            <strong>{strum.total}</strong>
            <span>{t('strum.countAll')}</span>
          </div>
          <div className="sc-cell">
            <strong>{patRows.length}</strong>
            <span>{t('stats.patternsUsed')}</span>
          </div>
        </div>
        {patRows.length ? (
          <ul className="stats-list">
            {patRows.map(([p, n]) => (
              <li key={p}>
                <span>
                  {patName(p)} <span className="mono muted small">{patternPreview(p)}</span>
                </span>
                <strong>×{n}</strong>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t('sargam.reset')}
                  onClick={() => ask(t('strum.resetAsk'), () => strum.reset(p))}
                >
                  ↺
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">{t('stats.noneYet')}</p>
        )}
        {strum.total > 0 && (
          <button type="button" className="link-btn small" onClick={() => ask(t('strum.resetAllAsk'), strum.resetAll)}>
            ↺ {t('strum.resetAll')}
          </button>
        )}
      </section>

      <section className="card">
        <div className="stats-head">
          <h3>✋ {t('stats.fingers')}</h3>
          <a className="btn small" href="#/learn/fingers">{t('stats.practise')} →</a>
        </div>
        <div className="sargam-count">
          <div className="sc-main">
            <span className="sc-num">{fCounter}</span>
            <span className="sc-label">{t('sargam.countNow')}</span>
            <button type="button" className="sc-reset" disabled={!fCounter} onClick={() => ask(t('sargam.resetAsk'), () => setFCounter(0))}>
              ↺ {t('sargam.reset')}
            </button>
          </div>
          <div className="sc-cell">
            <strong>{fingers.days?.[today] || 0}</strong>
            <span>{t('sargam.countToday')}</span>
          </div>
          <div className="sc-cell">
            <strong>{fingers.total || 0}</strong>
            <span>{t('sargam.countAll')}</span>
          </div>
          <div className="sc-cell">
            <strong>{Math.floor((fingers.secs?.[today] || 0) / 60)}</strong>
            <span>{t('sargam.countMins')}</span>
          </div>
          <div className="sc-cell">
            <strong>{Math.round(Object.values(fingers.secs || {}).reduce((a, b) => a + b, 0) / 60)}</strong>
            <span>{t('stats.minsAll')}</span>
          </div>
        </div>
        {fRows.length ? (
          <ul className="stats-list">
            {fRows.map(([id, n]) => (
              <li key={id}>
                <span>{fName(id)}</span>
                <strong>×{n}</strong>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t('sargam.reset')}
                  onClick={() => ask(t('stats.resetOne', { name: fName(id) }), () => setFingers((s) => ({ ...s, byEx: { ...s.byEx, [id]: 0 } })))}
                >
                  ↺
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">{t('stats.noneYet')}</p>
        )}
        {(fingers.total > 0 || fCounter > 0) && (
          <button
            type="button"
            className="link-btn small"
            onClick={() => ask(t('stats.resetSargamAsk'), () => {
              setFingers(EMPTY_FINGER_STATS);
              setFCounter(0);
            })}
          >
            ↺ {t('stats.resetFingers')}
          </button>
        )}
      </section>
    </div>
  );
}
