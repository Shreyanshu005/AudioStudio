import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  FileAudio2,
  Volume2,
  Volume,
  VolumeX,
  Download
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

interface AudioControlsProps {
  isPlaying: boolean;
  playbackRate: number;
  echoLevel: number;
  reverbLevel: number;
  volume: number;
  canDownload: boolean;
  onPlayPause: () => void;
  onRestart: () => void;
  onSkipAhead: () => void;
  onSkipBack: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onEchoChange: (level: number) => void;
  onReverbChange: (level: number) => void;
  onVolumeChange: (level: number) => void;
  onDownload: () => void;
}

const AudioControls = ({
  isPlaying,
  playbackRate,
  echoLevel,
  reverbLevel,
  volume,
  canDownload,
  onPlayPause,
  onRestart,
  onSkipAhead,
  onSkipBack,
  onPlaybackRateChange,
  onEchoChange,
  onReverbChange,
  onVolumeChange,
  onDownload
}: AudioControlsProps) => {
  const [activeTab, setActiveTab] = useState('playback');
  
  // Helper to format playback rate
  const formatPlaybackRate = (rate: number) => {
    return `${rate.toFixed(1)}x`;
  };
  
  // Get volume icon based on level
  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX className="h-4 w-4" />;
    if (volume < 0.5) return <Volume className="h-4 w-4" />;
    return <Volume2 className="h-4 w-4" />;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      {/* Main Playback Controls */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onRestart} 
          title="Restart"
        >
          <SkipBack className="h-5 w-5" />
        </Button>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onSkipBack} 
          title="Skip Back 5s"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="default" 
          size="icon" 
          onClick={onPlayPause} 
          className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6" />
          )}
        </Button>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onSkipAhead} 
          title="Skip Ahead 5s"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="outline" 
          disabled={!canDownload}
          size="icon" 
          onClick={onDownload} 
          title="Download Edited Audio"
        >
          <Download className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Tabs for different control sets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="playback">Playback</TabsTrigger>
          <TabsTrigger value="effects">Effects</TabsTrigger>
          <TabsTrigger value="volume">Volume</TabsTrigger>
        </TabsList>
        
        <TabsContent value="playback" className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="playback-rate">Playback Speed: {formatPlaybackRate(playbackRate)}</Label>
            </div>
            <div className="relative">
              <Slider
                id="playback-rate"
                min={0.25}
                max={4}
                step={0.25}
                value={[playbackRate]}
                onValueChange={([val]) => onPlaybackRateChange(val)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span className="absolute left-0">0.25x</span>
                {/* <span className="absolute left-1/2 -translate-x-1/2">1.0x</span> */}
                <span className="absolute right-0">4.0x</span>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="effects" className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="echo-level">Echo: {Math.round(echoLevel * 100)}%</Label>
            </div>
            <Slider
              id="echo-level"
              min={0}
              max={1}
              step={0.01}
              value={[echoLevel]}
              onValueChange={([val]) => onEchoChange(val)}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="reverb-level">Reverb: {Math.round(reverbLevel * 100)}%</Label>
            </div>
            <Slider
              id="reverb-level"
              min={0}
              max={1}
              step={0.01}
              value={[reverbLevel]}
              onValueChange={([val]) => onReverbChange(val)}
              className="w-full"
            />
          </div>
        </TabsContent>
        
        <TabsContent value="volume" className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="volume-level" className="flex items-center gap-2">
                {getVolumeIcon()}
                Volume: {Math.round(volume * 100)}%
              </Label>
            </div>
            <Slider
              id="volume-level"
              min={0}
              max={1}
              step={0.01}
              value={[volume]}
              onValueChange={([val]) => onVolumeChange(val)}
              className="w-full"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AudioControls;
