# Biblioteca da Tipologia — proposta de arquitetura e experiência

Data: 25 de setembro de 2026  
Estado: proposta para revisão; site, aplicativo, repositório e serviços ainda não criados.

## 1. Objetivo e escopo solicitado

Criar uma biblioteca de tipologia com site em React e aplicativo em React Native, código no GitHub de Elena, perfis por login Google, livros em PDF hospedados no Google Drive, artigos, textos-base e comentários em livros e publicações.

A conta `ehrenren629@gmail.com` será a proprietária. Terá todos os poderes editoriais e poderá conceder ou revogar a administração de outras contas. Administradores poderão editar o acervo, criar e publicar artigos e textos-base e remover comentários de outras pessoas.

O visual usará a logo da árvore enviada como terceira imagem, tons terrosos e organização por capas, inspirada nas duas referências de biblioteca. O aplicativo terá telas e navegação em componentes nativos.

**Interpretação a confirmar:** o acervo publicado será público; o painel de gestão será privado. Entrar com Google será obrigatório para comentar e acessar a própria conta. Se a intenção for uma biblioteca inteira fechada, mudar essa regra antes da implementação, incluindo a entrega dos PDFs.

## 2. O que foi verificado

- Conta GitHub conectada: `elenaess`. A listagem do conector retornou zero repositórios acessíveis; isso não prova que a conta não tenha repositórios.
- Os recursos GitHub disponíveis nesta sessão permitem consultar e escrever arquivos em repositórios acessíveis, mas não oferecem criação de um repositório. Será necessário criar ou disponibilizar um repositório para conectar o código.
- As três imagens estão disponíveis no ambiente; a marca é uma árvore branca integrada ao contorno de um livro sobre fundo escuro.
- Pasta de livros: https://drive.google.com/drive/folders/1v9LtYDdRGXkwtMTrIQnOigsE0AG9vH0m
- Pasta de escritos: https://drive.google.com/drive/folders/1MH7nrZ2Fs4FwlNbE4MveNccDE7quWnva
- A listagem retornou 28 PDFs: 25 na pasta Eneagrama, 2 em Psicosofia e 1 em Rhetorics.
- Há 3 documentos Google nativos na pasta de escritos: `jung.txt`, `socionics.txt` e `eneagrama.txt`. A extensão no título não corresponde ao formato real.
- Este levantamento leu metadados, não o conteúdo integral dos livros ou textos. Títulos, autores, traduções e classificação definitiva exigem revisão editorial.
- Os metadados indicam compartilhamento, mas não comprovam acesso anônimo a cada PDF. Abertura pública e incorporação serão verificadas antes de publicar.
- Há arquivos que parecem pertencer a outros temas dentro da pasta Eneagrama. A localização no Drive será uma pista de importação, nunca uma classificação irreversível.

## 3. Arquiteturas consideradas

| Opção | Pontos favoráveis | Custo de implementação e manutenção |
| --- | --- | --- |
| React + React Native/Expo + Supabase — recomendada | Uma base de contas e dados; relações entre livros, temas, pessoas e comentários; permissões no banco | Configurar projeto Supabase, OAuth Google e políticas de acesso |
| React + React Native/Expo + Firebase | Integração de autenticação e sincronização entre clientes | Modelo documental exige cuidado em relações e regras; serviços têm cotas próprias |
| React + React Native + API própria/PostgreSQL | Controle completo sobre API, armazenamento e autenticação | Mais infraestrutura, atualizações, operação e configuração |

A recomendação é um único repositório com dois aplicativos e código compartilhado. O site usa React, TypeScript e Vite; o app usa React Native, TypeScript e Expo. Supabase fornece autenticação, PostgreSQL e armazenamento de capas. O Drive continua sendo a fonte dos PDFs.

O GitHub guarda o código. GitHub Pages é uma opção para hospedar a parte estática do site; não hospeda o banco ou funções privilegiadas. A escolha do local de publicação e da visibilidade do repositório será confirmada antes de publicar. Não há contratação ou promessa de custo zero neste desenho.

