# Botão "Instalar app" no mobile

## Objetivo
Permitir que usuários no celular instalem o Nevvoh na tela inicial direto pelo navegador, sem passar pela App Store ou Google Play. Continuamos como Web App instalável (PWA) — o `manifest.webmanifest` já existe e está configurado.

## Como funciona
- **Android / Chrome / Edge**: o navegador dispara o evento `beforeinstallprompt`. Capturamos esse evento e mostramos nosso próprio botão "Instalar app". Ao clicar, abrimos o diálogo nativo de instalação.
- **iOS / Safari**: a Apple não permite instalação programática. Mostramos um modal com instruções visuais: "Toque em Compartilhar → Adicionar à Tela de Início".
- Se o app já estiver instalado (`display-mode: standalone`), o botão fica oculto.
- Se o usuário dispensar uma vez, lembramos disso no `localStorage` para não insistir (com opção de mostrar de novo depois de X dias).

## Onde aparece
1. **Botão no `MobileTopBar`** (ícone de download, só aparece no mobile, só quando instalável e ainda não instalado).
2. **Banner discreto** opcional, uma vez por sessão, no topo da `MobileShell` — descartável com "x".
   - Pergunta: prefere só o botão no topbar, só o banner, ou ambos? (default sugerido: **só o botão no topbar**, mais limpo).

## Arquivos a criar
- `src/hooks/usePWAInstall.ts` — hook que:
  - escuta `beforeinstallprompt` e guarda o evento
  - detecta iOS Safari (`/iPad|iPhone|iPod/` + sem `MSStream`)
  - detecta se já está instalado (`window.matchMedia('(display-mode: standalone)')` ou `navigator.standalone`)
  - expõe `{ canInstall, isIOS, isInstalled, promptInstall(), dismiss() }`
- `src/components/pwa/InstallAppButton.tsx` — botão (ícone `Download`) que:
  - no Android: chama `promptInstall()`
  - no iOS: abre um `Sheet`/`Dialog` com passo-a-passo ilustrado
  - usa `useIsMobile()` para só renderizar no mobile
- `src/components/pwa/IOSInstallInstructions.tsx` — conteúdo do sheet para iOS (PT-BR + EN via i18n).

## Arquivos a editar
- `src/components/layout/MobileTopBar.tsx` — inserir `<InstallAppButton />` entre o `LanguageSwitcher` e o bloco do timer/bell, com `shrink-0` e `h-8 w-8` (segue o padrão atual de espaçamento).
- `src/i18n/locales/pt-BR/common.json` e `src/i18n/locales/en/common.json` — chaves novas em `pwa.*`:
  - `pwa.install`, `pwa.installTitle`, `pwa.iosTitle`, `pwa.iosStep1/2/3`, `pwa.installed`.

## Fora do escopo
- Sem service worker, sem offline, sem `vite-plugin-pwa`.
- Sem mudanças no desktop, no manifest, no design da landing ou em qualquer outra tela.
- Sem alteração de lógica de negócio.

## Detalhes técnicos
- O `beforeinstallprompt` só dispara se os critérios de instalabilidade do navegador forem atendidos (manifest válido + HTTPS) — já temos isso em produção (`nevvoh.com`). Em preview do Lovable o evento pode não disparar; nesse caso o botão simplesmente não aparece (comportamento correto).
- Para iOS, mesmo sem evento, mostramos o botão se `isIOS && !isInstalled`, abrindo as instruções manuais.
- Persistência da dispensa: `localStorage.setItem('pwa-install-dismissed-at', Date.now())`, reaparecendo após 14 dias.
