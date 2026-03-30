import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, FileText, Image as ImageIcon, Download } from 'lucide-react';
import { toast } from 'sonner';

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
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
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
        toast.error(`Erro ao enviar ${file.name}`);
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
    toast.success('Anexo(s) enviado(s)!');
  };

  const handleDelete = async (att: Attachment) => {
    await supabase.storage.from('meeting-attachments').remove([att.file_path]);
    await supabase.from('meeting_attachments').delete().eq('id', att.id);
    fetchAttachments();
  };

  const handleDownload = async (att: Attachment) => {
    const { data } = await supabase.storage
      .from('meeting-attachments')
      .createSignedUrl(att.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
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
          {uploading ? 'Enviando...' : 'Enviar arquivo'}
        </Button>
      )}

      {attachments.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum anexo</p>
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
            <span className="truncate flex-1">{att.file_name}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDownload(att)}>
              <Download className="h-3 w-3" />
            </Button>
            {canDelete(att) && (
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete(att)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
