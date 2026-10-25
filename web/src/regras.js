// Todos os números que mudam a dificuldade e o jeito do jogo ficam aqui.
// Tempos são em "ticks" (1 tick = 10 ms, então 100 ticks = 1 segundo) e velocidades em pixels por tick.

export const TICK_MS = 10

// ---------- elfo ----------
export const VELOCIDADE_HEROI = 1.6
export const VELOCIDADE_HEROI_RAPIDO = 2.6 // com as botas
export const INVENCIVEL_DEPOIS_DE_APANHAR = 150
export const VIDAS_NO_COMECO = 3
export const VIDAS_NO_MAXIMO = 5

// ---------- níveis ----------
export const MORTES_POR_NIVEL = (nivel) => 10 + nivel * 2 // fase 1: 12, fase 5: 20, fase 10: 30
export const ACELERACAO_POR_NIVEL = 0.08 // quanto os zumbis ficam mais rápidos a cada fase (8%)
export const NIVEIS_ENTRE_CHEFOES = 5 // nível 5, 10, 15... tem chefão
export const COMBO_TEMPO = 150 // ticks para emendar a próxima morte no combo
export const ROLAGEM_DO_CHAO = 0.3 // o chão desce esta quantidade por tick
export const FASE_DA_CHUVA = 6 // a partir desta fase chove e caem raios
export const COMBO_MAXIMO = 5 // multiplicador máximo de pontos

// ---------- armas ----------
// espera = ticks entre disparos; tiros = projéteis por disparo; abertura = ângulo entre eles;
// tremida = quanto a mira treme; municao = disparos até voltar para a pistola; dano = vida tirada;
// empurra = quanto o zumbi recua ao levar o tiro; atravessa = o tiro passa por dentro dos zumbis;
// explode = raio da explosão quando o tiro bate; som = qual som toca e como (rate: menor = mais grave)
export const ARMAS = {
	pistola: {
		nome: 'PISTOLA', quadro: 0, espera: 22, tiros: 1, abertura: 0, tremida: 0, municao: Infinity,
		projetil: 'tiro', velocidade: 6, dano: 1, empurra: 2, som: { chave: 'tiro', volume: 0.5, rate: 1 },
	},
	triplo: {
		nome: 'TRIPLO', quadro: 1, espera: 30, tiros: 3, abertura: 0.22, tremida: 0, municao: 40,
		projetil: 'tiro', velocidade: 6, dano: 1, empurra: 2, som: { chave: 'tiro', volume: 0.6, rate: 0.75 },
	},
	metralhadora: {
		nome: 'METRALHADORA', quadro: 2, espera: 7, tiros: 1, abertura: 0, tremida: 0.08, municao: 150,
		projetil: 'tiro', velocidade: 7, dano: 1, empurra: 1, som: { chave: 'tiro', volume: 0.3, rate: 1.3 },
	},
	laser: {
		nome: 'LASER', quadro: 3, espera: 20, tiros: 1, abertura: 0, tremida: 0, municao: 45,
		projetil: 'laser', velocidade: 10, dano: 2, empurra: 1, atravessa: true, som: { chave: 'laser', volume: 0.5, rate: 1 },
	},
	bazuca: {
		nome: 'BAZUCA', quadro: 4, espera: 60, tiros: 1, abertura: 0, tremida: 0, municao: 15,
		projetil: 'foguete', velocidade: 4, dano: 2, empurra: 0, explode: 38, som: { chave: 'foguete', volume: 0.7, rate: 1 },
	},
}

// ---------- bombas ----------
export const BOMBAS_NO_COMECO = 2
export const BOMBAS_NO_MAXIMO = 9
export const BOMBAS_POR_CAIXA = 3
export const RAIO_DA_EXPLOSAO = 46
export const DANO_DA_EXPLOSAO = 3

// ---------- poderes (duração em ticks) ----------
export const PODERES = {
	escudo: { nome: 'ESCUDO', duracao: 1000 },
	velocidade: { nome: 'BOTAS', duracao: 900 },
	congelar: { nome: 'GELO', duracao: 450 },
}

// ---------- caixas que descem rolando com o chão ----------
// quadro = quadro da imagem itens.png; peso = chance relativa; nivel = a partir de que nível aparece
export const ITENS = [
	{ tipo: 'triplo', quadro: 0, peso: 3, nivel: 1 },
	{ tipo: 'metralhadora', quadro: 1, peso: 2, nivel: 1 },
	{ tipo: 'bomba', quadro: 2, peso: 3, nivel: 1 },
	{ tipo: 'laser', quadro: 3, peso: 2, nivel: 2 },
	{ tipo: 'bazuca', quadro: 4, peso: 1.5, nivel: 3 },
	{ tipo: 'escudo', quadro: 5, peso: 1.5, nivel: 1 },
	{ tipo: 'velocidade', quadro: 6, peso: 1.5, nivel: 1 },
	{ tipo: 'congelar', quadro: 7, peso: 1, nivel: 2 },
]
export const ITEM_A_CADA = [700, 1100] // ticks entre uma caixa e outra (sorteado entre os dois)
export const CHANCE_DE_CORACAO = 0.08 // chance de um zumbi morto soltar um coração
export const CHANCE_DE_ITEM = 0.03 // chance de um zumbi morto soltar uma caixa

