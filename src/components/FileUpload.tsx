import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, FileText, Image, File as FileIcon, Camera, ImagePlus, FolderSearch, Mic, Square, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];
const AUDIO_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'];

const ALLOWED_TYPES = [...IMAGE_TYPES, ...DOCUMENT_TYPES, ...AUDIO_TYPES];

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('audio/')) return Mic;
  if (mimeType === 'application/pdf' || mimeType.includes('document') || mimeType === 'text/plain') return FileText;
  return FileIcon;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'recording';
}

const ActionButton = ({ icon, label, onClick, disabled, variant = 'default' }: ActionButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200",
      "hover:scale-105 active:scale-95",
      "disabled:opacity-40 disabled:pointer-events-none",
      variant === 'recording' 
        ? "bg-destructive/10 text-destructive hover:bg-destructive/20 animate-pulse"
        : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
    )}
  >
    <div className={cn(
      "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
      variant === 'recording'
        ? "bg-destructive text-destructive-foreground"
        : "bg-primary/10 text-primary"
    )}>
      {icon}
    </div>
    <span className="text-xs font-medium">{label}</span>
  </button>
);

export const FileUpload = ({ 
  files, 
  onFilesChange, 
  maxFiles = 5, 
  maxSizeMB = 10,
  disabled = false 
}: FileUploadProps) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const validateAndAddFiles = (newFiles: FileList | null, allowedTypes: string[]) => {
    if (!newFiles) return;

    const validFiles: File[] = [];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    Array.from(newFiles).forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: File type not supported`);
        return;
      }
      if (file.size > maxSizeBytes) {
        toast.error(`${file.name}: File exceeds ${maxSizeMB}MB limit`);
        return;
      }
      if (files.length + validFiles.length >= maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      onFilesChange([...files, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    const file = files[index];
    const fileKey = `${file.name}-${index}`;
    
    // Stop and cleanup audio if playing
    const audio = audioRefs.current.get(fileKey);
    if (audio) {
      audio.pause();
      audioRefs.current.delete(fileKey);
    }
    if (playingAudio === fileKey) {
      setPlayingAudio(null);
    }
    
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleGallerySelect = () => {
    imageInputRef.current?.click();
  };

  const handleDocumentSelect = () => {
    documentInputRef.current?.click();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });
        
        if (files.length < maxFiles) {
          onFilesChange([...files, file]);
          toast.success("Voice message added!");
        } else {
          toast.error(`Maximum ${maxFiles} files allowed`);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Microphone access error:', error);
      toast.error("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleVoiceRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const toggleAudioPlayback = (fileKey: string, file: File) => {
    let audio = audioRefs.current.get(fileKey);
    
    if (!audio) {
      audio = new Audio(URL.createObjectURL(file));
      audio.onended = () => setPlayingAudio(null);
      audioRefs.current.set(fileKey, audio);
    }
    
    if (playingAudio === fileKey) {
      audio.pause();
      setPlayingAudio(null);
    } else {
      // Stop any currently playing audio
      if (playingAudio) {
        const currentAudio = audioRefs.current.get(playingAudio);
        currentAudio?.pause();
      }
      audio.play();
      setPlayingAudio(fileKey);
    }
  };

  const canAddMore = files.length < maxFiles && !disabled;

  return (
    <div className="space-y-4">
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => validateAndAddFiles(e.target.files, IMAGE_TYPES)}
        className="hidden"
        disabled={disabled}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        multiple
        onChange={(e) => validateAndAddFiles(e.target.files, IMAGE_TYPES)}
        className="hidden"
        disabled={disabled}
      />
      <input
        ref={documentInputRef}
        type="file"
        accept={DOCUMENT_TYPES.join(',')}
        multiple
        onChange={(e) => validateAndAddFiles(e.target.files, DOCUMENT_TYPES)}
        className="hidden"
        disabled={disabled}
      />

      {/* Action buttons grid */}
      <div className="grid grid-cols-4 gap-2">
        <ActionButton
          icon={<Camera className="w-5 h-5" />}
          label="Camera"
          onClick={handleCameraCapture}
          disabled={!canAddMore}
        />
        <ActionButton
          icon={<ImagePlus className="w-5 h-5" />}
          label="Gallery"
          onClick={handleGallerySelect}
          disabled={!canAddMore}
        />
        <ActionButton
          icon={<FolderSearch className="w-5 h-5" />}
          label="Document"
          onClick={handleDocumentSelect}
          disabled={!canAddMore}
        />
        <ActionButton
          icon={isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          label={isRecording ? formatDuration(recordingTime) : "Voice"}
          onClick={handleVoiceRecord}
          disabled={!canAddMore && !isRecording}
          variant={isRecording ? 'recording' : 'default'}
        />
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center justify-center gap-3 p-3 bg-destructive/10 rounded-xl border border-destructive/20">
          <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
          <span className="text-sm font-medium text-destructive">Recording... {formatDuration(recordingTime)}</span>
          <Button 
            type="button" 
            size="sm" 
            variant="destructive" 
            onClick={stopRecording}
            className="ml-2"
          >
            Stop
          </Button>
        </div>
      )}

      {/* File count indicator */}
      <p className="text-xs text-muted-foreground text-center">
        {files.length}/{maxFiles} attachments • Max {maxSizeMB}MB each
      </p>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => {
            const Icon = getFileIcon(file.type);
            const fileKey = `${file.name}-${index}`;
            const isAudio = file.type.startsWith('audio/');
            const isPlaying = playingAudio === fileKey;
            
            return (
              <div
                key={fileKey}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border/50"
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  file.type.startsWith('image/') && "bg-blue-500/10 text-blue-500",
                  file.type.startsWith('audio/') && "bg-purple-500/10 text-purple-500",
                  !file.type.startsWith('image/') && !file.type.startsWith('audio/') && "bg-orange-500/10 text-orange-500"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                
                {/* Audio playback button */}
                {isAudio && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => toggleAudioPlayback(fileKey, file)}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                )}
                
                {/* Image preview */}
                {file.type.startsWith('image/') && (
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt={file.name}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                )}
                
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
