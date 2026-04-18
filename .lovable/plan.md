

O usuário está confirmando que precisamos coletar CNPJ/CPF para emissão de NF. A resposta é sim, e o `BillingProfileForm.tsx` já coleta isso. Mas ele provavelmente quer saber se está completo o suficiente para emissão real de nota fiscal no Brasil.

Vou olhar o que `billing_profiles` tem hoje e comparar com o que uma NFS-e exige.

Hoje em `billing_profiles`:
- entity_type (individual/company) ✓
- legal_name ✓
- tax_id (CPF ou CNPJ) ✓
- email, phone ✓
- address_line1/2, city, state, postal_code, country ✓

O que **falta** para emissão real de NFS-e no Brasil:

**Para PJ (CNPJ):**
- Inscrição Municipal (obrigatória na maioria dos municípios para tomador PJ)
- Inscrição Estadual (opcional, "Isento" se não tiver)
- Razão social vs Nome fantasia (hoje só tem `legal_name`)

**Para PF (CPF):**
- RG (opcional, mas alguns municípios pedem)
- Nome completo já é o `legal_name` ✓

**Endereço:**
- Bairro (campo separado é exigido pela maioria dos sistemas de NFS-e — hoje vai jogado no `address_line2`)
- Número e complemento separados (hoje tudo junto em `address_line1`)
- Código IBGE do município (necessário no XML da NFS-e — pode ser derivado de cidade+UF na hora da emissão, não precisa pedir ao usuário)

**Validação:**
- Hoje aceita qualquer texto em `tax_id`. Precisa validar formato e dígito verificador de CPF/CNPJ.
- CEP precisa de máscara/validação (8 dígitos).
- UF precisa ser uma das 27 válidas.

**Outras considerações:**
- Se o emissor for **NEVVOH (CNPJ próprio)**, a NF é emitida pela NEVVOH com o cliente como tomador → precisa só dos dados acima do cliente. O CNPJ da NEVVOH é configuração interna, não vai em `billing_profiles`.
- Para emitir de fato, precisa integrar com prefeitura ou serviço como NFE.io / Focus NFe / eNotas. Isso é uma fase posterior.

## Plano — Completar dados fiscais para emissão de NFS-e

### O que já temos
`billing_profiles` cobre: tipo (PF/PJ), nome/razão social, CPF/CNPJ, email, telefone, endereço básico (linha 1, linha 2, cidade, UF, CEP, país).

### O que falta para uma NFS-e válida

**Campos novos em `billing_profiles`:**
| Campo | Tipo | Quando obrigatório |
|---|---|---|
| `trade_name` (nome fantasia) | text, opcional | PJ |
| `municipal_registration` (inscrição municipal) | text, opcional | PJ — alguns municípios exigem |
| `state_registration` (inscrição estadual) | text, opcional | PJ — "ISENTO" se não tiver |
| `address_number` (número) | text | sempre |
| `address_complement` (complemento) | text, opcional | sempre |
| `neighborhood` (bairro) | text | sempre |

**Reorganização do endereço:**
Hoje `address_line1` mistura rua + número e `address_line2` vira complemento. Para NF, o ideal é: `street`, `number`, `complement`, `neighborhood`, `city`, `state`, `postal_code`. Manter `address_line1/line2` como legado e adicionar os novos campos estruturados.

**Validação no form:**
- CPF: 11 dígitos + algoritmo de dígito verificador
- CNPJ: 14 dígitos + algoritmo de dígito verificador
- CEP: 8 dígitos numéricos, máscara `00000-000`
- UF: select com as 27 unidades federativas
- Auto-preenchimento de endereço via API ViaCEP ao digitar o CEP (gratuita, sem chave)

### Fluxo proposto

**Etapa A — Schema (agora)**
Adicionar colunas novas em `billing_profiles` (todas opcionais para não quebrar registros existentes), sem remover as antigas.

**Etapa B — Form (`BillingProfileForm.tsx`)**
Reescrever com:
- Campos condicionais por `entity_type` (PF não vê inscrição municipal/estadual)
- Validação com zod (CPF, CNPJ, CEP, UF)
- Máscaras de input para CPF/CNPJ/CEP/telefone
- Integração com ViaCEP para auto-completar bairro/cidade/UF
- Mensagens claras de erro

**Etapa C — Painel solution_admin**
Mostrar resumo dos dados fiscais no `SubscriptionDetailDrawer`, com aviso "Dados fiscais incompletos" se faltar campo essencial. Útil pra você cobrar o cliente a preencher antes de gerar a primeira NF.

**Etapa D — Emissão real (depois)**
Integração com NFE.io / Focus NFe / eNotas. Não entra agora — o objetivo desta fase é só **coletar e validar** os dados certos para que a emissão funcione quando plugarmos.

### O que NÃO entra agora
- Integração com prefeitura / API de NFS-e
- CNAE, alíquota ISS, regime tributário do tomador (geralmente o emissor define, não o tomador)
- Geração de PDF/XML da nota

### Decisão pendente
Confirmar se você quer que eu também já adicione **integração com ViaCEP** para auto-preencher endereço pelo CEP (recomendo, melhora muito o UX e quase elimina erro de digitação no endereço — é grátis e sem chave).

