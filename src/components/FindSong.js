import { useEffect, useRef, useState } from 'react';
import { searchSongs } from '../services/songSearch';
import { arrangeSong, friendlyError } from '../services/arranger';
import { useLocalStorage } from '../hooks';
import { useT } from '../i18n';

function usePreviewAudio() {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(null);
  const toggle = (song) => {
    if (playing === song.id) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    audio.current?.pause();
    const a = new Audio(song.preview);
    a.onended = () => setPlaying(null);
    a.play().catch(() => setPlaying(null));
    audio.current = a;
    setPlaying(song.id);
  };
  useEffect(() => () => audio.current?.pause(), []);
  return { playing, toggle, pause: () => { audio.current?.pause(); setPlaying(null); } };
}

export default function FindSong({ initialQuery = '', onDraft }) {
  const t = useT();
  const [apiKey] = useLocalStorage('riyaaz.apiKey', '');
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [job, setJob] = useState(null); // { song, stage }
  const abort = useRef(null);
  const preview = usePreviewAudio();

  const runSearch = async (term) => {
    if (!term.trim()) return;
    setSearching(true);
    setError('');
    try {
      setResults(await searchSongs(term.trim()));
    } catch {
      setError(t('find.searchError'));
      setResults(null);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (initialQuery) runSearch(initialQuery);
    return () => abort.current?.abort();
    // run once for the query we were opened with
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manual = (song) =>
    onDraft({
      title: song?.title || q.trim(),
      artist: song ? [song.artist, song.album].filter(Boolean).join(' · ') : '',
      preview: song?.preview ? { url: song.preview, artwork: song.artwork } : null,
      body: '',
    });

  const getChords = async (song) => {
    preview.pause();
    setError('');
    const ctrl = new AbortController();
    abort.current = ctrl;
    setJob({ song, stage: 'research' });
    try {
      const draft = await arrangeSong(apiKey, song, {
        signal: ctrl.signal,
        onStep: (stage) => setJob((j) => (j ? { ...j, stage } : j)),
      });
      if (ctrl.signal.aborted) return;
      setJob(null);
      if (!draft) {
        setError(t('find.notFound'));
        return;
      }
      onDraft(draft);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setJob(null);
      setError(t('find.error', { msg: friendlyError(e) }));
    }
  };

  const cancel = () => {
    abort.current?.abort();
    setJob(null);
  };

  return (
    <div className="page find">
      <a className="back" href="#/songs">
        {t('song.back')}
      </a>
      <header className="page-head">
        <h1>{t('find.title')}</h1>
        <p>{t('find.subtitle')}</p>
      </header>

      <form
        className="search-row"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(q);
        }}
      >
        <input
          className="search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('find.placeholder')}
          autoFocus={!initialQuery}
          enterKeyHint="search"
        />
        <button type="submit" className="btn primary" disabled={searching || !q.trim()}>
          {searching ? t('find.searching') : t('find.search')}
        </button>
      </form>

      {!apiKey && (
        <div className="card notice">
          <p>{t('find.needKey')}</p>
          <a className="btn small" href="#/settings">
            {t('find.openSettings')}
          </a>
        </div>
      )}

      {job && (
        <div className="card job">
          <div className="spinner" aria-hidden="true" />
          <div className="job-text">
            <strong>{t('find.working', { title: job.song.title })}</strong>
            <span className="muted">{job.stage === 'research' ? t('find.step1') : t('find.step2')}</span>
            <span className="muted small">{t('find.slow')}</span>
          </div>
          <button type="button" className="btn small" onClick={cancel}>
            {t('editor.cancel')}
          </button>
        </div>
      )}

      {error && <div className="alert">{error}</div>}

      {results && !results.length && (
        <div className="empty">
          <p>{t('find.noResults')}</p>
          <button type="button" className="btn" onClick={() => manual(null)}>
            {t('find.addManual')}
          </button>
        </div>
      )}

      {results && results.length > 0 && (
        <ul className="results">
          {results.map((s) => (
            <li key={s.id} className="result">
              {s.artwork ? <img src={s.artwork} alt="" className="art" loading="lazy" /> : <div className="art" />}
              <div className="result-info">
                <strong>{s.title}</strong>
                <span className="muted small">
                  {s.artist}
                  {s.album ? ` · ${s.album}` : ''}
                  {s.year ? ` · ${s.year}` : ''}
                </span>
                <div className="result-actions">
                  {s.preview && (
                    <button type="button" className="chip" onClick={() => preview.toggle(s)}>
                      {preview.playing === s.id ? '❚❚' : '▶'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn small primary"
                    disabled={!apiKey || !!job}
                    onClick={() => getChords(s)}
                  >
                    {t('find.getChords')}
                  </button>
                  <button type="button" className="btn small" disabled={!!job} onClick={() => manual(s)}>
                    {t('find.addManual')}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="muted small">{t('find.lyricsNote')}</p>
    </div>
  );
}
