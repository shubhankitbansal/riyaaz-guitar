import { render, screen } from '@testing-library/react';
import App from './App';
import { detectPitch } from './audio/pitch';
import { transposeChord, noteNameToMidi, midiToFreq, centsBetween, freqToNote, isChord } from './music/theory';
import { getChordShape } from './music/chords';
import { ksPlan, ksSamples } from './audio/synth';
import { parseSong, extractChords, convertChordSheet } from './music/songParser';
import { makeTab } from './music/tab';
import { BUILTIN_SONGS } from './data/songs';
import { ALL_LESSONS } from './data/lessons';

const SR = 44100;

function signal(freq, harmonics = [1], n = 4096) {
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    harmonics.forEach((amp, h) => {
      v += amp * Math.sin((2 * Math.PI * freq * (h + 1) * i) / SR);
    });
    buf[i] = v * 0.4;
  }
  return buf;
}

describe('pitch detection', () => {
  const strings = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'].map((n) => midiToFreq(noteNameToMidi(n)));

  test.each(strings)('detects pure tone %f Hz within 1 cent', (f) => {
    const res = detectPitch(signal(f), SR);
    expect(Math.abs(centsBetween(res.freq, f))).toBeLessThan(1);
  });

  test.each(strings)('detects harmonic-rich tone %f Hz (weak fundamental)', (f) => {
    const res = detectPitch(signal(f, [0.4, 1, 0.7, 0.3]), SR);
    expect(Math.abs(centsBetween(res.freq, f))).toBeLessThan(2);
  });

  test('detects a slightly flat string', () => {
    const f = 110 * 2 ** (-12 / 1200);
    const res = detectPitch(signal(f), SR);
    expect(centsBetween(res.freq, 110)).toBeCloseTo(-12, 0);
  });

  test('ignores silence', () => {
    expect(detectPitch(new Float32Array(4096), SR)).toBeNull();
  });

  test('freqToNote names notes', () => {
    expect(freqToNote(440)).toMatchObject({ name: 'A', octave: 4 });
    expect(freqToNote(82.41)).toMatchObject({ name: 'E', octave: 2 });
  });
});

describe('theory', () => {
  test('transposes chords including slash chords', () => {
    expect(transposeChord('Am', 3)).toBe('Cm');
    expect(transposeChord('G', 2)).toBe('A');
    expect(transposeChord('F#m7', -2)).toBe('Em7');
    expect(transposeChord('D/F#', 2)).toBe('E/G#');
    expect(transposeChord('C', -1)).toBe('B');
  });
  test('recognises chords vs words', () => {
    ['C', 'Am', 'F#m7', 'Bbmaj7', 'Dsus4', 'G/B', 'Cadd9', 'E7'].forEach((c) => expect(isChord(c)).toBe(true));
    ['Hum', 'Ab-', 'Tere', 'I', 'Bin', 'Ek'].forEach((w) => expect(isChord(w)).toBe(false));
  });
});

describe('chord shapes', () => {
  test('open chords', () => {
    expect(getChordShape('C').frets).toEqual([-1, 3, 2, 0, 1, 0]);
    expect(getChordShape('Em').frets).toEqual([0, 2, 2, 0, 0, 0]);
  });
  test('generated barre chords', () => {
    expect(getChordShape('F').frets).toEqual([1, 3, 3, 2, 1, 1]);
    expect(getChordShape('F').barre).toEqual({ fret: 1, from: 0, to: 5 });
    expect(getChordShape('Bm').frets).toEqual([-1, 2, 4, 4, 3, 2]);
    expect(getChordShape('Bb').frets).toEqual([-1, 1, 3, 3, 3, 1]);
    expect(getChordShape('C#m').frets).toEqual([-1, 4, 6, 6, 5, 4]);
  });
  test('every root and common type has a shape', () => {
    ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'Ab', 'A', 'Bb', 'B'].forEach((r) =>
      ['', 'm', '7', 'm7', 'maj7', 'sus2', 'sus4', 'add9', 'dim', '5', '6', '9', 'aug'].forEach((s) => {
        const shape = getChordShape(r + s);
        expect(shape).not.toBeNull();
        expect(shape.frets).toHaveLength(6);
      })
    );
  });
});

