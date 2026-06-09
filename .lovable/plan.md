# Ajuste do MobileTopBar (mobile)

## Problema
No header mobile, o `LanguageSwitcher` está visualmente colado/sobreposto ao logo + título, porque há muitos elementos (logo, título flex-1, busca, idioma, timer, sino) competindo por espaço em telas de 360–390px.

## Solução (apenas `src/components/layout/MobileTopBar.tsx`)

1. **Esconder o título** quando não couber: o título da página já aparece nas próprias telas, então no topo mobile basta o logo. Remover o `<h1>` e deixar apenas o logo à esquerda + `flex-1` spacer.
   - Alternativa caso o título seja desejado: manter, mas com `text-xs` e `max-w-[40%]`.
2. **Compactar o `LanguageSwitcher`**: passar uma variante mais enxuta (ou envolver em wrapper `[&_button]:px-1.5 [&_button]:h-8`) para reduzir largura.
3. **Reduzir gaps e tamanhos dos botões de ação** (busca, idioma, sino, timer) de `h-9 w-9` para `h-8 w-8` e `gap-2` → `gap-1`.
4. **Garantir `shrink-0`** em todos os ícones/botões à direita para que o spacer absorva a sobra em vez de empurrar os elementos.

## Fora de escopo
- Sem alterações no header desktop.
- Sem mudança de lógica, i18n keys ou navegação.
- Sem alteração no `LanguageSwitcher` em si (apenas estilização via classe wrapper).
