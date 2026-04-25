## Objetivo

Tornar a aplicação totalmente bilíngue (Português Brasil / Inglês) **sem desotimizar performance**, com seletor de idioma no header, persistência em `localStorage` + campo `profiles.locale`, e tradução de toda a interface, validações, toasts, datas e e-mails transacionais.

## Por que isso não desotimiza

- **`react-i18next`** (lib mais usada do ecossistema React, ~12 KB gzipped) com **lazy loading**: só o JSON do idioma ativo é baixado.
- **Sem re-renders extras**: `useTranslation()` retorna referência estável; só re-renderiza componentes quando o idioma muda.
- **Datas via `date-fns`**: o projeto já usa `ptBR`; basta importar `enUS` e selecionar dinamicamente.
- **Cache forte**: arquivos JSON servidos como assets estáticos com hash de versão.
- **Bundle inicial**: aumento estimado de **~15–25 KB gzipped total** (lib + 1 idioma carregado), diluído pelo cache.

---

## Fase 0 — Infraestrutura (base obrigatória)

### Migração SQL
Adicionar campo de preferência de idioma no perfil:

```sql
ALTER TABLE public.profiles
ADD COLUMN locale text NOT NULL DEFAULT 'pt-BR'
CHECK (locale IN ('pt-BR', 'en'));
```

### Dependências a instalar
- `i18next`
- `react-i18next`
- `i18next-browser-languagedetector`
- `i18next-http-backend` (para lazy loading dos JSONs)

### Estrutura de arquivos a criar
```
src/i18n/
├── index.ts                       # Configuração do i18next
├── locales/
│   ├── pt-BR/
│   │   ├── common.json            # Botões, labels comuns, ações
│   │   ├── nav.json               # Sidebar, header, breadcrumbs
│   │   ├── auth.json              # Login, registro, onboarding
│   │   ├── tasks.json             # Kanban, tarefas, filtros
│   │   ├── team.json              # Equipes, convites
│   │   ├── meetings.json          # Atas, agenda, calendário
│   │   ├── ideas.json             # Ideias
│   │   ├── knowledge.json         # Base de conhecimento, instruções
│   │   ├── financial.json         # Cobrança, planos, faturas
│   │   ├── admin.json             # Admin, suporte
│   │   ├── notifications.json     # Notificações e toasts
│   │   ├── validation.json        # Mensagens de erro de form
│   │   └── dates.json             # Formatos de data customizados
│   └── en/
│       └── (mesma estrutura)
└── locale-context.tsx             # Hook para sincronizar com perfil
```

### Configuração do `i18n/index.ts`
- Detector de idioma na ordem: `localStorage → navigator → 'pt-BR'`
- `fallbackLng: 'pt-BR'`
- Namespaces carregados sob demanda
- `interpolation.escapeValue: false` (React já escapa)
- Suporte a interpolação (ex: `t('greeting', { name: 'Ana' })`)

### Hook de sincronização com o perfil
`src/hooks/useLocaleSync.ts`:
- Ao logar, lê `profiles.locale` e aplica via `i18n.changeLanguage()`
- Quando usuário troca o idioma, atualiza `localStorage` E faz `UPDATE profiles SET locale = ?`
- Atualiza `<html lang="...">` dinamicamente

### Componente `LanguageSwitcher`
`src/components/LanguageSwitcher.tsx`:
- Dropdown compacto (bandeira + label) integrado ao header em `AppLayout.tsx`
- Também visível na Landing page para usuários não logados (só localStorage)
- Acessível via teclado, com `aria-label`

### Integração inicial
- Atualizar `src/main.tsx` para importar `./i18n` antes do render
- Atualizar `src/components/AppLayout.tsx` para incluir `<LanguageSwitcher />` no header
- Atualizar `src/contexts/AuthContext.tsx` para invocar o sync de locale ao logar

