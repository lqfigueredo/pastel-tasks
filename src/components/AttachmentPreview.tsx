import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: string;
  filePath: string;
  fileName: string;
  fileType: string;
}

export function AttachmentPreview({ open, onOpenChange, bucket, filePath, fileName, fileType }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  const canPreview = isImage || isPdf;

  useEffect(() => {
    if (!open) {
      setSignedUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 600)
      .then(({ data }) => {
        if (cancelled) return;
        setSignedUrl(data?.signedUrl ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, bucket, filePath]);

  const handleDownload = async () => {
    const { data } = await supabase.storage.from(bucket).download(filePath);
    if (!data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="truncate text-base">{fileName}</DialogTitle>
            <div className="flex items-center gap-2 shrink-0">
              {signedUrl && (
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5" />
                Baixar
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/30 min-h-[60vh]">
          {loading && (
            <div className="flex items-center justify-center h-full p-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && signedUrl && canPreview && isImage && (
            <div className="flex items-center justify-center p-4">
              <img
                src={signedUrl}
                alt=""
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md"
              />
            </div>
          )}

          {!loading && signedUrl && canPreview && isPdf && (
            <iframe
              src={signedUrl}
              title={fileName}
              className="w-full h-[75vh] border-0"
            />
          )}

          {!loading && !canPreview && (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center gap-3">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Pré-visualização não disponível para este tipo de arquivo.
              </p>
              <Button variant="default" onClick={handleDownload} className="gap-1.5 mt-2">
                <Download className="h-4 w-4" />
                Baixar arquivo
              </Button>
            </div>
          )}

          {!loading && !signedUrl && (
            <div className="flex items-center justify-center h-full p-12 text-sm text-destructive">
              Não foi possível carregar o arquivo.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
