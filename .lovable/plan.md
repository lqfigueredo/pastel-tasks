
## Solução proposta para a tela branca em produção

### Diagnóstico mais provável

A correção anterior focou só em `vendor-charts`, mas o problema persiste porque a aplicação ainda usa uma estratégia de `manualChunks` muito agressiva em `vite.config.ts`.

Hoje o build separa várias bibliotecas críticas manualmente:
- React / router
- query
- Radix
- Supabase client
- icons
- charts
- cmdk
- pdf
- dnd
- sentry
- date-fns

Em produção, esse tipo de divisão manual pode gerar ordem de inicialização instável entre chunks e causar erro fatal antes do React montar. Quando isso acontece:
- a tela fica 100% branca
- o `ErrorBoundary` não ajuda
- o erro acontece cedo demais, no bootstrap/import dos módulos

Isso combina com o comportamento atual: `/auth` é uma tela simples, mas o app inteiro depende do bootstrap inicial e dos chunks-base.

### Correção recomendada

#### 1. Remover o `manualChunks` customizado
Arquivo:
- `vite.config.ts`

Ajuste:
- remover a função `manualChunks` inteira
- deixar o Vite/Rollup cuidar do code splitting padrão

Motivo:
- é a forma mais segura para eliminar conflitos de inicialização entre chunks
- reduz risco de TDZ/circular init entre dependências compartilhadas
- evita quebrar novamente quando a árvore de imports muda

#### 2. Fortalecer o bootstrap do app
Arquivo:
- `src/main.tsx`

Ajuste:
- trocar o bootstrap estático por um bootstrap protegido
- carregar `App` via `import('./App')` dentro de `try/catch`
- registrar `window.onerror` e `window.onunhandledrejection`
- em caso de falha antes do React montar, renderizar um fallback mínimo no `#root` em vez de deixar a tela branca
- enviar o erro para o monitoramento

Resultado:
- mesmo se houver erro de import/chunk, o usuário não verá uma tela totalmente branca
- fica mais fácil identificar a causa real se algo ainda falhar

#### 3. Manter o `ErrorBoundary` apenas para falhas pós-montagem
Arquivo:
- `src/components/ErrorBoundary.tsx`

Ajuste:
- manter a proteção para erros de runtime depois que a aplicação já carregou
- não confiar nele para falhas de bootstrap

### Implementação esperada

#### `vite.config.ts`
- simplificar `build.rollupOptions.output`
- remover o `manualChunks`

#### `src/main.tsx`
Criar fluxo parecido com:
```ts
async function bootstrap() {
  try {
    initSentry();
    const [{ default: App }, { createRoot }] = await Promise.all([
      import('./App'),
      import('react-dom/client'),
    ]);
    createRoot(document.getElementById('root')!).render(<App />);
  } catch (error) {
    // captura + fallback visual
  }
}
```

Também incluir:
- listener global para `error`
- listener global para `unhandledrejection`

### Validação

Depois da implementação:

1. publicar novamente
2. testar em produção:
   - `/`
   - `/auth`
   - login e redirecionamento para `/tarefas`
3. confirmar que:
   - não há mais tela branca
   - o app ao menos mostra fallback se algo falhar
   - console não exibe mais erro fatal de inicialização de chunk
4. se ainda houver falha, o novo bootstrap vai expor o erro exato e não mais um branco total

### Arquivos que serão alterados

- `vite.config.ts`
- `src/main.tsx`
- possivelmente ajuste pequeno em `src/components/ErrorBoundary.tsx`

### Resultado esperado

A solução real não é “mexer só no chunk de charts”, e sim:
- parar de forçar split manual entre dependências sensíveis
- proteger o carregamento inicial do app

Isso ataca a causa estrutural mais provável do branco total em produção.
