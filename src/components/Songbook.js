import { useMemo, useRef, useState } from 'react';
import { BUILTIN_SONGS } from '../data/songs';
import { parseSong, extractChords } from '../music/songParser';
import { useLocalStorage, navigate } from '../hooks';
import { saveTextFile } from '../native';
import { useT } from '../i18n';
import Karaoke from './Karaoke';
import SongView from './SongView';
import SongEditor from './SongEditor';
import FindSong from './FindSong';

const FILTERS = ['all', 'fav', 'mine', 'film', 'ai', 'patriotic', 'bhajan', 'practice'];

function SongList({ songs, favs, onImport, onExport, mineCount }) {
  const t = useT();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useLocalStorage('riyaaz.songFilter', 'all');
  const fileRef = useRef(null);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return songs.filter((s) => {
      if (filter === 'fav' && !favs.includes(s.id)) return false;
      if (filter === 'mine' && s.source !== 'user') return false;
      if (!['all', 'fav', 'mine'].includes(filter) && !(s.tags || []).includes(filter)) return false;
      if (!needle) return true;
      return [s.title, s.artist, ...(s.tags || [])].join(' ').toLowerCase().includes(needle);
    });
  }, [songs, favs, q, filter]);

  const findUrl = `#/songs/find${q.trim() ? `/${encodeURIComponent(q.trim())}` : ''}`;

  return (
    <div className="page songbook">
      <header className="page-head">
        <h1>{t('songs.title')}</h1>
        <p>{t('songs.subtitle')}</p>
      </header>

      <a className="find-banner" href={findUrl}>
        <span className="find-icon">🔍</span>
        <span>
          <strong>{t('songs.find').replace('🔍 ', '')}</strong>
          <span className="muted small">{t('find.subtitle')}</span>
        </span>
        <span className="find-arrow">→</span>
      </a>

      <div className="search-row">
        <input className="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('songs.search')} />
        <a className="btn" href="#/songs/new">
          {t('songs.new')}
        </a>
      </div>

      <div className="chips-row">
        {FILTERS.map((id) => (
          <button key={id} type="button" className={`chip ${filter === id ? 'on' : ''}`} onClick={() => setFilter(id)}>
            {t(`songs.filter.${id}`)}
          </button>
        ))}
      </div>

      <div className="song-grid">
        {list.map((s) => {
          const chords = extractChords(parseSong(s.body)).slice(0, 5);
          return (
            <a key={s.id} className="song-card" href={`#/songs/${encodeURIComponent(s.id)}`}>
              <div className="song-card-top">
                {s.preview?.artwork && <img className="card-art" src={s.preview.artwork} alt="" loading="lazy" />}
                <div className="grow">
                  <h3>{s.title}</h3>
                  <p className="muted small">{s.artist || '—'}</p>
                </div>
                {favs.includes(s.id) && <span className="fav">★</span>}
              </div>
              <div className="song-card-chords">
                {chords.map((c) => (
                  <span key={c} className="mini-chord">
                    {c}
                  </span>
                ))}
              </div>
              <div className="song-card-meta">
                {s.key && <span>{t('songs.key', { k: s.key })}</span>}
                {s.difficulty && <span className={`diff-${s.difficulty.toLowerCase()}`}>{t(`level.${s.difficulty.toLowerCase()}`)}</span>}
                {s.ai && <span className="mine">{t('songs.ai')}</span>}
                {s.source === 'user' && !s.ai && <span className="mine">{t('songs.mine')}</span>}
              </div>
            </a>
          );
        })}
        {!list.length && (
          <div className="empty">
            <p>{t('songs.noMatch')}</p>
            <a className="btn primary" href={findUrl}>
              {q.trim() ? t('songs.findOnline', { q: q.trim() }) : t('songs.find')}
            </a>
          </div>
        )}
      </div>

      <section className="card info">
        <h3>{t('songs.infoTitle')}</h3>
        <p className="muted">{t('songs.infoText')}</p>
        <div className="actions">
          <button type="button" className="btn small" onClick={onExport} disabled={!mineCount}>
            {t('songs.export', { n: mineCount })}
          </button>
          <button type="button" className="btn small" onClick={() => fileRef.current?.click()}>
            {t('songs.import')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = '';
            }}
          />
        </div>
      </section>
    </div>
  );
}

