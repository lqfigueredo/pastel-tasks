import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Paperclip, Upload, Trash2, FileText, Image as ImageIcon, Eye } from 'lucide-react';
import { AttachmentPreview } from '@/components/AttachmentPreview';

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  created_at: string;
}

interface Props {
  taskId: string;
}

export function TaskAttachments({ taskId }: Props) {
  const { t } = useTranslation('kanban');
  const { user } = useAuth();
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewAtt, setPreviewAtt] = useState<Attachment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAttachments();
  }, [taskId]);

  const fetchAttachments = async () => {
    const { data } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });
    if (data) setAttachments(data);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `${taskId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(path, file);

      if (uploadError) {
        toast({ title: t('attachments.errorUpload', { name: file.name }), variant: 'destructive' });
        continue;
      }

      await supabase.from('task_attachments').insert({
        task_id: taskId,
        file_name: file.name,
        file_path: path,
        file_type: file.type,
        uploaded_by: user.id,
      });
    }
    setUploading(false);
    fetchAttachments();
    if (fileRef.current) fileRef.current.value = '';
    toast({ title: t('attachments.uploaded') });
  };

  const handleDelete = async (att: Attachment) => {
    await supabase.storage.from('task-attachments').remove([att.file_path]);
    await supabase.from('task_attachments').delete().eq('id', att.id);
    fetchAttachments();
  };

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <div>
      <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
        <Paperclip className="h-4 w-4" /> {t('attachments.title')}
      </h4>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleUpload}
      />

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

      {attachments.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">{t('attachments.empty')}</p>
      )}

      <div className="space-y-2">
        {attachments.map((att) => (
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
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPreviewAtt(att)} title={t('attachments.preview')}>
              <Eye className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete(att)} title={t('attachments.delete')}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {previewAtt && (
        <AttachmentPreview
          open={!!previewAtt}
          onOpenChange={(o) => !o && setPreviewAtt(null)}
          bucket="task-attachments"
          filePath={previewAtt.file_path}
          fileName={previewAtt.file_name}
          fileType={previewAtt.file_type}
        />
      )}
    </div>
  );
}
