const MODE_SETTINGS = {
  idle: { level: 0, energy: 0, tempo: 104 },
  lobby: { level: .26, energy: 1, tempo: 104 },
  round: { level: .32, energy: 2, tempo: 108 },
  finalists: { level: .37, energy: 3, tempo: 112 },
  final: { level: .18, energy: 1, tempo: 104 },
  result: { level: .21, energy: 1, tempo: 102 },
  outro: { level: .19, energy: 1, tempo: 100 }
};

const CUE_PATTERNS = {
  join: [[420, .05, 0], [560, .07, .04]],
  select: [[310, .045, 0]],
  lock: [[540, .06, 0], [720, .08, .055]],
  complete: [[520, .07, 0], [690, .07, .065], [880, .11, .13]],
  advance: [[440, .07, 0], [660, .08, .07], [900, .13, .14]],
  eliminate: [[360, .08, 0], [260, .13, .07]],
  finalists: [[390, .08, 0], [570, .09, .08], [790, .16, .17]],
  tick: [[470, .075, 0]],
  result: [[520, .09, 0], [660, .09, .08], [820, .1, .16], [1040, .2, .24]],
  sparkle: [[740, .07, 0], [980, .08, .075], [1220, .13, .15]]
};

const PLUCK_PATTERN = [330, 392, 440, 392, 349, 440, 494, 440];
const BASS_PATTERN = [110, 110, 87.31, 98];

class ProceduralAudioManager {
  constructor() {
    this.context = null;
    this.master = null;
    this.musicBus = null;
    this.duckBus = null;
    this.sfxBus = null;
    this.noiseBuffer = null;
    this.mode = "idle";
    this.countdown = false;
    this.muted = false;
    this.started = false;
    this.timer = null;
    this.nextStepTime = 0;
    this.step = 0;
  }

  ensureContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (this.context) return this.context;

    const context = new AudioContextClass();
    const master = context.createGain();
    const musicBus = context.createGain();
    const duckBus = context.createGain();
    const sfxBus = context.createGain();
    const compressor = context.createDynamicsCompressor();

    master.gain.value = this.muted ? 0 : 1;
    musicBus.gain.value = .0001;
    duckBus.gain.value = 1;
    sfxBus.gain.value = .8;
    compressor.threshold.value = -18;
    compressor.knee.value = 14;
    compressor.ratio.value = 5;
    compressor.attack.value = .004;
    compressor.release.value = .18;

    musicBus.connect(duckBus).connect(master);
    sfxBus.connect(compressor).connect(master);
    master.connect(context.destination);

