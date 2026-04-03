

# Redesign da Landing Page — funcionalidades completas e visual moderno

## Problema atual
A landing exibe apenas 4 funcionalidades (Kanban, Equipes, Atas, Dashboard), mas a plataforma já possui Temporizador, Agenda Pessoal, Instruções de Trabalho, Registro de Ideias, Suporte e Notificações. Além disso, o layout é estático e simples demais para transmitir modernidade.

## Alterações propostas

### 1. Hero section modernizada
- Adicionar um gradiente sutil mint-to-transparent no fundo
- Badge animado acima do titulo (ex: "Produtividade sem complexidade")
- Animacoes de fade-in escalonadas nos elementos (titulo, subtitulo, botao)
- Segundo CTA secundario "Ja tenho conta" ao lado do botao principal

### 2. Seção de funcionalidades expandida (8 features em grid)
Adicionar as funcionalidades que faltam:
- **Kanban Intuitivo** (existente)
- **Gestao de Equipes** (existente)
- **Atas de Reuniao** (existente)
- **Dashboard de Prazos** (existente)
- **Temporizador Pomodoro** (novo) — Timer, countdown com pausa/retomada
- **Agenda Pessoal** (novo) — Calendar, eventos e compromissos
- **Instrucoes de Trabalho** (novo) — BookOpen, documentos versionados
- **Registro de Ideias** (novo) — Lightbulb, capture e vincule ideias a tarefas

Layout: grid 2 colunas mobile, 4 colunas desktop. Cards com hover elevado (translate-y + shadow) para dar sensacao de fluidez.

### 3. Seção "Como funciona" (nova)
3 passos visuais com icones numerados e linhas conectoras:
1. Crie sua conta
2. Organize suas tarefas
3. Acompanhe os resultados

### 4. Seção de destaque visual (nova)
Uma faixa com fundo gradiente mint exibindo numeros/metricas de impacto (ex: "Tudo em um so lugar", "Gestao simplificada", "Equipes conectadas") — texto branco sobre fundo colorido.

### 5. Melhorias visuais gerais
- Scroll suave entre secoes
- Transicoes CSS com `animate-fade-in` e delays escalonados
- Cards com `transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`
- Espacamento mais generoso entre secoes (py-24 em vez de py-20)
- Footer com links para login e texto mais completo

## Arquivo modificado
- `src/pages/Landing.tsx` — reescrita completa mantendo a logica do formulario de leads

