import { useState } from 'react';
import { NOTE_NAMES } from '../music/theory';
import { getChordShape, chordNoteNames } from '../music/chords';
import { strumChord, arpeggiate } from '../audio/synth';
import { ChordCard, ChordDiagram } from './ChordDiagram';
import { useT } from '../i18n';

const TYPES = [
  ['', 'chords.major'],
  ['m', 'chords.minor'],
  ['7', '7'],
  ['m7', 'm7'],
  ['maj7', 'maj7'],
  ['sus2', 'sus2'],
  ['sus4', 'sus4'],
  ['add9', 'add9'],
  ['dim', 'dim'],
  ['5', 'chords.power'],
  ['6', '6'],
];

const GROUPS = [
  ['chords.g.essential', ['C', 'D', 'E', 'G', 'A', 'Am', 'Dm', 'Em']],
  ['chords.g.sevenths', ['A7', 'B7', 'C7', 'D7', 'E7', 'G7']],
  ['chords.g.barre', ['F', 'Bm', 'Bb', 'F#m', 'C#m', 'Gm']],
  ['chords.g.colour', ['Cadd9', 'Dsus2', 'Asus2', 'Fmaj7', 'Am7', 'Em7']],
];

export default function ChordLibrary() {
  const t = useT();
  const label = (l) => (l.startsWith('chords.') ? t(l) : l);
  const [root, setRoot] = useState('C');
  const [type, setType] = useState('');
  const name = root + type;
  const shape = getChordShape(name);

  return (
    <div className="page chords">
      <header className="page-head">
        <h1>{t('chords.title')}</h1>
        <p>{t('chords.subtitle')}</p>
      </header>

      <section className="card chord-finder">
        <div className="seg-control wrap">
          {NOTE_NAMES.map((n) => (
            <button key={n} type="button" className={root === n ? 'on' : ''} onClick={() => setRoot(n)}>
              {n}
            </button>
          ))}
        </div>
        <div className="seg-control wrap">
          {TYPES.map(([s, l]) => (
            <button key={l} type="button" className={type === s ? 'on' : ''} onClick={() => setType(s)}>
              {label(l)}
            </button>
          ))}
        </div>
        <div className="finder-result">
          <button type="button" className="finder-diagram" onClick={() => strumChord(shape)}>
            <ChordDiagram shape={shape} size={1.7} />
          </button>
          <div>
            <h2 className="finder-name">
              {name}
              {shape?.approx && <span className="muted small"> {t('chords.simplified')}</span>}
            </h2>
            {shape && <p className="muted">{t('chords.notes', { n: chordNoteNames(shape).join(' · ') })}</p>}
            <div className="actions">
              <button type="button" className="btn primary" onClick={() => strumChord(shape)}>
                {t('chords.strum')}
              </button>
              <button type="button" className="btn" onClick={() => arpeggiate(shape)}>
                {t('chords.arpeggio')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {GROUPS.map(([title, names]) => (
        <section key={title} className="card">
          <h3>{t(title)}</h3>
          <div className="chord-grid">
            {names.map((n) => (
              <ChordCard key={n} name={n} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
