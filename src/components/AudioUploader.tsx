
import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface AudioUploaderProps {
  onAudioLoaded: (file: File) => void;
}

const AudioUploader = ({ onAudioLoaded }: AudioUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    processFiles(files);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      processFiles(files);
    }
  }, []);

  const processFiles = (files: FileList) => {
    if (files.length === 0) return;
    
    const file = files[0];
    
    // Check if it's an audio file
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an audio file",
        variant: "destructive"
      });
      return;
    }
    
    onAudioLoaded(file);
    toast({
      title: "File loaded",
      description: `${file.name} loaded successfully`,
    });
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <Upload className="h-10 w-10 text-gray" />
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Upload Audio File</h3>
          <p className="text-sm text-muted-foreground">
            Drag and drop an audio file or click to browse
          </p>
        </div>
        <input
          id="audio-file"
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="outline"
          className="mt-2"
          onClick={() => document.getElementById('audio-file')?.click()}
        >
          Select File
        </Button>
      </div>
    </div>
  );
};

export default AudioUploader;
