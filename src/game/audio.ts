class SoundEffects {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private glottalWave: PeriodicWave | null = null;
  private softClipCurve: Float32Array<ArrayBuffer> | null = null;
  private muted = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 0.25);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private getGlottalWave(ctx: AudioContext): PeriodicWave {
    if (this.glottalWave) return this.glottalWave;
    // Band-limited glottal pulse harmonic roll-off (natural mammal vocal cords, no metallic buzz)
    const harmonics = 24;
    const real = new Float32Array(harmonics);
    const imag = new Float32Array(harmonics);
    real[0] = 0;
    imag[0] = 0;
    for (let n = 1; n < harmonics; n++) {
      const amp = 1 / Math.pow(n, 1.38);
      real[n] = amp * 0.35;
      imag[n] = amp * 0.85;
    }
    this.glottalWave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    return this.glottalWave;
  }

  private getSoftClipCurve(): Float32Array<ArrayBuffer> {
    if (this.softClipCurve) return this.softClipCurve;
    const samples = 512;
    const curve = new Float32Array(new ArrayBuffer(samples * 4));
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * 1.9);
    }
    this.softClipCurve = curve;
    return curve;
  }

  public unlock(): void {
    this.ensureContext();
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + Math.min(0.02, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private triggerSingleBark(
    ctx: AudioContext,
    startTime: number,
    isPuppy: boolean,
    volume: number,
    pitchJitter: number
  ): void {
    const dur = isPuppy ? 0.115 : 0.155;
    const wave = this.getGlottalWave(ctx);

    // Pitch contour: quick upward snap as air pressurizes, then natural downward chest drop
    const fStart = (isPuppy ? 410 : 155) * pitchJitter;
    const fPeak = (isPuppy ? 740 : 285) * pitchJitter;
    const fMid = (isPuppy ? 630 : 240) * pitchJitter;
    const fEnd = (isPuppy ? 275 : 108) * pitchJitter;

    const oscMain = ctx.createOscillator();
    oscMain.setPeriodicWave(wave);
    oscMain.frequency.setValueAtTime(fStart, startTime);
    oscMain.frequency.exponentialRampToValueAtTime(fPeak, startTime + 0.02);
    oscMain.frequency.exponentialRampToValueAtTime(fMid, startTime + dur * 0.42);
    oscMain.frequency.exponentialRampToValueAtTime(fEnd, startTime + dur);

    // Subtle chest sub-harmonic for adult dog depth, or slight harmonic thickness for puppy
    const oscSub = ctx.createOscillator();
    oscSub.type = 'triangle';
    const subRatio = isPuppy ? 1.008 : 0.5;
    oscSub.frequency.setValueAtTime(fStart * subRatio, startTime);
    oscSub.frequency.exponentialRampToValueAtTime(fPeak * subRatio, startTime + 0.02);
    oscSub.frequency.exponentialRampToValueAtTime(fEnd * subRatio, startTime + dur);

    // Throat growl / vocal fold flutter (adds organic raspy animal texture)
    const flutter = ctx.createOscillator();
    flutter.type = 'sine';
    flutter.frequency.setValueAtTime(isPuppy ? 48 : 36, startTime);
    const flutterGain = ctx.createGain();
    flutterGain.gain.setValueAtTime(isPuppy ? 18 : 14, startTime);
    flutter.connect(flutterGain);
    flutterGain.connect(oscMain.frequency);

    const mainMix = ctx.createGain();
    mainMix.gain.setValueAtTime(1.0, startTime);
    const subMix = ctx.createGain();
    subMix.gain.setValueAtTime(isPuppy ? 0.25 : 0.45, startTime);

    oscMain.connect(mainMix);
    oscSub.connect(subMix);

    // Parallel vocal-tract formant filters (F1 jaw, F2 mouth vowel "oo/uh/ah", F3 snout bite)
    const formants = isPuppy
      ? [
          { f0: 780, fPeak: 1080, fEnd: 690, q: 3.4, gain: 1.1 },
          { f0: 1650, fPeak: 2200, fEnd: 1450, q: 4.2, gain: 0.72 },
          { f0: 3000, fPeak: 3350, fEnd: 2450, q: 3.8, gain: 0.28 },
        ]
      : [
          { f0: 420, fPeak: 580, fEnd: 340, q: 3.6, gain: 1.25 },
          { f0: 980, fPeak: 1320, fEnd: 780, q: 4.4, gain: 0.72 },
          { f0: 1950, fPeak: 2250, fEnd: 1550, q: 4.0, gain: 0.24 },
        ];

    const vocalSum = ctx.createGain();
    for (const fm of formants) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(fm.q, startTime);
      bp.frequency.setValueAtTime(fm.f0 * pitchJitter, startTime);
      bp.frequency.exponentialRampToValueAtTime(fm.fPeak * pitchJitter, startTime + 0.028);
      bp.frequency.exponentialRampToValueAtTime(fm.fEnd * pitchJitter, startTime + dur);

      const fg = ctx.createGain();
      fg.gain.setValueAtTime(fm.gain, startTime);
      mainMix.connect(bp);
      subMix.connect(bp);
      bp.connect(fg);
      fg.connect(vocalSum);
    }

    // Gentle warm low-end chest body
    const chestLp = ctx.createBiquadFilter();
    chestLp.type = 'lowpass';
    chestLp.frequency.setValueAtTime(isPuppy ? 950 : 460, startTime);
    const chestGain = ctx.createGain();
    chestGain.gain.setValueAtTime(isPuppy ? 0.22 : 0.48, startTime);
    subMix.connect(chestLp);
    chestLp.connect(chestGain);
    chestGain.connect(vocalSum);

    // Warm soft saturation + envelope
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.getSoftClipCurve();

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(volume * 1.15, startTime + 0.016);
    env.gain.exponentialRampToValueAtTime(volume * 0.78, startTime + dur * 0.45);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + dur + 0.015);

    vocalSum.connect(shaper);
    shaper.connect(env);
    env.connect(ctx.destination);

    oscMain.start(startTime);
    oscSub.start(startTime);
    flutter.start(startTime);
    oscMain.stop(startTime + dur + 0.03);
    oscSub.stop(startTime + dur + 0.03);
    flutter.stop(startTime + dur + 0.03);

    // Breathy snout onset ("w-" / "y-") & mouth-close puff ("-f")
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = this.getNoiseBuffer(ctx);
    const noiseBp = ctx.createBiquadFilter();
    noiseBp.type = 'bandpass';
    noiseBp.frequency.setValueAtTime(isPuppy ? 1900 : 950, startTime);
    noiseBp.Q.setValueAtTime(1.5, startTime);

    const noiseEnv = ctx.createGain();
    noiseEnv.gain.setValueAtTime(0.0001, startTime);
    noiseEnv.gain.linearRampToValueAtTime(volume * 0.42, startTime + 0.012);
    noiseEnv.gain.exponentialRampToValueAtTime(volume * 0.06, startTime + 0.05);
    // Tail "-f" puff as snout closes
    noiseEnv.gain.linearRampToValueAtTime(volume * 0.24, startTime + dur * 0.82);
    noiseEnv.gain.exponentialRampToValueAtTime(0.0001, startTime + dur + 0.025);

    noiseSrc.connect(noiseBp);
    noiseBp.connect(noiseEnv);
    noiseEnv.connect(ctx.destination);
    noiseSrc.start(startTime);
    noiseSrc.stop(startTime + dur + 0.04);
  }

  public playDogBark(
    size: 'puppy' | 'adult' = 'adult',
    double = false,
    delay = 0,
    volume = 0.24
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const isPuppy = size === 'puppy';
    const baseTime = ctx.currentTime + delay;
    const jitter = 0.93 + Math.random() * 0.14;
    this.triggerSingleBark(ctx, baseTime, isPuppy, volume, jitter);
    if (double) {
      const gap = isPuppy ? 0.14 + Math.random() * 0.025 : 0.175 + Math.random() * 0.03;
      this.triggerSingleBark(ctx, baseTime + gap, isPuppy, volume * 0.92, jitter * 1.07);
    }
  }

  public playLovePulse(): void {
    this.playTone(587.33, 783.99, 0.14, 'sine', 0.06, 0);
    this.playDogBark('puppy', true, 0.04, 0.22);
    this.playDogBark('adult', false, 0.19, 0.2);
  }

  public playFeedBone(): void {
    this.playTone(440.0, 587.33, 0.1, 'sine', 0.05, 0);
    this.playDogBark('puppy', true, 0.03, 0.23);
    this.playDogBark('adult', false, 0.26, 0.19);
  }

  public playSniffBark(): void {
    this.playDogBark('adult', true, 0, 0.26);
  }

  public playDash(): void {
    this.playTone(260, 130, 0.12, 'sine', 0.06, 0);
    this.playDogBark('puppy', false, 0.02, 0.21);
  }

  public playBrambleBreak(): void {
    this.playTone(170, 90, 0.14, 'sawtooth', 0.06, 0);
    this.playDogBark('puppy', false, 0.04, 0.22);
  }

  public playFlowerBloom(): void {
    this.playTone(587.33, 880, 0.18, 'sine', 0.08, 0);
  }

  public playCritterBefriend(): void {
    this.playTone(523.25, 523.25, 0.1, 'sine', 0.08, 0);
    this.playTone(659.25, 659.25, 0.12, 'sine', 0.08, 0.07);
    this.playTone(783.99, 987.77, 0.18, 'triangle', 0.08, 0.14);
  }

  public playTreat(): void {
    this.playTone(698.46, 1046.5, 0.15, 'sine', 0.09, 0);
  }

  public playHurt(): void {
    this.playTone(180, 88, 0.18, 'sawtooth', 0.1, 0);
  }

  public playRescueDog(size: 'puppy' | 'adult' = 'puppy'): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.02, 0.2, 'sine', 0.065, idx * 0.085);
    });
    this.playDogBark(size, true, 0.06, 0.26);
  }

  public playVictory(): void {
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    chord.forEach((n, idx) => {
      this.playTone(n, n, 0.35, 'triangle', 0.07, idx * 0.09);
    });
    this.playDogBark('adult', true, 0.08, 0.23);
    this.playDogBark('puppy', true, 0.28, 0.22);
  }
}

export const soundFX = new SoundEffects();
