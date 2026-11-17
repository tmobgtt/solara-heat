// WebAudio synth only, no audio assets: engine hum, siren, shots, punches, money and jingles are
// all oscillators and noise buffers. Every entry point is guarded: no context, no sound, no throw.
export function createAudio(enabled) {
  let ctx = null, master = null, muted = false, unlocked = false, engineOsc = null, engineGain = null, sirenOsc = null, musicTimer = 0, note = 0;
  function ensure() {
    if (!enabled || !unlocked || ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
    } catch { ctx = null; }
    return ctx;
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (muted || !ensure()) return;
    try {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
      o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur);
    } catch { /* silent */ }
  }
  function noise(dur, vol) {
    if (muted || !ensure()) return;
    try {
      const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buf; g.gain.value = vol; src.connect(g); g.connect(master); src.start();
    } catch { /* silent */ }
  }
  return {
    unlock() { unlocked = true; ensure(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
    toggleMute() { muted = !muted; return muted; },
    isMuted: () => muted,
    shoot() { noise(0.12, 0.5); tone(160, 0.1, 'sawtooth', 0.25, 60); },
    punch() { noise(0.07, 0.35); tone(90, 0.08, 'sine', 0.4, 45); },
    money() { tone(880, 0.09, 'square', 0.2); setTimeout(() => tone(1320, 0.14, 'square', 0.2), 70); },
    hurt() { tone(140, 0.15, 'sawtooth', 0.3, 70); },
    complete() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.3), i * 110)); },
    fail() { tone(220, 0.4, 'sawtooth', 0.25, 110); },
    enterCar() { tone(300, 0.08, 'sine', 0.2, 180); },
    setEngine(on, speedRatio) {
      if (!ensure()) return;
      try {
        if (on && !engineOsc) {
          engineOsc = ctx.createOscillator(); engineGain = ctx.createGain();
          engineOsc.type = 'sawtooth'; engineGain.gain.value = 0.05;
          engineOsc.connect(engineGain); engineGain.connect(master); engineOsc.start();
        }
        if (engineOsc) {
          engineOsc.frequency.value = 55 + Math.abs(speedRatio) * 130;
          if (!on) { engineOsc.stop(); engineOsc = null; }
        }
      } catch { engineOsc = null; }
    },
    setSiren(on) {
      if (!ensure()) return;
      try {
        if (on && !sirenOsc) {
          sirenOsc = ctx.createOscillator(); const g = ctx.createGain(); const lfo = ctx.createOscillator(); const lg = ctx.createGain();
          sirenOsc.type = 'triangle'; sirenOsc.frequency.value = 750; g.gain.value = 0.045;
          lfo.frequency.value = 0.7; lg.gain.value = 180; lfo.connect(lg); lg.connect(sirenOsc.frequency);
          sirenOsc.connect(g); g.connect(master); sirenOsc.start(); lfo.start();
          sirenOsc.__lfo = lfo;
        } else if (!on && sirenOsc) { sirenOsc.stop(); sirenOsc.__lfo.stop(); sirenOsc = null; }
      } catch { sirenOsc = null; }
    },
    updateMusic(dt, playing) {
      if (!playing || muted || !ensure()) return;
      musicTimer -= dt;
      if (musicTimer <= 0) {
        const bass = [55, 55, 65.4, 49];
        tone(bass[note % 4], 0.42, 'triangle', 0.16);
        note += 1; musicTimer = 0.44;
      }
    },
  };
}
