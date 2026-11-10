// Zene: WebAudio demó loop, saját fájl betöltése, analyser, basszus-detektor, BPM-becslés,
// és a zenei reakció (hullámok, logó, pill-pulzálás) kockánkénti számolása
import { S, reduced } from './config.js';
import { U } from './scene.js';
import { WU } from './waves.js';
import { scrollVel } from './pills.js';
import { updateLogo } from './logo.js';
import { damp } from './util.js';
import { wavesIn } from './entrance.js';

/* ---------- Audio ---------- */
export let actx = null, master, analyser, freq;
let rev, dly, noiseBuf;
export let playing = false, mode = 'synth', fileBuf = null;
let fileSrc = null, nextT = 0, step = 0;
let synthOrigin = 0, fileStartAt = 0, fileTitle = '';
let trackBpm = 92, beatOffset = 0;   // a saját számnál betöltéskor becsülve
const BPM = 92, STEP = 60 / BPM / 4;
export let vol = 0.8;   // hangerő 0..1 (a lejátszó állítja a setVol-lal)
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = [
  { bass: 45, pad: [57, 60, 64, 67, 71] },
  { bass: 41, pad: [53, 57, 60, 64, 67] },
  { bass: 48, pad: [52, 55, 59, 64, 67] },
  { bass: 43, pad: [55, 59, 62, 64, 69] },
];
function impulse(sec, decay) {
  const len = actx.sampleRate * sec, b = actx.createBuffer(2, len, actx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return b;
}
function initAudio() {
  actx = new (window.AudioContext || window.webkitAudioContext)();
  const comp = actx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
  master = actx.createGain(); master.gain.value = 0.85 * vol;
  analyser = actx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.55;
  analyser.minDecibels = -88; analyser.maxDecibels = -22;
  freq = new Uint8Array(analyser.frequencyBinCount);
  master.connect(comp); comp.connect(analyser); analyser.connect(actx.destination);
  rev = actx.createConvolver(); rev.buffer = impulse(3.2, 2.4);
  const rg = actx.createGain(); rg.gain.value = 0.32; rev.connect(rg); rg.connect(master);
  dly = actx.createDelay(1.5); dly.delayTime.value = STEP * 3;
  const fb = actx.createGain(); fb.gain.value = 0.38;
  const dlp = actx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2400;
  const dg = actx.createGain(); dg.gain.value = 0.3;
  dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(dg); dg.connect(master);
  noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  setInterval(scheduler, 25);
  document.getElementById('seek').disabled = false;
}
function pad(notes, t, dur) {
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.6;
  lp.frequency.setValueAtTime(450, t); lp.frequency.linearRampToValueAtTime(1500, t + dur * 0.5); lp.frequency.linearRampToValueAtTime(550, t + dur);
  const g = actx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13, t + 1.4);
  g.gain.setValueAtTime(0.13, t + dur - 0.3); g.gain.linearRampToValueAtTime(0, t + dur + 1.6);
  lp.connect(g); g.connect(master); g.connect(rev);
  notes.forEach(n => [-8, 8].forEach(d => {
    const o = actx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = d;
    const og = actx.createGain(); og.gain.value = 0.1; o.connect(og); og.connect(lp);
    o.start(t); o.stop(t + dur + 1.8);
  }));
}
function kick(t, v) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.13);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.95 * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5);
}
function noiseHit(t, type, f, q, vol, dec, wet) {
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const fl = actx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  s.connect(fl); fl.connect(g); g.connect(master); if (wet) g.connect(rev);
  s.start(t); s.stop(t + dec + 0.05);
}
function bass(n, t, dur) {
  const o = actx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(n);
  const s = actx.createOscillator(); s.type = 'sine'; s.frequency.value = mtof(n - 12);
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.12, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp); s.connect(lp); lp.connect(g); g.connect(master);
  o.start(t); s.start(t); o.stop(t + dur + 0.05); s.stop(t + dur + 0.05);
}
function pluck(n, t, v) {
  const o = actx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(n);
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  o.connect(g); g.connect(master); g.connect(dly); g.connect(rev); o.start(t); o.stop(t + 0.45);
}
function schedStep(s, t) {
  const si = s % 16, bar = Math.floor(s / 16), ch = CHORDS[Math.floor(s / 32) % 4];
  if (s % 32 === 0) pad(ch.pad, t, STEP * 32);
  if (si === 0 || si === 8 || (si === 14 && bar % 2 === 1)) kick(t, si === 14 ? 0.6 : 1);
  if (si === 4 || si === 12) noiseHit(t, 'bandpass', 1700, 0.8, 0.28, 0.2, true);
  if (si % 4 === 2) noiseHit(t, 'highpass', 7500, 0.7, 0.11, 0.06, false);
  else if (si % 2 === 1 && Math.random() < 0.5) noiseHit(t, 'highpass', 9000, 0.7, 0.04, 0.03, false);
  if (si === 0) bass(ch.bass, t, STEP * 6);
  if (si === 7) bass(ch.bass + 12, t, STEP * 1.5);
  if (si === 10) bass(ch.bass, t, STEP * 4);
  if (Math.random() < 0.42) pluck(ch.pad[Math.floor(Math.random() * ch.pad.length)] + 12, t, 0.6 + Math.random() * 0.4);
}
function scheduler() {
  if (mode !== 'synth' || !actx || actx.state !== 'running') return;
  if (nextT < actx.currentTime) { nextT = actx.currentTime + 0.05; synthOrigin = nextT - step * STEP; }
  while (nextT < actx.currentTime + 0.12) { schedStep(step, nextT); nextT += STEP; step = (step + 1) % 128; }
}

