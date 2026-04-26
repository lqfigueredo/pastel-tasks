# Plano — Localizar conteúdo dos documentos legais por idioma

## Diagnóstico

Hoje a tabela `legal_documents` armazena **apenas uma versão por `doc_type`** (terms / privacy), sem coluna de idioma. As páginas `/termos` e `/privacidade` consultam essa tabela e renderizam o markdown como está — então mesmo com a UI já traduzida (cabeçalho, botão "Início", título da aba), o **corpo do documento continua sempre em PT-BR** independente do idioma do visitante.

**Estado atual no banco:**
- `terms` v1 (2.587 caracteres, PT-BR)
- `privacy` v1 (3.003 caracteres, PT-BR)

**Arquivos que tocam essa tabela:**
- `supabase/migrations/20260420184508_*.sql` (criação + seed PT)
- `src/pages/legal/Terms.tsx` e `Privacy.tsx` (leitura pública)
- `src/components/financial/LegalDocumentsEditor.tsx` (admin edita/publica versões)

---

## Mudanças propostas

### 1. Migração de schema — adicionar coluna `locale`
Nova migração SQL:
- Adicionar `locale text NOT NULL DEFAULT 'pt-BR'` em `public.legal_documents`.
- Restringir valores via CHECK: `locale IN ('pt-BR', 'en')`.
- Substituir o índice `idx_legal_documents_type_version` por um composto `(doc_type, locale, version DESC)` para acelerar a busca da versão mais recente por idioma.
- Atualizar a UNIQUE constraint (se existir) para incluir `locale`, permitindo `terms v1 pt-BR` e `terms v1 en` coexistirem.
- Backfill: as 2 linhas existentes recebem `locale = 'pt-BR'` automaticamente pelo default.

### 2. Seed inicial em inglês
Inserir versão v1 dos dois documentos em `en` traduzindo o conteúdo PT existente, para que `/terms` e `/privacy` em EN não caiam no fallback "Document not yet published". Conteúdo será uma tradução fiel do markdown atual (Termos de Uso e Política de Privacidade da NEVVOH).

### 3. Atualizar páginas públicas (`Privacy.tsx` / `Terms.tsx`)
- Importar `i18n` para detectar o idioma corrente (`i18n.language`).
- Adicionar filtro `.eq('locale', currentLocale)` na query.
- **Fallback inteligente**: se não houver documento no idioma corrente, fazer segunda query em `pt-BR` (idioma base) e exibir, evitando a tela "não publicado" quando admin esquecer de publicar uma das versões.
- Reagir a mudanças de idioma: re-disparar a query quando `i18n.language` mudar (incluir no `useEffect` deps).

### 4. Atualizar o editor do solution_admin (`LegalDocumentsEditor.tsx`)
- Adicionar um seletor de idioma (Tabs ou ToggleGroup) **dentro de cada aba** (Termos / Privacidade), com opções "Português (BR)" e "English".
- O versionamento passa a ser **por (doc_type, locale)**: ao publicar, calcular `nextVersion = max(version) + 1` filtrando também por `locale`.
- Histórico de versões na UI também filtrado por idioma.
- Adicionar um pequeno badge/aviso "Não publicado neste idioma" quando o draft estiver vazio para um locale específico.

### 5. Chaves i18n complementares
Adicionar ao namespace `financial` (PT/EN):
- `legal.localeTabs.ptBR`, `legal.localeTabs.en`
- `legal.notPublishedYet` (badge no editor)
- `legal.fallbackNotice` (opcional — exibido nas páginas públicas em EN quando estiver mostrando o conteúdo PT como fallback)

### 6. Documentação leve no editor
Atualizar o texto do `<Alert>` no editor para deixar claro que documentos são por idioma e que cada um tem versionamento independente.

---

## Arquivos afetados

- **Criar**: nova migração SQL em `supabase/migrations/` (schema + seed EN).
- **Editar**: `src/pages/legal/Terms.tsx`, `src/pages/legal/Privacy.tsx`, `src/components/financial/LegalDocumentsEditor.tsx`, `src/i18n/locales/pt-BR/financial.json`, `src/i18n/locales/en/financial.json`.

## Validação

1. `tsc --noEmit` para garantir tipos coerentes (o `types.ts` é regenerado automaticamente após a migração).
2. Acessar `/termos` e `/privacidade` em PT e EN via switcher — verificar conteúdo correto em cada idioma.
3. Como solution_admin, abrir o editor: alternar entre tabs PT/EN, publicar uma nova versão em EN e confirmar que histórico fica isolado por idioma.
4. Testar fallback: temporariamente desativar (ou simular ausência) da versão EN e confirmar que a página pública mostra o conteúdo PT em vez de "não publicado".

## Fora de escopo

- Auto-tradução por IA dos documentos (ex.: usar Lovable AI para gerar a versão EN a partir da PT). Pode ser uma evolução futura, mas adiciona custo/risco de revisão jurídica.
- Adicionar mais idiomas além de PT/EN — a estrutura já permitirá, mas o seed e a UI ficam restritos aos dois suportados pelo app.
