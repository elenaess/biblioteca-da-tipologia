# Login Google nativo no Android

O APK usa `@react-native-google-signin/google-signin` 16.1.5 para abrir o seletor nativo de conta do Google e recebe um `idToken`. Em seguida o token é enviado ao Supabase por `auth.signInWithIdToken({ provider: "google", token })`.

## IDs necessários

1. **OAuth Client ID do tipo Web**: usado em `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. É o audience do `idToken` e pode ser o mesmo Web Client ID usado pelo Google provider do Supabase.
2. **OAuth Client ID do tipo Android**: cadastrado no Google Cloud com package `br.org.bibliotecadatipologia` e o SHA-1 do certificado que assina o APK. Ele não é segredo e não precisa ser embutido no JS.

O Client Secret do Google nunca deve entrar no aplicativo.

## GitHub Actions

Cadastre o Web Client ID como variável pública do repositório:

```bash
gh variable set GOOGLE_WEB_CLIENT_ID \
  --body 'SEU_WEB_CLIENT_ID.apps.googleusercontent.com' \
  --repo elenaess/biblioteca-da-tipologia
```

O workflow `Build Android APK` injeta essa variável no bundle. Ele também preserva `apps/mobile/android/app/debug.keystore` via cache e imprime o SHA-1 do APK final. Use o valor impresso em `Print final APK signing certificate for Google OAuth` para criar/atualizar o OAuth Client Android.

Depois de cadastrar o package + SHA-1 no Google Cloud, rode o workflow outra vez e reinstale o APK.

## Supabase

No provider Google do Supabase, mantenha o provider ativado e a configuração Web já usada pelo site. O site continua com `signInWithOAuth`; só o app Android usa `signInWithIdToken` como fluxo primário.

## Fallback

Se o módulo nativo falhar (por exemplo `DEVELOPER_ERROR`, Play Services antigo ou configuração incompleta), o app mostra um botão explícito para usar o fluxo pelo navegador. Cancelar o seletor nativo não apaga estado nem abre navegador automaticamente.
