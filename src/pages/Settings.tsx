import { useAuth } from '@/contexts/AuthContext';

const Settings = () => {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">Configurações</h1>
      <p className="text-sm text-muted-foreground mb-6">Gerencie seu perfil e preferências</p>

      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground">E-mail</label>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Nome</label>
          <p className="text-sm text-muted-foreground">{user?.user_metadata?.display_name || '—'}</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