### Organização prevista

| Diretório | Responsabilidade |
| --- | --- |
| `apps/web` | Acervo, detalhes, leitor, artigos, conta e painel administrativo em React |
| `apps/mobile` | Navegação nativa, acervo, artigos, conta, comentários e tela do leitor |
| `packages/domain` | Tipos, taxonomia, validações e contratos comuns |
| `packages/data` | Consultas, autenticação e operações compartilhadas |
| `packages/design-tokens` | Cores, espaçamento, tipografia e duração de animações |
| `supabase/migrations` | Estrutura do banco, índices, funções e políticas de autorização |
| `supabase/functions` | Operações privilegiadas que não podem ser executadas pelo cliente |
| `docs` | Configuração, publicação, importação e operação |

Os aplicativos compartilham dados e regras, mas cada um tem sua interface adequada à plataforma.

## 4. Navegação e visual

### Identidade

- Fundo creme `#F3EBDD`; superfície de leitura `#FFFCF5`.
- Texto e cabeçalhos em marrom `#30251F`.
- Ação principal em terracota `#9A4934`.
- Destaques complementares em verde-oliva `#566145`.
- Bordas em areia `#D8C6AF`; verificar contraste real em todos os estados.
- Títulos com fonte serifada; controles e textos com fonte sem serifa.
- Capas em proporção aproximada 2:3; espaçamento consistente, cantos discretos, superfícies sólidas.
- A logo fornecida será reutilizada como imagem. Qualquer redesenho ou recoloração não está incluído nesta proposta.
- Texto de corpo de pelo menos 16 px, foco visível e áreas de toque adequadas.
- Animações curtas de navegação e feedback, respeitando redução de movimento.

### Telas

| Área | Conteúdo e ações |
| --- | --- |
| Biblioteca | Busca por título, autor e tradutor; filtro por tema/escola; grade de capas |
| Livro | Capa, título, autores, tradutores, edição, idioma, datas, descrição, temas, ação Ler e comentários |
| Leitor | PDF dentro da plataforma, identificação do livro, voltar e alternativa Abrir no Drive |
| Artigos | Lista de publicações; detalhes com autoria, data, corpo e comentários |
| Textos-base | Navegação por tema, texto adaptável à tela e referência à fonte |
| Conta | Entrar/sair com Google, nome de exibição e foto; e-mail fora do perfil público |
| Administração | Acervo, publicações, moderação; gestão de administradores visível só para a proprietária |

No celular: Biblioteca, Artigos, Textos-base e Conta na navegação inferior. No site: navegação superior ou lateral conforme a largura. Busca e acervo aparecem no primeiro trecho da página.

O painel administrativo será uma área web responsiva. No aplicativo, as contas autorizadas terão acesso ao painel por um link; não se duplicará todo o editor administrativo em telas nativas nesta primeira entrega.

Não entram nesta versão: chat privado, testes de tipagem, recomendações por IA, assinaturas, pagamentos, rede social de posts livres, avaliação por estrelas ou leitura offline.

## 5. Temas

| Tema | Estrutura |
| --- | --- |
| MBTI | Categoria própria |
| Eneagrama | Categoria própria |
| Protoanálise | Categoria própria, separada de Eneagrama |
| Socionics | Escola geral e filtros SHS, SSS, SCS e SWS |
| Psicologia Junguiana | Categoria própria |
| Neurotype | Categoria própria |
| Psicossofia | Nome público exatamente como solicitado |

Livros e publicações poderão ter mais de um tema. Em Socionics, uma ou mais escolas poderão ser indicadas quando houver base editorial para isso. Os rótulos das escolas não serão expandidos por suposição.

A pasta Rhetorics será preservada como informação de origem; seu PDF ficará para classificação editorial antes de entrar no catálogo publicado. Não será criada automaticamente uma oitava categoria.

## 6. Contas e autorização

