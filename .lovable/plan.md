

## Próxima leva — melhorias médias

Quatro frentes independentes:

### 1. Preview inline de anexos (PDF/imagem)
- Componente `AttachmentPreview.tsx` reusável: dialog com viewer.
- Imagens: `<img>` direto da signed URL.
- PDFs: `<iframe>` com signed URL (sem lib pesada — browser nativo).
- Botões: "Baixar" e "Abrir em nova aba".
- Integrar em `TaskAttachments`, `IdeaAttachments`, `MeetingAttachments`, `TeamAttachments`.
- Click no nome do arquivo → abre preview em vez de baixar.

### 2. Filtros salvos no Kanban
- Tabela nova `kanban_saved_filters` (user_id, name, filters jsonb).
- RLS: usuário só vê os próprios.
- UI no `KanbanBoard`: dropdown "Filtros salvos" ao lado dos filtros existentes, com "Salvar atual" / "Aplicar" / "Excluir".
- Filtros suportados: assignees, status, critical, team_id, search.

### 3. Export do TimeReport (CSV + PDF)
- Botão "Exportar" em `TimeReport.tsx` com dropdown CSV/PDF.
- CSV: gerado client-side (Blob + download).
- PDF: usar `jspdf` + `jspdf-autotable` (lazy import para não inflar bundle).
- Inclui: período, total geral, breakdown por tarefa/dia.

### 4. Manifest simples para instalabilidade
- **Sem service worker** (evita problemas no preview Lovable).
- `public/manifest.webmanifest` com ícones, nome, `display: standalone`, theme color Mint.
- Link no `index.html`.
- Permite "Adicionar à tela inicial" sem PWA completo.

---

### Arquivos

**Novos:**
- `src/components/AttachmentPreview.tsx`
- `public/manifest.webmanifest`
- Migration: criar `kanban_saved_filters` + RLS

**Modificados:**
- 4 componentes de anexos (Task/Idea/Meeting/Team)
- `src/components/kanban/KanbanBoard.tsx`
- `src/components/dashboard/TimeReport.tsx`
- `index.html`
- `package.json` (jspdf + jspdf-autotable)

### Ordem
1. Manifest (rápido, isolado)
2. Preview de anexos (alto impacto UX)
3. Export TimeReport
4. Filtros salvos do Kanban (requer migration)

