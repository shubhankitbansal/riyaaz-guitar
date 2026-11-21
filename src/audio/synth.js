// Tiny guitar synth using Karplus–Strong plucked-string synthesis (Web Audio API).

import { getChordShape, shapeToMidi } from '../music/chords';
import { midiToFreq } from '../music/theory';

let ctx = null;

export function getAudioContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

let buses = null;

/** Synthetic room reverb: decaying stereo noise, darkened with a one-pole low-pass. */
function makeImpulse(ac, seconds = 1.6, decay = 3.2) {
  const len = Math.floor(ac.sampleRate * seconds);
  const ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const x = i / len;
      const n = (Math.random() * 2 - 1) * (1 - x) ** decay;
      lp += (0.35 + 0.4 * (1 - x)) * (n - lp); // high frequencies die out first, like a real room
      d[i] = lp;
    }
  }
  return ir;
}

function getBuses(ac) {
  if (buses) return buses;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 12;
  comp.ratio.value = 3;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;
  comp.connect(ac.destination);

  const dry = ac.createGain(); // clicks and anything that should not sound like a guitar
  dry.gain.value = 0.9;
  dry.connect(comp);

  // Acoustic guitar body: air (≈100 Hz) and top-plate (≈200 Hz) resonances, less box, a bit of sparkle.
  const eq = [
    ['highpass', 70, 0.7, 0],
    ['peaking', 102, 1.6, 5],
    ['peaking', 205, 1.3, 3],
    ['peaking', 420, 1.0, -3],
    ['peaking', 2800, 0.9, 2.5],
    ['highshelf', 7000, 0.7, -6],
  ].map(([type, f, q, g]) => {
    const b = ac.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    b.gain.value = g;
    return b;
  });
  const voice = ac.createGain();
  voice.gain.value = 0.85;
  eq.reduce((a, b) => a.connect(b), voice);
  const body = eq[eq.length - 1];
  body.connect(comp);

  const verb = ac.createConvolver();
  verb.buffer = makeImpulse(ac);
  const wet = ac.createGain();
  wet.gain.value = 0.22;
  body.connect(verb).connect(wet).connect(comp);

  buses = { voice, dry, comp, tap: null };
  return buses;
}

const output = (ac) => getBuses(ac).voice;

/** A MediaStream carrying everything the app plays — mixed with the mic for karaoke recordings. */
export function getRecordTap() {
  const ac = getAudioContext();
  const b = getBuses(ac);
  if (!b.tap) {
    b.tap = ac.createMediaStreamDestination();
    b.comp.connect(b.tap);
  }
  return b.tap;
}

/** Guitar volume, 0–1.5 (clicks are not affected). */
export function setMusicVolume(v) {
  const b = getBuses(getAudioContext());
  b.voice.gain.setTargetAtTime(0.85 * v, 0, 0.02);
}

const bufferCache = new Map();
const VARIANTS = 3; // different pick noise per pluck so repeated strums don't sound like a loop

/**
 * Karplus–Strong plucked string. Each output sample is fed back as the average of itself and
 * the next sample in the ring, so the loop delay is N - 0.5 samples (not N + 0.5). The remaining
 * fraction is corrected with playbackRate so reference tones are exactly in tune.
 */
export function ksPlan(sampleRate, freq) {
  const N = Math.max(3, Math.round(sampleRate / freq + 0.5));
  return { N, rate: (freq * (N - 0.5)) / sampleRate };
}

/**
 * Generate the raw (un-resampled) plucked-string samples. Exported for tests.
 * bright: 0–1 pick brightness (soft fingers … hard pick). pickPos: where the string is struck,
 * as a fraction of its length — it notches out the harmonics that have a node there, which is
 * a big part of what makes it sound like a guitar rather than a harp.
 */
export function ksSamples(sampleRate, N, seconds = 3, random = Math.random, { bright = 0.5, pickPos = 0.14 } = {}) {
  const len = Math.floor(sampleRate * seconds);
  const out = new Float32Array(len);
  const ring = new Float32Array(N);
  const exc = new Float32Array(N);
  const a = 0.25 + 0.6 * bright;
  let prev = 0;
  for (let i = 0; i < N; i++) {
    prev += a * (random() * 2 - 1 - prev); // low-passed noise: softer pluck = darker
    exc[i] = prev;
  }
  const P = Math.max(1, Math.round(pickPos * N));
  let mean = 0;
  for (let i = 0; i < N; i++) {
    ring[i] = exc[i] - (i >= P ? exc[i - P] : 0); // pick-position comb
    mean += ring[i];
  }
  mean /= N;
  for (let i = 0; i < N; i++) ring[i] -= mean;

  const loss = 0.996 + 0.0025 * bright;
  let idx = 0;
  let peak = 1e-6;
  for (let i = 0; i < len; i++) {
    const nxt = idx + 1 === N ? 0 : idx + 1;
    const v = ring[idx];
    out[i] = v;
    if (Math.abs(v) > peak) peak = Math.abs(v);
    ring[idx] = loss * 0.5 * (v + ring[nxt]);
    idx = nxt;
  }
  for (let i = 0; i < len; i++) out[i] /= peak;
  return out;
}

