import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo.webp';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Link } from 'react-router-dom';
import { errorToast, successToast } from '@/lib/toast-helpers';
import { cn } from '@/lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = { name?: string; email?: string; password?: string };

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (user) return <Navigate to="/tarefas" replace />;

  const validateName = (v: string) => {
    if (isLogin) return undefined;
    const t = v.trim();
    if (!t) return 'Informe seu nome.';
    if (t.length < 2) return 'Nome muito curto.';
    return undefined;
  };
  const validateEmail = (v: string) => {
    const t = v.trim();
    if (!t) return 'Informe seu e-mail.';
    if (!EMAIL_RE.test(t)) return 'E-mail inválido.';
    return undefined;
  };
  const validatePassword = (v: string) => {
    if (!v) return 'Informe sua senha.';
    if (v.length < 6) return 'A senha deve ter ao menos 6 caracteres.';
    return undefined;
  };

  const validateAll = (): FieldErrors => ({
    name: validateName(displayName),
    email: validateEmail(email),
    password: validatePassword(password),
  });

  const hasErrors = (e: FieldErrors) => Boolean(e.name || e.email || e.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validateAll();
    setErrors(next);
    if (hasErrors(next)) return;

    setSubmitting(true);
    if (isLogin) {
      const { error } = await signIn(email.trim(), password);
      if (error) errorToast('entrar', error);
    } else {
      const { error } = await signUp(email.trim(), password, displayName.trim());
      if (error) {
        errorToast('criar a conta', error);
      } else {
        successToast(
          'Conta criada! 🎉',
          'Você tem 14 dias grátis para testar. Faça login para começar.',
        );
        setIsLogin(true);
        setPassword('');
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <Link to="/" className="absolute left-4 top-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>
      <div className="absolute right-4 top-4">
        <ThemeToggle collapsed />
      </div>
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <img src={logo} alt="NEVVOH" className="mx-auto mb-4 h-14 w-14 rounded-2xl" />
          <h1 className="font-display text-3xl font-bold text-foreground">NEVVOH</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie seus projetos com simplicidade</p>
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">{isLogin ? 'Entrar' : 'Criar conta'}</CardTitle>
            <CardDescription>
              {isLogin ? 'Entre com seu e-mail e senha' : 'Preencha os dados para criar sua conta'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                    }}
                    onBlur={() => setErrors((p) => ({ ...p, name: validateName(displayName) }))}
                    aria-invalid={!!errors.name}
                    className={cn(errors.name && 'border-destructive focus-visible:ring-destructive')}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                  }}
                  onBlur={() => setErrors((p) => ({ ...p, email: validateEmail(email) }))}
                  aria-invalid={!!errors.email}
                  className={cn(errors.email && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  onBlur={() => setErrors((p) => ({ ...p, password: validatePassword(password) }))}
                  aria-invalid={!!errors.password}
                  className={cn(errors.password && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar conta'}
              </Button>
            </form>
            <div className="mt-4 text-center space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="text-sm text-primary hover:underline block w-full"
              >
                {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
              </button>
              <Link to="/precos" className="text-xs text-muted-foreground hover:text-foreground inline-block">
                Veja os planos →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