describe('song parsing', () => {
  test('parses sections, inline chords, bars and tabs', () => {
    const s = parseSong('{Verse}\n[G]Hello [D]world\n| Em | C |\n\n{Tab Riff}\ne|--0--|');
    expect(s.map((x) => x.name)).toEqual(['Verse', 'Tab Riff']);
    expect(s[0].lines[0].segments).toEqual([
      { chord: 'G', text: 'Hello ' },
      { chord: 'D', text: 'world' },
    ]);
    expect(s[0].lines[1]).toEqual({ type: 'bars', bars: [['Em'], ['C']] });
    expect(s[1].lines[0].type).toBe('tab');
    expect(extractChords(s)).toEqual(['G', 'D', 'Em', 'C']);
  });

  test('converts chords-above-lyrics sheets', () => {
    const pasted = ['Intro: Am F C G', '', 'Verse 1', 'Am       F', 'Hum tere bin ab', 'C    G', '', 'Chorus:'].join('\n');
    expect(convertChordSheet(pasted)).toBe(
      ['{Intro}', '| Am | F | C | G |', '', '{Verse 1}', '[Am]Hum tere [F]bin ab', '| C | G |', '', '{Chorus}'].join('\n')
    );
  });

  test('pads lyric when chord sits past the end', () => {
    expect(convertChordSheet('C      G\nHello')).toBe('[C]Hello  [G]');
  });
});

describe('content', () => {
  test('tabs are aligned', () => {
    const rows = makeTab([[6, 0], [[5, 3], [1, '10']], '|', [3, '5h7']]).split('\n');
    expect(new Set(rows.map((r) => r.length)).size).toBe(1);
  });
  test('all bundled songs parse and have playable chords', () => {
    BUILTIN_SONGS.forEach((song) => {
      const chords = extractChords(parseSong(song.body));
      expect(chords.length).toBeGreaterThan(1);
      chords.forEach((c) => expect(getChordShape(c)).not.toBeNull());
    });
  });
  test('lesson ids are unique and chords valid', () => {
    const ids = ALL_LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    ALL_LESSONS.forEach((l) =>
      l.blocks.filter((b) => b.t === 'chords' || b.t === 'strum').forEach((b) =>
        (b.names || b.chords).forEach((c) => expect(getChordShape(c)).not.toBeNull())
      )
    );
  });
});

test('renders the app shell', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Tuner' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Songs/ })).toBeInTheDocument();
});

// ---------------- v2 features ----------------
import { parseMelodyLine, melodyPositions, melodyToTab, noteToToken, parseMelodyToken } from './music/melody';
import { buildTimeline, collectMelody } from './music/arrangement';
import { arrangementToBody } from './services/arranger';
import { cleanAlbum } from './services/songSearch';
import { DICTIONARIES, makeT } from './i18n';
import en from './locales/en';

describe('tuner on phone-like signals', () => {
  // Phone mics barely pick up low fundamentals: fundamental at 10-25% of the 2nd harmonic.
  test.each([82.41, 110, 146.83])('weak-fundamental %f Hz is not read an octave high', (f) => {
    [0.25, 0.15, 0.1].forEach((a1) => {
      const res = detectPitch(signal(f, [a1, 1, 0.6, 0.35]), SR);
      expect(Math.abs(centsBetween(res.freq, f))).toBeLessThan(5);
    });
  });
});

describe('melody', () => {
  test('parses tokens with lengths and rests', () => {
    expect(parseMelodyLine('E4 G4:0.5 - C#5:2')).toEqual([
      { midi: 64, beats: 1 },
      { midi: 67, beats: 0.5 },
      { midi: null, beats: 1 },
      { midi: 73, beats: 2 },
    ]);
    expect(noteToToken(parseMelodyToken('Bb3:1.5'))).toBe('Bb3:1.5');
  });
  test('maps notes to playable positions and an aligned tab', () => {
    const notes = parseMelodyLine('E4 F#4 G4 A4 B4 C5 D5 E5');
    const pos = melodyPositions(notes);
    pos.forEach((p, i) => {
      const open = [64, 59, 55, 50, 45, 40][p.string - 1];
      expect(open + p.fret).toBe(notes[i].midi);
    });
    const rows = melodyToTab(notes).split('\n');
    expect(rows).toHaveLength(6);
    expect(new Set(rows.map((r) => r.length)).size).toBe(1);
  });
  test('melody sections are parsed and collected', () => {
    const s = parseSong('{Verse}\n| C | G |\n{Melody Hook}\nE4 D4:0.5 C4:2');
    expect(s[1].isMelody).toBe(true);
    expect(collectMelody(s).map((n) => n.midi)).toEqual([64, 62, 60]);
  });
});