| Ação | Visitante | Membro | Administrador | Proprietária |
| --- | --- | --- | --- | --- |
| Consultar conteúdo publicado | Sim* | Sim | Sim | Sim |
| Comentar livro/publicação | Não | Sim | Sim | Sim |
| Editar perfil próprio | Não | Sim | Sim | Sim |
| Remover comentário próprio | Não | Sim | Sim | Sim |
| Remover comentário de outra pessoa | Não | Não | Sim | Sim |
| Editar metadados e capa de livro | Não | Não | Sim | Sim |
| Criar/editar/publicar conteúdo editorial | Não | Não | Sim | Sim |
| Acessar rascunhos e moderação | Não | Não | Sim | Sim |
| Conceder/revogar administração | Não | Não | Não | Sim |

*Leitura pública é a interpretação proposta e depende da confirmação da visibilidade do acervo e das permissões dos arquivos.

### Proteção da proprietária

A identidade de proprietária será vinculada ao identificador estável da conta autenticada pelo Google, após conferir no servidor o e-mail verificado `ehrenren629@gmail.com`. O e-mail digitado em um formulário ou dados editáveis do perfil não podem conceder privilégios.

A configuração inicial será executada por uma operação administrativa confiável. Não existirá uma rota pública que torne proprietária a primeira pessoa a entrar. Outros administradores não poderão remover, substituir ou rebaixar a proprietária.

A proprietária seleciona uma conta existente e confirma sua promoção ou remoção. Essa operação altera uma tabela privada de papéis e registra quem fez a mudança. Nenhuma mensagem ou convite será enviado automaticamente.

### Aplicação das regras

- Policies de Row Level Security no banco e nas capas, além de validação das funções de servidor.
- Papéis administrativos em tabela protegida, não em campos de perfil editáveis pelo cliente.
- A interface ocultar um botão não é uma medida suficiente de segurança.
- Consultas públicas retornam somente conteúdo publicado e campos públicos.
- Escritas de comentários autenticadas, com validação do alvo, tamanho e limites de frequência.
- Não conceder chaves de serviço ao navegador ou ao app.
- Ao remover um administrador, suas próximas operações privilegiadas devem ser rejeitadas, sem depender apenas de permissões antigas no cliente.

## 7. Acervo e PDFs do Drive

### Ficha de livro

Campos editáveis: título, subtítulo opcional, autores, tradutores, data/ano de publicação original, data/ano da tradução, edição, idioma, descrição, temas, escolas, capa e referência do PDF no Drive.

A data de cadastro no site será automática e independente da data do livro. Datas poderão ter precisão de ano, mês ou dia para evitar inventar datas completas. Autor ou tradutor desconhecido permanece vazio com indicação apropriada.

A informação importada da fonte e os campos editados no catálogo serão armazenados separadamente. Uma atualização do Drive não substituirá capas, autoria, traduções ou datas corrigidas manualmente.

### Importação inicial

1. Usar os IDs de arquivos já encontrados, sem copiar os PDFs para o GitHub.
2. Criar registros de revisão com título provisório derivado do nome do arquivo.
3. Validar arquivo, tipo, abertura e eventual chave de recurso do Drive.
4. Revisar categoria, metadados e disponibilidade.
5. Publicar os itens aprovados no catálogo.

Administradores poderão cadastrar outros livros com referência a um arquivo do Drive. Atualização automática periódica de pastas não faz parte da primeira versão.

### Leitor

O desenho inicial usa a visualização do Drive incorporada em uma tela da biblioteca: iframe no site e WebView somente na área do PDF no app. O restante do aplicativo permanece nativo.

O leitor terá carregamento, erro, retorno ao livro e alternativa para abrir a fonte. Como o conteúdo incorporado é de outro domínio, esta versão não promete sincronização de página, anotações, progresso ou personalização completa da barra interna do Drive.

O login Google da biblioteca não concede acesso aos arquivos particulares do administrador. Arquivos restritos continuam sujeitos às permissões do Drive. Nenhuma permissão das pastas será alterada durante a implementação sem autorização.

Se o acervo inteiro precisar ser privado para membros, o projeto deverá usar autorização também na entrega dos PDFs; esconder links públicos atrás de uma tela de login não torna os arquivos privados. Isso exigirá revisar esta seção antes do código.

