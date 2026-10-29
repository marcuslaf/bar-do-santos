# Revisão de UI — a placa no login

Data: 2026-10-29 · Base: `0c05fea` (feat: logo do bar (placa) no login) · Revisão sem edição de código.

## 0. Método e escopo

**Visto ao vivo** (dev server `localhost:3000`, Chrome headless via Playwright, DPR 1 salvo quando indicado, tema claro e escuro):

- `/login` — matriz completa de 10 viewports × 2 temas, incluindo o **estado de erro de senha**.
- `/`, `/nova`, `/nota/[id]`, `/caixa`, `/minha-senha` — logado como `11999990002` (papel `equipe`).
- `/sem-acesso` — logado como `11999990003` (sem vínculo).

**Visto só por leitura de código**: `/equipe` (owner) — o usuário `equipe` é redirecionado para `/`, e o dono local tem senha desconhecida; não alterei senha de dono para não mexer no seu ambiente. Também só por código: estados de erro de `/nova`, modais de pagamento/cancelamento, e o formulário de convite.

**Efeito colateral assumido**: criei 3 notas de teste no Supabase local ("Mesa 3", "Dona Lúcia", "Seu Zé") para conseguir medir a lista e o detalhe. Se quiser limpar: `supabase db reset` (recria tudo) ou cancelar as três pela UI. Nenhum arquivo de código foi alterado; as variantes de layout que aparecem neste relatório foram **simuladas via DOM** no navegador (`page.evaluate`) para produzir números reais, não estimativas.

---

## 1. Veredito

**A placa não está integrada — ela está encostada.** Não é por ser vermelha: é porque o app tem uma linguagem coerente (papel quente, tinta marrom, terracota de barro, Bitter slab, superfícies chapadas com fio de 1px) e a placa entra como **objeto de outra física**: gradiente vertical embutido (`#C60F17` no topo → `#8D080E` na base), letra branca com sombra projetada, filete dourado duplo e 77% da altura sendo campo vermelho vazio. Isso é uma foto de fachada, e foto de fachada pede moldura, não flutuação. O que mais dói, medido: em 352px de largura a palavra da placa tem **25,5px de altura de caixa** enquanto o "Pedidos" logo abaixo é **34px** — ou seja, **a cor grita e o tipo sussurra**, e quem ganha a hierarquia é o nome do app, não o do bar. Pior: a identidade **troca de marca conforme o aparelho** — no celular em pé você vê a placa, no celular deitado (568×320, 667×375, 844×390) a placa desaparece e o **nome do bar some da tela de login**. No estado de erro de senha em 320×568 a placa é a diferença entre o botão "Entrar" estar dentro ou fora da dobra (`+69px` de rolagem). Ou seja: a placa hoje não é só um desalinhamento estético, ela custa altura onde altura é o recurso escasso e some onde a largura sobra.

---

## 2. Achados priorizados

Legenda de prioridade: **P0** quebra invariante contratual ou impede tarefa · **P1** degrada tarefa ou identidade no aparelho principal · **P2** polimento/consistência.

**Nenhum P0.** Não há scroll horizontal em nenhuma das 90 cargas de página medidas (`scrollWidth − innerWidth = 0` em todas). Nenhum par de texto que eu tenha medido fica abaixo de 4,5:1 (o mais apertado é a legenda de 13px: 7,50:1 no claro, 8,60:1 no escuro). Os alvos principais medem ≥44px (botão "Entrar" 52, `AccountLink` 141×44, botão de tema 44×44) e o `alt` da placa está correto.

### P1

