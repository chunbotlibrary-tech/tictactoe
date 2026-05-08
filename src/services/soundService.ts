
class SoundService {
  private audioContext: AudioContext | null = null;

  private init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number) {
    this.init();
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);

    gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, this.audioContext.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  playMove() {
    // A crisp, short click/pop sound
    this.playTone(800, 'sine', 0.15, 0.2);
  }

  playWin() {
    // Triumphant rising arpeggio
    this.playTone(523.25, 'triangle', 0.4, 0.2); // C5
    setTimeout(() => this.playTone(659.25, 'triangle', 0.4, 0.2), 100); // E5
    setTimeout(() => this.playTone(783.99, 'triangle', 0.6, 0.2), 200); // G5
    setTimeout(() => this.playTone(1046.50, 'triangle', 0.8, 0.2), 300); // C6
  }

  playLose() {
    // Descending melancholy tone
    this.playTone(392.00, 'sine', 0.4, 0.2); // G4
    setTimeout(() => this.playTone(349.23, 'sine', 0.4, 0.2), 200); // F4
    setTimeout(() => this.playTone(261.63, 'sine', 0.6, 0.2), 400); // C4
  }

  playDraw() {
    // Neutral double beep
    this.playTone(440, 'sine', 0.2, 0.1);
    setTimeout(() => this.playTone(440, 'sine', 0.2, 0.1), 150);
  }
}

export const soundService = new SoundService();
