// Synthesised sound effects (Web Audio). No audio files, so there is nothing to license.
// The AudioContext is only created after a user gesture (unlock), so nothing plays unexpectedly.

const SOUNDS = {
  eat: [{ freq: 660, dur: 0.07, type: 'square', gain: 0.08 }, { freq: 990, dur: 0.09, type: 'square', gain: 0.08, at: 0.06 }],
  click: [{ freq: 440, dur: 0.05, type: 'triangle', gain: 0.07 }],
  over: [
    { freq: 330, dur: 0.15, type: 'sawtooth', gain: 0.09 },
    { freq: 247, dur: 0.15, type: 'sawtooth', gain: 0.09, at: 0.15 },
    { freq: 165, dur: 0.35, type: 'sawtooth', gain: 0.09, at: 0.3 },
  ],
  win: [
    { freq: 523, dur: 0.12, type: 'square', gain: 0.08 },
    { freq: 659, dur: 0.12, type: 'square', gain: 0.08, at: 0.12 },
    { freq: 784, dur: 0.25, type: 'square', gain: 0.08, at: 0.24 },
  ],
};

export function createAudio({ enabled = true } = {}) {
  let ctx = null;
  let on = enabled;

  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return;
    }
    const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Ctor) return;
    try {
      ctx = new Ctor();
    } catch {
      ctx = null;
    }
  }

  function play(name) {
    if (!on || !ctx || ctx.state !== 'running') return;
    const notes = SOUNDS[name];
    if (!notes) return;
    const now = ctx.currentTime;
    for (const n of notes) {
      const start = now + (n.at ?? 0);
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = n.type;
      osc.frequency.value = n.freq;
      amp.gain.setValueAtTime(n.gain, start);
      amp.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
      osc.connect(amp).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + n.dur + 0.02);
    }
  }

  return {
    unlock,
    play,
    setEnabled(value) {
      on = Boolean(value);
    },
    isEnabled: () => on,
  };
}