describe('full-song timeline', () => {
  test('one bar per lyric chord, bars split evenly, % repeats, tabs/melody skipped', () => {
    const s = parseSong('{A}\n[C]one [G]two\n| Am | F G | % |\n{Tab}\ne|--0--|\n{Melody}\nE4');
    const tl = buildTimeline(s, 4);
    expect(tl.map((e) => [e.chord, e.beats])).toEqual([
      ['C', 4],
      ['G', 4],
      ['Am', 4],
      ['F', 2],
      ['G', 2],
      ['G', 4],
    ]);
    expect(tl[0].pos).toBe('0-0-0');
    expect(tl[3].pos).toBe('0-1-1-0');
  });
});

describe('AI arrangement conversion', () => {
  const arr = {
    found: true, confidence: 'medium', key: 'Am', capo: 0, bpm: 72, beatsPerBar: 4, strum: 'D-DU-UDU',
    difficulty: 'Beginner', tips: '',
    sections: [
      { name: 'Intro', cue: '', bars: [['Am'], ['F'], ['C', 'G'], ['notachord']] },
      { name: 'Mukhda', cue: 'one two three four five six seven', bars: [['Am'], ['F'], ['C'], ['G'], ['Am']] },
    ],
    riff: { title: 'Intro riff', notes: [{ string: 3, fret: 2 }, { string: 2, fret: 1 }, { string: 9, fret: 1 }] },
    melody: { title: 'Hook', notes: [{ note: 'E4', beats: 1 }, { note: '-', beats: 1 }, { note: 'C5', beats: 2 }, { note: 'bad', beats: 1 }] },
  };
  test('produces a valid song body that round-trips through the parser', () => {
    const body = arrangementToBody(arr);
    expect(body).toContain('{Intro}\n| Am | F | C G |');
    expect(body).toContain('“one two three four five …”'); // cue capped at five words
    expect(body).not.toContain('six');
    const sections = parseSong(body);
    expect(extractChords(sections)).toEqual(['Am', 'F', 'C', 'G']);
    expect(sections.find((x) => x.isTab).lines.length).toBe(6);
    expect(collectMelody(sections).map((n) => n.midi)).toEqual([64, null, 72]);
    expect(buildTimeline(sections).length).toBe(3 + 1 + 5); // C G share a bar
  });
  test('cleans soundtrack album names', () => {
    expect(cleanAlbum('Aashiqui 2 (Original Motion Picture Soundtrack)')).toBe('Aashiqui 2');
    expect(cleanAlbum('Kabir Singh')).toBe('Kabir Singh');
  });
});

describe('translations', () => {
  const placeholders = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
  test.each(Object.keys(DICTIONARIES))('%s uses only known keys with matching placeholders', (lang) => {
    const dict = DICTIONARIES[lang];
    Object.keys(dict).forEach((k) => {
      expect(en).toHaveProperty([k]);
      expect(placeholders(dict[k])).toBe(placeholders(en[k]));
    });
  });
  test('falls back to English and fills variables', () => {
    expect(makeT('ta')('songs.export', { n: 3 })).toBe('Export my songs (3)');
    expect(makeT('hi')('learn.count', { done: 2, total: 24 })).toBe('2 / 24 पाठ');
  });
});