export default function Songbook({ route }) {
  const t = useT();
  const [userSongs, setUserSongs] = useLocalStorage('riyaaz.songs', []);
  const [favs, setFavs] = useLocalStorage('riyaaz.favs', []);
  const [draft, setDraft] = useState(null); // song prepared by Find a song, waiting in the editor
  const all = useMemo(() => [...userSongs.map((s) => ({ ...s, source: 'user' })), ...BUILTIN_SONGS], [userSongs]);
  const [id, action] = route;

  const save = (data) => {
    const isExisting = data.id && userSongs.some((s) => s.id === data.id);
    const song = { ...data, id: isExisting ? data.id : `u-${Date.now()}`, source: 'user' };
    setUserSongs((list) => (isExisting ? list.map((s) => (s.id === song.id ? song : s)) : [song, ...list]));
    setDraft(null);
    navigate(`/songs/${encodeURIComponent(song.id)}`);
  };

  const exportSongs = async () => {
    try {
      await saveTextFile('riyaaz-songs.json', JSON.stringify(userSongs, null, 2));
    } catch (e) {
      // Closing the share sheet without choosing a target is not an error worth showing.
      if (!/cancel/i.test(e?.message || '')) window.alert(t('songs.exportFailed', { msg: e.message }));
    }
  };

  const importSongs = async (file) => {
    try {
      const data = JSON.parse(await file.text());
      const arr = (Array.isArray(data) ? data : [data]).filter((s) => s && typeof s.title === 'string' && typeof s.body === 'string');
      if (!arr.length) throw new Error('No songs found in that file.');
      const stamp = Date.now();
      setUserSongs((list) => [
        ...arr.map((s, i) => ({ ...s, id: `u-${stamp}-${i}`, source: 'user', tags: Array.isArray(s.tags) ? s.tags : [] })),
        ...list,
      ]);
      window.alert(t('songs.imported', { n: arr.length }));
    } catch (e) {
      window.alert(t('songs.importFailed', { msg: e.message }));
    }
  };

  if (id === 'find') {
    return (
      <FindSong
        key={action || ''}
        initialQuery={action || ''}
        onDraft={(d) => {
          setDraft(d);
          navigate('/songs/new');
        }}
      />
    );
  }

  if (id === 'new') {
    return (
      <SongEditor
        key={draft ? 'draft' : 'blank'}
        song={draft}
        onSave={save}
        onCancel={() => {
          setDraft(null);
          navigate('/songs');
        }}
      />
    );
  }

  const song = all.find((s) => s.id === id);
  if (song && action === 'edit' && song.source === 'user') {
    const cancel = () => {
      // An empty copy made by "Add full lyrics" that was never filled in: remove it again.
      if (!song.body.trim()) {
        setUserSongs((list) => list.filter((s) => s.id !== song.id));
        navigate('/songs');
      } else navigate(`/songs/${encodeURIComponent(song.id)}`);
    };
    return <SongEditor key={song.id} song={song} onSave={save} onCancel={cancel} />;
  }
  if (song && action === 'karaoke') return <Karaoke key={song.id} song={song} />;
  if (song) {
    return (
      <SongView
        key={song.id}
        song={song}
        isFav={favs.includes(song.id)}
        onToggleFav={() => setFavs((f) => (f.includes(song.id) ? f.filter((x) => x !== song.id) : [...f, song.id]))}
        onDelete={() => {
          if (window.confirm(t('songs.deleteConfirm', { title: song.title }))) {
            setUserSongs((list) => list.filter((s) => s.id !== song.id));
            setFavs((f) => f.filter((x) => x !== song.id));
            navigate('/songs');
          }
        }}
        onAddLyrics={() => {
          // Your own copy of the song for the words you paste; it stays on this phone only.
          const copy = { ...song, id: `u-${Date.now()}`, source: 'user', body: '', note: '' };
          setUserSongs((list) => [copy, ...list]);
          navigate(`/songs/${copy.id}/edit`);
        }}
        onDuplicate={() => {
          const copy = { ...song, id: `u-${Date.now()}`, title: t('songs.myVersion', { title: song.title }), source: 'user' };
          setUserSongs((list) => [copy, ...list]);
          navigate(`/songs/${copy.id}/edit`);
        }}
      />
    );
  }

  return <SongList songs={all} favs={favs} mineCount={userSongs.length} onExport={exportSongs} onImport={importSongs} />;
}
