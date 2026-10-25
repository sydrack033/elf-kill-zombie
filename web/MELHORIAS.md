# O que mudou durante a madrugada

Resumo do que foi feito no Elf Kill Zombie enquanto você dormia. Cada etapa virou um commit no
git (pasta `Jogo1`), então dá para ver o histórico com `git log` e voltar qualquer coisa.

## Jogo

- **Inimigos novos:** corredor (rápido), brutamontes (grandão e resistente), cuspidor (para e cospe),
  bombado (explode quando morre), fantasma (fica transparente e os tiros passam), escavador (sai da
  terra perto do elfo), coveiro (carrega uma lápide que segura os tiros de frente até quebrar) e
  revoadas de corvos.
- **Zumbis de elite:** de vez em quando um vem dourado, maior e bem mais forte; vale mais pontos,
  sempre solta uma caixa e dá moedas.
- **5 chefões a cada 5 fases**, cada um com ataques próprios: O Rei Zumbi (cuspe em leque e chama
  ajudantes), O Carniceiro (investida em cima do elfo), O Podre (chuva de cuspe), A Bruxa (some e
  aparece, chama fantasmas) e O Necromante (escudo de ossos girando e mortos levantando das manchas
  de sangue). Depois eles voltam com tudo junto. Entrada de cinema com o nome do chefão.
- **Armas:** triplo, metralhadora, laser (atravessa), bazuca (explode), lança-chamas, raio (pula de
  zumbi em zumbi) e bumerangue (vai, faz a curva e volta). A arma aparece na mão do elfo.
- **Torreta:** caixa que monta uma torreta no chão; ela atira sozinha por 12 segundos.
- **Poderes:** escudo, botas de velocidade e gelo (congela os zumbis).
- **Melhorias** estilo "roguelite": a cada 2 fases escolha 1 de 3 (12 melhorias diferentes).
- **Esquiva** (Shift) e **fúria élfica** (E): barra que enche matando e solta um anel de fogo.
- **Combos**, DUPLO!/TRIPLO!/MASSACRE!, pontos flutuando.
- **Eventos:** a **Horda** (na metade das fases 8, 13, 18...) manda uma enxurrada de zumbis e dá
  prêmio a quem sobrevive; a **Lua de Sangue** deixa uma fase vermelha, com zumbis mais rápidos e
  pontos em dobro.
- **Cenários** a cada 10 fases: cemitério, pântano (com neblina), cidade em ruínas e inferno; cada
  um com sua música. A noite cai ao longo das fases, com chuva, raios e (no inferno) brasas subindo.
- **Modos:** Aventura (o normal) e **Só Chefões** (uma luta atrás da outra, com melhoria entre elas),
  e **2 jogadores** no mesmo computador (o segundo elfo anda com as setas ou um controle).
- **Loja do elfo:** cada partida rende moedas, que compram vantagens permanentes para o começo do
  jogo (bombas, corações, começar com o triplo, com meia fúria, com o ímã ou com uma melhoria).
- **Dificuldade** fácil / normal / difícil e **cores do elfo** liberadas por conquistas.
- **18 conquistas** com aviso na tela, tela própria e estatísticas de todas as partidas.
- **Placar** com os 5 melhores e nome de 3 letras, estilo fliperama (com a marca do modo).
- **Bestiário** com os inimigos já encontrados e uma **história** de abertura na primeira partida.

## Visual e som

- Fonte nova (Silkscreen) com acentos corretos.
- Sombras, manchas de sangue que ficam no chão, zumbi piscando ao levar tiro, clarão do tiro,
  tela tremendo (dá para desligar na pausa), parada de impacto em golpes fortes, vinheta nas bordas,
  neblina rolando no pântano, lua vermelha na Lua de Sangue.
- 6 músicas chiptune (título, uma por cenário e chefão) e uns 20 efeitos sonoros, todos gerados por
  `ferramentas/gerar_sons.mjs` (dá para mudar as notas lá e gerar de novo).
- Todas as imagens novas foram desenhadas em pixel art por scripts.

## Telas e controles

- Tela de título com demonstração rodando no fundo, placar e escolhas (dificuldade, cor do elfo,
  modo, jogadores), moedas e atalhos para loja, conquistas, bestiário e história.
- Pausa com opções de volume (música e efeitos) e tremor, guardadas no navegador, e saída para o menu.
- Dicas na primeira partida.
- **Celular:** joystick na tela, tiro automático, botões de bomba, esquiva, fúria e pausa.
- **Controle de videogame** (Xbox/PlayStation): dois analógicos, como nos jogos de tiro modernos.
- **Instalável e offline:** a versão final (`npm run build`) vira aplicativo e funciona sem internet.

## Como foi testado

- Um "piloto automático" (`src/teste.js`, só no modo dev) joga sozinho; ele chega em média entre a
  fase 9 e a 12 no normal, em 3 a 4 minutos.
- `ferramentas/testar.mjs` abre o jogo num Chrome invisível, roda cenários e tira fotos: celular
  com toque simulado, controle simulado, cada chefão, cada arma, pausa, placar, loja, modo offline.
- `ferramentas/cenas/verificar.js` é uma bateria de verificações das regras (OK/FALHOU), rodada
  depois de cada mudança.
- Duas revisões de código procurando bugs; o que elas acharam foi corrigido.
- Desempenho: 60 quadros por segundo com 80 zumbis, chuva e metralhadora na tela.

## O que eu não consegui verificar

- **Ouvir** as músicas e os sons (só medi volume e se não estoura).
- Jogar de verdade com as mãos: a dificuldade foi ajustada pelo piloto automático, então pode
  estar fácil ou difícil demais para uma pessoa. Os números ficam em `src/regras.js`.
- Celular e controle de verdade (foram simulados).
