import { useState } from 'react';
import { LayoutDashboard, Users, FileText, CalendarDays, Send } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const features = [
  {
    icon: LayoutDashboard,
    title: 'Kanban Intuitivo',
    description: 'Organize suas tarefas em colunas personalizáveis com arrastar e soltar.',
  },
  {
    icon: Users,
    title: 'Gestão de Equipes',
    description: 'Crie equipes, atribua tarefas e acompanhe o progresso de cada membro.',
  },
  {
    icon: FileText,
    title: 'Atas de Reunião',
    description: 'Registre reuniões, pendências e vincule tarefas automaticamente.',
  },
  {
    icon: CalendarDays,
    title: 'Dashboard de Prazos',
    description: 'Visualize entregas por período e nunca perca um prazo importante.',
  },
];

const Landing = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('leads').insert({ name: name.trim(), email: email.trim() });
    setLoading(false);

    if (error) {
      toast.error('Erro ao enviar. Tente novamente.');
      return;
    }

    toast.success('Obrigado pelo interesse! Entraremos em contato.');
    setName('');
    setEmail('');
    setOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <CheckSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">NEVVOH</span>
          </div>
          <Link to="/auth">
            <Button variant="outline" size="sm">Já tenho conta</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Gestão de tarefas
          <span className="text-primary"> simples e eficiente</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Organize projetos, gerencie equipes e acompanhe reuniões em um único lugar.
          O NEVVOH foi criado para times que querem produtividade sem complexidade.
        </p>
        <div className="mt-10">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="text-base px-8">
                <Send className="mr-2 h-5 w-5" />
                Tenho Interesse
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Demonstre seu interesse</DialogTitle>
                <DialogDescription>
                  Preencha seus dados e entraremos em contato para apresentar o NEVVOH.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lead-name">Nome</Label>
                  <Input
                    id="lead-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-email">E-mail</Label>
                  <Input
                    id="lead-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    maxLength={255}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Tudo que você precisa</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} NEVVOH. Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default Landing;
