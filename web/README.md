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

## Regras

- Você começa com 3 vidas (5 no fácil, 2 no difícil). Perde uma quando é mordido, atingido por
  cuspe ou quando um zumbi passa por você.
- **Caixas** descem rolando: armas (triplo, metralhadora, laser, bazuca, lança-chamas, raio),
  bombas e poderes (escudo, botas, gelo). Quando a munição acaba, o elfo volta para a pistola.
- A cada 2 fases (e depois de cada chefão) você escolhe **1 de 3 melhorias**.
- A cada 5 fases vem um **chefão** (Rei Zumbi, Carniceiro, Podre... e eles voltam mais fortes).
- A cada 10 fases o **cenário** muda: cemitério, pântano, cidade em ruínas e inferno.
- Mortes emendadas fazem **combo** (até x5 nos pontos). Matar enche a **fúria élfica**.
- **Conquistas** liberam cores novas para o elfo.

## Onde está cada coisa

- `src/regras.js`: **todos os números do jogo** (velocidades, armas, zumbis, chefões, melhorias,
  dificuldade). É o lugar para ajustar o jogo.
- `src/Jogo.js`: o jogo em si (as funções `entrada`, `processamento` e `saida`, como no original).
- `src/Titulo.js`: tela de título com a demonstração, placar e escolhas.
- `src/ConquistasCena.js` e `src/conquistas.js`: conquistas.
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
No console do navegador (modo dev) também existe `teste.comecar()`, `teste.ticks(n)` e
`teste.piloto(n)`.
