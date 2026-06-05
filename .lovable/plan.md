## Diagnóstico

A sidebar **já tem fundo navy estático** nos dois modos (`--sidebar-background` resolve para Deep Navy tanto no light quanto no dark). O problema não é o fundo — é a cor do texto do wordmark.

No `AppSidebar.tsx` linha 104, o "flow" usa `text-foreground`. Em light mode, `--foreground` é Deep Navy `#26215C` — exatamente a mesma família de cor do fundo da sidebar. Resultado: o "flow" some.

## Correção

Trocar `text-foreground` por `text-sidebar-foreground` no span do wordmark da sidebar. O token `--sidebar-foreground` é branco nos dois modos, garantindo que "flow" leia limpo sobre o navy estático da sidebar — independente do tema. O "ly" em Soft Purple já está OK.

Fora de escopo: não preciso mexer no fundo da sidebar nem criar tokens novos, o navy estático já existe.