| ID | Tela / estado | Viewport / tema | Evidência medida | Impacto no balcão | Proposta concreta |
|---|---|---|---|---|---|
| **P1-1** | `/login` com erro de senha ("Celular ou senha incorretos.") | 320×568 · claro e escuro | Sem erro: `scrollHeight − innerHeight = 0`, botão `bottom = 497,1`. Com erro: `scrollHeight 637` (**+69**), `button.bottom = 575,3` (>568), `card.bottom = 596,3`, `footer.bottom = 625,4`. Em 568×320 também estoura (+35; botão em 338). 360×640 fica +3; 375×667 e 1280×800 ficam 0. | Errar a senha é a primeira ação de quem chega; o erro aparece e empurra o "Entrar" 7px para fora da dobra em 320×568 (45 dos 52px visíveis) e 18px em 568×320. O usuário precisa rolar para tentar de novo, com uma mão. | Remover a placa abaixo de 768px e usar o **lockup compacto** (marca 40px + "Bar do Santos" Bitter 24 + legenda 13). Simulado em 320×568 no estado de erro: bloco de marca **46,3px** (hoje 114), `scrollHeight 569` (+1, sobra do rodapé), **botão em 507,3 dentro da dobra**. Ver §3, Direção B. |
| **P1-2** | `/login` ≥640px (duas colunas) | 640×800, 768×1024, 1024×768, 1280×800, 1920×1080 · ambos os temas | Altura de caixa da palavra na placa: **58px em 800px de arte** → 12,8px em 176 (640), 16,2px em 224 (768), **25,5px em 352** (≥1024). "Pedidos" medido: `24px` em 640, `30px` em 768, **`34px`** em ≥1024 (`login/page.tsx:87`). | Duas assinaturas serifadas empilhadas, com o nome do **app** maior que o nome do **bar**. Para quem usa o app todo dia, "Pedidos" já é o nome da ferramenta; a placa vira um adesivo decorativo acima dela. | Placa passa a ser o único serifado grande da coluna. Rebaixar "Pedidos" a etiqueta, sem Bitter display: `<p className="mt-3 text-[13px] leading-tight text-ink-soft">Pedidos · Caderno da equipe</p>`; remover o bloco `div.hidden … sm:flex` de `login/page.tsx:84-94` no tier alto. Custo em altura: **0px** (a coluna tem 181px em 1280 hoje; com mat + etiqueta fica 163). |
| **P1-3** | `/login` celular em pé | 320×568, 360×640, 375×667 · ambos | Placa `288×90` = **25.920px² = 14,3% da dobra** (181.760px²). O botão "Entrar" é `288×52,1` = 15.005px² (8,2%): **a placa tem 1,73× a área da ação primária**. Bloco de marca inteiro `20→134 = 114px` = 20,1% da altura. Arte: **77% da altura é campo vermelho** (96px acima + 96px abaixo da letra, em 250). | O primeiro olhar de quem abre o app no balcão vai para uma superfície vermelha chapada, não para o campo de celular. Em um aparelho de uso repetido, isso é atrito de atenção diário. | Mesmo lockup da P1-1: **−67,7px** de altura (114 → 46,3) e zero bytes de imagem no celular. Se a placa for mantida, o mínimo é **240px de largura** (75px de altura, −15) e remover a legenda (−24) — mas isso ainda deixa o estado de erro **+30px** fora da dobra: não resolve. |
| **P1-4** | `/login` tema escuro | 1280×800, 1920×1080, 320×568 · dark | A placa não tem variante escura. Silhueta contra o fundo: topo `#C60F17` × `--paper` escuro `#19120E` = **3,07:1**; base `#8D080E` × paper = **1,92:1**. O filete dourado × paper = **12,82:1**. No claro, o mesmo par vai de **5,55:1** (topo) a **8,90:1** (base). | No escuro a placa deixa de ser objeto e vira "contorno dourado flutuante com uma mancha vermelha por dentro". À noite, no balcão, é exatamente onde o app é usado. | Não criar variante dark da arte e não aplicar `filter`/`brightness` (altera cor de marca). Enquadrar: mat de papel com o mesmo recipe dos cards — `rounded-xl border border-line bg-surface p-3 shadow-card` — e a placa **quadrada** dentro (`rounded-none`). O mat define a borda do objeto nos dois temas. Custo: **+24px** de altura, só onde sobra altura (≥768). |

