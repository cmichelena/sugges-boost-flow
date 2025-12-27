import { FileText, Image, File, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string | null;
}

interface AttachmentListProps {
  attachments: Attachment[];
  canDelete?: boolean;
  onDelete?: (id: string) => void;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'application/pdf' || mimeType.includes('document') || mimeType === 'text/plain') return FileText;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Component for individual attachment with signed URL handling
const AttachmentItem = ({ 
  attachment, 
  canDelete, 
  onDelete 
}: { 
  attachment: Attachment; 
  canDelete?: boolean; 
  onDelete?: (id: string) => void;
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const Icon = getFileIcon(attachment.mime_type);
  const isImage = attachment.mime_type.startsWith('image/');

  useEffect(() => {
    const fetchSignedUrl = async () => {
      setLoading(true);
      setError(false);
      
      const { data, error: signedUrlError } = await supabase.storage
        .from('suggestion-attachments')
        .createSignedUrl(attachment.file_path, 3600); // 1 hour expiry
      
      if (signedUrlError) {
        console.error('Error creating signed URL:', signedUrlError);
        setError(true);
      } else {
        setSignedUrl(data.signedUrl);
      }
      setLoading(false);
    };

    fetchSignedUrl();
  }, [attachment.file_path]);

  const handleDownload = async () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
      {isImage ? (
        loading ? (
          <div className="w-10 h-10 flex items-center justify-center bg-muted rounded shrink-0">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : error || !signedUrl ? (
          <div className="w-10 h-10 flex items-center justify-center bg-muted rounded shrink-0">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
        ) : (
          <img
            src={signedUrl}
            alt={attachment.file_name}
            className="w-10 h-10 object-cover rounded shrink-0"
          />
        )
      ) : (
        <div className="w-10 h-10 flex items-center justify-center bg-muted rounded shrink-0">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attachment.file_name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.file_size)}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleDownload}
          disabled={loading || !signedUrl}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </Button>
        {canDelete && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(attachment.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export const AttachmentList = ({ attachments, canDelete, onDelete }: AttachmentListProps) => {
  if (attachments.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">
        Attachments ({attachments.length})
      </h4>
      <div className="grid gap-2">
        {attachments.map((attachment) => (
          <AttachmentItem 
            key={attachment.id}
            attachment={attachment}
            canDelete={canDelete}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};
