

# Instruções de Trabalho — Novo módulo

## Resumo

Criar um módulo completo de "Instruções de Trabalho" com CRUD de documentos PDF, versionamento de arquivos, log de alterações e gerenciamento de espaço de armazenamento.

## Banco de dados

### Novas tabelas (migration)

**1. `work_instructions`** — Documento principal
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| title | text NOT NULL | Título do documento |
| description | text | Descrição resumida |
| is_active | boolean DEFAULT true | Ativo sim/não |
| team_id | uuid NOT NULL | Referência ao time |
| current_file_path | text NOT NULL | Caminho no storage |
| current_file_name | text NOT NULL | Nome do arquivo |
| created_by | uuid NOT NULL | Quem criou |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

**2. `work_instruction_versions`** — Histórico de versões anteriores
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| instruction_id | uuid NOT NULL | FK → work_instructions |
| version_number | integer NOT NULL | Número sequencial |
| file_path | text NOT NULL | Caminho do PDF no storage |
| file_name | text NOT NULL | Nome do arquivo |
| change_reason | text NOT NULL | Motivo da alteração |
| changed_by | uuid NOT NULL | Quem alterou |
| created_at | timestamptz DEFAULT now() | |

**3. `work_instruction_logs`** — Log de todas as ações
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| instruction_id | uuid NOT NULL | FK → work_instructions |
| action | text NOT NULL | Ex: 'created', 'updated_file', 'deleted_version' |
| details | text | Motivo ou detalhes |
| user_id | uuid NOT NULL | |
| created_at | timestamptz DEFAULT now() | |

### Storage
- Criar bucket `work-instructions` (privado)
- RLS: membros do time podem ler; criador e membros do time podem fazer upload

### RLS policies
- **work_instructions**: SELECT/INSERT/UPDATE/DELETE restritos a membros do time (`is_team_member`)
- **work_instruction_versions**: SELECT para membros do time; INSERT para membros do time; DELETE para membros do time (permite remover versões antigas)
- **work_instruction_logs**: INSERT para authenticated (com `user_id = auth.uid()`); SELECT para membros do time

## Frontend

### Novos arquivos

| Arquivo | Descrição |
|---|---|
| `src/pages/WorkInstructions.tsx` | Página principal com listagem, filtros por equipe e status |
| `src/components/work-instructions/CreateInstructionDialog.tsx` | Dialog para criar: título, descrição, ativo, equipe, upload PDF |
| `src/components/work-instructions/EditInstructionDialog.tsx` | Dialog para editar metadados (título, descrição, ativo) |
| `src/components/work-instructions/UpdateDocumentDialog.tsx` | Dialog para trocar o PDF: upload do novo + campo obrigatório "motivo da alteração" |
| `src/components/work-instructions/VersionHistory.tsx` | Visualização do histórico de versões com opção de download e exclusão de versões antigas |
| `src/components/work-instructions/InstructionLogs.tsx` | Visualização do log de alterações (quem, quando, motivo) |

### Alterações em arquivos existentes

| Arquivo | Mudança |
|---|---|
| `src/components/AppSidebar.tsx` | Adicionar item "Instruções de Trabalho" com ícone `BookOpen`, visível para todos exceto `isOnlySolutionAdmin` |
| `src/App.tsx` | Adicionar rota `/instrucoes` → `WorkInstructions` |

## Fluxo de versionamento

1. Ao editar o documento (PDF), o usuário informa o **motivo da alteração** (campo obrigatório)
2. O arquivo atual é movido para `work_instruction_versions` como versão anterior
3. O novo PDF é salvo como arquivo atual em `work_instructions`
4. Um registro é inserido em `work_instruction_logs` com ação `updated_file`, motivo e nome do usuário
5. Versões anteriores (após existir mais de uma revisão) podem ser excluídas individualmente do storage e da tabela para economizar espaço

## Detalhes técnicos

- Upload aceita apenas `application/pdf` (validação client-side e no accept do input)
- Arquivos armazenados no bucket `work-instructions` com path `{team_id}/{instruction_id}/{timestamp}.pdf`
- Trigger `update_updated_at_column` aplicado à tabela `work_instructions`
- Todas as operações de escrita registram log automaticamente