// ---------- zumbis ----------
// escala = tamanho; cor = tom misturado à imagem; vida e velocidade (vy) crescem com o nível;
// peso(nivel) = chance relativa de aparecer naquele nível (0 = não aparece)
export const ZUMBIS = {
	comum: {
		escala: 1, cor: null, vida: 2, vy: 0.3, pontos: 10, empurravel: true,
		peso: () => 10,
	},
	corredor: {
		escala: 0.8, cor: 0xffb080, vida: 1, vy: 0.7, pontos: 15, empurravel: true,
		peso: (nivel) => (nivel >= 2 ? 2 + nivel : 0),
	},
	brutamontes: {
		escala: 1.5, cor: 0xa8a8ff, vida: 8, vy: 0.17, pontos: 40, empurravel: false,
		peso: (nivel) => (nivel >= 3 ? 1.5 + nivel * 0.4 : 0),
	},
	cuspidor: {
		escala: 1, cor: 0x9cff7a, vida: 3, vy: 0.3, pontos: 25, empurravel: true, cospe: true,
		peso: (nivel) => (nivel >= 4 ? 1.5 + nivel * 0.4 : 0),
	},
	// explode quando morre: machuca os zumbis em volta (e o elfo, se estiver perto)
	bombado: {
		escala: 1.15, cor: 0xff9a50, vida: 2, vy: 0.26, pontos: 20, empurravel: true, explode: 42,
		peso: (nivel) => (nivel >= 3 ? 1 + nivel * 0.3 : 0),
	},
	// de tempos em tempos fica transparente e os tiros passam por ele
	fantasma: {
		escala: 1, cor: 0xc8d8ff, vida: 2, vy: 0.36, pontos: 30, empurravel: true, fantasma: true,
		peso: (nivel) => (nivel >= 6 ? 1 + nivel * 0.3 : 0),
	},
}
export const VELOCIDADE_CUSPE = 1.7

// a imagem do zumbi tem 44x44, mas o corpo dele ocupa só este pedaço (sem contar a escala)
export const CORPO_ZUMBI = { x: 10, y: 4, l: 24, a: 36 }

// ---------- melhorias (a cada 2 fases e depois de cada chefão, escolha 1 de 3) ----------
// quadro = ícone em melhorias.png; maximo = quantas vezes dá para pegar a mesma
export const MELHORIAS = [
	{ id: 'cadencia', quadro: 0, nome: 'GATILHO LEVE', texto: 'ATIRA 15% MAIS RÁPIDO', maximo: 4 },
	{ id: 'dano', quadro: 1, nome: 'FOGO FORTE', texto: '+1 DE DANO EM TODO TIRO', maximo: 3 },
	{ id: 'perfura', quadro: 2, nome: 'PERFURANTE', texto: 'O TIRO ATRAVESSA MAIS 1 ZUMBI', maximo: 2 },
	{ id: 'vida_max', quadro: 3, nome: 'CORAÇÃO EXTRA', texto: '+1 CORAÇÃO MÁXIMO E CURA 1', maximo: 2 },
	{ id: 'velocidade', quadro: 4, nome: 'PÉS LIGEIROS', texto: 'ANDA 12% MAIS RÁPIDO', maximo: 3 },
	{ id: 'mochila', quadro: 5, nome: 'MOCHILA', texto: '+3 BOMBAS E CABEM MAIS 3', maximo: 3 },
	{ id: 'ima', quadro: 6, nome: 'ÍMÃ', texto: 'PUXA CAIXAS E CORAÇÕES', maximo: 3 },
	{ id: 'anjo', quadro: 7, nome: 'ANJO DA GUARDA', texto: 'ESCUDO NO COMEÇO DE CADA FASE', maximo: 1 },
	{ id: 'cinto', quadro: 8, nome: 'CINTO DE BALAS', texto: 'ARMAS ESPECIAIS COM +50% DE MUNIÇÃO', maximo: 2 },
	{ id: 'mao_dupla', quadro: 9, nome: 'MÃO DUPLA', texto: 'A PISTOLA DÁ DOIS TIROS', maximo: 1 },
	{ id: 'sorte', quadro: 10, nome: 'TREVO', texto: 'CAEM MAIS CORAÇÕES E CAIXAS', maximo: 2 },
	{ id: 'polvora', quadro: 11, nome: 'PÓLVORA', texto: 'EXPLOSÕES 25% MAIORES', maximo: 2 },
]
export const VIDAS_EXTRAS_MAXIMO = 2 // com o Coração Extra, o máximo de vidas sobe até 5 + 2

// ---------- chefão ----------
// a imagem tem quadros de 64x64; o corpo ocupa este pedaço (sem contar a escala)
export const CHEFE = { escala: 2, vida_base: 45, vida_por_chefe: 25, pontos: 1000, corpo: { x: 18, y: 6, l: 28, a: 54 } }