### P2

| ID | Tela / estado | Viewport / tema | Evidência | Impacto | Proposta concreta |
|---|---|---|---|---|---|
| **P2-1** | `BrandSign` | todos | `rounded-[4px]` em arte de cantos retos: em DPR 3 o raio **corta o canto do filete dourado** (o filete some no arco e sobra vermelho no canto) — `brand-sign.tsx:30`. | Detalhe de acabamento: o objeto parece mal recortado justamente no canto onde a arte é mais caprichada. | `rounded-none` na imagem; o raio passa a viver no mat (`rounded-xl p-3`, padding ≥ raio). Custo: 0px. |
| **P2-2** | `BrandSign` / `next/image` | DPR 3 em qualquer viewport | Requisições medidas em 320×568: DPR1 e DPR2 → `w=640` (5.844 bytes); **DPR3 → `w=1080`** (7.084 bytes) gerado a partir de um arquivo de **800px** = upscale de 1,35×. O fonte em `docs/brand/logo-bar-do-santos-source.png` já é **1600×500**. `sizes` declara `100vw` abaixo de 640 enquanto a imagem renderiza `100vw − 32px` (`brand-sign.tsx:29`) — com os buckets atuais (640/1080) isso não muda a escolha do arquivo, mas fica errado no dia em que a largura da placa mudar. | Em celular DPR 3 (a maioria dos Androids atuais) a placa é o único elemento raster da tela e chega levemente mole, ao lado de Bitter e do notebook vetoriais perfeitamente nítidos. | Publicar o asset em 1600×500 (o fonte existe; sobe bytes só no `w=1080` do DPR 3) e acertar `sizes` para `(min-width:1024px) 352px, (min-width:768px) 224px, (min-width:640px) 176px, calc(100vw - 2rem)`. No celular DPR 1/2 os bytes não mudam (~6KB). |
| **P2-3** | `/login` — troca de tier | 640×481 × 640×480 · ambos | **1px de altura troca a marca inteira**: 640×481 → placa `176×55`, sem marca, card 366,1px; 640×480 → placa `display:none`, marca `36×36`, card **284,1px**. O mesmo acontece entre 667×375 (marca) e 667×376 (placa). | O usuário que gira o aparelho ou muda a janela vê outra identidade. Não quebra nada, mas não parece o mesmo produto. | Com o lockup da Direção B, o tier curto muda **ritmo** (paddings/gaps), não **marca**: em ambos os casos a assinatura é marca + "Bar do Santos". |
| **P2-4** | `/sem-acesso` e `BrandMark` no escuro | 320×568 · dark | As linhas do caderninho são `stroke="var(--brand)"` com `opacity 0.55` sobre papel quase branco. No escuro `--brand` clareia: blend `#E7B199` sobre `#FAF7F0` = **1,76:1** (no claro é `#BF8C78` = **2,71:1**). | O símbolo do app perde o desenho de "caderninho" e vira um retângulo branco com uma faixa. É o oposto da placa: lá sobra detalhe, aqui falta. | Token constante para o traço, como já se faz com `--mark-paper`: `--mark-rule: oklch(0.45 0.13 38)` só no `:root`, usado com `opacity 0.7` → **3,77:1** nos dois temas. Custo: 0px. |
| **P2-5** | `/login` — legenda | 320×568 | Legenda "Pedidos · Caderno da equipe" em **13px / 16,3px de caixa**, 8px abaixo da placa. | 13px é o menor texto da primeira dobra e carrega o nome do app inteiro. Aceitável (AA folgado), mas é o primeiro a desaparecer se a altura apertar. | Se mantiver a legenda, deixá-la como **uma** linha de 13px (`text-ink-soft`), sem o span Bitter de 15px — a hierarquia já é da placa. Custo: 0px. |
| **P2-6** | `/login` — copy | todos | "Use o acesso criado pelo dono do bar." (14/15px) e "Sem acesso? Peça ao dono para criar o seu." (13px) dizem a mesma coisa em duas alturas. | Duas frases para a mesma informação competem com o formulário em 320×568. | Copy é seu terreno: sugiro manter só a do rodapé ou só a do subtítulo. Custo: 0px (e −21px se remover o rodapé). |
| **P2-7** | `/login` desktop — vazio | 1280×800, 1920×1080 | Coluna da marca: **181px** (188,4 → 369,4) contra card de **374,1px** (188,4 → 562,5) = **193px de papel abaixo da placa**. Em 768×1024: 137 contra 366,1 = **229px**. Alinhamento pelo topo (188,4 nos dois). | Não é bug: é composição editorial com linha de topo compartilhada. O vazio incomoda mais porque a placa é um retângulo fechado, sem nada que o ancore embaixo. | **Não centralizar** (`items-center` quebraria a linha de topo, que é justamente o que faz a composição funcionar). O mat + a etiqueta de 13px já reduzem o vazio percebido. Se incomodar depois, o espaço é lugar natural para uma linha de contexto do bar — não para mais marca. |

