# O que mudou durante a madrugada

Resumo do que foi feito no Elf Kill Zombie enquanto você dormia. Cada etapa virou um commit no
git (pasta `Jogo1`), então dá para ver o histórico com `git log` e voltar qualquer coisa.

## Jogo

- **Inimigos novos:** corredor (rápido), brutamontes (grandão e resistente), cuspidor (para e cospe),
  bombado (explode quando morre), fantasma (fica transparente e os tiros passam), escavador (sai da
  terra perto do elfo), coveiro (carrega uma lápide que segura os tiros de frente até quebrar),
  gosma (se divide em duas quando morre), tamborzeiro (acelera os zumbis em volta) e revoadas de corvos.
- **Zumbis de elite:** de vez em quando um vem dourado, maior e bem mais forte; vale mais pontos,
  sempre solta uma caixa e dá moedas.
- **6 chefões a cada 5 fases**, cada um com ataques próprios: O Rei Zumbi (cuspe em leque e chama
  ajudantes), O Carniceiro (investida em cima do elfo), O Podre (chuva de cuspe), A Bruxa (some e
  aparece, chama fantasmas), O Necromante (escudo de ossos girando e mortos levantando das manchas
  de sangue) e O Demônio (chuva de meteoros e labareda). Com metade da vida eles **enfurecem**
  (do 2º em diante). Depois voltam com tudo junto. Entrada de cinema com o nome do chefão.
- **Começar adiantado:** depois de chegar à fase 11, 21, 31 ou 41, dá para começar a partida lá
  (escolha "COMEÇAR NA" no título), já com as melhorias que teria pego no caminho. O título mostra
  a melhor fase alcançada rumo ao final.
- **Final do jogo:** na fase 50 vem o chefão final, **O Senhor dos Mortos** (maior e com todos os
  ataques). Vencendo, a história termina e dá para continuar no **modo infinito** ou encerrar.
- **Armas:** triplo, metralhadora, laser (atravessa), bazuca (explode), lança-chamas, raio (pula de
  zumbi em zumbi), bumerangue (vai, faz a curva e volta), espingarda (chumbos em leque, de perto) e arco élfico
  (segure para carregar e solte: a flecha atravessa tudo).
  A arma aparece na mão do elfo. Pegar a mesma arma de novo sobe o **nível** dela (até III, mais dano).
- **Torreta:** caixa que monta uma torreta no chão; ela atira sozinha por 12 segundos.
- **Poderes:** escudo, botas de velocidade e gelo (congela os zumbis).
- **Melhorias** estilo "roguelite": a cada 2 fases escolha 1 de 3 (18 melhorias diferentes, entre
  elas Vampiro, Ricochete, Estilhaços, Fragmentação, Segunda Pele e Ira Élfica). A pausa mostra as que você já pegou.
- **Esquiva** (Shift) e **fúria élfica** (E): barra que enche matando e solta um anel de fogo.
- **Combos**, DUPLO!/TRIPLO!/MASSACRE!, pontos flutuando e avisos nos combos de 10, 25, 50 e 100.
- **Eventos:** a **Horda** (na metade das fases 8, 13, 18...) manda uma enxurrada de zumbis e dá
  prêmio a quem sobrevive; a **Lua de Sangue** deixa uma fase vermelha, com zumbis mais rápidos e
  pontos em dobro; o **Eclipse** deixa a fase escura, com luz só em volta do elfo e das explosões.
- **Fase perfeita:** passar uma fase sem apanhar dá pontos extras e uma moeda.
- **Cenários** a cada 10 fases: cemitério, pântano (neblina e poças de lodo que deixam o elfo lento),
  cidade em ruínas (escombros caindo), inferno (meteoros) e, da fase 40 em diante, a **Terra Gelada**
  (neve e granizo). Cada um com sua música e uma **abertura de capítulo** com o nome do lugar.
  No modo infinito, depois da fase 50, os cenários recomeçam. O que cai do céu avisa antes com uma sombra no chão.
  A noite cai ao longo das fases, com chuva, raios e (no inferno) brasas subindo.
- **Modos:** Aventura (o normal) e **Só Chefões** (uma luta atrás da outra, com melhoria entre elas),
  e **2 jogadores** no mesmo computador (o segundo elfo anda com as setas ou um controle, mira
  sozinho e usa as armas que pegar).
