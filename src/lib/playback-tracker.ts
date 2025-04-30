
// Playback tracker for analyzing listener behavior
export class PlaybackTracker {
  private audio: HTMLAudioElement | null = null;
  private audioDuration: number = 0;
  private segments: number = 10; // Default number of segments to divide audio into
  private playbackData: number[] = [];
  private currentSegment: number = -1;
  private tracking: boolean = false;
  private lastTrackedTime: number = 0;

  constructor(segments: number = 10) {
    this.segments = segments;
    this.resetPlaybackData();
  }

  // Reset tracking data
  resetPlaybackData() {
    this.playbackData = new Array(this.segments).fill(0);
    this.currentSegment = -1;
  }

  // Initialize with audio element
  setAudio(audio: HTMLAudioElement, duration: number) {
    this.audio = audio;
    this.audioDuration = duration;
    this.resetPlaybackData();

    // Set up playback tracking
    if (this.audio) {
      this.audio.addEventListener('timeupdate', this.trackPlayback);
      this.audio.addEventListener('pause', () => this.tracking = false);
      this.audio.addEventListener('play', () => {
        this.tracking = true;
        this.trackPlayback();
      });
      this.audio.addEventListener('ended', () => this.tracking = false);
    }
  }

  // Track current playback segment
  private trackPlayback = () => {
    if (!this.tracking || !this.audio) return;
    
    const currentTime = this.audio.currentTime;
    const segmentDuration = this.audioDuration / this.segments;
    const newSegment = Math.floor(currentTime / segmentDuration);
    
    // Check if we're in a new segment
    if (newSegment !== this.currentSegment) {
      this.currentSegment = newSegment;
      
      // Only increment if we've been in this segment for a meaningful amount of time
      // (prevents incrementing when just quickly scrolling through)
      if (this.currentSegment >= 0 && this.currentSegment < this.segments) {
        this.playbackData[this.currentSegment]++;
      }
    }
    
    this.lastTrackedTime = currentTime;
  };

  // Get the playback data for visualization
  getPlaybackData(): number[] {
    return [...this.playbackData];
  }

  // Get normalized playback data (0-1 scale)
  getNormalizedPlaybackData(): number[] {
    const maxValue = Math.max(...this.playbackData, 1); // Avoid division by zero
    return this.playbackData.map(value => value / maxValue);
  }

  // Get the most replayed segment
  getMostReplayedSegment(): { index: number, count: number } {
    const maxIndex = this.playbackData.indexOf(Math.max(...this.playbackData));
    return {
      index: maxIndex,
      count: this.playbackData[maxIndex]
    };
  }

  // Calculate replay data for custom time ranges
  getCustomRangeReplayData(startTime: number, endTime: number): number {
    const segmentDuration = this.audioDuration / this.segments;
    
    const startSegment = Math.floor(startTime / segmentDuration);
    const endSegment = Math.floor(endTime / segmentDuration);
    
    let totalReplays = 0;
    
    for (let i = startSegment; i <= endSegment && i < this.segments; i++) {
      if (i >= 0) {
        totalReplays += this.playbackData[i];
      }
    }
    
    return totalReplays;
  }

  // Clean up event listeners
  cleanup() {
    if (this.audio) {
      this.audio.removeEventListener('timeupdate', this.trackPlayback);
    }
  }
}
