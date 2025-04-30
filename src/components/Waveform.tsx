import { useEffect, useRef, useState } from 'react';
import { Scissors } from 'lucide-react';

interface WaveformProps {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackData: number[];
  trimStart: number;
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
  onSeek: (time: number) => void;
}

const Waveform = ({
  audioBuffer,
  currentTime,
  duration,
  isPlaying,
  playbackData,
  trimStart,
  trimEnd,
  onTrimChange,
  onSeek
}: WaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftHandleRef = useRef<HTMLDivElement>(null);
  const rightHandleRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [isPlayheadDragging, setIsPlayheadDragging] = useState(false);

  // Draw waveform from audio buffer
  useEffect(() => {
    if (!canvasRef.current || !audioBuffer) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Reset canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get the audio data
    const channelData = audioBuffer.getChannelData(0); // Use first channel for simplicity
    const step = Math.ceil(channelData.length / canvas.width);
    const amp = canvas.height / 2;
    
    ctx.fillStyle = '#9b87f5';
    ctx.strokeStyle = '#7E69AB';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Draw the center line
    ctx.moveTo(0, amp);
    ctx.lineTo(canvas.width, amp);
    ctx.stroke();
    
    // Draw the waveform
    for (let i = 0; i < canvas.width; i++) {
      let min = 1.0;
      let max = -1.0;
      
      for (let j = 0; j < step; j++) {
        const datum = channelData[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      
      ctx.fillRect(
        i, 
        (1 + min) * amp, 
        1, 
        Math.max(1, (max - min) * amp)
      );
    }
  }, [audioBuffer]);

  // Handle playhead drag
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPlayheadDragging(true);
  };

  // Handle mouse move for playhead dragging
  useEffect(() => {
    if (!containerRef.current || !duration || !isPlayheadDragging) return;
    
    const container = containerRef.current;
    
    const handleMouseMove = (e: MouseEvent) => {
      const containerRect = container.getBoundingClientRect();
      const clickPosition = Math.max(0, Math.min(e.clientX - containerRect.left, containerRect.width));
      const seekTime = (clickPosition / containerRect.width) * duration;
      onSeek(seekTime);
    };
    
    const handleMouseUp = () => {
      setIsPlayheadDragging(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPlayheadDragging, duration, onSeek]);

  // Update playhead position
  useEffect(() => {
    const playheadEl = document.getElementById('playhead');
    if (playheadEl && containerRef.current && duration) {
      const containerWidth = containerRef.current.clientWidth;
      const position = (currentTime / duration) * containerWidth;
      playheadEl.style.left = `${position}px`;
    }
  }, [currentTime, duration, isPlaying]);

  // Update trim handles position
  useEffect(() => {
    if (!containerRef.current || !leftHandleRef.current || !rightHandleRef.current || !duration) return;
    
    const containerWidth = containerRef.current.clientWidth;
    
    // Make sure right position doesn't exceed the container width
    const leftPosition = (trimStart / duration) * containerWidth;
    const rightPosition = Math.min((trimEnd / duration) * containerWidth, containerWidth - 6);
    
    leftHandleRef.current.style.left = `${leftPosition}px`;
    rightHandleRef.current.style.left = `${rightPosition}px`;
    
    // Update trim region
    const trimRegion = document.getElementById('trim-region');
    if (trimRegion) {
      trimRegion.style.left = `${leftPosition}px`;
      trimRegion.style.width = `${rightPosition - leftPosition}px`;
    }
  }, [trimStart, trimEnd, duration]);

  // Improved drag handling with React state
  const handleMouseDown = (handle: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(handle);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!containerRef.current || !duration || isDragging || isPlayheadDragging) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const clickPosition = e.clientX - containerRect.left;
    const seekTime = (clickPosition / containerRect.width) * duration;
    onSeek(seekTime);
  };

  // Enhanced mouse move handler using React state
  useEffect(() => {
    if (!containerRef.current || !duration) return;
    
    const container = containerRef.current;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      
      // Calculate new position with constraints
      let newPos = e.clientX - containerRect.left;
      newPos = Math.max(0, Math.min(newPos, containerWidth));
      
      if (isDragging === 'left') {
        const maxLeft = (trimEnd - 0.5) / duration * containerWidth;
        newPos = Math.min(newPos, maxLeft);
        const newStart = (newPos / containerWidth) * duration;
        onTrimChange(newStart, trimEnd);
      } else if (isDragging === 'right') {
        const minRight = (trimStart + 0.5) / duration * containerWidth;
        newPos = Math.max(newPos, minRight);
        const newEnd = Math.min((newPos / containerWidth) * duration, duration);
        onTrimChange(trimStart, newEnd);
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(null);
    };

    // Touch event handlers with the same improvements
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault(); // Prevent scrolling while dragging
      
      const touch = e.touches[0];
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      
      // Calculate new position with constraints
      let newPos = touch.clientX - containerRect.left;
      newPos = Math.max(0, Math.min(newPos, containerWidth));
      
      if (isDragging === 'left') {
        const maxLeft = (trimEnd - 0.5) / duration * containerWidth;
        newPos = Math.min(newPos, maxLeft);
        const newStart = (newPos / containerWidth) * duration;
        onTrimChange(newStart, trimEnd);
      } else if (isDragging === 'right') {
        const minRight = (trimStart + 0.5) / duration * containerWidth;
        newPos = Math.max(newPos, minRight);
        const newEnd = Math.min((newPos / containerWidth) * duration, duration);
        onTrimChange(trimStart, newEnd);
      }
    };
    
    const handleTouchEnd = () => {
      setIsDragging(null);
    };
    
    // Only add listeners when actually dragging
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      // Set cursor style for entire document while dragging
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none'; // Prevent text selection during drag
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      
      // Reset cursor
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, duration, onTrimChange, trimStart, trimEnd]);

  // Touch handlers for handles
  const handleTouchStart = (handle: string) => (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(handle);
  };

  // Draw playback heatmap
  useEffect(() => {
    if (!containerRef.current || !playbackData.length || !duration) return;
    
    const heatmapContainer = document.getElementById('heatmap-container');
    if (!heatmapContainer) return;
    
    // Clear previous heatmap
    heatmapContainer.innerHTML = '';
    
    const containerWidth = containerRef.current.clientWidth;
    const segmentWidth = containerWidth / playbackData.length;
    
    // Find max value for normalization
    const maxValue = Math.max(...playbackData, 1);
    
    // Create heatmap segments
    playbackData.forEach((count, index) => {
      const intensity = count / maxValue;
      
      const segment = document.createElement('div');
      segment.className = 'replay-heatmap';
      segment.style.left = `${index * segmentWidth}px`;
      segment.style.width = `${segmentWidth}px`;
      segment.style.opacity = `${Math.max(0.2, intensity)}`;
      segment.style.backgroundColor = `rgba(139, 92, 246, ${Math.max(0.2, intensity)})`;
      segment.title = `Played ${count} times`;
      
      heatmapContainer.appendChild(segment);
    });
  }, [playbackData, duration]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="waveform-container relative cursor-pointer"
      ref={containerRef}
      onClick={handleClick}
    >
      <canvas 
        ref={canvasRef} 
        className="waveform w-full h-full" 
        style={{ display: 'block' }}
      />
      
      {/* Overlays */}
      <div className="waveform-overlay">
        {/* Heatmap visualization */}
        <div id="heatmap-container" className="absolute bottom-0 left-0 w-full h-5" />
        
        {/* Playhead */}
        <div 
          id="playhead" 
          className="absolute top-0 h-full w-0.5 bg-blue-500 z-10 cursor-grab active:cursor-grabbing hover:bg-blue-600" 
          style={{ left: '0px' }}
          onMouseDown={handlePlayheadMouseDown}
        />
        
        {/* Trim region - visible layer between handles */}
        <div 
          id="trim-region" 
          className="absolute top-0 h-full bg-purple-500/20 pointer-events-none z-0"
          style={{ left: '0px', width: '100%' }}
        />
        
        {/* Trim handles with improved dragging */}
        <div 
          id="left-handle" 
          ref={leftHandleRef}
          className={`absolute top-0 h-full w-6 cursor-col-resize z-20 flex items-center justify-center transition-colors duration-200 ${isDragging === 'left' ? 'bg-purple-800' : 'bg-purple-600 hover:bg-purple-700'}`}
          style={{ left: '0px' }}
          onMouseDown={handleMouseDown('left')}
          onTouchStart={handleTouchStart('left')}
          title="Drag to trim start"
        >
          <Scissors className="scissors-icon text-white h-4 w-4 bg-purple-800 rounded-full p-[2px]" />
        </div>
        <div 
          id="right-handle" 
          ref={rightHandleRef}
          className={`absolute top-0 h-full w-6 cursor-col-resize z-20 flex items-center justify-center transition-colors duration-200 ${isDragging === 'right' ? 'bg-purple-800' : 'bg-purple-600 hover:bg-purple-700'}`}
          style={{ left: 'calc(100% - 6px)' }} 
          onMouseDown={handleMouseDown('right')}
          onTouchStart={handleTouchStart('right')}
          title="Drag to trim end"
        >
          <Scissors className="scissors-icon text-white h-4 w-4 bg-purple-800 rounded-full p-[2px]" />
        </div>
      </div>
      
      {/* Time markers */}
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{formatTime(trimStart)}</span>
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(trimEnd)}</span>
      </div>
    </div>
  );
};

export default Waveform;