/* ---------- Lejátszás / szünet (a lejátszó gombja és ikonja) ---------- */
const playBtn = document.getElementById('play'), ico = document.getElementById('ico');
const trackName = document.getElementById('trackName');
const ICON_PLAY = 'M4 2.5v11l9.5-5.5z', ICON_PAUSE = 'M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z';
function setPlaying(v) {
  playing = v;
  ico.firstElementChild.setAttribute('d', v ? ICON_PAUSE : ICON_PLAY);
  playBtn.setAttribute('aria-label', v ? 'Szünet' : 'Lejátszás');
}
export async function togglePlay() {
  if (!actx) initAudio();
  if (playing) { await actx.suspend(); setPlaying(false); }
  else { await actx.resume(); setPlaying(true); scheduler(); }
}
export function setVol(v) {
  vol = v;
  if (master) master.gain.value = 0.85 * vol;
}

/* ---------- Saját zene betöltése (a borítóra kattintva) ---------- */
const trackArtist = document.getElementById('trackArtist');
document.getElementById('file').addEventListener('change', async e => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  if (!actx) initAudio();
  const title = f.name.replace(/\.[^.]+$/, '');
  fileTitle = title;
  trackName.textContent = 'Betöltés…';
  try {
    const buf = await actx.decodeAudioData(await f.arrayBuffer());
    mode = 'file'; fileBuf = buf;
    const est = detectBpm(buf); trackBpm = est.bpm; beatOffset = est.offset;
    document.getElementById('bpmOut').textContent = '~' + trackBpm + ' BPM';
    seekTo(0);
    trackName.textContent = title; trackArtist.textContent = 'Saját fájl';
    await actx.resume(); setPlaying(true);
  } catch (err) {
    trackName.textContent = 'Nem lejátszható fájl';
  }
  e.target.value = '';
});

/* ---------- Tempó-becslés a saját számhoz (mély-energia ütésekből, autokorrelációval) ---------- */
function detectBpm(buf) {
  const sr = buf.sampleRate, hop = 512, maxS = Math.min(buf.length, sr * 90);
  const chs = Math.min(2, buf.numberOfChannels), data = [];
  for (let c = 0; c < chs; c++) data.push(buf.getChannelData(c));
  const n = Math.floor(maxS / hop), env = new Float32Array(n);
  const a = Math.exp(-2 * Math.PI * 150 / sr); let lp = 0;           // aluláteresztő: a lábdob/basszus számít
  for (let i = 0; i < n; i++) {
    let e = 0;
    for (let j = i * hop, je = j + hop; j < je; j++) {
      let x = 0; for (let c = 0; c < chs; c++) x += data[c][j];
      lp = a * lp + (1 - a) * x; e += lp * lp;
    }
    env[i] = Math.sqrt(e / hop);
  }
  const on = new Float32Array(n);
  for (let i = 1; i < n; i++) on[i] = Math.max(0, env[i] - env[i - 1]);
  const fps = sr / hop;
  const minLag = Math.floor(fps * 60 / 180), maxLag = Math.ceil(fps * 60 / 70);
  const score = new Float32Array(maxLag + 2);
  let best = 0, bestLag = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sc = 0; for (let i = lag; i < n; i++) sc += on[i] * on[i - lag];
    sc *= Math.exp(-0.5 * Math.pow(Math.log2((60 * fps / lag) / 120) / 0.6, 2));   // enyhe előny 120 körül
    score[lag] = sc;
    if (sc > best) { best = sc; bestLag = lag; }
  }
  if (!bestLag) return { bpm: 120, offset: 0 };
  const y0 = score[bestLag - 1] || 0, y1 = score[bestLag], y2 = score[bestLag + 1] || 0, den = y0 - 2 * y1 + y2;
  const bpm = Math.round(60 * fps / (bestLag + (den !== 0 ? 0.5 * (y0 - y2) / den : 0)));
  const P = 60 * fps / bpm; let bestOff = 0, bestSum = -1;                // fázis: hova esnek az ütések
  for (let o = 0; o < Math.ceil(P); o++) {
    let sum = 0; for (let t = o; t < n; t += P) sum += on[Math.round(t)] || 0;
    if (sum > bestSum) { bestSum = sum; bestOff = o; }
  }
  return { bpm, offset: bestOff / fps };
}

