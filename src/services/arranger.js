// AI song arranger: asks Claude to research a song and return a guitar arrangement
// (key, capo, tempo, strumming, chord progression per section, riff tab, main melody hook).
// Step 1 researches with web search (free-form notes); step 2 converts the notes to strict JSON,
// because structured outputs can't be combined with the citations web search produces.
// No lyrics are requested beyond a short cue per section.

import Anthropic from '@anthropic-ai/sdk';
import { isChord } from '../music/theory';
import { makeTab } from '../music/tab';
import { parseMelodyToken, noteToToken } from '../music/melody';

const MODEL = 'claude-opus-5-5';
// Server-side fallback: if a request is declined, the API retries it on a recommended fallback model.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };

const makeClient = (apiKey) => new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });

/** Cheap key check (no tokens used): look up the model. */
export async function testApiKey(apiKey) {
  await makeClient(apiKey).models.retrieve(MODEL);
  return true;
}

export function friendlyError(e) {
  if (e instanceof Anthropic.AuthenticationError) return 'The API key was rejected. Check it in Settings.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'This API key doesn’t have access to the model.';
  if (e instanceof Anthropic.RateLimitError) return 'Too many requests right now — try again in a minute.';
  if (e instanceof Anthropic.APIConnectionError) return 'No connection to the AI service. Check your internet.';
  if (e instanceof Anthropic.APIError) return `AI service error (${e.status ?? 'network'}): ${e.message}`;
  return e?.message || String(e);
}

const RESEARCH_SYSTEM = `You are an expert guitar teacher who transcribes Indian film, indie and devotional songs for guitar.
Research the song the user names and report how to play it on an acoustic guitar.

Use web search to find guitar chord sheets, tabs and tutorials for this exact song, compare several sources, and prefer the chords that most sources agree on. Then write concise notes covering:
- Key of the original recording (concert pitch), time signature and approximate BPM.
- Capo that popular guitar versions use, if any.
- Strumming pattern for the main groove.
- The chord progression for every section in song order (intro, mukhda/verse, chorus/hook, antara, interludes, outro), bar by bar, in CONCERT PITCH (what actually sounds, not capo shapes).
- The intro or signature riff as guitar tab (string number and fret per note), if the song has one.
- The main vocal hook melody: one phrase of at most 16 notes as note names with octave (concert pitch) and lengths in beats.

Do not reproduce lyrics. To identify a section you may mention at most its first five words.
If you cannot find reliable information, say so clearly and give your best musical estimate, marked as an estimate.`;

