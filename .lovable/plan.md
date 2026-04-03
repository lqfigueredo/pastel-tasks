

# Corrigir proporção do logo nos templates de e-mail

## Problema
O arquivo `logo.png` é quadrado (375×375px), mas todos os 6 templates de e-mail forçam `width="120" height="40"`, distorcendo a imagem.

## Solução
Atualizar as dimensões do `<Img>` em todos os 6 templates para manter a proporção 1:1 do logo. Usar `width="48" height="48"` para um tamanho adequado em e-mails, ou alternativamente `width="40" height="40"`.

## Arquivos modificados
- `supabase/functions/_shared/email-templates/signup.tsx`
- `supabase/functions/_shared/email-templates/recovery.tsx`
- `supabase/functions/_shared/email-templates/magic-link.tsx`
- `supabase/functions/_shared/email-templates/invite.tsx`
- `supabase/functions/_shared/email-templates/email-change.tsx`
- `supabase/functions/_shared/email-templates/reauthentication.tsx`

Em cada arquivo, trocar:
```
<Img src={LOGO_URL} alt="NEVVOH" width="120" height="40" style={logo} />
```
por:
```
<Img src={LOGO_URL} alt="NEVVOH" width="48" height="48" style={logo} />
```

Após as alterações, fazer redeploy da edge function `auth-email-hook`.

