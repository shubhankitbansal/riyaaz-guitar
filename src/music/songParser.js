// Song text format (a friendly subset of ChordPro):
//   {Verse}                 -> section header ({Tab ...} sections are shown as raw tablature)
//   [Am]Lyrics with [F]chords inline
//   | Am | F | C | G |      -> chord bars (no lyrics)
//   e|---0---|              -> tab lines are kept monospaced
//
// convertChordSheet() turns the common "chords above lyrics" layout used by most
// chord websites into this format, so songs can be pasted straight in.

import { isChord } from './theory';
import { isMelodyLine, parseMelodyLine } from './melody';

const TAB_LINE = /^\s*[A-Ga-g][#b]?\s*\|.*-{2,}/;
export const isTabLine = (line) => TAB_LINE.test(line);

function sectionHeader(line) {
  const t = line.trim();
  let m = /^\{([^}]*)\}$/.exec(t);
  if (m) {
    const inner = m[1].trim();
    if (/^(end_of_|eo[a-z])/i.test(inner)) return false;
    const start = /^(?:start_of_|so)([a-z]+)$/i.exec(inner);
    if (start) return capitalize(start[1] === 't' ? 'tab' : start[1]);
    const kv = /^(\w+)\s*:\s*(.*)$/.exec(inner);
    if (kv) {
      return ['c', 'comment', 'ci', 'cb'].includes(kv[1].toLowerCase()) ? kv[2].trim() : false;
    }
    return inner;
  }
  m = /^\[([^\]]+)\]$/.exec(t);
  if (m && !isChord(m[1])) return m[1].trim();
  return null;
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export function parseInline(line) {
  const segments = [];
  const re = /\[([^\]]+)\]/g;
  let last = 0;
  let chord = null;
  let m;
  while ((m = re.exec(line))) {
    const text = line.slice(last, m.index);
    if (text || chord !== null) segments.push({ chord, text });
    chord = m[1].trim();
    last = re.lastIndex;
  }
  const tail = line.slice(last);
  if (tail || chord !== null) segments.push({ chord, text: tail });
  return segments;
}

const parseBars = (line) =>
  line
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((b) => b.split(/\s+/));

export function parseSong(text) {
  const sections = [];
  let cur = null;
  const ensure = () => {
    if (!cur) {
      cur = { name: '', isTab: false, isMelody: false, lines: [] };
      sections.push(cur);
    }
    return cur;
  };

  for (const raw of (text || '').replace(/\r/g, '').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const head = sectionHeader(line);
    if (head === false) {
      cur = null;
      continue;
    }
    if (head !== null) {
      cur = { name: head, isTab: /\btab\b/i.test(head), isMelody: /melod|\bdhun\b|\btune\b/i.test(head), lines: [] };
      sections.push(cur);
      continue;
    }
    const s = ensure();
    if (!line.trim()) s.lines.push({ type: 'empty' });
    else if (s.isTab || isTabLine(line)) s.lines.push({ type: 'tab', text: line });
    else if (s.isMelody && isMelodyLine(line)) s.lines.push({ type: 'melody', notes: parseMelodyLine(line) });
    else if (/^\s*\|/.test(line)) s.lines.push({ type: 'bars', bars: parseBars(line) });
    else s.lines.push({ type: 'lyric', segments: parseInline(line) });
  }

  for (const s of sections) {
    while (s.lines.length && s.lines[0].type === 'empty') s.lines.shift();
    while (s.lines.length && s.lines[s.lines.length - 1].type === 'empty') s.lines.pop();
  }
  return sections.filter((s) => s.lines.length || s.name);
}

/** Unique chords in order of first appearance. */
export function extractChords(sections) {
  const out = [];
  const add = (c) => {
    if (c && isChord(c) && !out.includes(c)) out.push(c);
  };
  for (const s of sections) {
    for (const l of s.lines) {
      if (l.type === 'lyric') l.segments.forEach((seg) => add(seg.chord));
      if (l.type === 'bars') l.bars.flat().forEach(add);
    }
  }
  return out;
}

// ---------- Importer for "chords above lyrics" sheets ----------

const FILLER = /^(\||-+|x\d+|\(x\d+\)|\/|\.+|%|\(|\))+$/i;

export function isChordLine(line) {
  if (!line || line.includes('[')) return false;
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.some(isChord) && tokens.every((t) => isChord(t) || FILLER.test(t));
}

const HEADER_RE =
  /^\s*[[(]?\s*(intro|verse|chorus|pre-chorus|prechorus|bridge|outro|interlude|antara|mukhda|hook|solo|instrumental|refrain|sthayi|ending|riff)(\s*\d+)?\s*[\])]?\s*:?\s*(.*)$/i;

function detectHeader(line) {
  const m = HEADER_RE.exec(line);
  if (!m) return null;
  const rest = m[3].trim();
  if (rest && !isChordLine(rest)) return null;
  return { name: capitalize(m[1]) + (m[2] ? ' ' + m[2].trim() : ''), rest };
}

