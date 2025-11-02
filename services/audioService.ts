// @ts-nocheck
// Disabling TypeScript check for this file because it uses browser-specific
// AudioContext APIs that may not be available in all environments.

class AudioService {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  
  // For thruster sound
  private thrusterOscillator: OscillatorNode | null = null;
  private thrusterGain: GainNode | null = null;

  private init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.isInitialized = true;
    } catch (e) {
      console.error("Web Audio API is not supported in this browser");
    }
  }

  // A user gesture is required to start audio context
  private resumeContext() {
    this.init();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
  
  private playSound(type: 'sine' | 'square' | 'sawtooth' | 'triangle', frequency: number, duration: number, volume: number = 0.5, start: number = 0) {
    this.resumeContext();
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    const startTime = this.audioContext.currentTime + start;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    
    gainNode.gain.setValueAtTime(volume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  public startThrusterSound() {
    this.resumeContext();
    if (!this.audioContext || this.thrusterOscillator) return;

    this.thrusterOscillator = this.audioContext.createOscillator();
    this.thrusterGain = this.audioContext.createGain();

    this.thrusterOscillator.type = 'sawtooth';
    this.thrusterOscillator.frequency.setValueAtTime(80, this.audioContext.currentTime); // low idle hum

    this.thrusterGain.gain.setValueAtTime(0, this.audioContext.currentTime); // start silent
    this.thrusterGain.gain.linearRampToValueAtTime(0.05, this.audioContext.currentTime + 0.1); // fade in

    this.thrusterOscillator.connect(this.thrusterGain);
    this.thrusterGain.connect(this.audioContext.destination);

    this.thrusterOscillator.start();
  }

  public stopThrusterSound() {
    if (!this.audioContext || !this.thrusterOscillator || !this.thrusterGain) return;

    this.thrusterGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.2); // fade out
    this.thrusterOscillator.stop(this.audioContext.currentTime + 0.2);

    this.thrusterOscillator = null;
    this.thrusterGain = null;
  }

  public updateThrusterSound(thrust: number) { // thrust is from -1 to 1
    if (!this.audioContext || !this.thrusterGain || !this.thrusterOscillator) return;
    
    let frequency = 80;
    let volume = 0.05;
    
    if (thrust > 0) { // Forward thrust
      this.thrusterOscillator.type = 'sawtooth';
      frequency = 80 + (thrust * 120);
      volume = 0.05 + (thrust * 0.15);
    } else if (thrust < 0) { // Reverse thrust
      this.thrusterOscillator.type = 'square';
      frequency = 60 + (Math.abs(thrust) * 40);
      volume = 0.05 + (Math.abs(thrust) * 0.1);
    }

    const now = this.audioContext.currentTime;
    this.thrusterOscillator.frequency.linearRampToValueAtTime(frequency, now + 0.1);
    this.thrusterGain.gain.linearRampToValueAtTime(volume, now + 0.1);
  }


  public playLaserSound() {
    this.playSound('sine', 880, 0.2, 0.2);
    this.playSound('square', 440, 0.2, 0.1);
  }

  public playMissileLaunchSound() {
    this.playSound('sawtooth', 100, 1.5, 0.6);
    this.playSound('square', 50, 1.5, 0.4);
  }

  public playExplosionSound() {
    this.playSound('sawtooth', 16, 1.5, 0.8);
    this.playSound('sawtooth', 200, 0.8, 0.7);
    this.playSound('square', 100, 1, 0.8);
  }

  public playJumpSound() {
    this.resumeContext();
    if (!this.audioContext) return;
    const ctx = this.audioContext;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 1.5);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 2);
  }
  
  public playDockingSound() {
      this.playSound('square', 300, 0.1, 0.3);
      this.playSound('square', 400, 0.1, 0.3, 0.15);
      this.playSound('square', 500, 0.2, 0.3, 0.3);
  }
  
  public playUIClick() {
      this.playSound('triangle', 800, 0.05, 0.1);
      this.playSound('triangle', 1200, 0.05, 0.05, 0.02);
  }

  public playPipChangeSound() {
      this.playSound('triangle', 1200, 0.05, 0.1);
  }

  public playGameOverSound() {
    this.playSound('sawtooth', 200, 0.8, 0.5);
    this.playSound('sawtooth', 100, 1.2, 0.5, 0.2);
    this.playSound('sawtooth', 50, 1.6, 0.5, 0.4);
  }

  public playUndockingSound() {
    this.playSound('sine', 440, 0.1, 0.2);
    this.playSound('sine', 660, 0.1, 0.2, 0.1);
    this.playSound('sine', 880, 0.2, 0.2, 0.2);
  }

  public playCargoScoopSound() {
      this.playSound('square', 80, 0.15, 0.4);
      this.playSound('sawtooth', 50, 0.2, 0.2);
  }
  
  public playBuySound() {
      this.playSound('square', 500, 0.05, 0.2);
      this.playSound('square', 700, 0.05, 0.1, 0.02);
  }

  public playSellSound() {
      this.playSound('sine', 1046.50, 0.1, 0.2); // C6
      this.playSound('sine', 1318.51, 0.2, 0.2, 0.1); // E6
  }

  public playAcceptMissionSound() {
      this.playSound('sine', 523.25, 0.1, 0.2); // C5
      this.playSound('sine', 659.25, 0.1, 0.2, 0.1); // E5
      this.playSound('sine', 783.99, 0.15, 0.2, 0.2); // G5
  }

}

export const audioService = new AudioService();