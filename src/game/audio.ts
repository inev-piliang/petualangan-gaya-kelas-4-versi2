let ctx: AudioContext | null = null;
let muted = false;

export function initAudio() {
  if (!ctx) {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AC) ctx = new AC();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}

export function setMuted(m: boolean) {
  muted = m;
}
export function isMuted() {
  return muted;
}

function beep(
  freq: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  when = 0,
  slideTo?: number
) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    /* ignore */
  }
}

export const sfx = {
  click() {
    beep(640, 0.07, "square", 0.1);
  },
  correct() {
    [523, 659, 784].forEach((f, i) => beep(f, 0.14, "triangle", 0.18, i * 0.07));
  },
  wrong() {
    beep(190, 0.28, "sawtooth", 0.14, 0, 110);
  },
  whoosh() {
    beep(280, 0.22, "sine", 0.1, 0, 760);
  },
  thud() {
    beep(140, 0.12, "square", 0.14, 0, 70);
  },
  clear() {
    [392, 523, 659, 784].forEach((f, i) => beep(f, 0.15, "triangle", 0.2, i * 0.09));
  },
  badge() {
    beep(880, 0.1, "sine", 0.16);
    beep(1318, 0.2, "sine", 0.14, 0.09);
  },
  treasure() {
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) =>
      beep(f, 0.24, "triangle", 0.2, i * 0.11)
    );
  },
  learn() {
    beep(440, 0.12, "triangle", 0.14);
    beep(587, 0.16, "triangle", 0.14, 0.1);
  },
};
