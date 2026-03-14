// Sound utilities using Web Audio API - no external dependencies needed
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.3,
  startDelay = 0,
) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + startDelay);
    gain.gain.setValueAtTime(0, ctx.currentTime + startDelay);
    gain.gain.linearRampToValueAtTime(
      volume,
      ctx.currentTime + startDelay + 0.01,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + startDelay + duration,
    );
    osc.start(ctx.currentTime + startDelay);
    osc.stop(ctx.currentTime + startDelay + duration);
  } catch {}
}

// Instagram-style match request sent sound: ascending chime
export function playMatchSentSound() {
  playTone(523, 0.12, "sine", 0.25, 0);
  playTone(659, 0.12, "sine", 0.25, 0.1);
  playTone(784, 0.18, "sine", 0.3, 0.2);
}

// Match request received: warm double chime
export function playMatchReceivedSound() {
  playTone(880, 0.15, "sine", 0.3, 0);
  playTone(1047, 0.2, "sine", 0.28, 0.15);
  playTone(1319, 0.25, "sine", 0.25, 0.3);
}

// Ringing sound for calls: pulsing phone ring pattern
export function playRingTone() {
  const pattern = [0, 0.4, 0.8, 1.2];
  for (const delay of pattern) {
    playTone(480, 0.3, "sine", 0.35, delay);
    playTone(440, 0.3, "sine", 0.2, delay + 0.05);
  }
}

// Stop audio context (cleanup)
export function stopAudio() {
  try {
    audioCtx?.close();
    audioCtx = null;
  } catch {}
}