const toBars = (line) => {
  const chords = line.trim().split(/\s+/).filter(isChord);
  return '| ' + chords.join(' | ') + ' |';
};

function mergeChordLine(chordLine, lyric) {
  const hits = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(chordLine))) if (isChord(m[0])) hits.push({ chord: m[0], idx: m.index });
  let res = lyric.padEnd(Math.max(lyric.length, ...hits.map((h) => h.idx)));
  // Copy-paste often shifts chords by a letter or two: a chord that lands inside a word moves to the
  // start of that word ("robo D[D]oraemon" → "robo [D]Doraemon").
  hits.forEach((h, n) => {
    let k = h.idx;
    while (k > 0 && k < lyric.length && /\S/.test(lyric[k]) && /\S/.test(lyric[k - 1])) k--;
    // Only a small nudge (a letter or two), and never onto the previous chord.
    if (h.idx - k <= 2 && (n === 0 || k > hits[n - 1].idx)) h.idx = k;
  });
  for (let i = hits.length - 1; i >= 0; i--) {
    const { chord, idx } = hits[i];
    res = res.slice(0, idx) + `[${chord}]` + res.slice(idx);
  }
  return res.replace(/\s+$/, '');
}

// Lines that chord websites put around the song (title bar, page numbers, counting rows …).
const JUNK_LINE = [
  /^\s*x\s*$/i,
  /^\s*page\s*\d+\s*(\/|of)\s*\d+\s*$/i,
  /^\s*(description|difficulty|tuning|key|capo|tempo|bpm|author|artist|album|year|strumming|transposed)\s*:/i,
  /\b(chords|tabs?|ukulele)\s+by\b/i,
  /^\s*strumming\s+pattern\s*$/i,
  /^\s*(full|half|double)?\s*\d+\s*bpm\s*$/i,
];
// Counting rows ("1", "&", "2", "&" … one per line) — only when several come together, so a lone chord stays.
const COUNT_LINE = /^\s*([1-8]|&|\+)\s*$/;

/** Song details found in a pasted sheet: { title, artist, key, capo, bpm, difficulty }. */
export function sheetMeta(text) {
  const meta = {};
  for (const line of String(text || '').split('\n')) {
    const l = line.trim();
    let m;
    if (!meta.title && (m = /^(.+?)\s+(?:chords|tabs?)\s+by\s+(.+)$/i.exec(l))) {
      meta.title = m[1].trim();
      meta.artist = m[2].trim();
    } else if ((m = /^key\s*:\s*([A-G][#b]?m?)\b/i.exec(l))) meta.key = m[1][0].toUpperCase() + m[1].slice(1);
    else if ((m = /^capo\s*:\s*(?:fret\s*)?(\d+)/i.exec(l))) meta.capo = Number(m[1]);
    else if ((m = /^difficulty\s*:\s*(beginner|intermediate|advanced|novice)/i.exec(l)))
      meta.difficulty = /novice/i.test(m[1]) ? 'Beginner' : capitalize(m[1]);
    else if (!meta.bpm && (m = /\b(\d{2,3})\s*bpm\b/i.exec(l))) meta.bpm = Number(m[1]);
  }
  return meta;
}

/** Remove website clutter: title bars, page numbers, the "Chords: D Em A …" list, counting rows. */
export function cleanSheet(text) {
  const lines = String(text || '').replace(/\r/g, '').replace(/\u00a0/g, ' ').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (JUNK_LINE.some((re) => re.test(line))) continue;
    if (COUNT_LINE.test(line) && (COUNT_LINE.test(lines[i - 1] || '') || COUNT_LINE.test(lines[i + 1] || ''))) continue;
    // A "Chords" heading followed by the chord names one per line: that's a legend, not music.
    if (/^\s*chords?\s*:?\s*$/i.test(line)) {
      while (i + 1 < lines.length && (!lines[i + 1].trim() || (/^\s*\S+\s*$/.test(lines[i + 1]) && isChord(lines[i + 1].trim())))) i++;
      continue;
    }
    out.push(line);
  }
  // Drop the leading blank lines left behind.
  while (out.length && !out[0].trim()) out.shift();
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

export function convertChordSheet(text) {
  const lines = cleanSheet(text).replace(/\t/g, '    ').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const header = detectHeader(line);
    if (header) {
      out.push(`{${header.name}}`);
      if (header.rest) out.push(toBars(header.rest));
      continue;
    }
    if (isChordLine(line)) {
      const next = lines[i + 1];
      const canMerge =
        next !== undefined &&
        next.trim() &&
        !isChordLine(next) &&
        !detectHeader(next) &&
        !isTabLine(next) &&
        !next.includes('[') &&
        !/^\s*\{/.test(next);
      if (canMerge) {
        out.push(mergeChordLine(line, next));
        i++;
      } else {
        out.push(toBars(line));
      }
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}
