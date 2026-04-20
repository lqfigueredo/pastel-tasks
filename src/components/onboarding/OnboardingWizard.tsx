import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInvalidateOnboarding } from '@/hooks/useOnboardingStatus';
import { Step1Profile } from './steps/Step1Profile';
import { Step2Team } from './steps/Step2Team';
import { Step3Invites } from './steps/Step3Invites';
import { Step4Task } from './steps/Step4Task';

const TOTAL_STEPS = 4;

export const OnboardingWizard = () => {
  const { user } = useAuth();
  const invalidate = useInvalidateOnboarding();
  const [step, setStep] = useState(1);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  const markCompleted = async () => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('user_id', user.id);
    invalidate();
    setOpen(false);
  };

  const handleSkipAll = () => {
    markCompleted();
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* prevent close on outside click */ }}>
      <DialogContent
        className="max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Configuração inicial — passo {step} de {TOTAL_STEPS}</DialogTitle>
        </DialogHeader>

        <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />

        <div className="mt-4">
          {step === 1 && (
            <Step1Profile onNext={() => setStep(2)} onSkip={handleSkipAll} />
          )}
          {step === 2 && (
            <Step2Team
              onNext={(id) => { setTeamId(id); setStep(3); }}
              onBack={() => setStep(1)}
              onSkip={handleSkipAll}
            />
          )}
          {step === 3 && (
            <Step3Invites
              teamId={teamId}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
              onSkip={handleSkipAll}
            />
          )}
          {step === 4 && (
            <Step4Task
              teamId={teamId}
              onFinish={markCompleted}
              onBack={() => setStep(3)}
              onSkip={markCompleted}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
