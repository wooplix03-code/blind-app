// High-Fidelity Human-Like Speech & Audio Feedback Engine for WEZEY
// Prioritizes natural, neural, human-sounding voices over robotic OS synthesizers

class SpeechEngine {
  private synth: SpeechSynthesis | null = null;
  private recognition: any = null;
  private audioCtx: AudioContext | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  public currentLanguage: string = 'en-US';
  public isListening: boolean = false;
  private micPermissionGranted: boolean = false;
  private voicesReady: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => {
          this.loadVoices();
          this.voicesReady = true;
        };
      }
      // Windows Edge: voices load lazily — force a speech to trigger lazy load
      // then re-fetch after short delay
      setTimeout(() => {
        if (!this.voicesReady && this.synth) {
          this.voices = this.synth.getVoices();
          this.voicesReady = true;
        }
      }, 500);
      setTimeout(() => {
        if (this.synth) {
          const freshVoices = this.synth.getVoices();
          if (freshVoices.length > this.voices.length) {
            this.voices = freshVoices;
          }
        }
      }, 2500);
    }
    this.initAudioContext();
  }

  private loadVoices(): void {
    if (!this.synth) return;
    const v = this.synth.getVoices();
    if (v.length > 0) {
      this.voices = v;
      this.voicesReady = true;
    }
  }

  /**
   * Wait until voices are loaded (Windows lazy-load workaround).
   * Resolves after voices appear or after 3s timeout.
   */
  private waitForVoices(): Promise<void> {
    return new Promise((resolve) => {
      if (this.voices.length > 0) {
        resolve();
        return;
      }
      let attempts = 0;
      const poll = setInterval(() => {
        if (this.synth) {
          const v = this.synth.getVoices();
          if (v.length > 0) {
            this.voices = v;
            clearInterval(poll);
            resolve();
            return;
          }
        }
        attempts++;
        if (attempts >= 30) { // 3 seconds max
          clearInterval(poll);
          resolve();
        }
      }, 100);
    });
  }

  private initAudioContext(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    } catch (e) {
      console.warn('AudioContext not available:', e);
    }
  }

  public setLanguage(lang: 'en' | 'ms' | string): void {
    if (lang === 'ms' || lang.startsWith('ms')) {
      this.currentLanguage = 'ms-MY';
    } else {
      this.currentLanguage = 'en-US';
    }
    const voice = this.getBestHumanVoice(this.currentLanguage);
    console.log(`Language set to ${this.currentLanguage}, selected voice:`, voice?.name);
  }

  /**
   * Request browser microphone permission explicitly upfront.
   */
  public async ensureMicAccess(): Promise<boolean> {
    if (this.micPermissionGranted) return true;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        this.micPermissionGranted = true;
        return true;
      }
    } catch (err) {
      console.warn('Microphone permission request error:', err);
    }
    return false;
  }

  /**
   * Find the most natural, human-sounding voice available on the device.
   * Filters out obsolete robotic desktop voices (e.g. David Desktop).
   */
  public getBestHumanVoice(lang?: string): SpeechSynthesisVoice | null {
    if (!this.voices || this.voices.length === 0) {
      if (this.synth) this.voices = this.synth.getVoices();
    }
    if (!this.voices || this.voices.length === 0) return null;

    const targetLang = (lang || this.currentLanguage || 'en').toLowerCase().slice(0, 2);
    let langVoices = this.voices.filter((v) => v.lang.toLowerCase().startsWith(targetLang));

    if (langVoices.length === 0) {
      langVoices = this.voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    }

    if (langVoices.length === 0) {
      return this.voices[0] || null;
    }

    const scoreVoice = (v: SpeechSynthesisVoice): number => {
      const name = v.name.toLowerCase();
      let score = 0;

      // ── TIER 1: Microsoft Edge Natural (best human voices on Windows) ──
      // Exact match gets highest score
      if (name === 'microsoft aria online (natural)') return 400;
      if (name === 'microsoft jenny online (natural)') return 390;
      if (name === 'microsoft guy online (natural)') return 380;
      if (name === 'microsoft ana online (natural)') return 375;

      // Partial match for aria/jenny online
      if (name.includes('aria') && name.includes('online')) score += 300;
      if (name.includes('jenny') && name.includes('online')) score += 290;
      if (name.includes('guy') && name.includes('online')) score += 280;

      // Any "online (natural)" voice
      if (name.includes('online') && name.includes('natural')) score += 250;
      if (name.includes('natural')) score += 180;
      if (name.includes('neural')) score += 160;
      if (name.includes('online')) score += 140;

      // Any aria/jenny voice (even without "online")
      if (name.includes('aria')) score += 95;
      if (name.includes('jenny')) score += 90;
      if (name.includes('guy') && !name.includes('desktop')) score += 85;

      // ── TIER 2: Google Natural Voices (Chrome / Android) ──
      if (name.includes('google')) score += 80;
      if (name.includes('female') || name.includes('us english') || name.includes('uk english')) score += 20;

      // ── TIER 3: Apple Natural Voices (iOS / macOS) ──
      if (name.includes('siri')) score += 90;
      if (name.includes('samantha')) score += 75;
      if (name.includes('karen') || name.includes('moira')) score += 60;

      // Premium / Enhanced markers
      if (name.includes('premium')) score += 50;
      if (name.includes('enhanced')) score += 40;

      // ── PENALIZE robotic Windows Desktop voices ──
      if (name.includes('desktop')) score -= 150;
      if (name.includes('david')) score -= 160;
      if (name.includes('mark') && name.includes('desktop')) score -= 150;
      if (name.includes('george')) score -= 100;
      if (name.includes('espeak')) score -= 200;
      if (name.includes('zira') && name.includes('desktop')) score -= 100;

      return score;
    };

    const sorted = [...langVoices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
    return sorted[0] || null;
  }

  /**
   * Speak text clearly with natural human conversational cadence.
   * Cancels prior speech immediately to avoid overlapping audio.
   * Uses warm human-sounding rate/pitch and auto-retries voice on Windows.
   */
  public speak(text: string, onEnd?: () => void, lang?: string): void {
    if (!this.synth) {
      if (onEnd) onEnd();
      return;
    }

    this.synth.cancel();

    const cleanText = text.replace(/[*#_`]/g, '').trim();
    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const doSpeak = () => {
      if (!this.synth) { if (onEnd) onEnd(); return; }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const chosenLang = lang || this.currentLanguage;
      utterance.lang = chosenLang;

      // Human-warm cadence: slightly slower + slightly warmer pitch
      // 0.92 rate sounds natural & easy to follow for blind users
      utterance.rate = 0.92;
      utterance.pitch = 1.08;  // slightly warmer/friendlier tone
      utterance.volume = 1.0;

      // Re-fetch voices fresh in case they loaded after app start
      if (this.voices.length === 0 && this.synth) {
        this.voices = this.synth.getVoices();
      }
      const bestVoice = this.getBestHumanVoice(chosenLang);
      if (bestVoice) {
        utterance.voice = bestVoice;
        // Log selected voice for debug
        console.log('[Wezey Voice]', bestVoice.name, '| lang:', bestVoice.lang, '| local:', bestVoice.localService);
      }

      utterance.onend = () => {
        if (onEnd) {
          // Small delay so speech finishes completely before mic starts
          setTimeout(onEnd, 150);
        }
      };

      utterance.onerror = (e) => {
        console.warn('Speech error:', e);
        if (onEnd) onEnd();
      };

      this.synth.speak(utterance);
    };

    // If voices are not yet loaded, wait (Windows lazy-load fix)
    if (this.voices.length === 0) {
      this.waitForVoices().then(doSpeak);
    } else {
      doSpeak();
    }
  }

  public stopSpeaking(): void {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  /**
   * Play warm, pleasant acoustic earcon cues using Web Audio API
   */
  public playCue(type: 'mic_start' | 'mic_end' | 'shutter' | 'success' | 'alert'): void {
    if (!this.audioCtx) this.initAudioContext();
    if (!this.audioCtx) return;

    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'mic_start') {
        // Soft warm ascending chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.14);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.17);
      } else if (type === 'mic_end') {
        // Soft descending chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(783.99, now);
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.14);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.17);
      } else if (type === 'shutter') {
        // Camera snap sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'success') {
        // Gentle major chord chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'alert') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch (e) {
      console.warn('Audio cue error:', e);
    }
  }

  /**
   * Listen to user speech with REAL-TIME interim streaming.
   * Words type live onto the screen as they are spoken.
   */
  public startListening(
    onResult: (text: string, isFinal: boolean) => void,
    onError?: (err: any) => void
  ): boolean {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      if (onError) onError('Speech recognition not supported in browser');
      return false;
    }

    try {
      this.stopListening();
      this.recognition = new SpeechRec();
      this.recognition.continuous = true; // Keep listening continuously until user pauses
      this.recognition.interimResults = true; // Live real-time typing
      this.recognition.lang = this.currentLanguage;
      this.isListening = true;

      this.recognition.onstart = () => {
        this.playCue('mic_start');
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const text = finalTranscript || interimTranscript;
        const isFinal = Boolean(finalTranscript);
        if (text) {
          onResult(text, isFinal);
        }
      };

      this.recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // ignore momentary silence
          return;
        }
        this.isListening = false;
        console.warn('SpeechRecognition error:', event.error);
        if (onError) onError(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.playCue('mic_end');
      };

      this.recognition.start();
      return true;
    } catch (e) {
      this.isListening = false;
      console.warn('SpeechRecognition start error:', e);
      if (onError) onError(e);
      return false;
    }
  }

  public stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }
    this.isListening = false;
  }
}

export const speechEngine = new SpeechEngine();