---

## 3. Hipóteses: veredito

| # | Hipótese | Veredito | Argumento com número |
|---|---|---|---|
| 1 | Dois vermelhos brigando | **Confirmada, com correção** | Não são dois vermelhos opostos: são **a mesma família** — placa `oklch(0.508 0.201 27.3)`, `--brand` claro `oklch(0.449 0.129 38.2)`. Δhue 11°, ΔL 0.06, mas **croma 56% maior** na placa. Contraste entre os dois: **1,23:1** (claro) e **2,05:1** (escuro). É justamente essa quase-igualdade que produz o efeito "adesivo": se fosse outra cor, leria como outra camada; sendo quase a mesma, lê como erro de impressão. |
| 2 | Duas assinaturas serifadas empilhadas | **Parcial** | Verdadeira de **640px para cima**: 12,8/16,2/25,5px de caixa na placa contra 24/30/34px em "Pedidos" (medido). **Falsa em 320–639px**: ali "Pedidos" é um span de **15px** dentro de uma legenda de 13px — não é headline. A duplicação é um problema de desktop. |
| 3 | Peso da placa no celular | **Confirmada** | 90px = **15,8%** de 568 e **14,3%** da área da dobra; 1,73× a área do botão; bloco de marca = 20,1% da altura. A legenda é 13px/16,3px. E o custo aparece no erro de senha: +69px de rolagem. |
| 4 | Composição desktop com vazio grande | **Confirmada como número, não como defeito** | **193px** de vazio sob a coluna da marca em 1280 e 1920 (181 vs 374) e **229px** em 768. O topo alinhado é a decisão certa; trocar por centralização piora. Ver P2-7. |
| 5 | Placa raster num app vetorial | **Confirmada em parte** | Nitidez: em DPR3 o Next serve `w=1080` de um arquivo **800** (upscale 1,35×); o fonte de 1600 existe em `docs/brand/`. Peso: **26.121 bytes** no repo, **5.844 bytes** servidos em `w=640` e **7.084** em `w=1080` — o peso não é problema. Falta de variante escura: **é** problema, mas a solução não é uma arte dark (mudaria a marca) e sim moldura (P1-4). |
| 6 | `alt="Bar do Santos"` atrapalha | **Refutada** | O login **não tem outro lugar** com o nome do bar (o `orgs` só é legível por `authenticated` com vínculo — `20261026120000_init_schema.sql:300-308` — e `/login` não tem sessão). Remover o `alt` deixaria a tela sem nome do bar. O `h1` é "Entrar" e continua sendo o título do formulário; a ordem de leitura ("Bar do Santos" → "Pedidos" → "Entrar") é informativa, não ruído. **Manter.** Se a Direção B entrar, o `alt` continua necessário, porque o desenho proposto mostra o bar em texto e a placa só ≥768. |

