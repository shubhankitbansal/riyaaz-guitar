import { useEffect, useMemo, useRef, useState } from 'react';
import { parseSong, extractChords } from '../music/songParser';
import { transposeChord, parseChord, noteIndex, isChord, isMinorSuffix } from '../music/theory';
import { getChordShape } from '../music/chords';
import { melodyToTab, transposeMelody, midiLabel } from '../music/melody';
import { buildTimeline, collectMelody, lyricPos, barPos } from '../music/arrangement';
import { strumChord } from '../audio/synth';
import { useSongPlayer } from '../audio/useSongPlayer';
import { youtubeSearchUrl } from '../services/songSearch';
import { ChordCard } from './ChordDiagram';
import StrumPattern, { patternPreview } from './StrumPattern';
import { useLocalStorage, useMyPatterns } from '../hooks';
import { parsePattern, PRESET_PATTERNS } from '../music/strum';
import { useT } from '../i18n';

const EASY_KEYS = ['G', 'C', 'D', 'A', 'E', 'Em', 'Am', 'Dm'];

function sameKey(a, b) {
  const x = parseChord(a);
  const y = parseChord(b);
  return !!x && !!y && noteIndex(x.root) === noteIndex(y.root) && isMinorSuffix(x.suffix) === isMinorSuffix(y.suffix);
}

function groupTabs(lines) {
  const out = [];
  for (const l of lines) {
    const last = out[out.length - 1];
    if (l.type === 'tab' && last?.type === 'tabblock') last.text += '\n' + l.text;
    else if (l.type === 'tab') out.push({ type: 'tabblock', text: l.text });
    else out.push(l);
  }
  return out;
}

const sectionNotes = (sec) => sec.lines.filter((l) => l.type === 'melody').flatMap((l) => l.notes);

function MelodySection({ sec, semis, beatsPerBar, onPlay, playing, t }) {
  // Shown relative to the capo (the shapes you play); played at real pitch by the caller.
  const notes = transposeMelody(sectionNotes(sec), semis);
  if (!notes.length) return null;
  return (
    <div className="melody">
      <div className="melody-notes">
        {notes.map((n, i) => (
          <span key={i} className={`mnote ${n.midi === null ? 'rest' : ''}`} style={{ flexGrow: n.beats }}>
            {n.midi === null ? '–' : midiLabel(n.midi).replace(/(\d)$/, '')}
            {n.midi !== null && <sub>{Math.floor(n.midi / 12) - 1}</sub>}
          </span>
        ))}
      </div>
      <pre className="tab">{melodyToTab(notes, beatsPerBar)}</pre>
      <button type="button" className="btn small" onClick={() => onPlay(sectionNotes(sec))}>
        {playing ? t('song.stopMelody') : t('song.playMelody')}
      </button>
    </div>
  );
}

