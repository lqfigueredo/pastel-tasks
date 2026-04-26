import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';

interface HelpSection {
  label: string;
  text: string;
}

interface HelpText {
  id: string;
  page_key: string;
  title: string;
  sections: HelpSection[];
}

export default function HelpTextsManager() {
  const { t } = useTranslation('financial');
  const { user } = useAuth();
  const [helpTexts, setHelpTexts] = useState<HelpText[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const pageLabel = (key: string) => t(`helpTexts.pageLabels.${key}`, { defaultValue: key });

  useEffect(() => {
    loadHelpTexts();
  }, []);

  const loadHelpTexts = async () => {
    const { data } = await supabase
      .from('help_texts')
      .select('*')
      .order('page_key');

    setHelpTexts(
      (data || []).map((d: any) => ({
        id: d.id,
        page_key: d.page_key,
        title: d.title,
        sections: (d.sections as HelpSection[]) || [],
      }))
    );
    setLoading(false);
  };

  const updateTitle = (id: string, title: string) => {
    setHelpTexts(prev => prev.map(h => h.id === id ? { ...h, title } : h));
  };

  const updateSectionLabel = (id: string, idx: number, label: string) => {
    setHelpTexts(prev => prev.map(h => {
      if (h.id !== id) return h;
      const sections = [...h.sections];
      sections[idx] = { ...sections[idx], label };
      return { ...h, sections };
    }));
  };

  const updateSectionText = (id: string, idx: number, text: string) => {
    setHelpTexts(prev => prev.map(h => {
      if (h.id !== id) return h;
      const sections = [...h.sections];
      sections[idx] = { ...sections[idx], text };
      return { ...h, sections };
    }));
  };

  const addSection = (id: string) => {
    setHelpTexts(prev => prev.map(h => {
      if (h.id !== id) return h;
      return { ...h, sections: [...h.sections, { label: '', text: '' }] };
    }));
  };

  const removeSection = (id: string, idx: number) => {
    setHelpTexts(prev => prev.map(h => {
      if (h.id !== id) return h;
      const sections = h.sections.filter((_, i) => i !== idx);
      return { ...h, sections };
    }));
  };

  const handleSave = async (helpText: HelpText) => {
    setSaving(helpText.id);
    const { error } = await supabase
      .from('help_texts')
      .update({
        title: helpText.title,
        sections: helpText.sections as any,
        updated_by: user?.id,
      })
      .eq('id', helpText.id);

    if (error) {
      toast.error(t('helpTexts.saveError', { message: error.message }));
    } else {
      toast.success(t('helpTexts.saveSuccess', { page: pageLabel(helpText.page_key) }));
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p
        className="text-sm text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: t('helpTexts.intro') }}
      />

      <Accordion type="single" collapsible className="w-full">
        {helpTexts.map((ht) => (
          <AccordionItem key={ht.id} value={ht.id}>
            <AccordionTrigger className="text-sm font-medium">
              {pageLabel(ht.page_key)}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t('helpTexts.dialogTitle')}</label>
                  <Input
                    value={ht.title}
                    onChange={(e) => updateTitle(ht.id, e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-medium text-muted-foreground">{t('helpTexts.sections')}</label>
                  {ht.sections.map((section, idx) => (
                    <div key={idx} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder={t('helpTexts.sectionTitlePlaceholder')}
                          value={section.label}
                          onChange={(e) => updateSectionLabel(ht.id, idx, e.target.value)}
                          className="text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => removeSection(ht.id, idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        placeholder={t('helpTexts.sectionTextPlaceholder')}
                        value={section.text}
                        onChange={(e) => updateSectionText(ht.id, idx, e.target.value)}
                        className="text-sm min-h-[60px]"
                      />
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSection(ht.id)}
                    className="gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('helpTexts.addSection')}
                  </Button>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleSave(ht)}
                    disabled={saving === ht.id}
                    className="gap-1"
                  >
                    {saving === ht.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {t('helpTexts.save')}
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