const FORMAT_SYSTEM = `Convert the research notes into the JSON arrangement schema.
Rules:
- All chord names and melody notes are CONCERT PITCH. "capo" is only a suggestion for easier shapes.
- Chord names use standard symbols such as C, Am, F#m, Bb, G7, Dsus4, Cadd9, Em7, D/F#.
- "bars" is a list of bars; each bar lists the chord(s) played in it (usually one, sometimes two).
- "strum" describes one bar in eighth notes: 8 characters for 4/4 or 6 for 3/4, using D (down), U (up), X (muted chuck) and - (miss). Example: "D-DU-UDU".
- "riff.notes" uses string 1 = high e … 6 = low E. Leave it empty if there is no riff.
- "melody.notes[].note" is a note name with octave like "E4" or "C#5", or "-" for a rest; "beats" is its length.
- "cue" is at most five words to identify the section, or an empty string. Never include more lyrics.
- Set "found" to false and "confidence" to "low" if the notes say no reliable information was found.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['found', 'confidence', 'key', 'capo', 'bpm', 'beatsPerBar', 'strum', 'difficulty', 'sections', 'riff', 'melody', 'tips'],
  properties: {
    found: { type: 'boolean' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    key: { type: 'string' },
    capo: { type: 'integer' },
    bpm: { type: 'integer' },
    beatsPerBar: { type: 'integer', enum: [3, 4] },
    strum: { type: 'string' },
    difficulty: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'] },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'cue', 'bars'],
        properties: {
          name: { type: 'string' },
          cue: { type: 'string' },
          bars: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
        },
      },
    },
    riff: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'notes'],
      properties: {
        title: { type: 'string' },
        notes: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['string', 'fret'],
            properties: { string: { type: 'integer' }, fret: { type: 'integer' } },
          },
        },
      },
    },
    melody: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'notes'],
      properties: {
        title: { type: 'string' },
        notes: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['note', 'beats'],
            properties: { note: { type: 'string' }, beats: { type: 'number' } },
          },
        },
      },
    },
    tips: { type: 'string' },
  },
};

const textOf = (content) => content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();

function assertUsable(res) {
  if (res.stop_reason === 'refusal') throw new Error('The AI declined this request.');
}

async function research(client, song, signal, onStep) {
  const prompt = `Song: "${song.title}"${song.artist ? ` by ${song.artist}` : ''}${song.album ? ` (album/film: ${song.album})` : ''}${song.year ? `, released ${song.year}` : ''}.`;
  const messages = [{ role: 'user', content: prompt }];
  const base = {
    model: MODEL,
    max_tokens: 16000,
    system: RESEARCH_SYSTEM,
    output_config: { effort: 'medium' },
    ...FALLBACK,
  };
  const tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 6 }];

  let res;
  try {
    res = await client.beta.messages.create({ ...base, tools, messages }, { signal });
    // Server-side tool loops can pause; resend the conversation so the server continues.
    for (let i = 0; i < 3 && res.stop_reason === 'pause_turn'; i++) {
      onStep?.('research');
      res = await client.beta.messages.create(
        { ...base, tools, messages: [...messages, { role: 'assistant', content: res.content }] },
        { signal }
      );
    }
  } catch (e) {
    // If web search isn't enabled for this organisation, fall back to the model's own knowledge.
    if (e instanceof Anthropic.BadRequestError && /web_search|tool/i.test(e.message)) {
      res = await client.beta.messages.create({ ...base, messages }, { signal });
    } else {
      throw e;
    }
  }
  assertUsable(res);
  return textOf(res.content);
}

async function structure(client, song, notes, signal) {
  const res = await client.beta.messages.create(
    {
      model: MODEL,
      max_tokens: 16000,
      system: FORMAT_SYSTEM,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      ...FALLBACK,
      messages: [{ role: 'user', content: `Song: "${song.title}"${song.artist ? ` by ${song.artist}` : ''}\n\nResearch notes:\n${notes}` }],
    },
    { signal }
  );
  assertUsable(res);
  if (res.stop_reason === 'max_tokens') throw new Error('The arrangement was too long to finish. Try again.');
  return JSON.parse(textOf(res.content));
}

const clamp = (v, lo, hi, d) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);

/** Turn the JSON arrangement into the app's song text format. Exported for tests. */
export function arrangementToBody(arr) {
  const out = [];
  const beatsPerBar = arr.beatsPerBar === 3 ? 3 : 4;
  for (const sec of arr.sections || []) {
    const bars = (sec.bars || [])
      .map((bar) => (Array.isArray(bar) ? bar : [bar]).map((c) => String(c).trim()).filter(isChord))
      .filter((bar) => bar.length);
    if (!bars.length) continue;
    out.push(`{${String(sec.name || 'Section').replace(/[{}]/g, '').trim()}}`);
    const cue = String(sec.cue || '').split(/\s+/).filter(Boolean).slice(0, 5).join(' ');
    if (cue) out.push(`“${cue} …”`);
    for (let i = 0; i < bars.length; i += 4) {
      out.push('| ' + bars.slice(i, i + 4).map((b) => b.join(' ')).join(' | ') + ' |');
    }
    out.push('');
  }

  const riff = (arr.riff?.notes || []).filter(
    (n) => Number.isInteger(n.string) && n.string >= 1 && n.string <= 6 && Number.isInteger(n.fret) && n.fret >= 0 && n.fret <= 22
  );
  if (riff.length) {
    out.push(`{Tab ${String(arr.riff.title || 'Riff').replace(/[{}]/g, '')}}`);
    out.push(makeTab(riff.map((n) => [n.string, n.fret])));
    out.push('');
  }

  const melody = (arr.melody?.notes || [])
    .map((n) => {
      const p = parseMelodyToken(String(n.note).trim());
      const beats = Number(n.beats) > 0 ? Math.min(8, Number(n.beats)) : 1;
      return p ? { ...p, beats } : null;
    })
    .filter(Boolean);
  if (melody.some((n) => n.midi !== null)) {
    out.push(`{Melody ${String(arr.melody.title || 'Hook').replace(/[{}]/g, '')}}`);
    let line = [];
    let beat = 0;
    for (const n of melody) {
      line.push(noteToToken(n));
      beat += n.beats;
      if (beat >= beatsPerBar * 2) {
        out.push(line.join(' '));
        line = [];
        beat = 0;
      }
    }
    if (line.length) out.push(line.join(' '));
  }
  return out.join('\n').trim();
}

/**
 * Research a song and return a song object ready for the editor.
 * onStep(stage) is called with 'research' then 'arrange'.
 */
export async function arrangeSong(apiKey, song, { signal, onStep } = {}) {
  const client = makeClient(apiKey);
  onStep?.('research');
  const notes = await research(client, song, signal, onStep);
  onStep?.('arrange');
  const arr = await structure(client, song, notes, signal);
  const body = arrangementToBody(arr);
  if (!arr.found && !body) return null;

  const beatsPerBar = arr.beatsPerBar === 3 ? 3 : 4;
  const strum = new RegExp(`^[DUX-]{${beatsPerBar * 2}}$`).test(arr.strum || '')
    ? arr.strum
    : beatsPerBar === 3
    ? 'D-DUDU'
    : 'D-DU-UDU';
  const confidence = { high: 'High', medium: 'Medium', low: 'Low' }[arr.confidence] || 'Low';

  return {
    title: song.title,
    artist: [song.artist, song.album].filter(Boolean).join(' · '),
    key: isChord(arr.key) ? arr.key : '',
    capo: clamp(arr.capo, 0, 9, 0),
    bpm: clamp(arr.bpm, 40, 220, 80),
    strum,
    difficulty: arr.difficulty || 'Beginner',
    tags: ['ai'],
    ai: true,
    note: [`AI arrangement · confidence: ${confidence}.`, arr.tips].filter(Boolean).join(' '),
    preview: song.preview ? { url: song.preview, artwork: song.artwork } : null,
    body,
  };
}