- **Loja do elfo:** cada partida rende moedas (pontos, chefões, elites, hordas e moedas que caem dos
  zumbis), que compram vantagens permanentes para o começo do jogo (bombas, corações, começar com o
  triplo, com meia fúria, com o ímã, com uma melhoria) e a **Segunda Chance** (volta uma vez ao morrer).
- **Chapéus** para o elfo (gorro de Natal, cartola, chapéu de bruxa, elmo viking e coroa), numa aba
  da loja; o chapéu aparece no jogo e na demonstração do título.
- **Desafios do dia:** 3 missões que mudam todo dia (tecla D no título), cada uma vale 25 moedas.
- **Dificuldade** fácil / normal / difícil (vale também para a vida dos chefões) e **cores do elfo**
  liberadas por conquistas.
- **22 conquistas** com aviso na tela, tela própria e estatísticas de todas as partidas.
- Na primeira vez que aparece cada **inimigo** ou **caixa**, o jogo explica o que ele faz.
- **Placar** com os 5 melhores e nome de 3 letras, estilo fliperama (com a marca do modo).
- **Bestiário** com os inimigos já encontrados (e quantos de cada você já abateu), mais as abas
  **CAIXAS** (o que cada item faz) e **EVENTOS** (horda, lua de sangue, eclipse...), e uma **história**
  de abertura na primeira partida.

## Visual e som

- Fonte nova (Silkscreen) com acentos corretos.
- Sombras, manchas de sangue que ficam no chão, zumbi piscando ao levar tiro, clarão do tiro,
  tela tremendo (dá para desligar na pausa), parada de impacto em golpes fortes, vinheta nas bordas,
  neblina rolando no pântano, lua vermelha na Lua de Sangue.
- 8 músicas chiptune (título, uma por cenário, chefão e chefão final) e uns 20 efeitos sonoros, todos gerados por
  `ferramentas/gerar_sons.mjs` (dá para mudar as notas lá e gerar de novo).
- Todas as imagens novas foram desenhadas em pixel art por scripts.

## Telas e controles

- Tela de título com demonstração rodando no fundo, placar e escolhas (dificuldade, cor do elfo,
  modo, jogadores), moedas e atalhos para loja, conquistas, bestiário e história.
- Tela de **Opções** no título (tecla O): volumes, tremor, **tiro automático** no computador, tela
  cheia e rever as dicas.
- Pausa com opções de volume (música e efeitos) e tremor, guardadas no navegador, recomeçar e saída
  para o menu. O controle de videogame vibra quando o elfo apanha e nas explosões.
- Confete quando bate o recorde.
- Dicas na primeira partida.
- **Celular:** joystick na tela, tiro automático, botões de bomba, esquiva, fúria e pausa.
- **Controle de videogame** (Xbox/PlayStation): dois analógicos, como nos jogos de tiro modernos.
- **Instalável e offline:** a versão final (`npm run build`) vira aplicativo e funciona sem internet.

## Código

- O `Jogo.js` tinha crescido para quase 4.000 linhas; agora ele guarda só o começo da partida e o
  laço (entrada → processamento → saída), e o resto está dividido por assunto em `src/jogo/`
  (elfo, zumbis, chefões, tiros, explosões, itens, melhorias, HUD, clima, controles, desenho, fim).

## Como foi testado

- Um "piloto automático" (`src/teste.js`, só no modo dev) joga sozinho; ele chega em média entre a
  fase 9 e a 12 no normal, em 3 a 4 minutos.
- `ferramentas/testar.mjs` abre o jogo num Chrome invisível, roda cenários e tira fotos: celular
  com toque simulado, controle simulado, cada chefão, cada arma, pausa, placar, loja, modo offline.
- `ferramentas/cenas/verificar.js` é uma bateria de verificações das regras (OK/FALHOU), rodada
  depois de cada mudança.
- Revisões de código procurando bugs a cada leva de novidades; o que elas acharam foi corrigido.
- Desempenho: 60 quadros por segundo com 80 zumbis, chuva e metralhadora na tela.

## O que eu não consegui verificar

- **Ouvir** as músicas e os sons (só medi volume e se não estoura).
- Jogar de verdade com as mãos: a dificuldade foi ajustada pelo piloto automático, então pode
  estar fácil ou difícil demais para uma pessoa. Os números ficam em `src/regras.js`.
- Celular e controle de verdade (foram simulados).