---

## 4. Direção visual

Três caminhos possíveis. Todos usam só tokens, sem dependência nova, sem `filter` na arte e sem mexer na largura mínima.

### A — "Emoldurar a placa" (mantém a placa em todas as telas)

A placa vira objeto pendurado: mat de papel (`rounded-xl border border-line bg-surface p-3 shadow-card`) com a arte quadrada dentro, e "Pedidos" rebaixado a etiqueta de 13px.

- **Custo**: mobile **0px** (mantém 90px) ou **−39px** se reduzir a placa para 240 e cortar a legenda; desktop **+24px** (mat) e **−18px** no total da coluna (181 → 163).
- **Ganha**: hierarquia única, silhueta definida nos dois temas, cara de "placa na parede".
- **Perde**: **não resolve o erro de senha em 320×568** (o cálculo não fecha: precisa cortar 69px e a placa mais a legenda dão 39px) e mantém a placa como o maior objeto da primeira dobra num app de uso repetido.
- **Esforço**: S (30–45 min).

### B — "Assinatura vetorial no celular, placa onde há largura" — **recomendada**

Abaixo de 768px de largura — e em qualquer largura quando a altura for ≤ 480px — a marca do app passa a ser o **caderninho + "Bar do Santos" em Bitter** + legenda de 13px, o mesmo par nome/subtítulo que o header já usa (`account-link.tsx:58-62`). A placa só existe a partir de 768px de largura com altura > 480px, emoldurada (mat de A) e com etiqueta de 13px abaixo.

```
< 768px (qualquer altura)        ≥ 768px e altura > 480px
[marca 40] Bar do Santos 24      ┌───────────────┐
           Pedidos · Caderno     │   [ placa ]   │  ← mat de papel
                                 └───────────────┘
                                 Pedidos · Caderno da equipe (13px)
```

- **Custo em altura**: mobile **−67,7px** (114 → 46,3, medido); tier curto (≤480px) **0px** (marca 36 continua, trocando "Pedidos" 24 por "Bar do Santos" 20 — devolve o nome do bar no celular deitado); desktop **−18px**.
- **Custo em bytes**: no máximo **−6KB** no celular, e só se a placa deixar de ser renderizada (ou perder o `priority`) abaixo de 768: com `priority` no DOM, o `<link rel=preload>` continua baixando o arquivo mesmo com a placa escondida por CSS. Sem preload, a imagem sai do caminho crítico e o LCP no telefone passa a ser texto (hoje o LCP é `IMG[alt="Bar do Santos"]`, 228–348ms local).
- **Ganha**: corrige P1-1 (erro de senha volta para a dobra), P1-2 (uma só assinatura serifada), P1-3 (área da marca cai 60%), P2-3 (o tier curto muda ritmo, não marca) e o **nome do bar volta a aparecer no celular deitado**, onde hoje não aparece em lugar nenhum.
- **Perde**: o celular em pé deixa de mostrar o vermelho da fachada — que é justamente o que a logo trouxe. É a troca central e precisa da sua bênção. A placa continua viva em tablet/desktop e pode, se quiser, aparecer também em `/equipe`.
- **Esforço**: M (2–3 h, incluindo remedir a matriz).

### C — "Fachada de verdade" (banner full-bleed no topo)

A placa encosta nas bordas, sem raio e sem gutter, como toldo; o conteúdo começa abaixo.

- **Custo**: no celular a faixa fica 320×100 e **não economiza altura** (ganha área, não reduz); no desktop é incompatível com a composição de duas colunas (viraria uma faixa no topo da página e a coluna esquerda ficaria vazia).
- **Ganha**: o objeto físico fica evidente.
- **Perde**: vira chrome de página, não marca; e ignora o `max-w-5xl` que organiza header, conteúdo e login.
- **Esforço**: L. **Não recomendo.**