export function SongBody({ sections, semis = 0, fontScale = 1, activePos = null, beatsPerBar = 4, onPlayMelody, melodyPlaying, t }) {
  const show = (c) => transposeChord(c, semis);
  const play = (c) => {
    const s = getChordShape(show(c));
    if (s) strumChord(s);
  };
  const chordBtn = (c, pos) =>
    isChord(c) ? (
      <button key={pos} type="button" data-pos={pos} className={`chord-tag ${activePos === pos ? 'playing' : ''}`} onClick={() => play(c)}>
        {show(c)}
      </button>
    ) : (
      <span key={pos} className="chord-note">
        {c}
      </span>
    );

  return (
    <div className="song-body" style={{ fontSize: `${fontScale}rem` }}>
      {sections.map((sec, si) => (
        <section key={si} className="song-section">
          {sec.name && <h3 className="section-name">{sec.name}</h3>}
          {sec.isMelody && onPlayMelody ? (
            <MelodySection sec={sec} semis={semis} beatsPerBar={beatsPerBar} onPlay={onPlayMelody} playing={melodyPlaying} t={t} />
          ) : null}
          {groupTabs(sec.lines).map((ln, li) => {
            if (ln.type === 'melody') return sec.isMelody && onPlayMelody ? null : <div key={li} className="lyric-plain mono">{ln.notes.map((n) => (n.midi === null ? '-' : midiLabel(n.midi))).join(' ')}</div>;
            if (ln.type === 'empty') return <div key={li} className="spacer" />;
            if (ln.type === 'tabblock')
              return (
                <pre key={li} className="tab">
                  {ln.text}
                </pre>
              );
            if (ln.type === 'bars')
              return (
                <div key={li} className="bars">
                  {ln.bars.map((bar, bi) => (
                    <div key={bi} className="bar">
                      {bar.map((tok, ti) => chordBtn(tok, barPos(si, li, bi, ti)))}
                    </div>
                  ))}
                </div>
              );
            const hasChord = ln.segments.some((s) => s.chord !== null);
            if (!hasChord)
              return (
                <div key={li} className="lyric-plain">
                  {ln.segments.map((s) => s.text).join('')}
                </div>
              );
            return (
              <div key={li} className="lyric-line">
                {ln.segments.map((s, gi) => (
                  <span key={gi} className={`seg ${activePos && activePos === lyricPos(si, li, gi) ? 'playing' : ''}`}>
                    <span className="chord-slot">{s.chord !== null ? chordBtn(s.chord, lyricPos(si, li, gi)) : ' '}</span>
                    <span className="lyric">{s.text || ' '}</span>
                  </span>
                ))}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function PreviewButton({ url, t }) {
  const audio = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => () => audio.current?.pause(), []);
  const toggle = () => {
    if (on) {
      audio.current?.pause();
      setOn(false);
      return;
    }
    if (!audio.current) {
      audio.current = new Audio(url);
      audio.current.onended = () => setOn(false);
    }
    audio.current.play().then(() => setOn(true)).catch(() => setOn(false));
  };
  return (
    <button type="button" className="btn small" onClick={toggle}>
      {on ? t('song.pausePreview') : t('song.preview')}
    </button>
  );
}

export default function SongView({ song, isFav, onToggleFav, onDelete, onDuplicate, onAddLyrics }) {
  const t = useT();
  const [transpose, setTranspose] = useState(0);
  const [capo, setCapo] = useState(Number(song.capo) || 0);
  const [fontScale, setFontScale] = useLocalStorage('riyaaz.fontScale', 1);
  const [scrolling, setScrolling] = useState(false);
  const [speed, setSpeed] = useState(4);
  const player = useSongPlayer();

  const sections = useMemo(() => parseSong(song.body), [song.body]);
  const chords = useMemo(() => extractChords(sections), [sections]);
  const hasWords = useMemo(
    () => sections.some((sec) => sec.lines.some((l) => l.type === 'lyric' && l.segments.some((g) => g.chord && /[^\s“”"….]/.test(g.text) && g.text.trim().length > 12))),
    [sections]
  );
  const [strumChoice, setStrumChoice] = useLocalStorage(`riyaaz.songStrum.${song.id}`, '');
  const [myPatterns] = useMyPatterns();
  const pattern = strumChoice || song.strum || 'D-DU-UDU';
  const beatsPerBar = parsePattern(pattern).beats;
  const patternOptions = useMemo(() => {
    const seen = new Set([song.strum || 'D-DU-UDU']);
    const out = [];
    for (const item of [...myPatterns, ...PRESET_PATTERNS]) {
      if (seen.has(item.pattern)) continue;
      seen.add(item.pattern);
      out.push(item);
    }
    return out;
  }, [myPatterns, song.strum]);
  const timeline = useMemo(() => buildTimeline(sections, beatsPerBar), [sections, beatsPerBar]);
  const melody = useMemo(() => collectMelody(sections), [sections]);
  const songBpm = Number(song.bpm) || 80;
  const [bpm, setBpm] = useLocalStorage(`riyaaz.songBpm.${song.id}`, songBpm);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const getBpm = () => bpmRef.current;
  const changeBpm = (d) => setBpm((x) => Math.max(30, Math.min(240, x + d)));

  const semis = transpose - capo;
  const shown = [...new Set(chords.map((c) => transposeChord(c, semis)))];
  const soundingKey = song.key && isChord(song.key) ? transposeChord(song.key, transpose) : null;
  const shapeKey = soundingKey ? transposeChord(soundingKey, -capo) : null;

  const suggestions = useMemo(() => {
    if (!soundingKey) return [];
    const out = [];
    for (let c = 0; c <= 7; c++) {
      const k = transposeChord(soundingKey, -c);
      const easy = EASY_KEYS.find((e) => sameKey(e, k));
      if (easy) out.push({ capo: c, key: easy });
    }
    return out.slice(0, 4);
  }, [soundingKey]);

  // Follow the chord being played.
  useEffect(() => {
    if (!player.pos) return;
    const el = document.querySelector(`[data-pos="${player.pos}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [player.pos]);

  useEffect(() => {
    if (!scrolling) return undefined;
    let raf;
    let last = performance.now();
    let acc = 0;
    const step = (now) => {
      acc += (now - last) * speed * 0.006;
      last = now;
      if (acc >= 1) {
        const px = Math.floor(acc);
        window.scrollBy(0, px);
        acc -= px;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        setScrolling(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [scrolling, speed]);

  const isUser = song.source === 'user';
  const songPlaying = player.mode === 'song';

  const toggleSong = () => {
    if (songPlaying) player.stop();
    else {
      setScrolling(false);
      // Chords are sounding pitch + transpose; the synth plays real pitch, so ignore the capo here.
      player.playSong({ events: timeline, pattern, bpm, getBpm, semis: transpose });
    }
  };

  const toggleMelody = (notes) => {
    if (player.mode === 'melody') player.stop();
    else player.playMelody({ notes: transposeMelody(notes || melody, transpose), bpm, getBpm });
  };

  return (
    <div className="page song-view">
      <div className="song-top">
        <a className="back" href="#/songs">
          {t('song.back')}
        </a>
        <div className="actions">
          <button type="button" className={`icon-btn ${isFav ? 'fav' : ''}`} onClick={onToggleFav} aria-label="★">
            {isFav ? '★' : '☆'}
          </button>
          {isUser ? (
            <>
              <a className="btn small" href={`#/songs/${encodeURIComponent(song.id)}/edit`}>
                {t('song.edit')}
              </a>
              <button type="button" className="btn small danger" onClick={onDelete}>
                {t('song.delete')}
              </button>
            </>
          ) : (
            <button type="button" className="btn small" onClick={onDuplicate}>
              {t('song.copyEdit')}
            </button>
          )}
        </div>
      </div>

      <header className="page-head song-head">
        {song.preview?.artwork && <img className="song-art" src={song.preview.artwork} alt="" />}
        <div>
          <h1>{song.title}</h1>
          <p className="muted">{song.artist}</p>
          <div className="meta-chips">
            {soundingKey && <span className="meta">{t('songs.key', { k: soundingKey })}</span>}
            {capo > 0 && <span className="meta">{t('song.capoShapes', { n: capo, k: shapeKey })}</span>}
            {song.bpm ? <span className="meta">{t('song.bpm', { n: song.bpm })}</span> : null}
            {song.difficulty && (
              <span className={`meta diff-${song.difficulty.toLowerCase()}`}>{t(`level.${song.difficulty.toLowerCase()}`)}</span>
            )}
            {song.ai && <span className="meta ai">{t('songs.ai')}</span>}
          </div>
        </div>
      </header>
      {song.ai && <p className="song-note ai-note">{t('song.aiNote')}</p>}
      {song.note && <p className="song-note">{song.note}</p>}
      {song.source !== 'user' && onAddLyrics && !hasWords && (
        <div className="card add-lyrics">
          <div>
            <strong>{t('song.addLyricsTitle')}</strong>
            <p className="muted small">{t('song.addLyricsText')}</p>
          </div>
          <button type="button" className="btn primary" onClick={onAddLyrics}>
            📝 {t('song.addLyrics')}
          </button>
        </div>
      )}

      <div className="play-row">
        {timeline.length > 0 && (
          <button type="button" className={`btn ${songPlaying ? '' : 'primary'}`} onClick={toggleSong}>
            {songPlaying ? t('song.stopSong') : t('song.playSong')}
          </button>
        )}
        {timeline.length > 0 && (
          <a className="btn" href={`#/songs/${encodeURIComponent(song.id)}/karaoke`} onClick={() => player.stop()}>
            🎤 {t('song.karaoke')}
          </a>
        )}
        {melody.some((n) => n.midi !== null) && (
          <button type="button" className="btn" onClick={() => toggleMelody()}>
            {player.mode === 'melody' ? t('song.stopMelody') : t('song.playMelody')}
          </button>
        )}
        {song.preview?.url && <PreviewButton url={song.preview.url} t={t} />}
        <a className="btn small" href={youtubeSearchUrl(song)} target="_blank" rel="noopener noreferrer">
          {t('song.youtube')} ↗
        </a>
      </div>

      <div className="song-toolbar">
        <div className="tool tempo-tool">
          <span>{t('song.tempo')}</span>
          <div className="stepper">
            <button type="button" onClick={() => changeBpm(-5)} aria-label="−">−</button>
            <span>{bpm}</span>
            <button type="button" onClick={() => changeBpm(5)} aria-label="+">+</button>
          </div>
          {bpm !== songBpm && (
            <button type="button" className="link-btn small" onClick={() => setBpm(songBpm)}>
              {t('song.tempoReset', { n: songBpm })}
            </button>
          )}
        </div>
        <div className="tool">
          <span>{t('song.transpose')}</span>
          <div className="stepper">
            <button type="button" onClick={() => setTranspose((x) => x - 1)} aria-label="−">−</button>
            <span>{transpose > 0 ? `+${transpose}` : transpose}</span>
            <button type="button" onClick={() => setTranspose((x) => x + 1)} aria-label="+">+</button>
          </div>
        </div>
        <label className="tool">
          <span>{t('song.capo')}</span>
          <select value={capo} onChange={(e) => setCapo(Number(e.target.value))}>
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i} value={i}>
                {i === 0 ? t('song.none') : t('song.fret', { n: i })}
              </option>
            ))}
          </select>
        </label>
        <div className="tool">
          <span>{t('song.text')}</span>
          <div className="stepper">
            <button type="button" onClick={() => setFontScale((f) => Math.max(0.8, +(f - 0.1).toFixed(1)))} aria-label="A−">A−</button>
            <button type="button" onClick={() => setFontScale((f) => Math.min(1.8, +(f + 0.1).toFixed(1)))} aria-label="A+">A+</button>
          </div>
        </div>
        <div className="tool">
          <span>{t('song.autoScroll')}</span>
          <div className="stepper">
            <button type="button" className={scrolling ? 'on' : ''} onClick={() => setScrolling((s) => !s)}>
              {scrolling ? '❚❚' : '▶'}
            </button>
            <input type="range" min="1" max="10" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="speed" />
          </div>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="suggestions">
          <span className="muted small">{t('song.easyShapes')}</span>
          {suggestions.map((s) => (
            <button key={s.capo} type="button" className={`chip ${capo === s.capo ? 'on' : ''}`} onClick={() => setCapo(s.capo)}>
              {s.capo === 0 ? t('song.noCapo') : `${t('song.capo')} ${s.capo}`} → {s.key}
            </button>
          ))}
        </div>
      )}

      {shown.length > 0 && (
        <section className="chord-strip">
          {shown.map((c) => (
            <ChordCard key={c} name={c} size={0.8} />
          ))}
        </section>
      )}

      {shown.length > 0 && (
        <StrumPattern
          key={pattern}
          title={t('song.strumTitle')}
          pattern={pattern}
          chords={shown.slice(0, 4)}
          bpm={bpm}
          studioHref={`#/strum/${encodeURIComponent(pattern)}/${encodeURIComponent(shown.slice(0, 4).join(' '))}`}
          picker={
            <label className="field pattern-select">
              <span>{t('song.pattern')}</span>
              <select
                value={strumChoice && strumChoice !== song.strum ? strumChoice : ''}
                onChange={(e) => {
                  player.stop();
                  setStrumChoice(e.target.value);
                }}
              >
                <option value="">
                  {song.strum ? t('song.patternSong', { p: patternPreview(song.strum) }) : t('song.patternDefault', { p: patternPreview('D-DU-UDU') })}
                </option>
                {patternOptions.map((item) => (
                  <option key={item.id} value={item.pattern}>
                    {(item.id.startsWith('p-') ? t(`strum.p.${item.id}`) : item.name) + ' — ' + patternPreview(item.pattern)}
                  </option>
                ))}
              </select>
            </label>
          }
        />
      )}

      <SongBody
        sections={sections}
        semis={semis}
        fontScale={fontScale}
        activePos={player.pos}
        beatsPerBar={beatsPerBar}
        onPlayMelody={toggleMelody}
        melodyPlaying={player.mode === 'melody'}
        t={t}
      />
    </div>
  );
}
