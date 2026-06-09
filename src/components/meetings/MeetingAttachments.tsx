import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Upload, Trash2, FileText, Image as ImageIcon, Eye, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { AttachmentPreview } from '@/components/AttachmentPreview';

const RECORDING_RETENTION_DAYS = 15;
const isRecording = (type: string) => type.startsWith('video/') || type.startsWith('audio/');
const daysUntilExpiry = (createdAt: string) => {
  const expiresAt = new Date(createdAt).getTime() + RECORDING_RETENTION_DAYS * 86400000;
  return Math.ceil((expiresAt - Date.now()) / 86400000);
};

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  uploaded_by: string;
  created_at: string;
}

interface Props {
  meetingId: string;
  canUpload: boolean;
  createdBy?: string;
}

export function MeetingAttachments({ meetingId, canUpload, createdBy }: Props) {
  const { t } = useTranslation('meetings');
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewAtt, setPreviewAtt] = useState<Attachment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAttachments();
  }, [meetingId]);

  const fetchAttachments = async () => {
    const { data } = await supabase
      .from('meeting_attachments')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false });
    if (data) setAttachments(data as Attachment[]);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${meetingId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('meeting-attachments')
        .upload(path, file);

      if (uploadError) {
        toast.error(t('attachments.errorUpload', { name: file.name }));
        continue;
      }

      await supabase.from('meeting_attachments').insert({
        meeting_id: meetingId,
        file_name: file.name,
        file_path: path,
        file_type: file.type,
        uploaded_by: user.id,
      });
    }
    setUploading(false);
    fetchAttachments();
    if (fileRef.current) fileRef.current.value = '';
    toast.success(t('attachments.uploaded'));
  };

  const handleDelete = async (att: Attachment) => {
    await supabase.storage.from('meeting-attachments').remove([att.file_path]);
    await supabase.from('meeting_attachments').delete().eq('id', att.id);
    fetchAttachments();
  };

  const canDelete = (att: Attachment) =>
    user?.id === att.uploaded_by || user?.id === createdBy;

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      {canUpload && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mb-3 gap-1 text-xs"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-3 w-3" />
          {uploading ? t('attachments.uploading') : t('attachments.upload')}
        </Button>
      )}

      {attachments.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">{t('attachments.empty')}</p>
      )}

      <div className="space-y-2">
        {attachments.map((att) => {
          const recording = isRecording(att.file_type);
          const days = recording ? daysUntilExpiry(att.created_at) : null;
          let expiryLabel = '';
          let expiryVariant: 'secondary' | 'destructive' = 'secondary';
          if (recording && days !== null) {
            if (days <= 0) {
              expiryLabel = t('attachments.expired');
              expiryVariant = 'destructive';
            } else if (days === 1) {
              expiryLabel = t('attachments.expiringToday');
              expiryVariant = 'destructive';
            } else {
              expiryLabel = t('attachments.expiresIn', { count: days });
              if (days <= 3) expiryVariant = 'destructive';
            }
          }
          return (
            <div
              key={att.id}
              className="flex items-center gap-2 rounded-lg bg-muted/50 p-2 text-sm"
            >
              {isImage(att.file_type) ? (
                <ImageIcon className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <FileText className="h-4 w-4 text-primary shrink-0" />
              )}
              <button
                type="button"
                onClick={() => setPreviewAtt(att)}
                className="truncate flex-1 text-left hover:underline focus:outline-none focus:underline"
                title={t('attachments.preview')}
              >
                {att.file_name}
              </button>
              {recording && expiryLabel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant={expiryVariant} className="gap-1 text-[10px] font-normal whitespace-nowrap">
                      <Clock className="h-2.5 w-2.5" />
                      {expiryLabel}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {t('attachments.recordingRetentionTooltip')}
                  </TooltipContent>
                </Tooltip>
              )}
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPreviewAtt(att)} title={t('attachments.preview')}>
                <Eye className="h-3 w-3" />
              </Button>
              {canDelete(att) && (
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete(att)} title={t('attachments.delete')}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {previewAtt && (
        <AttachmentPreview
          open={!!previewAtt}
          onOpenChange={(o) => !o && setPreviewAtt(null)}
          bucket="meeting-attachments"
          filePath={previewAtt.file_path}
          fileName={previewAtt.file_name}
          fileType={previewAtt.file_type}
        />
      )}
    </div>
  );
}
