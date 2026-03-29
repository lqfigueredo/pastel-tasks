import { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface HelpSection {
  label: string;
  text: string;
}

interface HelpButtonProps {
  pageKey: string;
  fallbackTitle?: string;
  fallbackSections?: HelpSection[];
}

export function HelpButton({ pageKey, fallbackTitle = 'Ajuda', fallbackSections = [] }: HelpButtonProps) {
  const [title, setTitle] = useState(fallbackTitle);
  const [sections, setSections] = useState<HelpSection[]>(fallbackSections);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from('help_texts')
      .select('title, sections')
      .eq('page_key', pageKey)
      .single()
      .then(({ data }) => {
        if (data) {
          setTitle(data.title as string);
          setSections((data.sections as unknown as HelpSection[]) || []);
        }
        setLoaded(true);
      });
  }, [pageKey]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {sections.length === 0 && loaded && (
            <p className="text-sm text-muted-foreground">Nenhuma informação de ajuda disponível.</p>
          )}
          {sections.map((section, i) => (
            <div key={i} className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">{section.label}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.text}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