describe('reference tones', () => {
  // Resample like AudioBufferSourceNode.playbackRate (linear interpolation), then measure.
  const render = (sr, f, opts) => {
    const { N, rate } = ksPlan(sr, f);
    let seed = 7;
    const raw = ksSamples(sr, N, 1, () => ((seed = (seed * 16807) % 2147483647) / 2147483647), opts);
    const out = new Float32Array(Math.floor(raw.length / rate) - 2);
    for (let i = 0; i < out.length; i++) {
      const x = i * rate;
      const k = Math.floor(x);
      out[i] = raw[k] * (1 - (x - k)) + raw[k + 1] * (x - k);
    }
    return out;
  };
  test.each([[44100], [48000]])('plucked reference tones are in tune at %i Hz', (sr) => {
    [82.41, 110, 146.83, 196, 246.94, 329.63].forEach((f) => {
      const res = detectPitch(render(sr, f).subarray(4800, 4800 + 4096), sr);
      expect(Math.abs(centsBetween(res.freq, f))).toBeLessThan(1);
    });
  });
  test.each([
    [{ bright: 0.42, pickPos: 0.17 }],
    [{ bright: 0.8, pickPos: 0.11 }],
  ])('soft and bright pick variants stay in tune and finite (%o)', (opts) => {
    [82.41, 146.83, 246.94, 329.63].forEach((f) => {
      const out = render(48000, f, opts);
      expect(out.every(Number.isFinite)).toBe(true);
      const res = detectPitch(out.subarray(4800, 4800 + 4096), 48000);
      expect(Math.abs(centsBetween(res.freq, f))).toBeLessThan(1);
    });
  });
});

describe('strumming patterns', () => {
  const { parsePattern, formatPattern, cleanSlots, nextSymbol, reshapePattern, stepLabel, parseProgression, PRESET_PATTERNS } = require('./music/strum');

  test('parses eighth and sixteenth patterns', () => {
    expect(parsePattern('D-DU-UDU')).toEqual({ sub: 2, slots: 'D-DU-UDU'.split(''), beats: 4 });
    const p16 = parsePattern('16:D-DU-UDUD-DU-UDU');
    expect(p16.sub).toBe(4);
    expect(p16.beats).toBe(4);
    expect(formatPattern(p16)).toBe('16:D-DU-UDUD-DU-UDU');
  });

  test('cleans typed input and pads to whole beats', () => {
    expect(cleanSlots('d . du | ↑x')).toEqual(['D', '-', 'D', 'U', 'U', 'X']);
    expect(parsePattern('DUD').slots).toEqual(['D', 'U', 'D', '-']);
    expect(parsePattern('').slots.length).toBe(8);
  });

  test('tapping cycles symbols', () => {
    expect(['D', 'U', 'X', '-'].map(nextSymbol)).toEqual(['U', 'X', '-', 'D']);
  });

  test('reshaping keeps the groove', () => {
    const p = parsePattern('D-DU-UDU');
    expect(reshapePattern(p, 3).slots.join('')).toBe('D-DU-U');
    expect(reshapePattern(p, 4, 4).slots.join('')).toBe('D---D-U---U-D-U-');
    expect(reshapePattern(reshapePattern(p, 4, 4), 4, 2).slots.join('')).toBe('D-DU-UDU');
  });

  test('count labels', () => {
    expect([0, 1, 2, 3].map((i) => stepLabel(i, 2))).toEqual(['1', '&', '2', '&']);
    expect([0, 1, 2, 3, 4].map((i) => stepLabel(i, 4))).toEqual(['1', 'e', '&', 'a', '2']);
  });

  test('presets are valid and progressions split', () => {
    PRESET_PATTERNS.forEach((x) => expect(formatPattern(parsePattern(x.pattern))).toBe(x.pattern));
    expect(parseProgression('G | D, Em  C')).toEqual(['G', 'D', 'Em', 'C']);
  });

  test('every preset has an English name', () => {
    PRESET_PATTERNS.forEach((x) => expect(en).toHaveProperty([`strum.p.${x.id}`]));
  });
});

test('Bade Achhe Lagte Hain chart: every chord has a shape (sounding and capo-2 shapes) and plays', () => {
  const { BUILTIN_SONGS } = require('./data/songs');
  const { parseSong, extractChords } = require('./music/songParser');
  const { buildTimeline } = require('./music/arrangement');
  const { getChordShape } = require('./music/chords');
  const { transposeChord } = require('./music/theory');
  const song = BUILTIN_SONGS.find((s) => s.id === 'b-bade-achhe-lagte-hain');
  const sections = parseSong(song.body);
  const chords = extractChords(sections);
  expect(chords.sort()).toEqual(['B', 'C#', 'C#7', 'D#m', 'F#']);
  chords.forEach((c) => {
    expect(getChordShape(c)).toBeTruthy();
    expect(getChordShape(transposeChord(c, -song.capo))).toBeTruthy();
  });
  expect(chords.map((c) => transposeChord(c, -2)).sort()).toEqual(['A', 'B', 'B7', 'C#m', 'E']);
  expect(buildTimeline(sections, 4).length).toBeGreaterThan(40);
});

