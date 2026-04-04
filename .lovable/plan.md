

## Responder leads via plataforma com envio de e-mail

### O que será feito
Adicionar um botão "Responder" em cada lead na aba Leads da página Financeira. Ao clicar, abre um dialog onde o financeiro pode:
1. Escolher uma **mensagem pré-definida** ("Você já pode se cadastrar no NEVVOH!") ou
2. Escrever uma **mensagem customizada**

O e-mail será enviado ao lead usando a infraestrutura de e-mails do Lovable Cloud.

### Etapas

**1. Configurar infraestrutura de e-mail transacional**
- Configurar a infraestrutura de fila de e-mails (tabelas, cron job, Edge Functions)
- Criar o scaffold de e-mails transacionais (Edge Function `send-transactional-email` + templates)

**2. Criar template de e-mail para resposta ao lead**
- Template `lead-reply` em `supabase/functions/_shared/transactional-email-templates/`
- Aceita props: `leadName`, `message` (mensagem customizada)
- Estilizado com a identidade visual NEVVOH (cores, logo, fontes)

**3. Criar componente `ReplyLeadDialog`**
- Dialog com opções:
  - Mensagem padrão de convite ao cadastro (pré-preenchida)
  - Campo de texto para mensagem customizada
- Botão de envio que chama `supabase.functions.invoke('send-transactional-email', ...)`

**4. Atualizar tabela de leads**
- Adicionar coluna `replied_at` (timestamp nullable) para marcar leads já respondidos
- Adicionar coluna `reply_message` (text nullable) para guardar a mensagem enviada
- Atualizar RLS para permitir UPDATE pelo solution_admin

**5. Atualizar a aba Leads no Financial.tsx**
- Adicionar botão "Responder" em cada linha da tabela
- Mostrar badge "Respondido" quando `replied_at` não for null
- Adicionar coluna de status na tabela

### Arquivos modificados
- `supabase/functions/_shared/transactional-email-templates/lead-reply.tsx` (novo)
- `supabase/functions/_shared/transactional-email-templates/registry.ts` (novo/atualizado)
- `src/components/financial/ReplyLeadDialog.tsx` (novo)
- `src/pages/Financial.tsx` (atualizado — botão responder + status)
- Migration SQL para adicionar `replied_at` e `reply_message` na tabela `leads`