## 8. Artigos, posts e textos-base

Artigos e posts serão conteúdo editorial criado por administradores. Ambos aceitam comentários. “Posts” não será interpretado como um feed aberto de publicações dos membros.

O editor terá título, resumo opcional, corpo, temas, escola quando aplicável, autoria, data, fonte e estado rascunho/publicado. O conteúdo deverá ser sanitizado e renderizado sem executar HTML ou scripts arbitrários.

Textos-base vindos de Google Docs serão importados como versões editoriais para leitura dentro da plataforma, com títulos e estrutura revisáveis e link da fonte. A importação não altera o documento original.

Atualizações futuras de um documento de origem geram uma revisão a conferir, nunca sobrescrevem silenciosamente a versão já editada. Não se inventarão artigos ou traduções para preencher a interface.

## 9. Comentários e moderação

- Uma conversa por livro ou publicação.
- Cada comentário mostra nome de exibição, foto e data.
- A autoria vem da sessão autenticada, nunca de um identificador enviado livremente.
- Membros podem remover os próprios comentários; administradores podem remover qualquer comentário.
- Remoções administrativas exigem confirmação e deixam registro interno de autoria da ação, alvo e data.
- O comentário removido não pode continuar disponível em consultas públicas nem por acesso direto ao seu identificador.
- Conteúdo novo deve validar o alvo publicado e limites de tamanho e frequência.

A expressão “mensagens dos outros” será atendida pela moderação dos comentários; não implica criação de mensagens privadas.

## 10. Modelo de dados previsto

| Entidade | Finalidade e relação |
| --- | --- |
| profiles | Perfil público mínimo ligado à conta de autenticação; nome e foto |
| roles | Papel protegido por usuário; membro, administrador ou proprietária |
| topics / schools | Temas e escolas permitidos |
| books | Ficha editorial, referência Drive, capa e estado de publicação |
| book_topics / book_schools | Relações de classificação |
| book_contributors | Autores e tradutores, função e ordem de exibição |
| publications | Artigos, posts e textos-base, corpo e estado editorial |
| publication_topics / publication_schools | Classificação editorial |
| comments | Autor, alvo livro ou publicação, texto, datas e estado |
| source_records | ID da origem, formato, metadados obtidos e última importação |
| moderation_log | Ações administrativas sem exposição pública |
| role_change_log | Concessão e revogação de papéis |

Regras de integridade devem impedir comentários sem alvo, mistura de dois tipos de alvo, relações inválidas e duplicação de um mesmo arquivo Drive. Capas serão arquivos reais de imagem, com validação de formato e tamanho.

## 11. Sequência proposta de entregas

1. **Fundação:** repositório, estrutura compartilhada, taxonomia, identidade visual e configuração documentada.
2. **Site e dados:** acervo real, detalhes, leitura, autenticação, artigos, textos-base e comentários.
3. **Administração:** edição de fichas/capas, publicação, moderação, proprietária e gestão de administradores.
4. **App:** telas nativas conectadas aos mesmos dados, login Google, comentários e leitor.
5. **Validação e publicação:** testes de autorização, revisão em desktop/celular, configuração dos ambientes e build Android.

Esta ordem não remove o aplicativo do escopo. Builds instaláveis e login real dependem das configurações e credenciais de assinatura/autenticação correspondentes.

## 12. Critérios de aceite

- Site responsivo e app React Native, com todos os sete temas e quatro escolas de Socionics.
- Biblioteca acessível logo na entrada, capas legíveis e logo fornecida aplicada.
- Um cadastro ou alteração administrativa aparece nos dois clientes usando o mesmo banco.
- Login Google real em web e Android; estados de erro e sessão expirada claros.
- Conta proprietária verificada e exclusivamente autorizada a administrar administradores.
- Tentativas diretas de membros e visitantes de editar livros, publicar ou elevar privilégios falham no servidor/banco.
- Administradores removem comentários e editam metadados/capas; remoção de papel revoga os poderes.
- PDFs acessíveis renderizam dentro da plataforma; restritos ou ausentes mostram uma alternativa clara.
- Textos-base são legíveis e têm fonte identificada.
- Importação preserva revisões editoriais e não duplica livros.
- Ausência de segredos no bundle, app, commits e histórico entregue.
- Validação de teclado, foco, contraste, tela estreita e texto ampliado.

