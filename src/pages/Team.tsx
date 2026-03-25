const Team = () => {
  return (
    <div className="animate-fade-in">
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">Equipe</h1>
      <p className="text-sm text-muted-foreground mb-6">Gerencie membros e veja tarefas da equipe</p>
      <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
        <p className="text-muted-foreground">Funcionalidade de equipe será habilitada após configurar um time nas Configurações.</p>
      </div>
    </div>
  );
};

export default Team;
