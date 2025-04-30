import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import AudioUploader from '@/components/AudioUploader';
import Waveform from '@/components/Waveform';
import AudioControls from '@/components/AudioControls';
import ReplayInsights from '@/components/ReplayInsights';
import { AudioProcessor } from '@/lib/audio-processor';
import { Card, CardContent } from '@/components/ui/card';
import { AudioWaveform } from 'lucide-react';
import { PlaybackTracker } from '@/lib/playback-tracker';

const Index = () => {
  // Audio state
  const [file, setFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Audio processing
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [echoLevel, setEchoLevel] = useState<number>(0);
  const [reverbLevel, setReverbLevel] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  
  // Trim controls
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  
  // Playback tracking
  const [playbackData, setPlaybackData] = useState<number[]>([]);
  const [mostReplayedSegment, setMostReplayedSegment] = useState<{index: number, count: number} | null>(null);
  
  // Refs for audio processor and tracking
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const playbackTrackerRef = useRef<PlaybackTracker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Toast notifications
  const { toast } = useToast();
  
  // Initialize audio processor on mount
  useEffect(() => {
    audioProcessorRef.current = new AudioProcessor();
    playbackTrackerRef.current = new PlaybackTracker(10); // 10 segments
    
    return () => {
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioProcessorRef.current) {
        audioProcessorRef.current.stop();
      }
      
      if (playbackTrackerRef.current) {
        playbackTrackerRef.current.cleanup();
      }
    };
  }, []);
  
  // Handle audio file loading
  const handleAudioLoaded = async (audioFile: File) => {
    try {
      setFile(audioFile);
      
      if (audioProcessorRef.current) {
        const buffer = await audioProcessorRef.current.loadAudioFile(audioFile);
        setAudioBuffer(buffer);
        setDuration(buffer.duration);
        setTrimStart(0);
        setTrimEnd(buffer.duration);
        
        // Reset playback tracking
        if (playbackTrackerRef.current) {
          playbackTrackerRef.current.resetPlaybackData();
          setPlaybackData(new Array(10).fill(0));
          setMostReplayedSegment(null);
        }
        
        toast({
          title: "Audio loaded",
          description: `${audioFile.name} (${Math.round(buffer.duration)} seconds)`,
        });
      }
    } catch (error) {
      console.error("Error loading audio:", error);
      toast({
        title: "Error loading audio",
        description: "Failed to process audio file",
        variant: "destructive",
      });
    }
  };
  
  // Update playback position and tracking data
  const updatePlaybackPosition = () => {
    if (!audioProcessorRef.current) return;
    
    // Get current time
    const time = audioProcessorRef.current.getCurrentTime();
    setCurrentTime(time);
    
    // Update playback tracking
    if (playbackTrackerRef.current && isPlaying) {
      // Track which segment is being played
      const segmentIndex = Math.floor((time / duration) * 10);
      
      // Only update if in a valid segment
      if (segmentIndex >= 0 && segmentIndex < 10) {
        const newPlaybackData = [...playbackData];
        newPlaybackData[segmentIndex] += 0.1; // Increment gradually for smoother visualization
        setPlaybackData(newPlaybackData);
        
        // Find most replayed segment
        const maxIndex = newPlaybackData.indexOf(Math.max(...newPlaybackData));
        setMostReplayedSegment({
          index: maxIndex,
          count: Math.round(newPlaybackData[maxIndex])
        });
      }
    }
    
    // Continue animation if playing
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
    }
  };
  
  // Playback controls
  const handlePlayPause = () => {
    if (!audioProcessorRef.current || !audioBuffer) return;
    
    if (isPlaying) {
      audioProcessorRef.current.pause();
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    } else {
      audioProcessorRef.current.play();
      setIsPlaying(true);
      animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
    }
  };
  
  const handleRestart = () => {
    if (!audioProcessorRef.current) return;
    
    // Stop current playback
    audioProcessorRef.current.stop();
    
    // Reset position to start of trim region
    setCurrentTime(trimStart);
    audioProcessorRef.current.setTrimPoints(trimStart, trimEnd);
    
    // If was playing, restart playback
    if (isPlaying) {
      audioProcessorRef.current.play();
      animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
    } else {
      setIsPlaying(false);
    }
  };
  
  const handleSkipAhead = () => {
    if (!audioProcessorRef.current || !audioBuffer) return;
    
    const newTime = Math.min(currentTime + 5, trimEnd);
    setCurrentTime(newTime);
    
    // Use the seek method to maintain playback state
    audioProcessorRef.current.seek(newTime);
    
    // If playing, continue the animation
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
    }
  };
  
  const handleSkipBack = () => {
    if (!audioProcessorRef.current || !audioBuffer) return;
    
    const newTime = Math.max(currentTime - 5, trimStart);
    setCurrentTime(newTime);
    
    // Use the seek method to maintain playback state
    audioProcessorRef.current.seek(newTime);
    
    // If playing, continue the animation
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
    }
  };
  
  const handleSeek = (time: number) => {
    if (!audioProcessorRef.current) return;
    
    // Ensure time is within trim region
    const clampedTime = Math.max(trimStart, Math.min(time, trimEnd));
    setCurrentTime(clampedTime);
    
    // Start playing from the new position
    audioProcessorRef.current.seek(clampedTime);
    if (!isPlaying) {
      setIsPlaying(true);
      audioProcessorRef.current.play();
    }
    
    // Continue animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
  };
  
  // Handle audio processing changes
  const handlePlaybackRateChange = (rate: number) => {
    if (!audioProcessorRef.current) return;
    
    setPlaybackRate(rate);
    audioProcessorRef.current.setPlaybackRate(rate);
  };
  
  const handleEchoChange = (level: number) => {
    if (!audioProcessorRef.current) return;
    
    setEchoLevel(level);
    audioProcessorRef.current.setEchoEffect(0.3, level);
  };
  
  const handleReverbChange = (level: number) => {
    if (!audioProcessorRef.current) return;
    
    setReverbLevel(level);
    audioProcessorRef.current.setReverbEffect(level);
  };
  
  const handleVolumeChange = (level: number) => {
    setVolume(level);
    if (audioProcessorRef.current) {
      audioProcessorRef.current.setVolume(level);
    }
  };
  
  // Handle trim region changes
  const handleTrimChange = (start: number, end: number) => {
    if (!audioProcessorRef.current) return;
    
    setTrimStart(start);
    setTrimEnd(end);
    audioProcessorRef.current.setTrimPoints(start, end);
    
    // If current position is outside new trim region, adjust it
    if (currentTime < start || currentTime > end) {
      setCurrentTime(start);
    }
  };
  
  // Handle audio download
  const handleDownload = async () => {
    if (!audioProcessorRef.current || !file) return;
    
    try {
      toast({
        title: "Processing audio",
        description: "Preparing your edited audio file...",
      });
      
      const blob = await audioProcessorRef.current.exportAudio();
      const url = URL.createObjectURL(blob);
      
      // Create a download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited_${file.name}`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download ready",
        description: "Your edited audio has been downloaded",
      });
    } catch (error) {
      console.error("Error exporting audio:", error);
      toast({
        title: "Export failed",
        description: "Failed to process audio for download",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <AudioWaveform className="h-8 w-8 text-primary" />
            Audio Studio
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Edit audio and track listener engagement
          </p>
        </div>
        
        {/* Main content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Editor Section (2/3 width on medium+ screens) */}
          <div className="md:col-span-2 space-y-6">
            {!audioBuffer ? (
              <AudioUploader onAudioLoaded={handleAudioLoaded} />
            ) : (
              <>
                {/* Audio waveform and editor */}
                <Card>
                  <CardContent className="p-4 md:p-6">
                    <Waveform
                      audioBuffer={audioBuffer}
                      currentTime={currentTime}
                      duration={duration}
                      isPlaying={isPlaying}
                      playbackData={playbackData}
                      trimStart={trimStart}
                      trimEnd={trimEnd}
                      onTrimChange={handleTrimChange}
                      onSeek={handleSeek}
                    />
                  </CardContent>
                </Card>
                
                {/* Audio controls */}
                <AudioControls
                  isPlaying={isPlaying}
                  playbackRate={playbackRate}
                  echoLevel={echoLevel}
                  reverbLevel={reverbLevel}
                  volume={volume}
                  canDownload={!!audioBuffer}
                  onPlayPause={handlePlayPause}
                  onRestart={handleRestart}
                  onSkipAhead={handleSkipAhead}
                  onSkipBack={handleSkipBack}
                  onPlaybackRateChange={handlePlaybackRateChange}
                  onEchoChange={handleEchoChange}
                  onReverbChange={handleReverbChange}
                  onVolumeChange={handleVolumeChange}
                  onDownload={handleDownload}
                />
              </>
            )}
          </div>
          
          {/* Analytics Section (1/3 width on medium+ screens) */}
          <div className="md:col-span-1">
            <ReplayInsights
              playbackData={playbackData}
              duration={duration}
              mostReplayedSegment={mostReplayedSegment}
            />
          </div>
        </div>
        
        {/* Instructions */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Upload an audio file to begin editing. Track which sections are replayed most often.</p>
          <p className="mt-1">Changes are processed in real-time and you can download your edited audio when finished.</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