describe('sargam', () => {
  const { buildExercise, EXERCISES, SCALES, swarMidi, swarLabel, centsToTarget } = require('./music/sargam');
  const names = (ex, scale = 'SRGMPDN') => buildExercise(EXERCISES.find((e) => e.id === ex), scale).map((n) => swarLabel(n)).join(' ');

  test('aaroh-avroh goes up to taar Sa and back', () => {
    expect(names('aaroh')).toBe("Sa Re Ga Ma Pa Dha Ni Sa' Sa' Ni Dha Pa Ma Ga Re Sa");
    expect(names('aaroh', 'SRGPD')).toBe("Sa Re Ga Pa Dha Sa' Sa' Dha Pa Ga Re Sa");
  });

  test('alankars climb and come back down', () => {
    expect(names('three').startsWith('Sa Re Ga Re Ga Ma Ga Ma Pa')).toBe(true);
    expect(names('three').endsWith('Ga Re Sa')).toBe(true);
    expect(names('pairs').startsWith('Sa Sa Re Re')).toBe(true);
    expect(names('skip').startsWith('Sa Ga Re Ma')).toBe(true);
  });

  test('every exercise works in every scale and stays within two octaves', () => {
    EXERCISES.forEach((ex) =>
      SCALES.forEach((sc) => {
        const notes = buildExercise(ex, sc.notes);
        expect(notes.length).toBeGreaterThan(4);
        notes.forEach((n) => expect(n.octave === 0 || n.octave === 1).toBe(true));
        expect(swarLabel(notes[0])).toBe('Sa');
      })
    );
  });

  test('pitches and tuning check', () => {
    expect(swarMidi({ letter: 'P', octave: 0 }, 48)).toBe(55);
    expect(swarMidi({ letter: 'S', octave: 1 }, 48)).toBe(60);
    expect(swarMidi({ letter: 'm', octave: 0 }, 48)).toBe(54);
    expect(Math.abs(centsToTarget(261.63, 60))).toBeLessThan(1);
    expect(Math.abs(centsToTarget(130.81, 60))).toBeLessThan(1); // an octave lower still counts
    expect(centsToTarget(266, 60)).toBeGreaterThan(20);
  });
});

describe('sargam patterns', () => {
  const { buildExercise, customExercise, parseSargam, swarLabel, EXERCISES } = require('./music/sargam');
  const show = (ex, scale = 'SRGMPDN') => buildExercise(ex, scale).map((n) => swarLabel(n)).join(' ');

  test('parses typed sargam in many spellings', () => {
    expect(parseSargam("sa RE ga Ma' .ni re_ ma# S'").map((n) => n.letter + n.octave)).toEqual(['S0', 'R0', 'G0', 'M1', 'N-1', 'r0', 'm0', 'S1']);
    expect(parseSargam('सा रे ग म').map((n) => n.letter)).toEqual(['S', 'R', 'G', 'M']);
    expect(parseSargam('hello 123')).toEqual([]);
  });

  test('requested patterns', () => {
    expect(show(EXERCISES.find((e) => e.id === 'aaroh')).startsWith("Sa Re Ga Ma Pa Dha Ni Sa'")).toBe(true);
    expect(show(EXERCISES.find((e) => e.id === 'pairs')).startsWith("Sa Sa Re Re Ga Ga Ma Ma Pa Pa Dha Dha Ni Ni Sa' Sa'")).toBe(true);
    expect(show(EXERCISES.find((e) => e.id === 'srggrs')).startsWith('Sa Re Ga Ga Re Sa Re Ga Ma Ma Ga Re')).toBe(true);
  });

  test('custom pattern climbs or plays as typed', () => {
    expect(show(customExercise('Sa Re Ga Ga Re Sa', false))).toBe('Sa Re Ga Ga Re Sa');
    const climbed = show(customExercise('Sa Re Ga Ga Re Sa', true));
    expect(climbed.startsWith('Sa Re Ga Ga Re Sa Re Ga Ma Ma Ga Re')).toBe(true);
    expect(climbed.endsWith('Ga Re Sa Sa Re Ga')).toBe(false); // descent is mirrored
    // Ma isn't in Bhupali: snaps to a nearby swar instead of breaking
    expect(buildExercise(customExercise('Sa Ma Pa', true), 'SRGPD').length).toBeGreaterThan(3);
  });

  test('every exercise stays within Sa … taar Sa', () => {
    EXERCISES.forEach((ex) => {
      const notes = buildExercise(ex, 'SRGMPDN');
      expect(notes.every((n) => n.octave === 0 || (n.octave === 1 && n.letter === 'S') || n.octave === 1)).toBe(true);
      expect(swarLabel(notes[0])).toBe('Sa');
    });
  });
});

