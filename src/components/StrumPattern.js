import { useState } from 'react';
import { useStrumLoop } from '../audio/useStrumLoop';
import { parsePattern, stepLabel, formatPattern } from '../music/strum';
import { useStrumCounts } from '../hooks';
import { useT } from '../i18n';

export const ARROWS = { D: '↓', U: '↑', X: '✕', '-': '' };

/** Pattern boxes. Pass onTap to make them editable. */
export function StrumGrid({ pattern, active = -1, onTap }) {
  const { sub, slots } = parsePattern(pattern);
  const n = slots.length;
  const cols = n <= 8 ? n : n % 8 === 0 ? 8 : 6;
  return (
    <div className={`strum-grid ${onTap ? 'editable' : ''}`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {slots.map((s, i) => {
        const cls = `strum-slot ${s === '-' ? 'rest' : ''} ${s === 'X' ? 'mute' : ''} ${active === i ? 'now' : ''} ${i % sub === 0 ? 'on-beat' : ''}`;
        const inner = (
          <>
            <span className="strum-arrow">{ARROWS[s] ?? s}</span>
            <span className="strum-count">{stepLabel(i, sub)}</span>
          </>
        );
        return onTap ? (
          <button key={i} type="button" className={cls} onClick={() => onTap(i)} aria-label={`${stepLabel(i, sub)}: ${s}`}>
            {inner}
          </button>
        ) : (
          <div key={i} className={cls}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/** Compact text preview: ↓ · ↓↑ · ↑↓↑ */
export function patternPreview(pattern) {
  const { sub, slots } = parsePattern(pattern);
  const beats = [];
  for (let i = 0; i < slots.length; i += sub) {
    beats.push(
      slots
        .slice(i, i + sub)
        .map((s) => (s === '-' ? '·' : ARROWS[s]))
        .join('')
    );
  }
  return beats.join(' ');
}

/** Times-played counter for one strumming pattern, with Reset (same look as the sargam counter). */
export function StrumCounter({ pattern, counts, full = false }) {
  const t = useT();
  const n = counts.forPattern(pattern);
  return (
    <div className={`sargam-count strum-count ${full ? '' : 'compact'}`} aria-live="polite">
      <div className="sc-main">
        <span className="sc-num">{n}</span>
        <span className="sc-label">{t('strum.countThis')}</span>
        <button type="button" className="sc-reset" disabled={!n} onClick={() => window.confirm(t('strum.resetAsk')) && counts.reset(pattern)}>
          ↺ {t('sargam.reset')}
        </button>
      </div>
      {full && (
        <>
          <div className="sc-cell">
            <strong>{counts.today}</strong>
            <span>{t('strum.countToday')}</span>
          </div>
          <div className="sc-cell">
            <strong>{counts.total}</strong>
            <span>{t('strum.countAll')}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function StrumPattern({ title, pattern = 'D-DU-UDU', chords = ['G'], bpm: initialBpm = 72, picker, studioHref }) {
  const t = useT();
  const [bpm, setBpm] = useState(initialBpm);
  const counts = useStrumCounts();
  const key = formatPattern(parsePattern(pattern));
  const { playing, pos, toggle } = useStrumLoop({ pattern, chords, bpm, onBar: () => counts.add(key) });
  const current = pos ? pos.chord : -1;

  return (
    <div className="strum card-inset">
      <div className="strum-head">
        {title && <strong>{title}</strong>}
        <span className="muted small">
          {t('strum.chords')}{' '}
          {chords.map((c, i) => (
            <span key={i} className={`strum-chord ${playing && current === i ? 'on' : ''}`}>
              {c}
            </span>
          ))}
        </span>
      </div>
      {picker}
      <StrumGrid pattern={pattern} active={pos ? pos.step : -1} />
      <StrumCounter pattern={key} counts={counts} />
      <div className="strum-controls">
        <button type="button" className="btn primary" onClick={toggle}>
          {playing ? t('strum.stop') : t('strum.play')}
        </button>
        <label className="range">
          <span>{bpm} BPM</span>
          <input type="range" min="40" max="160" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
        </label>
        {studioHref && (
          <a className="btn small" href={studioHref}>
            {t('strum.openStudio')}
          </a>
        )}
      </div>
    </div>
  );
}
