# Estado recuperado — 26/09/2026

Este arquivo existe para que o projeto não dependa de uma conversa específica do ChatGPT.

## Backend

- Supabase project name: `Biblioteca da Tipologia`
- Project ref: `ghendeqnxybayhzhsjgz`
- API URL: `https://ghendeqnxybayhzhsjgz.supabase.co`
- Região: `sa-east-1`
- Estado observado: `ACTIVE_HEALTHY`
- Conteúdo observado: 28 livros, 3 leituras (`base_text`), 0 comentários e 0 perfis antes do primeiro login.
- Buckets: `library-files` (PDFs, privado) e `editorial-images` (imagens, privado).

### Migrações observadas

1. `20260927002708_library_schema`
2. `20260927002806_private_editorial_bucket`
3. `20260927002815_direct_pdf_uploads`
4. `20260927002825_published_editorial_access`
5. `20260927003651_authenticated_role_lookup`

### RPCs públicas existentes

- `my_role()`
- `claim_owner()`
- `list_members()`
- `remove_comment(comment_id uuid)`
- `set_member_role(target_user uuid, new_role text)`

`claim_owner()` confere no servidor a identidade Google verificada da conta proprietária antes de conceder `owner`.

## Google OAuth

Callback que deve existir no cliente Web do Google:

`https://ghendeqnxybayhzhsjgz.supabase.co/auth/v1/callback`

Redirects do Supabase:

- `https://elenaess.github.io/biblioteca-da-tipologia/`
- `bibliotecadatipologia://auth/callback`
- `http://localhost:5173/`

## Código / publicação

- GitHub desejado: `elenaess/biblioteca-da-tipologia`
- Site anterior do Work: `https://biblioteca-da-tipologia.etheeraal.chatgpt.site`
- Android package: `br.org.bibliotecadatipologia`
- URI scheme Android: `bibliotecadatipologia`

## Últimos requisitos visuais preservados

- Nome sempre `BIBLIOTECA DA TIPOLOGIA` na marca.
- Desktop: wordmark completa.
- Celular/app: símbolo.
- “Textos-base” virou `Leituras`.
- Botão Google usa símbolo SVG do Google, não a letra G.
- Animações rápidas em torno de 80–100 ms no site.
- Contas autorizadas veem lápis para editar livros, artigos e leituras.
- Footer: `Biblioteca da Tipologia` + símbolo Creative Commons + `- 2006 | Alguns direitos reservados.`
