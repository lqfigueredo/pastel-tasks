
## Melhorar fluxo de contratação: separar "Entrar em contato" de "Realizar trial"

### Objetivo
Substituir o botão único "Tenho Interesse" por dois botões lado a lado:
- **"Entrar em contato"** (atual `LeadFormTrigger`, renomeado) — abre o `LeadFormDialog` para captura de lead.
- **"Realizar trial"** (novo, primário/destaque) — leva direto ao cadastro em `/auth`.

Hoje o único CTA forte (`Tenho Interesse`) abre formulário de contato. Quem quer começar agora precisa procurar o link discreto "Já tenho conta". Separar reduz fricção para quem está pronto e mantém canal de captação para quem precisa conversar.

### Mudanças

**1. `src/components/landing/LeadFormTrigger.tsx`**
- Renomear texto do botão de "Tenho Interesse" para "Entrar em contato".
- Trocar variant para `outline` (deixa de ser o CTA principal, passa a ser secundário ao lado do trial).
- Trocar ícone `Send` por `Mail` (mais coerente com "contato").
- Manter API (props/comportamento) intactos.

**2. `src/pages/Landing.tsx` — Hero (linhas 188-207)**
Reorganizar em 2 botões principais lado a lado + link "Já tenho conta" como ghost menor abaixo (ou no header, que já existe).

```tsx
<div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
  <Link to="/auth">
    <Button size="lg" className="text-base px-8 gap-2">
      <Sparkles className="h-5 w-5" />
      Realizar trial grátis
    </Button>
  </Link>
  <LeadFormTrigger />
</div>
<p className="mt-4 text-xs text-muted-foreground">
  14 dias grátis · sem cartão de crédito
</p>
```

Remover o `<Link to="/precos">Ver preços</Link>` e `<Link to="/auth">Já tenho conta</Link>` desta área (preços já está no header; "já tenho conta" também). Hero fica focado em 2 ações.

**3. `src/pages/Pricing.tsx` (linhas ~152-160 — área de CTA do plano)**
Já tem layout similar com "Começar teste grátis" + `LeadFormTrigger`. Apenas se beneficiará da renomeação automática para "Entrar em contato". Sem mudança extra de código necessária aqui.

### Fora de escopo
- Mexer no header (já tem "Preços" e "Já tenho conta" — está ok).
- Trocar copy do `LeadFormDialog` interno (formulário continua igual).
- Adicionar novo CTA em outras páginas além das já citadas.

### Arquivos afetados
- `src/components/landing/LeadFormTrigger.tsx` (texto/variant/ícone)
- `src/pages/Landing.tsx` (reorganizar hero CTA)
