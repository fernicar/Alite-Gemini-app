
// @ts-nocheck
// Disabling TypeScript check for this file because it uses browser-specific
// AudioContext APIs that may not be available in all environments.

class AudioService {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

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

  public playLaserSound() {
    this.playSound('sine', 880, 0.2, 0.2);
    this.playSound('square', 440, 0.2, 0.1);
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
      this.playSound('triangle', 600, 0.05, 0.1);
  }

  public playGameOverSound() {
    this.playSound('sawtooth', 200, 0.8, 0.5);
    this.playSound('sawtooth', 100, 1.2, 0.5, 0.2);
    this.playSound('sawtooth', 50, 1.6, 0.5, 0.4);
  }

}

export const audioService = new AudioService();
