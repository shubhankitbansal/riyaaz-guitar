// YIN pitch detection (de Cheveigné & Kawahara, 2002), tuned for guitar range.
// Returns { freq, confidence } or null when there is no clear pitch.

export function detectPitch(buf, sampleRate, opts = {}) {
  const { minFreq = 60, maxFreq = 1100, threshold = 0.12, minRms = 0.008 } = opts;
  const n = buf.length;

  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < minRms) return null;

  // Coarse search on a decimated copy (~16 kHz): the cost grows with rate², so this is ~9× cheaper
  // on a 48 kHz phone. The exact period is then refined on the full-rate signal.
  const k = Math.max(1, Math.floor(sampleRate / 16000));
  let x = buf;
  if (k > 1) {
    x = new Float32Array(Math.floor(n / k));
    for (let i = 0; i < x.length; i++) {
      let s = 0;
      for (let j = 0; j < k; j++) s += buf[i * k + j];
      x[i] = s / k;
    }
  }
  const coarse = yinCoarse(x, sampleRate / k, minFreq, maxFreq, threshold);
  if (!coarse) return null;

  // Refine around k·τ with the plain difference function at full rate (no normalisation bias).
  const maxTau = Math.min(Math.floor(sampleRate / minFreq), Math.floor(n / 2));
  const w = n - maxTau;
  const centre = Math.round(coarse.tau * k);
  const lo = Math.max(2, centre - k - 1);
  const hi = Math.min(maxTau - 1, centre + k + 1);
  if (hi <= lo + 1) return { freq: sampleRate / (coarse.tau * k), confidence: coarse.confidence };
  const diff = (tau) => {
    let sum = 0;
    for (let i = 0; i < w; i++) {
      const d = buf[i] - buf[i + tau];
      sum += d * d;
    }
    return sum;
  };
  let best = lo;
  let bestVal = Infinity;
  const vals = new Map();
  for (let tau = lo; tau <= hi; tau++) {
    const v = diff(tau);
    vals.set(tau, v);
    if (v < bestVal) {
      bestVal = v;
      best = tau;
    }
  }
  const a = vals.get(best - 1) ?? diff(best - 1);
  const c = vals.get(best + 1) ?? diff(best + 1);
  const denom = a + c - 2 * bestVal;
  const shift = denom > 0 ? Math.max(-0.5, Math.min(0.5, (a - c) / (2 * denom))) : 0;
  return { freq: sampleRate / (best + shift), confidence: coarse.confidence };
}

/** YIN on (possibly decimated) samples → { tau (fractional, in these samples), confidence } or null. */
function yinCoarse(buf, sampleRate, minFreq, maxFreq, threshold) {
  const n = buf.length;
  const maxTau = Math.min(Math.floor(sampleRate / minFreq), Math.floor(n / 2));
  const minTau = Math.max(2, Math.floor(sampleRate / maxFreq));
  if (maxTau <= minTau + 2) return null;
  const w = n - maxTau;
  const d = new Float32Array(maxTau + 1);

  // 1. Difference function
  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0;
    for (let i = 0; i < w; i++) {
      const diff = buf[i] - buf[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }

  // 2. Cumulative mean normalised difference
  d[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    running += d[tau];
    d[tau] = running > 0 ? (d[tau] * tau) / running : 1;
  }

  // 3. First dip under the threshold (then walk to its local minimum)
  let tau = -1;
  for (let t = minTau; t < maxTau; t++) {
    if (d[t] < threshold) {
      while (t + 1 < maxTau && d[t + 1] < d[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau === -1) {
    let best = minTau;
    for (let t = minTau + 1; t < maxTau; t++) if (d[t] < d[best]) best = t;
    if (d[best] > 0.35) return null;
    tau = best;
  }

  // 3b. Octave guard. Phone microphones barely pick up the fundamentals of the low strings,
  // so the 2nd harmonic can create the first dip (reading one octave too high). If the dip at
  // twice the lag is clearly deeper, the real period is the longer one.
  // Compare the interpolated bottoms of the dips: a dip that falls between samples looks shallower.
  const floorAt = (t) => {
    const a = d[t - 1];
    const b = d[t];
    const c = d[t + 1];
    const den = a + c - 2 * b;
    return den > 0 ? b - ((a - c) * (a - c)) / (8 * den) : b;
  };
  const t2 = tau * 2;
  if (d[tau] > 0.01 && t2 + 3 < maxTau) {
    let best = t2;
    for (let t = t2 - 2; t <= t2 + 2; t++) if (d[t] < d[best]) best = t;
    const here = Math.max(0, floorAt(tau));
    const there = Math.max(0, floorAt(best));
    // Only when the first dip is genuinely shallow; a clean periodic note has both dips near zero.
    if (here > 0.03 && there < here * 0.6) tau = best;
  }

  // 4. Parabolic interpolation
  let better = tau;
  if (tau > 1 && tau < maxTau) {
    const a = d[tau - 1];
    const b = d[tau];
    const c = d[tau + 1];
    const denom = a + c - 2 * b;
    if (denom !== 0) better = tau + (a - c) / (2 * denom);
  }
  return { tau: better, confidence: Math.max(0, 1 - d[tau]) };
}

export function rmsOf(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

export function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