/* ---------- Váltás a demó és a saját szám között, idő, tekerés ---------- */
export function switchTo(m) {
  if (!actx) initAudio();
  if (m === 'file' && fileBuf) {
    mode = 'file'; seekTo(0);
    trackName.textContent = fileTitle; trackArtist.textContent = 'Saját fájl';
  } else {
    if (fileSrc) { try { fileSrc.stop(); } catch (_) {} fileSrc = null; }
    mode = 'synth'; step = 0; nextT = actx.currentTime + 0.05; synthOrigin = nextT;
    trackName.textContent = 'Demó loop'; trackArtist.textContent = 'Demó';
  }
}
export function duration() { return mode === 'file' && fileBuf ? fileBuf.duration : 128 * STEP; }
export function position() {
  if (!actx) return 0;
  const d = duration();
  const p = mode === 'file' ? actx.currentTime - fileStartAt : actx.currentTime - synthOrigin;
  return ((p % d) + d) % d;
}
export function seekTo(pos) {
  if (!actx) return;
  if (mode === 'file' && fileBuf) {
    if (fileSrc) { try { fileSrc.stop(); } catch (_) {} }
    fileSrc = actx.createBufferSource(); fileSrc.buffer = fileBuf; fileSrc.loop = true;
    fileSrc.connect(master); fileSrc.start(0, pos);
    fileStartAt = actx.currentTime - pos;
  } else {
    step = Math.floor(pos / STEP) % 128;
    nextT = actx.currentTime + 0.03;
    synthOrigin = nextT - step * STEP;
  }
}

/* ---------- Zenei reakció (kockánként) ---------- */
const BANDS = 64;   // a spektrum ennyi logaritmikus sávra bontva
const levels = new Float32Array(BANDS);
let musicAmt = 0, pulse = 0, elapsed = 0, reach = 0, scrollPush = 0;
let prevL = 0, prevM = 0, prevH = 0, surge = 0, surgeS = 0, flowVel = 0, flowY = 0, bassSlow = 0;   // hangszerenkénti gyorsulás