### Helper de datas
`src/lib/date.ts`:
- Adicionar função `getCurrentLocale()` que retorna `ptBR` ou `enUS` do `date-fns/locale` baseado no `i18n.language`
- Atualizar `safeFormatDate()` para usar esse helper como default

---

## Fase 1 — Layout global e textos compartilhados

Traduzir tudo que aparece em **toda navegação**:

### Arquivos a editar
- `src/components/AppSidebar.tsx` — todos os labels de menu
- `src/components/AppLayout.tsx` — `PAGE_TITLES`, placeholder "Buscar", "⌘K"
- `src/components/NotificationBell.tsx` — labels e estados vazios
- `src/components/GlobalSearch.tsx` — placeholders e categorias
- `src/components/GlobalTimerIndicator.tsx`
- `src/components/HelpButton.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/components/TrialBanner.tsx`
- `src/components/billing/SubscriptionStatusBanner.tsx`
- `src/components/ui/empty-state.tsx`
- `src/components/ui/loaders.tsx`
- `src/lib/toast-helpers.ts` — toasts genéricos ("Sucesso", "Erro", "Tente novamente")
- `src/components/ui/responsive-table.tsx` — labels mobile

### Namespace usado
Principalmente `common` e `nav`.

---

## Fase 2 — Páginas principais

### Tarefas (Kanban)
- `src/pages/Index.tsx` — header, popover de export CSV (datas, botões)
- `src/components/kanban/KanbanBoard.tsx`, `KanbanColumn.tsx`, `KanbanCard.tsx`, `KanbanMobileView.tsx`
- `src/components/kanban/CreateTaskDialog.tsx`, `TaskDetailDialog.tsx` (incluindo "ID copiado!")
- `src/components/kanban/TaskAttachments.tsx`, `TaskTimer.tsx`, `TaskChangeHistory.tsx`, `TaskLinkedIdeas.tsx`
- `src/components/kanban/AssigneeSelector.tsx`, `KanbanSavedFilters.tsx`
- `src/lib/csv-export.ts` — cabeçalhos do CSV traduzidos conforme idioma ativo

### Dashboard / Agenda / Timer
- `src/pages/Dashboard.tsx`
- `src/pages/PersonalCalendar.tsx`
- `src/pages/Timer.tsx`
- `src/components/dashboard/TaskTooltip.tsx`, `TimeReport.tsx`
- `src/components/calendar/CreateEventDialog.tsx`, `EventDetailDialog.tsx`
- `src/components/timer/TimerDashboard.tsx`

### Equipe
- `src/pages/Team.tsx`, `TeamList.tsx`
- `src/components/team/InviteUserDialog.tsx`, `TeamAttachments.tsx`

### Configurações
- `src/pages/Settings.tsx`
- `src/components/settings/RecurringTasksSettings.tsx`

---

## Fase 3 — Páginas restantes, validações, e-mails

### Páginas de conteúdo
- `src/pages/Ideas.tsx` + `src/components/ideas/*`
- `src/pages/MeetingMinutes.tsx`, `MeetingMinuteDetail.tsx` + `src/components/meetings/*`
- `src/pages/WorkInstructions.tsx` + `src/components/work-instructions/*`
- `src/pages/KnowledgeBase.tsx` + `src/components/knowledge/*`

### Auth e onboarding
- `src/pages/Auth.tsx`, `AcceptInvite.tsx`, `Unsubscribe.tsx`
- `src/components/onboarding/OnboardingWizard.tsx` + steps 1–4
- Mensagens de validação Zod (campos obrigatórios, e-mail inválido, etc.)

### Financeiro / Cobrança / Admin
- `src/pages/Financial.tsx`, `FinancialRegister.tsx`, `Billing.tsx`, `Pricing.tsx`, `Admin.tsx`
- Todos os componentes em `src/components/financial/*`, `src/components/billing/*`, `src/components/admin/*`
- `src/components/support/SupportChat.tsx`, `SupportTicketList.tsx`
- `src/lib/br-validators.ts` — mensagens de erro de CPF/CNPJ/CEP
- `src/lib/fiscal-readiness.ts` — labels de campos pendentes

