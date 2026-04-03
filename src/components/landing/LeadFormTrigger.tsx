import { useState, lazy, Suspense } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LeadFormDialog = lazy(() => import('./LeadFormDialog'));

const LeadFormTrigger = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="lg" className="text-base px-8" onClick={() => setOpen(true)}>
        <Send className="mr-2 h-5 w-5" />
        Tenho Interesse
      </Button>
      {open && (
        <Suspense fallback={null}>
          <LeadFormDialog open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
};

export default LeadFormTrigger;