export function updateAudio(dt) {
  let hasData = false;
  if (analyser && playing) { analyser.getByteFrequencyData(freq); hasData = true; }
  updateLogo(freq, actx ? actx.sampleRate : 48000, 2048, hasData, 0.8 + (S.react / 50) * 0.5);
  musicAmt = damp(musicAmt, playing ? 1 : 0, playing ? 2.5 : 1.2, dt);
  const binHz = actx ? actx.sampleRate / 2 / freq.length : 1;
  let low = 0, mid = 0, high = 0;
  for (let r = 0; r < BANDS; r++) {
    let target = 0;
    if (hasData) {
      const k0 = r / BANDS, k1 = (r + 1) / BANDS;
      const b0 = Math.max(1, Math.floor(40 * Math.pow(300, k0) / binHz));
      const b1 = Math.max(b0 + 1, Math.ceil(40 * Math.pow(300, k1) / binHz));
      let sum = 0; for (let b = b0; b < b1 && b < freq.length; b++) sum += freq[b];
      target = Math.pow(Math.min(1, (sum / (b1 - b0) / 255) * (1 + k0 * 0.7)), 1.5);
    }
    levels[r] += (target - levels[r]) * (target > levels[r] ? 0.35 : 0.06);
    if (r < 10) low += levels[r] / 10;
    else if (r < 36) mid += levels[r] / 26;
    else high += levels[r] / 28;
  }
  for (let j = 0; j < 6; j++) {
    const r0 = Math.floor(j * BANDS / 6), r1 = Math.floor((j + 1) * BANDS / 6);
    let a = 0; for (let r = r0; r < r1; r++) a += levels[r];
    WU.uBands.value[j] = a / (r1 - r0);
  }
  pulse = damp(pulse, low * musicAmt, 9, dt);                  // simított, nem villog minden ütésre
  U.uPulse.value = pulse;
  const R = S.react / 50;                                   // 0..2
  // Lendület: új ütés a mélyben / közepen / magasban → rövid gyorsulás, ami simán lecseng
  const fr = Math.min(3, 0.016 / Math.max(dt, 0.001));
  const onL = Math.max(0, low - prevL) * fr, onM = Math.max(0, mid - prevM) * fr, onH = Math.max(0, high - prevH) * fr;
  prevL = low; prevM = mid; prevH = high;
  surge = Math.min(2.5, surge * Math.exp(-dt * 2.2) + (onL * 6 + onM * 2 + onH * 1) * (S.surge / 50) * R * musicAmt);
  surgeS = damp(surgeS, surge, 10, dt);
  // „pak – húz”: basszus-ütésre a hullám lefelé rántódik, kicsúszik, majd lassan folyik tovább
  // saját basszus-detektor 30–150 Hz: az ütést a basszus pillanatnyi átlagához mérjük,
  // így folyamatos, vastag basszus mellett is minden kiugró lábdob ránt egyet
  let bassV = 0;
  if (hasData) {
    const hz = actx.sampleRate / analyser.fftSize;
    const a = Math.max(1, Math.floor(30 / hz)), b = Math.ceil(150 / hz);
    let sum = 0; for (let j = a; j <= b; j++) sum += freq[j];
    bassV = sum / ((b - a + 1) * 255);
  }
  bassSlow = damp(bassSlow, bassV, 3, dt);
  const kS = (S.surge / 50) * (0.5 + R * 0.5) * musicAmt;
  const tr = Math.max(0, bassV - bassSlow - 0.015);           // mennyivel üt ki az átlagból
  flowVel += tr * 70 * kS * Math.min(dt, 0.05) + onM * 0.1 * kS;
  flowVel *= Math.exp(-dt * 5);
  // folyamatos áramlás: minél több a basszus, annál gyorsabban folyik lefelé
  flowY += (flowVel + (0.015 + bassSlow * 0.14 * (S.surge / 50)) * musicAmt) * dt * (reduced ? 0.3 : 1);
  WU.uFlowY.value = flowY;
  // BPM-szinkron: a tempóval arányos áramlás + lökés minden ütemre
  let syncPulse = 0, bpmFactor = 1;
  if (S.bpmSync && actx && playing) {
    const ph = (((position() - (mode === 'file' ? beatOffset : 0)) * trackBpm / 60) % 1 + 1) % 1;
    syncPulse = (0.5 + 0.5 * Math.cos(ph * Math.PI * 2)) * 0.6 * musicAmt;   // puha hullám az ütemen, nem rángatás
    bpmFactor = 1 + (trackBpm / 92 - 1) * musicAmt;
  }
  elapsed += dt * (reduced ? 0.3 : 1) * (S.wspeed / 40) * bpmFactor * (1 + musicAmt * pulse * 0.4 * R + scrollPush * 1.2 + syncPulse * 0.35 + surgeS);
  WU.uTime.value = elapsed;
  WU.uAmp.value = musicAmt;
  WU.uReact.value = R;
  WU.uBeat.value = Math.max(pulse, syncPulse * 0.3) * 0.7;
  WU.uMid.value = mid * musicAmt; WU.uHigh.value = high * musicAmt;   // a Folyékony szalag hullámai / fodrai
  WU.uGain.value = (S.wlight / 50) * (1.0 + musicAmt * (0.2 + pulse * 0.4 * R)) * wavesIn();   // belépéskor beúszik
  reach = damp(reach, Math.min(1.2, musicAmt * (0.2 + pulse * 0.9 * R)), 4, dt);   // zenére beljebb úsznak
  scrollPush = damp(scrollPush, Math.min(1, Math.abs(scrollVel) / 7), 4, dt);   // görgetésre beljebb úsznak
  WU.uPush.value = (S.wpush / 100) * (0.2 + 0.8 * reach) + scrollPush * 0.3 + syncPulse * 0.02;
}
