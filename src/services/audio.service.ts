import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private audioContext: AudioContext | null = null;

  private async tryInitializeAudioContext(): Promise<boolean> {
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(e => console.error("Audio context resume failed:", e));
      }
      return this.audioContext.state === 'running';
    }

    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (this.audioContext.state === 'suspended') {
           await this.audioContext.resume().catch(e => console.error("Audio context resume failed:", e));
        }
        return this.audioContext.state === 'running';
      } catch (e) {
        console.error('Error initializing AudioContext', e);
        this.audioContext = null;
        return false;
      }
    }
    return false;
  }

  private async playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): Promise<void> {
    const isReady = await this.tryInitializeAudioContext();
    if (!isReady || !this.audioContext) {
      return;
    }
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    // Fade out to avoid clicks
    gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playSentSound(): void {
    this.playTone(523.25, 0.1, 'triangle'); // C5
  }

  playReceivedSound(): void {
    this.playTone(783.99, 0.08, 'sine'); // G5
    setTimeout(() => this.playTone(1046.50, 0.1, 'sine'), 100); // C6
  }

  playRecordingStartSound(): void {
    this.playTone(261.63, 0.1, 'square'); // C4
  }

  playRecordingStopSound(): void {
    this.playTone(329.63, 0.1, 'square'); // E4
  }
}
