import { useEffect, useMemo, useRef, useState } from 'react';
import { parseSong } from '../music/songParser';
import { buildTimeline } from '../music/arrangement';
import { transposeChord, isChord } from '../music/theory';
import { parsePattern } from '../music/strum';
import { useSongPlayer } from '../audio/useSongPlayer';
import { getAudioContext, getRecordTap, setMusicVolume } from '../audio/synth';
import { saveBlobFile, APP_PAUSE_EVENT } from '../native';
import { useLocalStorage } from '../hooks';
import { useT } from '../i18n';

const lineKey = (pos) => (pos ? pos.split('-').slice(0, 2).join('-') : null);

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) {
    if (MediaRecorder.isTypeSupported?.(m)) return m;
  }
  return '';
}

/** Karaoke: the song's own lines, big, following the backing track; optionally record yourself over it. */
export default function Karaoke({ song }) {
  const t = useT();
  const player = useSongPlayer();
  const [strumChoice] = useLocalStorage(`riyaaz.songStrum.${song.id}`, '');
  const [volume, setVolume] = useLocalStorage('riyaaz.karaoke.volume', 1);
  const [record, setRecord] = useLocalStorage('riyaaz.karaoke.record', false);
  const [shift, setShift] = useState(0); // singer's key change in semitones
  const [tempo, setTempo] = useState(Number(song.bpm) || 80);
  const [take, setTake] = useState(null); // { url, blob, ext }
  const [error, setError] = useState('');
  const rec = useRef(null);
  const listRef = useRef(null);

  const pattern = strumChoice || song.strum || 'D-DU-UDU';
  const beats = parsePattern(pattern).beats;
  const sections = useMemo(() => parseSong(song.body), [song.body]);
  const timeline = useMemo(() => buildTimeline(sections, beats), [sections, beats]);

  // Flatten into karaoke rows: section titles, lyric lines and chord-bar lines.
  const rows = useMemo(() => {
    const out = [];
    sections.forEach((sec, si) => {
      if (sec.isTab || sec.isMelody) return;
      if (sec.name) out.push({ type: 'section', key: `s${si}`, name: sec.name });
      sec.lines.forEach((ln, li) => {
        if (ln.type === 'lyric' || ln.type === 'bars') out.push({ ...ln, key: `${si}-${li}` });
      });
    });
    return out;
  }, [sections]);

  const playing = player.mode === 'song';
  const activeLine = lineKey(player.pos);
  const lineOrder = useMemo(() => rows.filter((r) => r.type !== 'section').map((r) => r.key), [rows]);
  const activeIdx = lineOrder.indexOf(activeLine);

  useEffect(() => {
    setMusicVolume(volume);
    return () => setMusicVolume(1);
  }, [volume]);

  // Keep the current line in the middle of the screen.
  useEffect(() => {
    if (!activeLine || !listRef.current) return;
    listRef.current.querySelector(`[data-line="${activeLine}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeLine]);

  const stopRecording = () => {
    const r = rec.current;
    rec.current = null;
    if (!r) return;
    if (r.recorder.state !== 'inactive') r.recorder.stop();
    r.mic.getTracks().forEach((tr) => tr.stop());
    r.source.disconnect();
  };

  // Song finished (or stopped): finish the recording too.
  useEffect(() => {
    if (!playing) stopRecording();
  }, [playing]);

  useEffect(() => {
    const onPause = () => player.stop();
    window.addEventListener(APP_PAUSE_EVENT, onPause);
    return () => {
      window.removeEventListener(APP_PAUSE_EVENT, onPause);
      stopRecording();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => take && URL.revokeObjectURL(take.url), [take]);

  const start = async () => {
    setError('');
    const ac = getAudioContext(); // created inside the tap so audio is allowed to start
    if (record) {
      const mime = pickMime();
      if (mime === null || !navigator.mediaDevices?.getUserMedia) {
        setError(t('karaoke.noRecorder'));
        return;
      }
      try {
        const mic = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        const tap = getRecordTap();
        const source = ac.createMediaStreamSource(mic);
        const micGain = ac.createGain();
        micGain.gain.value = 1.4;
        source.connect(micGain).connect(tap); // voice goes only to the recording, not the speaker
        const recorder = new MediaRecorder(tap.stream, mime ? { mimeType: mime } : undefined);
        const chunks = [];
        recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        recorder.onstop = () => {
          const type = recorder.mimeType || mime || 'audio/webm';
          const blob = new Blob(chunks, { type });
          if (blob.size) setTake({ blob, url: URL.createObjectURL(blob), ext: type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm' });
        };
        recorder.start(1000);
        rec.current = { recorder, mic, source };
      } catch {
        setError(t('karaoke.micDenied'));
        return;
      }
    }
    setTake(null);
    player.playSong({ events: timeline, pattern, bpm: tempo, semis: shift, countIn: beats });
  };

  const toggle = () => (playing ? player.stop() : start());

  const saveTake = () => {
    const name = `${song.title.replace(/[^\w\- ]+/g, '').trim() || 'karaoke'} - karaoke.${take.ext}`;
    saveBlobFile(name, take.blob, t('karaoke.saveTitle')).catch(() => setError(t('karaoke.saveFail')));
  };

  const hasWords = rows.some((r) => r.type === 'lyric' && r.segments.some((s) => s.text.trim()));
  let lineNo = -1;

  return (
    <div className="karaoke">
      <div className="karaoke-top">
        <a className="back" href={`#/songs/${encodeURIComponent(song.id)}`}>
          {t('karaoke.exit')}
        </a>
        <div className="karaoke-title">
          <strong>{song.title}</strong>
          <span className="muted small">{song.artist}</span>
        </div>
      </div>

      {!hasWords && <p className="muted small karaoke-hint">{t('karaoke.noWords')}</p>}

      <div className="karaoke-lines" ref={listRef}>
        {player.count > 0 && <div className="karaoke-count">{player.count}</div>}
        {rows.map((r) => {
          if (r.type === 'section') {
            return (
              <div key={r.key} className="karaoke-section">
                {r.name}
              </div>
            );
          }
          lineNo += 1;
          const state = activeIdx < 0 ? '' : lineNo < activeIdx ? 'past' : lineNo === activeIdx ? 'now' : lineNo === activeIdx + 1 ? 'next' : '';
          const posParts = r.key === activeLine && player.pos ? player.pos.split('-') : null;
          if (r.type === 'bars') {
            return (
              <div key={r.key} data-line={r.key} className={`karaoke-line bars ${state}`}>
                {r.bars.map((bar, bi) => (
                  <span key={bi} className="kbar">
                    {bar.map((c, ti) => (
                      <span
                        key={ti}
                        className={`kchord ${posParts && Number(posParts[2]) === bi && Number(posParts[3]) === ti ? 'on' : ''}`}
                      >
                        {isChord(c) ? transposeChord(c, shift) : c}
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            );
          }
          return (
            <div key={r.key} data-line={r.key} className={`karaoke-line ${state}`}>
              {r.segments.map((seg, gi) => (
                <span key={gi} className={`kseg ${posParts && Number(posParts[2]) === gi ? 'on' : ''}`}>
                  <span className={`kchord ${posParts && Number(posParts[2]) === gi ? 'on' : ''}`}>
                    {seg.chord && isChord(seg.chord) ? transposeChord(seg.chord, shift) : ' '}
                  </span>
                  <span className="kword">{seg.text || ' '}</span>
                </span>
              ))}
            </div>
          );
        })}
      </div>

      {take && !playing && (
        <div className="karaoke-take card-inset">
          <strong>{t('karaoke.yourTake')}</strong>
          <audio controls src={take.url} />
          <div className="actions">
            <button type="button" className="btn primary" onClick={saveTake}>
              {t('karaoke.save')}
            </button>
            <button type="button" className="btn" onClick={() => setTake(null)}>
              {t('karaoke.discard')}
            </button>
          </div>
        </div>
      )}
      {error && <p className="error small karaoke-hint">{error}</p>}

      <div className="karaoke-controls">
        <button type="button" className={`btn big ${playing ? '' : 'primary'}`} onClick={toggle} disabled={!timeline.length}>
          {playing ? t('karaoke.stop') : record ? t('karaoke.startRec') : t('karaoke.start')}
        </button>
        <div className="karaoke-opts">
          <div className="tool">
            <span>{t('karaoke.key')}</span>
            <div className="stepper">
              <button type="button" disabled={playing} onClick={() => setShift((x) => x - 1)} aria-label="−">
                −
              </button>
              <span>{shift > 0 ? `+${shift}` : shift}</span>
              <button type="button" disabled={playing} onClick={() => setShift((x) => x + 1)} aria-label="+">
                +
              </button>
            </div>
          </div>
          <div className="tool">
            <span>{t('karaoke.tempo')}</span>
            <div className="stepper">
              <button type="button" disabled={playing} onClick={() => setTempo((x) => Math.max(40, x - 4))} aria-label="−">
                −
              </button>
              <span>{tempo}</span>
              <button type="button" disabled={playing} onClick={() => setTempo((x) => Math.min(200, x + 4))} aria-label="+">
                +
              </button>
            </div>
          </div>
          <label className="tool">
            <span>{t('karaoke.music')}</span>
            <input type="range" min="0" max="1.5" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
          </label>
          <button type="button" className={`chip ${record ? 'on' : ''}`} disabled={playing} onClick={() => setRecord((x) => !x)}>
            ● {t('karaoke.record')}
          </button>
        </div>
        {record && <p className="muted small">{t('karaoke.headphones')}</p>}
      </div>
    </div>
  );
}