function pluckBuffer(ac, freq, tone) {
  const sr = ac.sampleRate;
  const { N, rate } = ksPlan(sr, freq);
  const v = Math.floor(Math.random() * VARIANTS);
  const key = `${sr}:${N}:${tone}:${v}`;
  if (!bufferCache.has(key)) {
    const opts = tone === 'bright' ? { bright: 0.8, pickPos: 0.11 } : { bright: 0.42, pickPos: 0.17 };
    const samples = ksSamples(sr, N, 3, Math.random, opts);
    const buffer = ac.createBuffer(1, samples.length, sr);
    buffer.getChannelData(0).set(samples);
    bufferCache.set(key, buffer);
  }
  return { buffer: bufferCache.get(key), rate };
}

/** Play a plucked note. Returns the gain node so it can be choked. */
export function playFreq(freq, { when, gain = 0.5, duration = 2.5, tone = 'soft', pan = 0 } = {}) {
  const ac = getAudioContext();
  const { buffer, rate } = pluckBuffer(ac, freq, tone);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const g = ac.createGain();
  const t = when ?? ac.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.setValueAtTime(gain, t + duration - 0.3);
  g.gain.linearRampToValueAtTime(0, t + duration);
  let node = src.connect(g);
  if (pan && ac.createStereoPanner) {
    const p = ac.createStereoPanner();
    p.pan.value = pan;
    node = node.connect(p);
  }
  node.connect(output(ac));
  src.start(t);
  src.stop(t + duration);
  g.source = src;
  return g;
}

/** Silence notes returned by playFreq/playMidi, including ones scheduled for later. */
export function stopVoices(voices) {
  const ac = getAudioContext();
  for (const g of voices) {
    try {
      g.gain.cancelScheduledValues(0);
      g.gain.setTargetAtTime(0, ac.currentTime, 0.02);
      g.source?.stop(ac.currentTime + 0.1);
    } catch {
      /* already stopped */
    }
  }
}

export const playMidi = (midi, opts, a4 = 440) => playFreq(midiToFreq(midi, a4), opts);

let ringing = [];

/** Strum a chord (name or shape). direction: 'down' (low→high) or 'up'. */
export function strumChord(chord, { when, direction = 'down', gain = 0.32, spacing = 0.018, duration = 2 } = {}) {
  const shape = typeof chord === 'string' ? getChordShape(chord) : chord;
  if (!shape) return;
  const ac = getAudioContext();
  const t = Math.max(ac.currentTime, (when ?? ac.currentTime) + (Math.random() - 0.5) * 0.008); // human timing
  // Choke strings that are still ringing from the previous strum.
  for (const g of ringing) {
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(0, t, 0.025);
  }
  const all = shapeToMidi(shape); // low → high
  const up = direction === 'up';
  const notes = all.map((m, i) => ({ m, pan: all.length > 1 ? -0.3 + (0.6 * i) / (all.length - 1) : 0, i }));
  const order = up ? notes.slice(-4).reverse() : notes;
  const hard = gain >= 0.34;
  const tone = up || hard ? 'bright' : 'soft';
  const level = up ? gain * 0.7 : gain;
  const gap = spacing * (hard ? 0.8 : 1) * (0.8 + Math.random() * 0.4);
  ringing = order.map(({ m, pan, i }, k) => {
    // Down strums lean on the bass strings, up strums on the treble; each string a little different.
    const tilt = up ? 1 : 1.1 - (0.2 * i) / Math.max(1, all.length - 1);
    const g = level * tilt * (0.88 + Math.random() * 0.24);
    return playMidi(m, { when: t + k * gap * (0.85 + Math.random() * 0.3), gain: g, duration, tone, pan });
  });
}

export function arpeggiate(chord, { gap = 0.16 } = {}) {
  const shape = typeof chord === 'string' ? getChordShape(chord) : chord;
  if (!shape) return;
  const ac = getAudioContext();
  shapeToMidi(shape).forEach((m, i) => playMidi(m, { when: ac.currentTime + i * gap, gain: 0.4 }));
}

let noiseBuf = null;

/** Percussive muted "chuck" stroke. */
export function chuck(when, gain = 0.6) {
  const ac = getAudioContext();
  if (!noiseBuf) {
    const len = Math.floor(ac.sampleRate * 0.08);
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  for (const g of ringing) {
    g.gain.cancelScheduledValues(when);
    g.gain.setTargetAtTime(0, when, 0.01);
  }
  ringing = [];
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1600;
  bp.Q.value = 0.7;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(bp).connect(g).connect(output(ac));
  src.start(when);
}

/** Metronome click. level: 'accent' | 'beat' | 'sub' */
export function click(when, level = 'beat') {
  const ac = getAudioContext();
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.frequency.value = level === 'accent' ? 1600 : level === 'beat' ? 1050 : 800;
  const peak = level === 'accent' ? 0.7 : level === 'beat' ? 0.45 : 0.2;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(peak, when + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  o.connect(g).connect(getBuses(ac).dry);
  o.start(when);
  o.stop(when + 0.06);
}