### Recomendação

**B**, com o tratamento de **A** aplicado à placa a partir de 768px. A razão é aritmética, não gosto: no aparelho principal (320×568) a placa ocupa 90px e o erro de senha precisa de 69px — **não existe arranjo que caiba os dois**; em toda tela onde há largura sobrando (≥768) a placa tem espaço e o mat resolve a silhueta no escuro. B também elimina a incoerência mais visível hoje: o login mostra **duas marcas diferentes** dependendo da orientação, e no celular deitado o nome do bar simplesmente desaparece.

Se preferir manter o vermelho no celular, faça **A** agora (30 min) e aceite o overflow do estado de erro até a próxima passada — mas registre que a decisão deixa um P1 aberto.

---

## 5. O que NÃO mexer

1. **Tokens de cor e a paleta.** `--brand` terracota + papel quente + tinta marrom funcionam, estão medidos e o app inteiro é coerente. Não criar `--brand-red`, não "harmonizar" a placa com o terracota (viraria um vermelho lavado) e não usar o vermelho da placa como cor de UI — branco sobre ele até passa (6,43:1), mas `--ink` sobre ele não.
2. **Os tiers de altura do login (`max-height: 30rem` / `22rem`).** Medidos: 480×320, 568×320, 667×375 e 844×390 têm o "Entrar" dentro da dobra (`bottom` 297,5 / 297,5 / 305 / 312,5) com zero scroll. É a melhor parte do arquivo. Só a **marca** dentro deles deve mudar (Direção B), não o ritmo.
3. **A composição de duas colunas com alinhamento pelo topo** (`login/page.tsx:51`). 640→1920 sem overflow; card e marca começam na mesma linha (188,4 em 1280). Centralizar verticalmente piora.
4. **O `alt="Bar do Santos"`.** É a única fonte do nome do bar no login (o `orgs` só é legível por `authenticated` com vínculo) e a ordem de leitura com o `h1` "Entrar" está correta. Sobre o `priority`: hoje ele é correto, porque a placa é o LCP no celular. Se a Direção B entrar, ele deve sair junto — `priority` injeta `<link rel=preload>` e o arquivo continua sendo baixado mesmo com a placa escondida por CSS; sem preload (ou sem renderizar a placa abaixo de 768) a imagem sai do caminho crítico.
5. **`BrandMark` como símbolo do app** (PWA, `/sem-acesso`, tiers curtos). O caderninho é o que sobrevive a 16px; a placa não. Não trocar um pelo outro.
6. **O header** (`(app)/layout.tsx:50-70`): `AccountLink` 141×44 em todos os viewports, tema e "Sair" couberam em 320 sem menu. Não colocar a placa no header — não há largura e o bloco de identidade já é o link da conta.
7. **O botão de tema dentro do card do login.** Não acrescenta altura em nenhum tier (a linha do título já é mais alta que 44px).
8. **Bitter + IBM Plex Sans.** Não introduzir uma terceira família para "casar" com a placa: a placa é objeto, não tipografia de UI.
9. **Bottom nav, FAB, cards do caixa, tipografia de status.** Nada neles depende da logo, e estão consistentes nas medições (zero overflow horizontal em todas as telas).

---

## 6. Esforço e ordem