    this.context = context;
    this.master = master;
    this.musicBus = musicBus;
    this.duckBus = duckBus;
    this.sfxBus = sfxBus;
    this.noiseBuffer = this.createNoiseBuffer();
    return context;
  }

  createNoiseBuffer() {
    const buffer = this.context.createBuffer(1, this.context.sampleRate * .12, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    return buffer;
  }

  start(mode = this.mode) {
    this.mode = mode;
    const context = this.ensureContext();
    if (!context) return;
    if (context.state === "suspended") context.resume();
    if (!this.started) {
      this.started = true;
      this.nextStepTime = context.currentTime + .05;
      this.timer = window.setInterval(() => this.schedule(), 30);
    }
    this.applyMix(.7);
  }

  setMode(mode, { countdown = false } = {}) {
    const previousMode = this.mode;
    this.mode = MODE_SETTINGS[mode] ? mode : "idle";
    this.countdown = countdown;
    if (!this.started) return;
    if (previousMode === "idle" && this.mode !== "idle") this.nextStepTime = this.context.currentTime + .05;
    this.applyMix(this.mode === "idle" ? .65 : .45);
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.context) return;
    if (!muted && this.context.state === "suspended") this.context.resume();
    this.ramp(this.master.gain, muted ? 0 : 1, .18);
  }

  applyMix(duration = .45) {
    if (!this.context || !this.musicBus) return;
    const setting = MODE_SETTINGS[this.mode];
    const level = this.countdown ? .055 : setting.level;
    this.ramp(this.musicBus.gain, level, duration);
  }

  ramp(parameter, value, duration) {
    const now = this.context.currentTime;
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(Math.max(0, parameter.value), now);
    parameter.linearRampToValueAtTime(Math.max(0, value), now + duration);
  }

  schedule() {
    if (!this.context) return;
    if (this.mode === "idle") {
      this.nextStepTime = this.context.currentTime + .05;
      return;
    }
    while (this.nextStepTime < this.context.currentTime + .16) {
      this.scheduleStep(this.step, this.nextStepTime);
      const secondsPerStep = 60 / MODE_SETTINGS[this.mode].tempo / 2;
      this.nextStepTime += secondsPerStep;
      this.step = (this.step + 1) % 16;
    }
  }

  scheduleStep(step, time) {
    const { energy } = MODE_SETTINGS[this.mode];
    const quietFinal = this.mode === "final" || this.countdown;
    if (this.countdown) {
      if (step % 8 === 0) this.playTone(82.41, time, .2, .04, "sine", this.musicBus);
      return;
    }

    if (step % 4 === 0) {
      const bass = BASS_PATTERN[(step / 4) % BASS_PATTERN.length];
      this.playTone(bass, time, .22, quietFinal ? .06 : .09, "triangle", this.musicBus, 520);
    }

    const pluckEvery = energy >= 2 ? 2 : 4;
    if (step % pluckEvery === 0) {
      const note = PLUCK_PATTERN[(step / 2) % PLUCK_PATTERN.length];
      this.playTone(note, time, .11, quietFinal ? .05 : .075, "triangle", this.musicBus, 1500);
    }

    if (!quietFinal && step % 4 === 0) this.playKick(time, energy >= 2 ? .075 : .05);
    if (!quietFinal && energy >= 2 && step % 2 === 1) this.playHat(time, energy >= 3 ? .04 : .03);
    if (this.mode === "finalists" && step % 4 === 2) {
      this.playTone(PLUCK_PATTERN[(step / 2 + 2) % PLUCK_PATTERN.length] * 2, time, .08, .035, "sine", this.musicBus, 2200);
    }
  }

  playTone(frequency, time, duration, peak, type, destination, filterFrequency = 1200) {
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterFrequency, time);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    oscillator.connect(filter).connect(gain).connect(destination);
    oscillator.start(time);
    oscillator.stop(time + duration + .02);
  }

  playKick(time, peak) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(105, time);
    oscillator.frequency.exponentialRampToValueAtTime(54, time + .08);
    gain.gain.setValueAtTime(peak, time);
    gain.gain.exponentialRampToValueAtTime(.0001, time + .1);
    oscillator.connect(gain).connect(this.musicBus);
    oscillator.start(time);
    oscillator.stop(time + .12);
  }

  playHat(time, peak) {
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = "highpass";
    filter.frequency.value = 4800;
    gain.gain.setValueAtTime(peak, time);
    gain.gain.exponentialRampToValueAtTime(.0001, time + .035);
    source.connect(filter).connect(gain).connect(this.musicBus);
    source.start(time);
    source.stop(time + .045);
  }

  duck(amount = .46, hold = .24) {
    if (!this.context || !this.duckBus) return;
    const now = this.context.currentTime;
    this.duckBus.gain.cancelScheduledValues(now);
    this.duckBus.gain.setValueAtTime(Math.max(.0001, this.duckBus.gain.value), now);
    this.duckBus.gain.linearRampToValueAtTime(amount, now + .025);
    this.duckBus.gain.linearRampToValueAtTime(1, now + hold);
  }

  playCue(cue) {
    if (this.muted) return;
    if (!this.started) this.start(this.mode);
    const context = this.ensureContext();
    if (!context || !this.sfxBus) return;
    if (context.state === "suspended") context.resume();

    const important = ["complete", "advance", "finalists", "result", "sparkle"].includes(cue);
    if (important) this.duck(cue === "result" ? .24 : .48, cue === "result" ? .52 : .3);
    const peak = cue === "result" ? .072 : cue === "sparkle" ? .058 : .045;

    (CUE_PATTERNS[cue] || CUE_PATTERNS.select).forEach(([frequency, duration, offset]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = cue === "eliminate" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + offset);
      gain.gain.setValueAtTime(.0001, context.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(peak, context.currentTime + offset + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + offset + duration);
      oscillator.connect(gain).connect(this.sfxBus);
      oscillator.start(context.currentTime + offset);
      oscillator.stop(context.currentTime + offset + duration + .02);
    });
  }
}

export const gameAudio = new ProceduralAudioManager();