### Landing e páginas públicas
- `src/pages/Landing.tsx` + `src/components/landing/*`
- `src/pages/legal/Privacy.tsx`, `Terms.tsx`
- `src/pages/NotFound.tsx`
- Atualizar meta tags (`<title>`, `<meta description>`) dinamicamente via `react-helmet-async` ou efeito direto no `document`
- Atualizar `<html lang>` dinamicamente

### E-mails do backend (Edge Functions)
Estratégia: cada função que envia e-mail recebe (ou consulta) o `locale` do destinatário e renderiza o template correto.

**Mudanças**:
1. `supabase/functions/_shared/transactional-email-templates/registry.ts` — aceitar `locale` como parâmetro e ter strings PT/EN inline em cada template.
2. Atualizar templates existentes para receber `locale: 'pt-BR' | 'en'`:
   - `daily-pending-summary.tsx`
   - `lead-reply.tsx`
   - `recurring-task-reminder.tsx`
   - `team-invite.tsx`
3. `supabase/functions/auth-email-hook/index.ts` e templates auth (`signup.tsx`, `magic-link.tsx`, `recovery.tsx`, `invite.tsx`, `email-change.tsx`, `reauthentication.tsx`) — buscar `profiles.locale` pelo `user_id` quando disponível e renderizar o idioma certo.
4. `process-email-queue`, `send-transactional-email`, `send-daily-pending-email`, `check-notifications` — propagar `locale` no payload da fila.

---

## Padrões e convenções de código

### Como usar nos componentes
```tsx
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation('tasks');
  return <button>{t('createTask')}</button>;
}
```

### Como usar com interpolação
```tsx
t('welcome', { name: user.displayName })
// JSON: { "welcome": "Olá, {{name}}!" } / "Hello, {{name}}!"
```

### Pluralização
```tsx
t('itemCount', { count: 5 })
// JSON: { "itemCount_one": "1 item", "itemCount_other": "{{count}} itens" }
```

### Convenção de chaves
- camelCase, agrupadas por domínio dentro do JSON
- Ex: `tasks.create.title`, `tasks.create.submit`, `tasks.filters.assignee`
- Evitar chaves genéricas demais — preferir `tasks.empty.message` a `empty.message`

---

## Validação ao final de cada fase

1. `bunx tsc --noEmit` — verificar tipos
2. Testar fluxo com PT-BR (idioma padrão)
3. Trocar para EN no header e revisitar as mesmas telas
4. Verificar persistência: deslogar/logar, abrir em outro navegador (sincroniza via `profiles.locale`)
5. Confirmar `<html lang>` muda corretamente
6. Datas formatadas no locale certo (ex: "April 25, 2026" vs "25 de abril de 2026")

---

## Estimativa de impacto

| Métrica | Impacto |
|---|---|
| **Bundle inicial** | +15–25 KB gzipped (lib + 1 namespace base) |
| **Bundle por idioma extra** | +5–10 KB gzipped (lazy, só baixa quando trocar) |
| **Performance runtime** | Praticamente zero |
| **Tempo de carregamento inicial** | +30–80ms na 1ª visita (negligível com cache) |
| **Manutenção futura** | Cada texto novo precisa entrar em PT e EN |

---

## Entrega faseada

Aplicarei nesta ordem dentro do mesmo ciclo de implementação após sua aprovação:
1. **Fase 0** (infra + migração + seletor no header) — base funcional sem traduções
2. **Fase 1** (layout global) — sidebar, header, toasts já bilíngues
3. **Fase 2** (páginas principais) — Tarefas, Dashboard, Equipe, Configurações
4. **Fase 3** (resto + e-mails) — landing, financeiro, admin, e-mails transacionais

Ao final, todo o app responde ao seletor de idioma e os e-mails enviados respeitam a preferência do destinatário.