| Ordem | Item | Esforço | Por quê nessa ordem |
|---|---|---|---|
| 1 | P2-1 `rounded-none` na placa (raio no mat) | **S** · 5 min | Zero risco, corrige um defeito visível em DPR 3 e é pré-requisito do mat. |
| 2 | P2-2 asset em 1600 + `sizes` | **S** · 20 min | Nitidez em DPR 3 e `sizes` correto antes de qualquer mudança de largura (senão medimos no escuro). |
| 3 | P1-2 etiqueta de 13px + mat (P1-4) em ≥768 | **S** · 40 min | Resolve a hierarquia duplicada e a silhueta no escuro só com classes, sem tocar em estrutura. |
| 4 | P1-1 + P1-3 + P2-3 — `BrandLockup` e corte da placa abaixo de 768 | **M** · 2–3 h | É a mudança estrutural; depende de 1–3 e exige remedir a matriz inteira (10 viewports × 2 temas + estado de erro). |
| 5 | P2-4 `--mark-rule` no `BrandMark` | **S** · 30 min | Independente; entra quando a marca volta a ser o centro do celular. |
| 6 | P2-5 legenda / P2-6 copy | **S** · dono | Copy é seu terreno; eu só sinalizo a duplicação. |
| 7 | P2-7 vazio no desktop | — | Não fazer. Registrado para não voltar à mesa. |
| — | Direção C (fachada) | **L** | Só se quiser explorar; não recomendo. |

Total estimado: **4–5 h** para chegar em "zero P1", incluindo a remedição.

---

## Anexo A — Matriz medida

### A.1 `/login` sem erro (claro e escuro idênticos em geometria)

`placa` = `getBoundingClientRect()` do `<img>`; `card`/`btn`/`footer` idem; valores em px CSS; DPR 1.

| Viewport | placa (w×h @ y) | scrollW−innerW | scrollH−innerH | card.bottom | btn.bottom | btn na dobra | footer.bottom |
|---|---|---|---|---|---|---|---|
| 320×568 | 288×90 @ 20,8 | 0 | 0 | 518,1 | 497,1 | sim | 547,2 |
| 360×640 | 328×102,5 @ 42,6 | 0 | 0 | 552,3 | 531,3 | sim | 597,4 |
| 375×667 | 343×107,2 @ 63,3 | 0 | 0 | 558,5 | 537,5 | sim | 603,7 |
| 480×320 | — (tier curto) | 0 | 0 | 306,5 | 297,5 | sim | oculto |
| 568×320 | — (tier curto) | 0 | 0 | 306,5 | 297,5 | sim | oculto |
| 667×375 | — (tier curto) | 0 | 0 | 316,0 | 305,0 | sim | 343,1 |
| 844×390 | — (tier curto) | 0 | 0 | 323,5 | 312,5 | sim | 350,6 |
| 768×1024 | 224×70 @ 304,4 | 0 | 0 | 670,5 | 645,5 | sim | 719,6 |
| 1280×800 | 352×110 @ 188,4 | 0 | 0 | 562,5 | 533,5 | sim | 611,6 |
| 1920×1080 | 352×110 @ 328,4 | 0 | 0 | 702,5 | 673,5 | sim | 751,6 |

Extras medidos fora da matriz: 640×800 → placa `176×55 @ 192,4`, card 366,1, sem overflow. 1024×768 → placa `352×110 @ 172,4`, card 374,1. 320×481 → placa 288×90, **`scrollHeight 550` (+69)** — o degrau de 1px do `min-height: 30.01rem` já produz rolagem antes do erro de senha.

### A.2 `/login` com erro de senha

| Viewport | scrollH−innerH | btn.bottom | card.bottom | erro (y..bottom) |
|---|---|---|---|---|
| 320×568 | **+69** (637) | **575,3** | 596,3 | 253,3..324,3 (71px, 2 linhas) |
| 360×640 | +3 (643) | 565,3 | 586,3 | 265,8..314,3 |
| 375×667 | 0 | 569,8 | 590,8 | 270,3..318,8 |
| 568×320 | **+35** (355) | **338** | 347 | 97..135 |
| 667×375 | 0 | 328 | 339 | 87..125 |
| 1280×800 | 0 | 565,8 | 594,8 | 266,3..314,8 |

### A.3 Telas autenticadas (papel `equipe`)

Header medido 57px (h-14) e 49px em altura ≤ 480; `AccountLink` **141×44** em todos os viewports.

