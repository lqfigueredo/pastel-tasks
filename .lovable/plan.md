

## Melhorar SEO para ranqueamento no Google

O Lighthouse já dá 100 em SEO técnico, mas isso cobre apenas o básico (meta tags, mobile-friendly). Para aparecer em buscas como "gerenciador de tarefas", "software de gestão de equipes", etc., precisamos trabalhar **conteúdo, estrutura semântica e SEO on-page**.

### 1. Palavras-chave e Meta Tags estratégicas
- Atualizar `<title>` para incluir palavras-chave: ex. `NEVVOH - Gerenciador de Tarefas e Projetos para Equipes`
- Expandir `<meta description>` com termos de busca: ex. `Software de gestão de tarefas, projetos e equipes. Kanban, atas de reunião, temporizador e agenda em um só lugar. Experimente grátis.`
- Adicionar `<meta keywords>` (baixo impacto, mas não custa)

### 2. Dados Estruturados (JSON-LD)
- Adicionar schema.org `SoftwareApplication` no `index.html` para aparecer em rich snippets do Google
- Incluir informações como nome, descrição, categoria, sistema operacional (web), preço

### 3. Conteúdo semântico na Landing Page
- Usar tags `<h1>`, `<h2>`, `<h3>` com hierarquia correta (já parcialmente feito)
- Adicionar uma seção de **FAQ** com perguntas comuns que as pessoas buscam no Google (ex. "O que é um gerenciador de tarefas?", "Como organizar tarefas da equipe?")
- Adicionar `<alt>` descritivo em todas as imagens

### 4. SEO técnico adicional
- Adicionar `sitemap.xml` gerado estaticamente
- Melhorar `robots.txt` com referência ao sitemap
- Adicionar tag `<link rel="canonical">` para evitar conteúdo duplicado
- Adicionar hreflang para indicar idioma PT-BR

### 5. Open Graph e Social
- Atualizar OG tags com descrições mais ricas e palavras-chave

### Arquivos modificados
- `index.html` — meta tags, JSON-LD, canonical, hreflang
- `public/sitemap.xml` — novo
- `public/robots.txt` — referência ao sitemap
- `src/pages/Landing.tsx` — seção FAQ com perguntas otimizadas para SEO

