let audioCtx: AudioContext | null = null;

export function playSuccessChime() {
  if (typeof window === 'undefined') return;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const t = audioCtx.currentTime;
  
  const playNote = (freq: number, startTime: number, duration: number) => {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    // Smooth sine wave for ambient feel
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    // Gentle envelope: fade in softly, fade out slowly
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.1); 
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  // Subtle major 7th chord arpeggio for a premium "success" feel
  playNote(523.25, t, 2.0); // C5
  playNote(659.25, t + 0.1, 2.0); // E5
  playNote(783.99, t + 0.2, 2.0); // G5
  playNote(987.77, t + 0.3, 2.5); // B5 (sparkle note)
}