import { boxPositions as boxPos, saStringOptions as saOpts } from './music/sargam';

test('sargam in the 5th-fret box: Sa = C4 on string 3', () => {
  const sa = 60;
  expect(saOpts(sa).map((o) => `${o.string}·${o.fret}`)).toEqual(['4·10', '3·5', '2·1']);
  const scale = [0, 2, 4, 5, 7, 9, 11, 12].map((x) => sa + x);
  const got = boxPos(scale, sa, 3).map((p) => `${p.string}·${p.fret}`);
  expect(got).toEqual(['3·5', '3·7', '2·5', '2·6', '2·8', '1·5', '1·7', '1·8']);
  expect(boxPos(scale, sa, 6)).toBeNull(); // C4 isn't on the low E string below fret 12
});

test('tuner: high e between samples is not read an octave low; locked range works', () => {
  const sr = 48000;
  const make = (f) => {
    const b = new Float32Array(4096);
    for (let i = 0; i < b.length; i++) b[i] = 0.1 * [1, 0.7, 0.5].reduce((s, a, h) => s + a * Math.sin((2 * Math.PI * f * (h + 1) * i) / sr + h), 0);
    return b;
  };
  [329.92, 329.76, 329.66, 82.6, 110.3].forEach((f) => {
    const res = detectPitch(make(f), sr);
    expect(Math.abs(1200 * Math.log2(res.freq / f))).toBeLessThan(0.5);
  });
  const locked = detectPitch(make(110), sr, { minFreq: 110 / 1.5, maxFreq: 110 * 1.5 });
  expect(Math.abs(1200 * Math.log2(locked.freq / 110))).toBeLessThan(0.5);
});

test('Doraemon chart: five open chords, all playable', () => {
  const { BUILTIN_SONGS } = require('./data/songs');
  const { parseSong, extractChords } = require('./music/songParser');
  const { buildTimeline } = require('./music/arrangement');
  const { getChordShape } = require('./music/chords');
  const song = BUILTIN_SONGS.find((s) => s.id === 'b-doraemon-zindagi-sawar-dun');
  const sections = parseSong(song.body);
  const chords = extractChords(sections);
  expect([...chords].sort()).toEqual(['A', 'Bm', 'D', 'Em', 'G']);
  chords.forEach((c) => expect(getChordShape(c)).toBeTruthy());
  expect(buildTimeline(sections, 4).length).toBeGreaterThan(30);
});

test('pasted chord-site sheet: clutter removed, chords kept, details picked up', () => {
  const { convertChordSheet, sheetMeta, parseSong } = require('./music/songParser');
  const paste = [
    'X', 'Some Song - Title Chords by Someone', 'Difficulty: beginner', 'Tuning: E A D G B E', 'Key: D',
    'Chords', 'D', 'Em', 'A', 'G', 'Strumming pattern', 'full 80 bpm', '1', '&', '2', '&',
    '[Intro]', ' ', 'D Em A D', '', '[Verse]',
    'D       Bm', 'la la la la', 'A', 'na na na', 'plain words line',
    'A                       D', 'one two three four robo Doraemon',
    '     Em    A', 'Haan helicopter', 'Page 1/2', 'G D Em A', 'Page 2/2',
  ].join('\n');
  const out = convertChordSheet(paste);
  expect(out).not.toMatch(/Page|Difficulty|Strumming|Chords by|^X$/m);
  expect(out.startsWith('{Intro}')).toBe(true);
  expect(out).toContain('[A]na na na');
  expect(out).toContain('robo [D]Doraemon');
  expect(out).toContain('Haan [Em]helico[A]pter');
  expect(out.trim().endsWith('| G | D | Em | A |')).toBe(true);
  expect(sheetMeta(paste)).toMatchObject({ title: 'Some Song - Title', artist: 'Someone', key: 'D', bpm: 80, difficulty: 'Beginner' });
  expect(parseSong(out).map((s) => s.name)).toEqual(['Intro', 'Verse']);
});

