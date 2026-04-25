import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Eye, EyeOff } from "lucide-react";

const FinancialRegister = () => {
  const { t } = useTranslation('financialRegister');
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim() || !token.trim()) {
      toast.error(t('errors.required'));
      return;
    }

    if (token !== "445") {
      toast.error(t('errors.invalidToken'));
      return;
    }

    if (password.length < 6) {
      toast.error(t('errors.passwordShort'));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-financial-user", {
        body: { email: email.trim(), password, token: token.trim() },
      });

      if (error) {
        toast.error(error.message || t('errors.createFailed'));
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(t('success'));
      navigate("/auth");
    } catch {
      toast.error(t('errors.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <TrendingUp className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('page.title')}</CardTitle>
          <CardDescription>{t('page.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('form.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('form.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('form.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('form.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">{t('form.token')}</Label>
              <Input
                id="token"
                type="text"
                placeholder={t('form.tokenPlaceholder')}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('form.submitting') : t('form.submit')}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {t('form.haveAccount')}{" "}
            <button
              onClick={() => navigate("/auth")}
              className="text-primary hover:underline"
            >
              {t('form.signIn')}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialRegister;
