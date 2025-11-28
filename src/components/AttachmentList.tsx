import { FileText, Image, File, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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

export const AttachmentList = ({ attachments, canDelete, onDelete }: AttachmentListProps) => {
  if (attachments.length === 0) return null;

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('suggestion-attachments')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleDownload = async (attachment: Attachment) => {
    const url = getPublicUrl(attachment.file_path);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">
        Attachments ({attachments.length})
      </h4>
      <div className="grid gap-2">
        {attachments.map((attachment) => {
          const Icon = getFileIcon(attachment.mime_type);
          const isImage = attachment.mime_type.startsWith('image/');
          const publicUrl = getPublicUrl(attachment.file_path);

          return (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border"
            >
              {isImage ? (
                <img
                  src={publicUrl}
                  alt={attachment.file_name}
                  className="w-10 h-10 object-cover rounded shrink-0"
                />
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
                  onClick={() => handleDownload(attachment)}
                >
                  <Download className="w-4 h-4" />
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
        })}
      </div>
    </div>
  );
};