test('melody fret@string notation keeps exact tab positions', () => {
  const { parseMelodyLine, isMelodyLine, melodyToTab, transposeMelody, noteToToken } = require('./music/melody');
  const line = '2@3:0.5 3@2:0.5 7@1 0@1:1.5';
  expect(isMelodyLine(line)).toBe(true);
  const notes = parseMelodyLine(line);
  expect(notes.map((n) => n.midi)).toEqual([57, 62, 71, 64]);
  expect(notes.map(noteToToken).join(' ')).toBe(line.replace('7@1 ', '7@1 '));
  const tab = melodyToTab(notes, 4).split('\n');
  expect(tab[0]).toBe('e|-----7-0-|');
  expect(tab[2]).toBe('G|-2-------|');
  expect(transposeMelody(notes, 2)[0].pos).toEqual({ string: 3, fret: 4 });
  expect(transposeMelody(notes, -1)[3].pos).toBeUndefined();
});

describe('finger exercises', () => {
  const { FINGER_EXERCISES, buildFingerExercise, fingerMidi, fingerTabColumns, spanOf } = require('./music/fingers');
  const { makeTab } = require('./music/tab');
  const show = (id, pos) => buildFingerExercise(id, pos).map((n) => `${n.string}:${n.fret}/${n.finger}${n.tech || ''}`);

  test('1-2-3-4 goes low E → high e and back, one finger per fret', () => {
    const s = show('chromatic', 1);
    expect(s.slice(0, 5)).toEqual(['6:1/1', '6:2/2', '6:3/3', '6:4/4', '5:1/1']);
    expect(s.slice(20, 28)).toEqual(['1:1/1', '1:2/2', '1:3/3', '1:4/4', '1:4/4', '1:3/3', '1:2/2', '1:1/1']);
    expect(s).toHaveLength(48);
  });
  test('spider walk alternates two strings', () => {
    expect(show('spider', 5).slice(0, 4)).toEqual(['6:5/1', '5:6/2', '6:7/3', '5:8/4']);
  });
  test('legato marks hammer-ons and pull-offs, and the tab shows them', () => {
    const notes = buildFingerExercise('legato', 5);
    expect(show('legato', 5).slice(0, 4)).toEqual(['6:5/1', '6:6/2h', '6:7/3h', '6:8/4h']);
    expect(notes.find((n) => n.tech === 'p')).toBeTruthy();
    expect(makeTab(fingerTabColumns(notes.slice(0, 4))).split('\n')[5]).toBe('E|-5-h6-h7-h8-|');
  });
  test('every exercise is playable: valid strings, frets and fingers, and fits the neck when climbing', () => {
    FINGER_EXERCISES.forEach((ex) => {
      [1, 5, 9].forEach((pos) => {
        const notes = buildFingerExercise(ex.id, pos);
        expect(notes.length).toBeGreaterThan(8);
        notes.forEach((n) => {
          expect(n.string).toBeGreaterThanOrEqual(1);
          expect(n.string).toBeLessThanOrEqual(6);
          expect(n.fret).toBeGreaterThanOrEqual(1);
          expect([1, 2, 3, 4]).toContain(n.finger);
          expect(fingerMidi(n)).toBeGreaterThan(40);
        });
        expect(spanOf(notes, Math.max(ex.minPos || 1, pos))).toBeLessThanOrEqual(5);
      });
    });
  });
  test('stretch starts no lower than fret 3', () => {
    expect(Math.min(...buildFingerExercise('stretch', 1).map((n) => n.fret))).toBe(3);
  });
});