| Rota | 320×568 | 568×320 | 667×375 | 844×390 | 1280×800 |
|---|---|---|---|---|---|
| `/` (3 notas) | +332 | +544 | +343 | +256 | 0 |
| `/nova` | 0 (Salvar na dobra) | +184 (Salvar na dobra) | 0 | 0 | 0 |
| `/nota/[id]` | +41 | +135 | 0 | 0 | 0 |
| `/caixa` | +445 | +636 | +581 | +242 | 0 |
| `/minha-senha` | +27 | 0 | 0 | 0 | 0 |
| `/sem-acesso` | +79 | — | — | — | — |

Nenhum `scrollWidth − innerWidth > 0` em nenhuma das 90 cargas medidas (login e lista: 10 viewports × 2 temas; `/nova`, `/nota`, `/caixa`, `/equipe`, `/minha-senha`: 5 viewports × 2 temas). As rolagens verticais acima são de conteúdo (listas, caixa com 3 cartões) e não de layout.

---

## Anexo B — Contraste calculado

Fórmula WCAG sobre sRGB medido do PNG e dos tokens resolvidos em runtime (`oklch → sRGB` via canvas).

| Par | Claro | Escuro |
|---|---|---|
| Branco da placa sobre o vermelho central `#BE0E16` | **6,43:1** (passa AA) | idem (arte fixa) |
| Branco sobre a borda `#AA0C13` | 7,58:1 | idem |
| Filete dourado `#FFD23E` sobre o vermelho | 4,45:1 (decorativo) | idem |
| Placa (topo `#C60F17`) × `--paper` | 5,55:1 | **3,07:1** |
| Placa (base `#8D080E`) × `--paper` | 8,90:1 | **1,92:1** |
| Filete dourado × `--paper` | — | **12,82:1** |
| Placa × `--brand` (comparação de família) | **1,23:1** | 2,05:1 |
| `--brand` × `--paper` | 7,29:1 | 5,91:1 |
| Texto da legenda (`--ink-soft` 13px) × `--paper` | 7,50:1 | 8,60:1 |

OKLCH: placa `oklch(0.508 0.201 27.3)` · `--brand` claro `oklch(0.449 0.129 38.2)` · `--brand` escuro `oklch(0.671 0.130 42.1)`.

Proposta de token para o caderninho (P2-4): `--mark-rule: oklch(0.45 0.13 38)` constante nos dois temas, traço a `opacity 0.7` → **3,77:1** sobre `--mark-paper` (hoje 2,71:1 no claro e 1,76:1 no escuro).

---

## Anexo C — O que ficou sem validar

- **`/equipe` (owner) e o formulário de convite**: só leitura de código. Não abri a tela com papel `owner` para não alterar a senha do dono local.
- **`/nova` em erro de servidor** e modais de pagamento/cancelamento: não exercitados.
- **DPR real de celular**: as medições foram a DPR 1 (CSS px); o teste de nitidez foi feito a DPR 3 isoladamente (`placa-dpr3.png`).
- **Safari/iOS**: não medido. O `env(safe-area-inset-*)` e o `100dvh` estão no código, mas a matriz foi toda em Chrome.
- **Teclado virtual aberto**: não simulado. Se o navegador reduzir o viewport de layout ao abrir o teclado (comportamento varia por plataforma), o tier curto entra em cena e a marca troca durante a digitação — vale um teste em aparelho real antes de fechar a Direção B.

## Artefatos da revisão

Screenshots em `.playwright-mcp/` (não versionado): `login-{light,dark}-*.png`, `login-erro-320x568.png`, `login-erro-375x667.png`, `placa-dpr1.png`, `placa-dpr3.png`, `sim-lockup-320x568.png`, `sim-mat-*.png`, `app-{lista,nova,nota,caixa}-*.png`, `sem-acesso-*.png`.
