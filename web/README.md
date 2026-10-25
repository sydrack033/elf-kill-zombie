# Elf Kill Zombie (versão web)

Jogo de tiro no estilo dos jogos de nave antigos: os zumbis descem do topo da tela e o elfo
precisa acabar com eles antes que passem por ele. Começou como o `Meu jogo.por` (Portugol Studio)
e foi passado para JavaScript com [Phaser 4](https://phaser.io) e [Vite](https://vite.dev).

## Como rodar

Precisa do Node.js instalado. Dentro desta pasta:

```bash
npm install
npm run dev
```

Depois abra o endereço que aparecer no terminal (normalmente http://localhost:5173).

Para gerar a versão final (pasta `dist/`, pronta para publicar em qualquer site estático):

```bash
npm run build
```

A versão final pode ser **instalada como aplicativo** (no celular: "Adicionar à tela inicial") e
funciona **sem internet** depois da primeira visita.

## Controles

| Ação | Teclado e mouse | Celular | Controle (Xbox/PS) |
|---|---|---|---|
| Andar | WASD ou setas | arrastar o dedo na metade esquerda | analógico esquerdo ou direcional |
| Mirar | mouse | tocar na metade direita (sem tocar, mira sozinho) | analógico direito |
| Atirar | clique esquerdo ou espaço | automático | RT, RB ou A (ou só mirar com o analógico direito) |
| Bomba | clique direito ou Q | botão da bomba | LT, LB ou X |
| Esquiva | Shift | botão >> | B |
| Fúria élfica | E ou botão do meio | botão F | Y |
| Pausa e opções | P ou ESC | botão II | Start |
| Tela cheia | F | | |
| Som / música | M / N | | |
| Conquistas (no título) | C | troféu no canto | Y |
| Loja (no título) | L | moeda no canto | Select |
| Modo de jogo (no título) | X | setas na tela | X |
| Bestiário / história (no título) | B / H | | |
| Opções (no título) | O | "OPÇÕES" no canto | |
| Desafios do dia (no título) | D | "DESAFIOS" no canto | |
| Recomeçar (na pausa) | R | botão na pausa | |
| Sair para o menu (na pausa) | T | botão na pausa | Select |
| Jogador 2 (no computador) | setas para andar, mira e tiro automáticos | | segundo controle |

## Regras

- Você começa com 3 vidas (5 no fácil, 2 no difícil). Perde uma quando é mordido, atingido por
  cuspe ou quando um zumbi passa por você.
- **Caixas** descem rolando: armas (triplo, metralhadora, laser, bazuca, lança-chamas, raio,
  bumerangue, espingarda, arco élfico), bombas, torreta (atira sozinha por 12 segundos) e poderes (escudo, botas, gelo).
  Quando a munição acaba, o elfo volta para a pistola.
- A cada 2 fases (e depois de cada chefão) você escolhe **1 de 3 melhorias**.
- A cada 5 fases vem um **chefão**: Rei Zumbi, Carniceiro, Podre, Bruxa, Necromante e Demônio
  (depois eles voltam mais fortes e com todos os ataques). Com metade da vida eles enfurecem.
- **Zumbis**: comum, corredor, brutamontes, cuspidor, bombado (explode), fantasma (fica transparente),
  escavador (sai da terra), coveiro (lápide como escudo), gosma (se divide) e corvos em bando. Às vezes vem um de
  **elite**, dourado e mais forte, que dá moedas e uma caixa.
- A cada 10 fases o **cenário** muda: cemitério, pântano (lodo que deixa lento), cidade em ruínas
  (escombros caindo), inferno (meteoros) e Terra Gelada (granizo e neve).
- Mortes emendadas fazem **combo** (até x5 nos pontos). Matar enche a **fúria élfica**.
- **Eventos**: a **Horda** (fases 8, 13, 18...) manda uma enxurrada de zumbis e dá prêmio a quem
  sobrevive; a **Lua de Sangue** deixa uma fase com zumbis mais rápidos e pontos em dobro; o
  **Eclipse** deixa a fase escura, só com luz em volta do elfo.
- **Final**: na fase 50 vem o chefão final, O Senhor dos Mortos. Vencendo, aparece o final da
  história e dá para seguir no modo infinito.
- **Modo Chefões**: só as lutas contra chefões, com uma melhoria entre cada uma.
- **Moedas**: cada partida rende moedas (pontos, chefões, elites, hordas, desafios e as que caem dos
  zumbis). Na **loja** elas compram vantagens para o começo de todas as partidas (bombas, corações,
  triplo, fúria, ímã, melhoria, segunda chance) e chapéus para o elfo.
- **Desafios do dia**: 3 missões que mudam todo dia; cada uma vale 25 moedas.
- **2 jogadores** no mesmo computador: o segundo elfo anda com as setas (ou um controle), atira
  sozinho e usa as armas que pegar.
- **Conquistas** liberam cores novas para o elfo. O **bestiário** guarda os inimigos já vistos.

## Onde está cada coisa

- `src/regras.js`: **todos os números do jogo** (velocidades, armas, zumbis, chefões, melhorias,
  dificuldade). É o lugar para ajustar o jogo.
- `src/Jogo.js`: a cena do jogo: o começo da partida e o laço (as funções `entrada`, `processamento`
  e `saida`, como no original).
- `src/jogo/`: o resto da cena, dividido por assunto: `elfo.js`, `zumbis.js`, `chefes.js`,
  `tiros.js`, `explosoes.js`, `itens.js`, `melhorias.js`, `hud.js`, `clima.js`, `controles.js`,
  `desenho.js`, `fim.js` e `comum.js` (funções usadas por todos). Os métodos de cada arquivo são
  copiados para a cena no fim do `Jogo.js`, então dentro deles `this` é a própria cena.
- `src/Titulo.js`: tela de título com a demonstração, placar e escolhas.
- `src/ConquistasCena.js` e `src/conquistas.js`: conquistas (e as estatísticas de todas as partidas).
- `src/LojaCena.js` e `src/moedas.js`: loja e moedas.
- `src/DesafiosCena.js` e `src/desafios.js`: desafios do dia.
- `src/Bestiario.js` e `src/Historia.js`: galeria dos inimigos e a história do começo.
- `src/Carregar.js`: carrega imagens e sons (com barra de carregamento).
- `src/tela.js`: ajuste da tela cheia, textos, recorde e placar.
- `src/musica.js` e `src/opcoes.js`: música, volume e opções guardadas no navegador.
- `public/assets/imagens/`: as imagens (as do jogo original e as novas em pixel art).
- `public/assets/sons/`: músicas e efeitos, gerados por `ferramentas/gerar_sons.mjs`.

## Ferramentas de teste

Com o `npm run dev` rodando:

```bash
node ferramentas/testar.mjs --arquivo ferramentas/cenas/dificuldade.js
```

Isso abre o jogo num Chrome invisível, joga 5 partidas com o piloto automático e mostra até que
fase ele chegou. Outras cenas em `ferramentas/cenas/` testam o toque no celular (`--celular`),
o controle de videogame, os chefões, as armas e tiram fotos (`--foto arquivo.png`).

```bash
node ferramentas/testar.mjs --arquivo ferramentas/cenas/verificar.js
```

roda uma bateria de verificações das regras (tiro, mordida, escudo, bomba, melhoria, chefão,
pausa, fim de jogo...) e imprime OK ou FALHOU em cada uma.
No console do navegador (modo dev) também existe `teste.comecar()`, `teste.ticks(n)` e
`teste.piloto(n)`.
