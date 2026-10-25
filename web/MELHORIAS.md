# O que mudou durante a madrugada

Resumo do que foi feito no Elf Kill Zombie enquanto você dormia. Cada etapa virou um commit no
git (pasta `Jogo1`), então dá para ver o histórico com `git log` e voltar qualquer coisa.

## Jogo

- **Inimigos novos:** corredor (rápido), brutamontes (grandão e resistente), cuspidor (para e cospe),
  bombado (explode quando morre), fantasma (fica transparente e os tiros passam), escavador (sai da
  terra perto do elfo) e revoadas de corvos.
- **Chefões a cada 5 fases**, cada um com ataques próprios: O Rei Zumbi (cuspe em leque e chama
  ajudantes), O Carniceiro (investida em cima do elfo) e O Podre (chuva de cuspe). Do 4º em diante
  eles voltam com tudo junto. Entrada de cinema com o nome do chefão.
- **Armas:** triplo, metralhadora, laser (atravessa), bazuca (explode), lança-chamas e raio (pula de
  zumbi em zumbi). A arma aparece na mão do elfo.
- **Poderes:** escudo, botas de velocidade e gelo (congela os zumbis).
- **Melhorias** estilo "roguelite": a cada 2 fases escolha 1 de 3 (12 melhorias diferentes).
- **Esquiva** (Shift) e **fúria élfica** (E): barra que enche matando e solta um anel de fogo.
- **Combos**, DUPLO!/TRIPLO!/MASSACRE!, pontos flutuando.
- **Cenários** a cada 10 fases: cemitério, pântano, cidade em ruínas e inferno; a noite cai ao longo
  das fases, com chuva, raios e (no inferno) brasas subindo.
- **Dificuldade** fácil / normal / difícil e **cores do elfo** liberadas por conquistas.
- **14 conquistas** com aviso na tela e uma tela própria.
- **Placar** com os 5 melhores e nome de 3 letras, estilo fliperama.

## Visual e som

- Fonte nova (Silkscreen) com acentos corretos.
- Sombras, manchas de sangue que ficam no chão, zumbi piscando ao levar tiro, clarão do tiro,
  tela tremendo, parada de impacto em golpes fortes, vinheta escura nas bordas.
- 3 músicas chiptune (título, jogo, chefão) e uns 20 efeitos sonoros, todos gerados por
  `ferramentas/gerar_sons.mjs` (dá para mudar as notas lá e gerar de novo).
- Todas as imagens novas foram desenhadas em pixel art por scripts.

## Telas e controles

- Tela de título com demonstração rodando no fundo, placar e escolhas.
- Pausa com opções de volume (música e efeitos), guardadas no navegador.
- Dicas na primeira partida.
- **Celular:** joystick na tela, tiro automático, botões de bomba, esquiva, fúria e pausa.
- **Controle de videogame** (Xbox/PlayStation): dois analógicos, como nos jogos de tiro modernos.
- **Instalável e offline:** a versão final (`npm run build`) vira aplicativo e funciona sem internet.

## Como foi testado

- Um "piloto automático" (`src/teste.js`, só no modo dev) joga sozinho; ele chega em média entre a
  fase 9 e a 12 no normal, em 3 a 4 minutos.
- `ferramentas/testar.mjs` abre o jogo num Chrome invisível, roda cenários e tira fotos: celular
  com toque simulado, controle simulado, cada chefão, cada arma, pausa, placar, modo offline.
- Desempenho: 60 quadros por segundo com 80 zumbis, chuva e metralhadora na tela.

## O que eu não consegui verificar

- **Ouvir** as músicas e os sons (só medi volume e se não estoura).
- Jogar de verdade com as mãos: a dificuldade foi ajustada pelo piloto automático, então pode
  estar fácil ou difícil demais para uma pessoa. Os números ficam em `src/regras.js`.
- Celular e controle de verdade (foram simulados).
