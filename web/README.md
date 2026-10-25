# Elf Kill Zombie (versão web)

Jogo de tiro no estilo dos jogos de nave antigos: os zumbis descem do topo da tela e o elfo
precisa acabar com eles antes que passem por ele. Começou como o `Meu jogo.por` (Portugol Studio)
e foi passado para JavaScript com [Phaser](https://phaser.io) e [Vite](https://vite.dev).

## Como rodar

Precisa do Node.js instalado. Dentro desta pasta:

```bash
npm install
npm run dev
```

Depois abra o endereço que aparecer no terminal (normalmente http://localhost:5173).

## Controles

- WASD ou setas: andar
- Mouse: mirar; botão esquerdo (ou espaço) atira
- Botão direito (ou Q): jogar bomba no ponto do mouse
- P ou ESC: pausa
- F: tela cheia
- M: liga e desliga o som

## Regras

- Você começa com 3 vidas (máximo 5). Perde uma quando um zumbi te morde ou passa por você.
- Zumbi morto às vezes solta um coração: pegue para ganhar vida.
- De tempos em tempos desce uma caixa: tiro triplo, metralhadora ou +3 bombas.
  Quando a munição da arma acaba, o elfo volta para a pistola.
- A cada 12 zumbis mortos sobe de nível: vêm mais zumbis, mais rápidos e mais resistentes.

## Onde está cada coisa

- `src/Jogo.js`: o jogo (as funções `entrada`, `processamento` e `saida`, como no original).
  As constantes no topo (velocidades, armas, chances) são o lugar para ajustar a dificuldade.
- `src/Titulo.js`: tela de título
- `src/Carregar.js`: carrega as imagens
- `src/tela.js`: ajuste da tela cheia, textos e recorde
- `public/assets/imagens/`: as imagens do jogo
- `public/assets/sons/`: os efeitos sonoros (WAV); dá para trocar por outro arquivo com o mesmo nome

`npm run build` gera a pasta `dist/` com o jogo pronto para publicar em qualquer site estático.
