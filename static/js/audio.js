export class SoundEffects {
  constructor() {
    this.context = null;
    this.explorationTimer = 0;
    this.lastStepAt = 0;
    this.explorationNote = 0;
  }

  unlock() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
    }
    if (this.context.state === "suspended") {
      void this.context.resume().catch(() => {});
    }
  }

  tone(frequency, duration, volume, type = "sine", endFrequency = frequency) {
    if (!this.context) return;
    if (this.context.state === "suspended") {
      void this.context.resume()
        .then(() => this.tone(frequency, duration, volume, type, endFrequency))
        .catch(() => {});
      return;
    }
    if (this.context.state !== "running") return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  hover() {
    this.tone(620, 0.045, 0.025);
  }

  click() {
    this.tone(390, 0.06, 0.035, "triangle", 320);
  }

  startExploring() {
    if (this.explorationTimer) return;
    this.explorationNote = 0;
    const playNote = () => {
      const frequency = this.explorationNote++ % 2 ? 520 : 430;
      this.tone(frequency, 0.18, 0.025, "sine", frequency * 1.12);
    };
    playNote();
    this.explorationTimer = window.setInterval(playNote, 480);
  }

  stopExploring() {
    window.clearInterval(this.explorationTimer);
    this.explorationTimer = 0;
  }

  pathFound() {
    this.stopExploring();
    this.tone(520, 0.12, 0.045, "sine", 680);
    window.setTimeout(() => this.tone(680, 0.16, 0.045), 95);
  }

  step() {
    const now = performance.now();
    if (now - this.lastStepAt < 130) return;
    this.lastStepAt = now;
    this.tone(210, 0.055, 0.035, "triangle", 155);
  }

  victory() {
    this.stopExploring();
    this.tone(523, 0.2, 0.055, "sine");
    window.setTimeout(() => this.tone(659, 0.2, 0.055, "sine"), 110);
    window.setTimeout(() => this.tone(784, 0.32, 0.06, "sine"), 220);
  }
}
