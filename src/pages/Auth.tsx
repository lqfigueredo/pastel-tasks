import { useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo.webp';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Link } from 'react-router-dom';
import { errorToast, successToast } from '@/lib/toast-helpers';
import { cn } from '@/lib/utils';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

const TURNSTILE_TEST_KEY = '1x00000000000000000000AA';
const SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || TURNSTILE_TEST_KEY;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = { name?: string; email?: string; password?: string };

const Auth = () => {
  const { t } = useTranslation('auth');
  const { user, loading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{t('loading')}</div>
      </div>
    );
  }

  if (user) return <Navigate to="/tarefas" replace />;

  const validateName = (v: string) => {
    if (isLogin) return undefined;
    const value = v.trim();
    if (!value) return t('validation.nameRequired');
    if (value.length < 2) return t('validation.nameTooShort');
    return undefined;
  };
  const validateEmail = (v: string) => {
    const value = v.trim();
    if (!value) return t('validation.emailRequired');
    if (!EMAIL_RE.test(value)) return t('validation.emailInvalid');
    return undefined;
  };
  const validatePassword = (v: string) => {
    if (!v) return t('validation.passwordRequired');
    if (v.length < 6) return t('validation.passwordTooShort');
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
      if (error) errorToast(t('errors.signIn'), error);
    } else {
      if (!turnstileToken) {
        errorToast(t('errors.signUp'), { message: t('validation.turnstileRequired') });
        setSubmitting(false);
        return;
      }
      const { error } = await signUp(email.trim(), password, displayName.trim(), turnstileToken);
      if (error) {
        errorToast(t('errors.signUp'), error);
        turnstileRef.current?.reset();
        setTurnstileToken('');
      } else {
        successToast(t('signup.successTitle'), t('signup.successDescription'));
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
        {t('back')}
      </Link>
      <div className="absolute right-4 top-4 flex items-center gap-1">
        <LanguageSwitcher compact />
        <ThemeToggle collapsed />
      </div>
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <img src={logo} alt="NEVVOH" className="mx-auto mb-4 h-14 w-14 rounded-2xl" />
          <h1 className="font-display text-3xl font-bold text-foreground">NEVVOH</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('tagline')}</p>
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">{isLogin ? t('login.title') : t('signup.title')}</CardTitle>
            <CardDescription>
              {isLogin ? t('login.description') : t('signup.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t('fields.name')}</Label>
                  <Input
                    id="name"
                    placeholder={t('fields.namePlaceholder')}
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
                <Label htmlFor="email">{t('fields.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('fields.emailPlaceholder')}
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
                <Label htmlFor="password">{t('fields.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('fields.passwordPlaceholder')}
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
                {submitting ? t('submitting') : isLogin ? t('login.submit') : t('signup.submit')}
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
                {isLogin ? t('login.toggle') : t('signup.toggle')}
              </button>
              <Link to="/precos" className="text-xs text-muted-foreground hover:text-foreground inline-block">
                {t('viewPlans')}
              </Link>
            </div>
            {!isLogin && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                <Trans
                  i18nKey="signup.termsPrefix"
                  ns="auth"
                />
                <Link to="/termos" className="text-primary hover:underline">{t('signup.termsLink')}</Link>
                {t('signup.termsAnd')}
                <Link to="/privacidade" className="text-primary hover:underline">{t('signup.privacyLink')}</Link>
                {t('signup.termsSuffix')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