Testes automáticos devem se concentrar nas permissões, integridade, importação e regras compartilhadas; testes visuais e de navegação verificam as jornadas principais.

## 13. Pendências para execução real

- Confirmar a interpretação “acervo público, painel privado”.
- Aprovar a arquitetura recomendada antes do plano de implementação.
- Criar ou disponibilizar o repositório GitHub e conceder acesso à conexão.
- Configurar um projeto Supabase e OAuth Google, com domínios, callback, identificação do app e assinatura Android.
- Verificar acesso dos PDFs para o público definido.
- Definir a hospedagem e executar o build do aplicativo após a configuração.

Essas pendências são condições de integração e publicação, não funcionalidades já concluídas. Credenciais secretas devem entrar nos ambientes apropriados e nunca ser publicadas no repositório.

## 14. Inventário inicial de fontes

As linhas abaixo preservam os nomes encontrados no Drive. Não representam fichas bibliográficas revisadas.

| Arquivo | Pasta de origem | Referência |
| --- | --- | --- |
| Caráter & Neurose (2ª Edição).pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/16wLOdxiu27gyyhG3G0Qqdz-PqebxJ7x6/view?usp=drivesdk) |
| DCNH_subtype_system.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/10FZSkSKBif_ZanShjm9uzIRrMy_dPAIT/view?usp=drivesdk) |
| opis_drayzer.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1hm5UglyGNdio6qrhBwqVzTaNTW77pM_W/view?usp=drivesdk) |
| pdfcoffee.com_a-sabedoria-do-eneagrama-pdf-free.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1Nd38KAu1uLSP9nalK4rVCxdT-je3CDm8/view?usp=drivesdk) |
| Beatrice Chestnut, The Enneagram Guide to Waking Up Find Your Path Face Your Shadow Discover Your True Self.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/15_GWfKhOs0ECTw00Rh37tqTcxrcI-g-t/view?usp=drivesdk) |
| Beatrice Chestnut, The Complete Enneagram.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1T02lq5JwHYsX133B4_bYlfZwpp1xeJje/view?usp=drivesdk) |
| Oscar Ichazo, The Enneagrams of the Divine Forms Perfect, Eternal, Unchanging Truths.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1dKvVFZ6UhvUsTF5Vd1NFajWcdZc53kO2/view?usp=drivesdk) |
| Sandra Maitri, La dimensión espiritual del eneagrama.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1fgmJ7uPz0gYchTloN32EgDdZZJKE5hbQ/view?usp=drivesdk) |
| Oscar Ichazo, The Enneagram Of Fixations.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1WO6OLsZuGgBTcWLqAp14FuBIuNoZuMdJ/view?usp=drivesdk) |
| Claudio Naranjo, Enneatypes in Psychoterapy.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1GILV5SEZve_WBaFp3UxckeH-V0guRGyL/view?usp=drivesdk) |
| Claudio Naranjo, Transformation through insight.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1fLMWumO1dcda2-t8agWwDwcmlAYSeXKO/view?usp=drivesdk) |
| Claudio Naranjo, Sanar las mentes para arreglar el mundo.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1hfZ668FWfszpHjVCbLh-bOvLfKCwyt9F/view?usp=drivesdk) |
| Claudio Naranjo, 27 personajes en busca del ser.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1k5tManAqd69tZVPk-J5aIkMSHDoFLVeK/view?usp=drivesdk) |
| Claudio Naranjo, Dramatis Personae.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/16lmeF8rM0ZHDfZ8ICW4PVZJMbUjITZI6/view?usp=drivesdk) |
| Eneatipo 7 - Golosos_ tramposos, soñadores y charlatanes.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1T7ehtpZXaBKqYrVfJZt5muF1la9NyQ3F/view?usp=drivesdk) |
| Eneatipo 8 - Lujuria_ Sádicos, Posesivos y Justicieros.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1w8ttAKFbobK3b3NX6YfJd6Y6UDQiV4r0/view?usp=drivesdk) |
| Eneatipo 9 - La pereza psicoespiritual.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/141radlUuPSpbtbahPjI6lSBMhReHcB5J/view?usp=drivesdk) |
| Eneatipo 5 - Avaricia_ Mezquinos, arrogantes e indiferentes.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1J7lFVT2vLlx9r9t05bO-on9v-jU5pBEO/view?usp=drivesdk) |
| Eneatipo 3 - Vanidad.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1vH_tvFrGFq83rGA3rrDM1rdOUhFeHhE-/view?usp=drivesdk) |
| Entre Personalidades e Neuroses_ Um estudo da personalidade através do Eneagrama Clínico.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1ecv8xlL1hYiHwS73HLwUggrpsI4zYq7I/view?usp=drivesdk) |
| E3.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1ccXtOoNdjF-GrzvCv59PYagW6ZvGjJ8y/view?usp=drivesdk) |
| ꒰ 𝐄𝟐_ 𝐎𝐫𝐠𝐮𝐥𝐥𝐨 –.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1lPXaBsYf6r8_oCyM0hDHO2wJ6-20cvUH/view?usp=drivesdk) |
| ﹙1﹚Wrath — Standalone ～ ✦ (1).pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1lQfFazGdpjZXYCOFer3hYUzk0UREyAVJ/view?usp=drivesdk) |
| psicoenea.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1eYgYzk17d3ATywfRk9X3RLydkbfU-JSn/view?usp=drivesdk) |
| ajudaenea.pdf | Eneagrama (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1zluN7hiF8eyNJaP30Bzq4Q5wE8q4S8ae/view?usp=drivesdk) |
| The_Syntax_of_Love.pdf | Psicosofia (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1fylmuof8w6r0XFosqaJ02bYw--Kq8-Xo/view?usp=drivesdk) |
| attitudinalpsyche.pdf | Psicosofia (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/11gAFxune3-QRXeC_IszDC1IuSAG_pOQ1/view?usp=drivesdk) |
| Typologyless - Um Compilado de Retorística.pdf | Rhetorics (pasta de origem) | [Abrir fonte](https://drive.google.com/file/d/1qHkrBEFH4YSKKqJUe8Iv2KFP5tX00oie/view?usp=drivesdk) |
| jung.txt | Textos-base | [Abrir fonte](https://docs.google.com/document/d/1b6u9iQifam8Cg-P06fI04IfY2pny81FM6qg_lcWTDYc/edit?usp=drivesdk) |
| socionics.txt | Textos-base | [Abrir fonte](https://docs.google.com/document/d/1yxdsy3qJkOWg8MnRpfexSk5AVN6dj-ZDKz4PpxTbL9o/edit?usp=drivesdk) |
| eneagrama.txt | Textos-base | [Abrir fonte](https://docs.google.com/document/d/1NIj90GTzyi09JrV9yVXQ-i2qfSNn6M37lPFU7RwAZFs/edit?usp=drivesdk) |

## 15. Documentação técnica consultada

Consultada em 25 de setembro de 2026.

- [Supabase: login com Google](https://supabase.com/docs/guides/auth/social-login/auth-google) — suporte web/nativo e configuração de OAuth.
- [Supabase: Expo React Native](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) — integração dos clientes.
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — políticas no banco e limites de metadados editáveis.
- [Supabase: API keys](https://supabase.com/docs/guides/getting-started/api-keys) — diferença entre chaves públicas e privilegiadas.
- [GitHub: GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) — hospedagem estática e disponibilidade.
- [Google Drive: compartilhamento](https://developers.google.com/workspace/drive/api/guides/manage-sharing) — permissões por arquivo e pasta.
- [Google Drive: chaves de recurso](https://developers.google.com/workspace/drive/api/guides/resource-keys) — acesso a arquivos compartilhados por link.

