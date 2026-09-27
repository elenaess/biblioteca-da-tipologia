# Biblioteca da Tipologia

Pacote reconstruído a partir do projeto criado no ChatGPT em 26/09/2026, do Supabase ativo e da especificação preservada.

## O que está incluído

- `apps/web`: React + Vite, catálogo, Leituras, Artigos, leitor, comentários, conta Google/Supabase e edição administrativa.
- `apps/mobile`: Expo/React Native Android, navegação nativa, catálogo, leitor PDF, Leituras/Artigos, conta e login Google via Supabase OAuth/PKCE.
- `packages/core`: regras compartilhadas e testes sem dependências externas.
- `.github/workflows/pages.yml`: GitHub Pages.
- `.github/workflows/android-apk.yml`: gera APK instalável e salva como artifact do GitHub Actions.

O backend usado é o Supabase **Biblioteca da Tipologia** (`ghendeqnxybayhzhsjgz`). A publishable key incluída nos clientes é pública por definição; as ações privilegiadas permanecem protegidas por RLS/RPC no banco.

## 1. Teste local mínimo

```bash
npm test
```

## 2. Site

```bash
cd apps/web
npm install
npm run dev
```

O Vite usa `base: './'` e `HashRouter`, portanto funciona sob `https://<usuario>.github.io/<repositorio>/`.

## 3. App Android

O projeto usa **Expo SDK 57 / React Native 0.86** (SDK 57 é a versão estável; SDK 58 está em beta em setembro de 2026).

```bash
cd apps/mobile
npm install
npx expo install --fix
npx expo prebuild --platform android
cd android
./gradlew assembleDebug
```

APK: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`.

No GitHub, o workflow **Build Android APK** faz tudo automaticamente. Abra a execução em Actions e baixe o artifact `Biblioteca-da-Tipologia-APK`.

## 4. Google + Supabase Auth (passo externo obrigatório)

No Google Cloud, crie um OAuth Client **Web** e configure o callback do Supabase:

```text
https://ghendeqnxybayhzhsjgz.supabase.co/auth/v1/callback
```

Depois, no Supabase: **Authentication → Providers → Google**, habilite Google e informe Client ID + Client Secret.

Em **Authentication → URL Configuration → Redirect URLs**, permita:

```text
https://elenaess.github.io/biblioteca-da-tipologia/
bibliotecadatipologia://auth/callback
http://localhost:5173/
```

O site usa `signInWithOAuth`. O app Android usa o mesmo provider, abre o navegador e retorna ao APK por `bibliotecadatipologia://auth/callback`, trocando o código PKCE pela sessão do Supabase.

A RPC `claim_owner()` já existente no banco reconhece a conta proprietária verificada e mantém a autorização do lado do servidor.

## 5. Colocar no GitHub pelo Termux

```bash
pkg update
pkg install git gh unzip -y
termux-setup-storage
cd ~/storage/downloads
unzip Biblioteca-da-Tipologia-recuperada.zip -d ~/biblioteca-da-tipologia
cd ~/biblioteca-da-tipologia
gh auth login
git init
git branch -M main
git add .
git commit -m "feat: Biblioteca da Tipologia"
gh repo create biblioteca-da-tipologia --public --source=. --remote=origin --push
```

Depois vá em **Settings → Pages** do repositório e selecione **GitHub Actions** como fonte. Os workflows também podem ser disparados manualmente pela aba **Actions**.

## Observação sobre segurança

Nunca coloque `service_role`, segredo JWT ou Client Secret do Google no GitHub/app. Apenas a publishable key do Supabase deve aparecer no cliente.
