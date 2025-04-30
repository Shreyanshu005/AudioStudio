// Audio processing middleware class
export class AudioProcessor {
  private audioContext: AudioContext;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private analyserNode: AnalyserNode | null = null;
  private convolver: ConvolverNode | null = null;
  private delay: DelayNode | null = null;
  private playbackRate: number = 1.0;
  private startTime: number = 0;
  private pausedAt: number = 0;
  private isPlaying: boolean = false;
  private trimStart: number = 0;
  private trimEnd: number = 0;
  private effectsSettings = {
    echo: {
      delay: 0.3,
      feedback: 0
    },
    reverb: {
      level: 0
    }
  };

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  // Load audio file
  async loadAudioFile(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.trimEnd = this.audioBuffer.duration;
    return this.audioBuffer;
  }

  // Setup audio nodes for playback
  private setupNodes() {
    if (!this.audioBuffer) throw new Error("No audio loaded");

    // Reset any existing nodes
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
    }
    if (this.convolver) {
      this.convolver.disconnect();
    }
    if (this.delay) {
      this.delay.disconnect();
    }

    // Create source node
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.playbackRate.value = this.playbackRate;

    // Create analyzer for waveform visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;

    // Create gain node for volume control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.gainNode?.gain.value || 1.0;

    // Connect the basic chain
    this.sourceNode.connect(this.analyserNode);
    this.analyserNode.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    // Apply effects if enabled
    this.applyEffects();
  }

  // Apply audio effects
  private applyEffects() {
    if (!this.sourceNode || !this.gainNode || !this.analyserNode) return;

    // Reset any existing effects
    if (this.convolver) this.convolver.disconnect();
    if (this.delay) this.delay.disconnect();

    // Disconnect all nodes first to prevent duplicate audio paths
    this.sourceNode.disconnect();
    this.analyserNode.disconnect();
    
    // Reconnect the basic path
    this.sourceNode.connect(this.analyserNode);
    this.analyserNode.connect(this.gainNode);

    // Only apply echo if feedback is greater than 0
    if (this.effectsSettings.echo.feedback > 0) {
      this.delay = this.audioContext.createDelay();
      this.delay.delayTime.value = this.effectsSettings.echo.delay;

      const feedbackGain = this.audioContext.createGain();
      feedbackGain.gain.value = this.effectsSettings.echo.feedback;

      // Create echo effect
      this.sourceNode.connect(this.delay);
      this.delay.connect(feedbackGain);
      feedbackGain.connect(this.delay);
      this.delay.connect(this.gainNode);
    }

    // Only apply reverb if level is greater than 0
    if (this.effectsSettings.reverb.level > 0) {
      this.createReverbNode().then(reverbNode => {
        if (!this.sourceNode || !this.gainNode) return;

        this.convolver = reverbNode;
        const reverbGain = this.audioContext.createGain();
        reverbGain.gain.value = this.effectsSettings.reverb.level;

        // Connect to reverb
        this.sourceNode.connect(this.convolver);
        this.convolver.connect(reverbGain);
        reverbGain.connect(this.gainNode);
      });
    }
  }

  // Create a reverb convolver node
  private async createReverbNode(): Promise<ConvolverNode> {
    const reverbNode = this.audioContext.createConvolver();
    
    // Generate a simple impulse response for reverb (in a real app, you'd use a real IR file)
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * 2; // 2 seconds reverb
    const impulseResponse = this.audioContext.createBuffer(2, length, sampleRate);
    
    const leftChannel = impulseResponse.getChannelData(0);
    const rightChannel = impulseResponse.getChannelData(1);
    
    for (let i = 0; i < length; i++) {
      // Exponential decay
      const decay = Math.exp(-i / (sampleRate * 0.5));
      leftChannel[i] = (Math.random() * 2 - 1) * decay;
      rightChannel[i] = (Math.random() * 2 - 1) * decay;
    }
    
    reverbNode.buffer = impulseResponse;
    return reverbNode;
  }

  // Play audio
  play() {
    if (!this.audioBuffer) return;
    
    // If already playing, stop first
    if (this.isPlaying) {
      this.stop();
    }
    
    // Reset effects and setup nodes
    this.setupNodes();
    
    if (this.sourceNode) {
      // Calculate where to start playback
      const offset = this.pausedAt > 0 ? this.pausedAt : this.trimStart;
      const duration = this.trimEnd - offset;
      
      // Start playing from the calculated position
      this.sourceNode.start(0, offset, duration);
      this.startTime = this.audioContext.currentTime - offset;
      this.isPlaying = true;
      
      // When playback finishes
      this.sourceNode.onended = () => {
        this.pausedAt = this.trimStart; // Reset to trim start when done
        this.stop();
      };
    }
  }
  
  // Pause audio
  pause() {
    if (!this.isPlaying) return;
    
    this.pausedAt = this.getCurrentTime();
    this.stop();
  }
  
  // Stop audio
  stop() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (e) {
        // Source might have already stopped
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    // Clean up effects
    if (this.delay) {
      this.delay.disconnect();
      this.delay = null;
    }
    if (this.convolver) {
      this.convolver.disconnect();
      this.convolver = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    this.isPlaying = false;
  }
  
  // Get current playback time
  getCurrentTime(): number {
    if (!this.isPlaying) {
      return this.pausedAt;
    }
    
    // Calculate current time and ensure it stays within trim boundaries
    const rawTime = this.audioContext.currentTime - this.startTime;
    
    // Ensure we don't go beyond trim end
    if (rawTime > this.trimEnd) {
      this.pausedAt = this.trimStart;
      this.stop();
      return this.trimStart;
    }
    
    return rawTime;
  }
  
  // Set playback rate
  setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    if (this.sourceNode) {
      this.sourceNode.playbackRate.value = rate;
    }
  }
  
  // Set echo effect parameters
  setEchoEffect(delay: number, feedback: number) {
    this.effectsSettings.echo.delay = delay;
    this.effectsSettings.echo.feedback = feedback;
    if (this.isPlaying) {
      // For playing audio, we need to rebuild the audio graph
      const currentTime = this.getCurrentTime();
      this.stop();
      this.pausedAt = currentTime;
      this.play();
    }
  }
  
  // Set reverb effect level
  setReverbEffect(level: number) {
    this.effectsSettings.reverb.level = level;
    if (this.isPlaying) {
      // For playing audio, we need to rebuild the audio graph
      const currentTime = this.getCurrentTime();
      this.stop();
      this.pausedAt = currentTime;
      this.play();
    }
  }
  
  // Set trim points
  setTrimPoints(start: number, end: number) {
    const oldTrimStart = this.trimStart;
    const oldTrimEnd = this.trimEnd;
    
    this.trimStart = Math.max(0, start);
    this.trimEnd = Math.min(this.audioBuffer?.duration || 0, end);
    
    console.log(`Trim points updated: ${this.trimStart.toFixed(2)} to ${this.trimEnd.toFixed(2)}`);
    
    // If currently playing and trim points changed significantly, restart from new trim start
    if (this.isPlaying && (Math.abs(oldTrimStart - this.trimStart) > 0.1 || 
                          Math.abs(oldTrimEnd - this.trimEnd) > 0.1)) {
      const wasPlaying = this.isPlaying;
      this.stop();
      if (wasPlaying) {
        this.pausedAt = this.trimStart;
        this.play();
      }
    } else if (!this.isPlaying) {
      // If paused, ensure pausedAt is within the new trim region
      this.pausedAt = Math.max(this.trimStart, Math.min(this.pausedAt, this.trimEnd));
    }
  }
  
  // Get waveform data for visualization
  getWaveformData(): Uint8Array {
    if (!this.analyserNode) {
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
    }
    
    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteTimeDomainData(dataArray);
    return dataArray;
  }
  
  // Process and export the edited audio
  async exportAudio(format: string = 'audio/wav'): Promise<Blob> {
    if (!this.audioBuffer) throw new Error("No audio loaded");
    
    // Create a new audio buffer with the trimmed content
    const duration = this.trimEnd - this.trimStart;
    const offlineContext = new OfflineAudioContext(
      this.audioBuffer.numberOfChannels,
      this.audioBuffer.sampleRate * duration,
      this.audioBuffer.sampleRate
    );
    
    // Create source buffer
    const sourceNode = offlineContext.createBufferSource();
    sourceNode.buffer = this.audioBuffer;
    sourceNode.playbackRate.value = this.playbackRate;
    
    // Create gain node for volume
    const gainNode = offlineContext.createGain();
    gainNode.gain.value = this.gainNode?.gain.value || 1.0;
    
    // Apply echo effect if enabled
    if (this.effectsSettings.echo.feedback > 0) {
      const delay = offlineContext.createDelay();
      delay.delayTime.value = this.effectsSettings.echo.delay;
      
      const feedbackGain = offlineContext.createGain();
      feedbackGain.gain.value = this.effectsSettings.echo.feedback;
      
      // Create echo effect chain
      sourceNode.connect(delay);
      delay.connect(feedbackGain);
      feedbackGain.connect(delay);
      delay.connect(gainNode);
    } else {
      sourceNode.connect(gainNode);
    }
    
    // Apply reverb effect if enabled
    if (this.effectsSettings.reverb.level > 0) {
      const reverbNode = await this.createReverbNode();
      const reverbGain = offlineContext.createGain();
      reverbGain.gain.value = this.effectsSettings.reverb.level;
      
      // Connect to reverb
      sourceNode.connect(reverbNode);
      reverbNode.connect(reverbGain);
      reverbGain.connect(gainNode);
    }
    
    // Connect to destination
    gainNode.connect(offlineContext.destination);
    
    // Render the audio
    sourceNode.start(0, this.trimStart, duration);
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert the rendered buffer to the requested format
    const audioData = this.audioBufferToWav(renderedBuffer);
    return new Blob([audioData], { type: format });
  }
  
  // Convert AudioBuffer to WAV format
  private audioBufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
    // Implementation of WAV encoding
    // This is a simplified version - a real app would use a more robust implementation
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const buffer = audioBuffer;
    const numSamples = buffer.length;
    const dataSize = numSamples * numChannels * bytesPerSample;
    const bufferSize = 44 + dataSize;
    
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);
    
    // Write WAV header
    // "RIFF" chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    
    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // byte rate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    
    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Write audio data
    const channelData = [];
    for (let i = 0; i < numChannels; i++) {
      channelData.push(buffer.getChannelData(i));
    }
    
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
        const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, value, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  }
  
  // Set volume level
  setVolume(level: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = level;
    }
  }

  // Seek to a specific time
  seek(time: number) {
    if (!this.audioBuffer) return;
    
    // Ensure time is within trim region
    const clampedTime = Math.max(this.trimStart, Math.min(time, this.trimEnd));
    
    // Stop current playback if any
    if (this.isPlaying) {
      this.stop();
    }
    
    // Set the new position
    this.pausedAt = clampedTime;
    
    // If we were playing, start from the new position
    if (this.isPlaying) {
      this.setupNodes();
      this.play();
    }
  }
}

// Helper function to write strings to a DataView
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
