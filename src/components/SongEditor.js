import { useMemo, useState } from 'react';
import { parseSong, extractChords, convertChordSheet, isChordLine, sheetMeta } from '../music/songParser';
import { parseChord, isMinorSuffix } from '../music/theory';
import { SongBody } from './SongView';
import { useT } from '../i18n';
import { useMyPatterns } from '../hooks';
import { PRESET_PATTERNS } from '../music/strum';
import { patternPreview } from './StrumPattern';


const EXAMPLE = `{Mukhda}
[G]Write your lyrics with [D]chords in square brackets
[Em]Like this [C]line

{Antara}
| G | D | Em | C |

{Tab Intro riff}
e|-----0---|
B|---1---1-|

{Melody Hook}
E4 G4:0.5 A4:0.5 B4:2 -`;

export default function SongEditor({ song, onSave, onCancel }) {
  const t = useT();
  const [form, setForm] = useState(() => ({
    title: '',
    artist: '',
    key: '',
    capo: 0,
    bpm: 80,
    strum: 'D-DU-UDU',
    difficulty: 'Beginner',
    body: '',
    ...song,
    tags: (song?.tags || []).join(', '),
  }));
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const sections = useMemo(() => parseSong(form.body), [form.body]);
  const looksPasted = useMemo(() => form.body.split('\n').some(isChordLine), [form.body]);
  const [myPatterns] = useMyPatterns();
  const strumOptions = [['', t('editor.strumNone')]];
  for (const item of [...PRESET_PATTERNS, ...myPatterns]) {
    if (strumOptions.some(([v]) => v === item.pattern)) continue;
    const label = item.id.startsWith('p-') ? t(`strum.p.${item.id}`) : item.name;
    strumOptions.push([item.pattern, `${label} — ${patternPreview(item.pattern)}`]);
  }
  if (form.strum && !strumOptions.some(([v]) => v === form.strum)) strumOptions.push([form.strum, patternPreview(form.strum)]);

  // Pasting a chart from a chord website: format it at once and pick up title/key/tempo from it.
  const onPaste = (e) => {
    const text = e.clipboardData?.getData('text/plain');
    if (!text || !text.split('\n').some(isChordLine)) return;
    e.preventDefault();
    const el = e.target;
    const converted = convertChordSheet(text);
    const meta = sheetMeta(text);
    setForm((f) => {
      const body = f.body.slice(0, el.selectionStart) + converted + f.body.slice(el.selectionEnd);
      const next = { ...f, body };
      if (!f.title.trim() && meta.title) next.title = meta.title;
      if (!f.artist.trim() && meta.artist) next.artist = meta.artist;
      if (!String(f.key).trim() && meta.key) next.key = meta.key;
      if (meta.capo !== undefined && !Number(f.capo)) next.capo = meta.capo;
      if (meta.bpm) next.bpm = meta.bpm;
      if (meta.difficulty) next.difficulty = meta.difficulty;
      return next;
    });
  };

  const save = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError(t('editor.errTitle'));
    if (!form.body.trim()) return setError(t('editor.errBody'));
    let key = form.key.trim();
    if (!key) {
      const first = parseChord(extractChords(sections)[0] || '');
      if (first) key = first.root + (isMinorSuffix(first.suffix) ? 'm' : '');
    }
    onSave({
      ...form,
      key,
      title: form.title.trim(),
      capo: Number(form.capo) || 0,
      bpm: Number(form.bpm) || 0,
      tags: form.tags
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean),
    });
    return undefined;
  };

  return (
    <div className="page editor">
      <a className="back" href="#/songs" onClick={onCancel}>
        {t('song.back')}
      </a>
      <header className="page-head">
        <h1>{song?.id ? t('editor.titleEdit') : t('editor.titleNew')}</h1>
        <p>{song?.ai ? t('find.review') : t('editor.intro')}</p>
      </header>
      {song?.ai && <p className="song-note ai-note">{t('song.aiNote')}</p>}

      <form className="editor-grid" onSubmit={save}>
        <div className="card editor-form">
          <div className="form-row">
            <label className="field grow">
              <span>{t('editor.title')}</span>
              <input value={form.title} onChange={set('title')} placeholder="e.g. Tum Hi Ho" />
            </label>
            <label className="field grow">
              <span>{t('editor.artist')}</span>
              <input value={form.artist} onChange={set('artist')} placeholder="e.g. Arijit Singh · Aashiqui 2" />
            </label>
          </div>
          <div className="form-row">
            <label className="field">
              <span>{t('editor.key')}</span>
              <input value={form.key} onChange={set('key')} placeholder="auto" size={5} />
            </label>
            <label className="field">
              <span>{t('editor.capo')}</span>
              <input type="number" min="0" max="11" value={form.capo} onChange={set('capo')} />
            </label>
            <label className="field">
              <span>{t('editor.bpm')}</span>
              <input type="number" min="0" max="240" value={form.bpm} onChange={set('bpm')} />
            </label>
            <label className="field">
              <span>{t('editor.level')}</span>
              <select value={form.difficulty} onChange={set('difficulty')}>
                {['Beginner', 'Intermediate', 'Advanced'].map((d) => (
                  <option key={d} value={d}>
                    {t(`level.${d.toLowerCase()}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label className="field grow">
              <span>{t('editor.strum')}</span>
              <select value={form.strum} onChange={set('strum')}>
                {strumOptions.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="field grow">
              <span>{t('editor.tags')}</span>
              <input value={form.tags} onChange={set('tags')} placeholder="romantic, arijit" />
            </label>
          </div>
          <label className="field">
            <span>{t('editor.body')}</span>
            <textarea value={form.body} onChange={set('body')} onPaste={onPaste} placeholder={EXAMPLE} rows={18} spellCheck={false} className="mono" />
          </label>
          <div className="actions">
            <button
              type="button"
              className={`btn ${looksPasted ? 'primary' : ''}`}
              onClick={() => setForm((f) => ({ ...f, body: convertChordSheet(f.body) }))}
            >
              {t('editor.autoFormat')}
            </button>
            {looksPasted && <span className="muted small">{t('editor.detected')}</span>}
          </div>
          <details className="help">
            <summary>{t('editor.guide')}</summary>
            <ul>
              {['g1', 'g2', 'g3', 'g4', 'g5'].map((k) => (
                <li key={k}>{t(`editor.${k}`)}</li>
              ))}
            </ul>
          </details>
          {error && <div className="alert">{error}</div>}
          <div className="actions">
            <button type="submit" className="btn primary">
              {t('editor.save')}
            </button>
            <button type="button" className="btn" onClick={onCancel}>
              {t('editor.cancel')}
            </button>
          </div>
        </div>

        <div className="card editor-preview">
          <div className="eyebrow">{t('editor.preview')}</div>
          {sections.length ? <SongBody sections={sections} t={t} /> : <p className="muted">{t('editor.previewEmpty')}</p>}
        </div>
      </form>
    </div>
  );
}
