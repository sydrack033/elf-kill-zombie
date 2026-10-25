// Todos os números que mudam a dificuldade e o jeito do jogo ficam aqui.
// Tempos são em "ticks" (1 tick = 10 ms, então 100 ticks = 1 segundo) e velocidades em pixels por tick.

export const TICK_MS = 10

// ---------- dificuldade (escolhida na tela de título) ----------
// vidas = vidas no começo; velocidade = multiplica a velocidade dos zumbis;
// frequencia = multiplica quantos zumbis aparecem; pontos = multiplica os pontos
export const DIFICULDADES = {
	facil: { nome: 'FÁCIL', vidas: 5, velocidade: 0.8, frequencia: 0.75, pontos: 0.5, chefe: 0.7 },
	normal: { nome: 'NORMAL', vidas: 3, velocidade: 1, frequencia: 1, pontos: 1, chefe: 1 },
	dificil: { nome: 'DIFÍCIL', vidas: 2, velocidade: 1.2, frequencia: 1.3, pontos: 2, chefe: 1.3 }, // chefe = vida dos chefões
}

// ---------- cores do elfo (liberadas com conquistas) ----------
export const ELFOS = [
	{ id: 'verde', nome: 'ELFO VERDE', cor: null, conquistas: 0 },
	{ id: 'noturno', nome: 'ELFO NOTURNO', cor: 0x8aa0ff, conquistas: 3 },
	{ id: 'fogo', nome: 'ELFO DE FOGO', cor: 0xff9a6a, conquistas: 6 },
	{ id: 'ouro', nome: 'ELFO DOURADO', cor: 0xffe070, conquistas: 10 },
	{ id: 'sombrio', nome: 'ELFO SOMBRIO', cor: 0x7a6a8a, conquistas: 15 },
	// só para quem venceu o chefão final; a cor vai mudando como um arco-íris
	{ id: 'lendario', nome: 'ELFO LENDÁRIO', cor: 'arco', conquistas: 0, conquista: 'zerou' },
]

// a cor está liberada? (pela quantidade de conquistas ou por uma conquista específica)
export function elfo_liberado(elfo, feitas) {
	return elfo.conquista ? feitas.has(elfo.conquista) : feitas.size >= elfo.conquistas
}

// cor do Elfo Lendário num instante (arco-íris devagar)
export function cor_arco_iris(tempo) {
	const h = (tempo / 4000) % 1
	const f = (n) => {
		const k = (n + h * 6) % 6
		return Math.round(255 * (1 - 0.45 * Math.max(0, Math.min(k, 4 - k, 1))))
	}
	return (f(5) << 16) | (f(3) << 8) | f(1)
}

// ---------- elfo ----------
export const VELOCIDADE_HEROI = 1.6
export const VELOCIDADE_HEROI_RAPIDO = 2.6 // com as botas
export const INVENCIVEL_DEPOIS_DE_APANHAR = 150
// esquiva (Shift): uma arrancada rápida em que nada acerta o elfo
export const ESQUIVA = { duracao: 16, velocidade: 5, espera: 100 }
export const VIDAS_NO_COMECO = 3
export const VIDAS_NO_MAXIMO = 5

// ---------- níveis ----------
export const MORTES_POR_NIVEL = (nivel) => 10 + nivel * 2 // fase 1: 12, fase 5: 20, fase 10: 30
export const ACELERACAO_POR_NIVEL = 0.08 // quanto os zumbis ficam mais rápidos a cada fase (8%)
export const NIVEIS_ENTRE_CHEFOES = 5 // nível 5, 10, 15... tem chefão
export const COMBO_TEMPO = 150 // ticks para emendar a próxima morte no combo
export const CRITICO = { chance: 0.07, multiplicador: 2 } // de vez em quando um tiro acerta em cheio
export const ROLAGEM_DO_CHAO = 0.3 // o chão desce esta quantidade por tick
// perigos de cenário: algo cai do céu num ponto perto do elfo (a sombra avisa antes) e machuca quem estiver embaixo
export const PERIGOS = {
	escombros: { cor: 0x8a8070, raio: 26, a_cada: [520, 820], aviso: 100 },
	meteoros: { cor: 0xff7a2a, raio: 34, a_cada: [420, 700], aviso: 90 },
	granizo: { cor: 0xc8ecff, raio: 24, a_cada: [260, 460], aviso: 80 },
}

// lodo (pântano): poças que descem com o chão e deixam o elfo lento enquanto ele pisa nelas
export const LODO = { a_cada: [300, 520], lenta: 0.55, largura: 60, altura: 24 }

// eclipse: de vez em quando uma fase escura, em que só se enxerga em volta do elfo (e das explosões)
export const ECLIPSE = { a_partir_da_fase: 12, chance: 0.12, escuridao: 0.88 }

// lua de sangue: de vez em quando uma fase inteira com zumbis mais rápidos que valem o dobro
export const LUA_DE_SANGUE = { a_partir_da_fase: 6, chance: 0.15, velocidade: 1.25, pontos: 2 }

export const FASE_DA_CHUVA = 6 // dentro de cada cenário, a partir desta fase chove e caem raios

// o cenário muda a cada 10 fases; clima = o que cai do céu (chuva) ou sobe do chão (brasas)
export const CENARIOS = [
	{ a_partir_da_fase: 1, textura: 'chao', nome: 'CEMITÉRIO', clima: 'chuva', musica: 'musica_jogo', lema: 'ONDE TUDO COMEÇOU' },
	{ a_partir_da_fase: 10, textura: 'chao_pantano', nome: 'PÂNTANO', lema: 'ONDE OS MORTOS AFUNDAM', clima: 'chuva', musica: 'musica_pantano', neblina: 0.4, perigo: 'lodo', cor_zumbi: 0xc8e8b0 },
	{ a_partir_da_fase: 20, textura: 'chao_ruinas', nome: 'CIDADE EM RUÍNAS', lema: 'A VILA JÁ CAIU', clima: 'chuva', musica: 'musica_ruinas', neblina: 0.2, perigo: 'escombros' },
	{ a_partir_da_fase: 30, textura: 'chao_inferno', nome: 'INFERNO', lema: 'DE ONDE ELES VÊM', clima: 'brasas', musica: 'musica_inferno', perigo: 'meteoros', cor_zumbi: 0xffb898 },
	{ a_partir_da_fase: 40, textura: 'chao_gelo', nome: 'TERRA GELADA', lema: 'ONDE O MUNDO ACABA', clima: 'neve', musica: 'musica_gelo', perigo: 'granizo', cor_zumbi: 0xb8dcff },
]
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
	// chama = cada tiro é uma labareda que cresce e some depois de "alcance" ticks
	lancachamas: {
		nome: 'LANÇA-CHAMAS', quadro: 5, espera: 4, tiros: 1, abertura: 0, tremida: 0.22, municao: 250,
		projetil: 'tiro', velocidade: 3.4, dano: 1, empurra: 0, atravessa: true, alcance: 30, chama: true,
		som: { chave: 'chama', volume: 0.3, rate: 1 },
	},
	// raio = acerta o inimigo mais perto da mira e pula para os vizinhos ("saltos")
	raio: {
		nome: 'RAIO', quadro: 6, espera: 32, tiros: 1, abertura: 0, tremida: 0, municao: 30,
		projetil: null, velocidade: 0, dano: 3, empurra: 3, especial: 'raio', saltos: 3, alcance: 260,
		som: { chave: 'raio', volume: 0.55, rate: 1 },
	},
	// espingarda: um monte de chumbos em leque que somem logo (alcance) e empurram forte
	espingarda: {
		nome: 'ESPINGARDA', quadro: 8, espera: 55, tiros: 7, abertura: 0.11, tremida: 0.05, municao: 20,
		projetil: 'tiro', velocidade: 7, dano: 1, empurra: 7, alcance: 26, chumbo: true,
		som: { chave: 'explosao', volume: 0.35, rate: 1.9 },
	},
	// arco: segure para carregar (carrega = ticks até a carga cheia) e solte para disparar;
	// a flecha atravessa tudo e o dano cresce com a carga (dano + 6 com a carga cheia)
	arco: {
		nome: 'ARCO ÉLFICO', quadro: 9, espera: 12, tiros: 1, abertura: 0, tremida: 0, municao: 30,
		projetil: 'flecha', velocidade: 9, dano: 2, empurra: 3, atravessa: true, carrega: 70,
		som: { chave: 'arremesso', volume: 0.5, rate: 1.8 },
	},
	// volta = depois de tantos ticks o bumerangue faz a curva e volta para a mão (acerta na ida e na volta)
	bumerangue: {
		nome: 'BUMERANGUE', quadro: 7, espera: 40, tiros: 1, abertura: 0, tremida: 0, municao: 25,
		projetil: 'bumerangue', velocidade: 5, dano: 2, empurra: 2, atravessa: true, volta: 40,
		som: { chave: 'bumerangue', volume: 0.6, rate: 1 },
	},
}

// ---------- fúria élfica (tecla E): a barra enche matando e solta um anel de fogo ----------
export const FURIA = { por_morte: 0.04, por_acerto_no_chefe: 0.01, tiros: 32, velocidade: 4.5, dano: 4 }

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
	{ tipo: 'triplo', quadro: 0, peso: 3, nivel: 1, texto: 'TRÊS TIROS EM LEQUE' },
	{ tipo: 'metralhadora', quadro: 1, peso: 2, nivel: 1, texto: 'SEGURE PARA ATIRAR SEM PARAR' },
	{ tipo: 'bomba', quadro: 2, peso: 3, nivel: 1, texto: 'MAIS BOMBAS PARA JOGAR' },
	{ tipo: 'laser', quadro: 3, peso: 2, nivel: 2, texto: 'ATRAVESSA TODOS OS ZUMBIS DA LINHA' },
	{ tipo: 'bazuca', quadro: 4, peso: 1.5, nivel: 3, texto: 'FOGUETE QUE EXPLODE' },
	{ tipo: 'escudo', quadro: 5, peso: 1.5, nivel: 1, texto: 'SEGURA UMA MORDIDA' },
	{ tipo: 'velocidade', quadro: 6, peso: 1.5, nivel: 1, texto: 'ANDA MAIS RÁPIDO POR UM TEMPO' },
	{ tipo: 'congelar', quadro: 7, peso: 1, nivel: 2, texto: 'CONGELA OS ZUMBIS POR UM TEMPO' },
	{ tipo: 'lancachamas', quadro: 8, peso: 1.5, nivel: 4, texto: 'FOGO DE PERTO, ATRAVESSA TUDO' },
	{ tipo: 'raio', quadro: 9, peso: 1.5, nivel: 5, texto: 'PULA DE ZUMBI EM ZUMBI' },
	{ tipo: 'torreta', quadro: 10, peso: 1.2, nivel: 3, texto: 'ATIRA SOZINHA POR 12 SEGUNDOS' },
	{ tipo: 'bumerangue', quadro: 11, peso: 1.5, nivel: 2, texto: 'VAI E VOLTA, ACERTANDO DUAS VEZES' },
	{ tipo: 'arco', quadro: 13, peso: 1.3, nivel: 4, texto: 'SEGURE PARA CARREGAR, SOLTE PARA ATIRAR' },
	{ tipo: 'espingarda', quadro: 12, peso: 1.5, nivel: 3, texto: 'MUITOS CHUMBOS DE PERTO, EMPURRA FORTE' },
]

// torreta: fica onde o elfo pegou a caixa e atira sozinha no zumbi mais perto
export const TORRETA = { duracao: 1200, espera: 26, alcance: 270, velocidade: 6, dano: 1, maximo: 2 }
export const ITEM_A_CADA = [700, 1100] // ticks entre uma caixa e outra (sorteado entre os dois)
export const CHANCE_DE_CORACAO = 0.08 // chance de um zumbi morto soltar um coração
export const CHANCE_DE_ITEM = 0.03 // chance de um zumbi morto soltar uma caixa
export const CHANCE_DE_MOEDA = 0.04 // chance de um zumbi morto soltar uma moeda (para a loja)

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
	// escavador: sai de baixo da terra perto do elfo (a terra treme antes, dá tempo de fugir)
	escavador: {
		escala: 1, cor: 0xc8a070, vida: 3, vy: 0.2, pontos: 35, empurravel: true, cava: true,
		peso: (nivel) => (nivel >= 7 ? 1 + nivel * 0.25 : 0),
	},
	// coveiro: carrega uma lápide na frente; o tiro de frente bate na pedra até ela quebrar
	// (explosão, raio e fúria passam por cima, e tiro de lado acerta o corpo)
	coveiro: {
		escala: 1.05, cor: 0xd8c8a8, vida: 3, vy: 0.22, pontos: 45, empurravel: false, escudo: 6,
		peso: (nivel) => (nivel >= 8 ? 1 + nivel * 0.25 : 0),
	},
	// gosma: zumbi de lodo; quando morre se divide em dois menores (que não se dividem de novo)
	gosma: {
		escala: 1.1, cor: 0x7aff9a, vida: 3, vy: 0.28, pontos: 30, empurravel: true, divide: true,
		peso: (nivel) => (nivel >= 11 ? 1 + nivel * 0.25 : 0),
	},
	// tamborzeiro: enquanto vivo, os zumbis em volta dele (raio da aura) andam mais rápido
	tamborzeiro: {
		escala: 1.1, cor: 0xff8a8a, vida: 4, vy: 0.2, pontos: 50, empurravel: true, aura: 80, acelera: 1.45,
		peso: (nivel) => (nivel >= 14 ? 0.8 + nivel * 0.15 : 0),
	},
	// corvo: não aparece sozinho, vem em revoadas (ver CORVOS); voa em diagonal e não custa vida se passar
	corvo: {
		escala: 1, cor: null, vida: 1, vy: 0, pontos: 15, empurravel: false, voa: true,
		textura: 'corvo', corpo: { x: 0, y: 0, l: 16, a: 12 }, // desenhado 40% maior
		peso: () => 0,
	},
	// cova aberta: um túmulo que desce com o chão e solta um zumbi a cada 'ninho' ticks até ser quebrado
	// (não morde nem custa vida se passar; quebrar solta moedas)
	cova: {
		escala: 1, cor: null, vida: 12, vy: 0, pontos: 60, empurravel: false, ninho: 170,
		textura: 'lapide', corpo: { x: 0, y: 0, l: 40, a: 44 },
		peso: () => 0,
	},
	// morcego: vem em revoadas como o corvo (fase 16+), mas faz zigue-zague e mergulha no elfo
	morcego: {
		escala: 1, cor: 0x8a6aaa, vida: 1, vy: 0, pontos: 25, empurravel: false, voa: true, mergulha: true,
		textura: 'corvo', corpo: { x: 0, y: 0, l: 16, a: 12 },
		peso: () => 0,
	},
}

// chuva de moedas: depois de vencer o 2º, 4º, 6º... chefão, alguns segundos sem zumbis e com moedas caindo
// covas abertas: a partir da fase 6, de tempos em tempos
export const COVAS = { a_partir_da_fase: 6, a_cada: [1800, 2800] }

export const CHUVA_DE_MOEDAS = { duracao: 700, a_cada: 9 }

// horda: na metade das fases 8, 13, 18... vem uma enxurrada de zumbis; quem sobrevive ganha um prêmio
export const HORDA = { fase: 3, a_partir_da_fase: 8, duracao: 400, a_cada: 15, moedas: 10 }

// elite: às vezes um zumbi vem dourado, maior e bem mais forte; vale mais pontos, sempre solta uma caixa e dá moedas
export const ELITE = { a_partir_da_fase: 4, chance: 0.04, vida: 4, escala: 1.2, pontos: 5, moedas: 5 }

// revoadas de corvos atravessando a tela
export const CORVOS = { a_partir_da_fase: 2, a_cada: [1100, 1900], quantos: [3, 5], velocidade: 1.3 }
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
	{ id: 'anjo', rara: true, quadro: 7, nome: 'ANJO DA GUARDA', texto: 'ESCUDO NO COMEÇO DE CADA FASE', maximo: 1 },
	{ id: 'cinto', quadro: 8, nome: 'CINTO DE BALAS', texto: 'ARMAS ESPECIAIS COM +50% DE MUNIÇÃO', maximo: 2 },
	{ id: 'mao_dupla', rara: true, quadro: 9, nome: 'MÃO DUPLA', texto: 'A PISTOLA DÁ DOIS TIROS', maximo: 1 },
	{ id: 'sorte', quadro: 10, nome: 'TREVO', texto: 'CAEM MAIS CORAÇÕES E CAIXAS', maximo: 2 },
	{ id: 'polvora', quadro: 11, nome: 'PÓLVORA', texto: 'EXPLOSÕES 25% MAIORES', maximo: 2 },
	{ id: 'vampiro', rara: true, quadro: 12, nome: 'VAMPIRO', texto: 'A CADA 30 ZUMBIS, CURA 1 CORAÇÃO', maximo: 1 },
	{ id: 'ricochete', rara: true, quadro: 13, nome: 'RICOCHETE', texto: 'O TIRO QUICA NAS BORDAS DA TELA', maximo: 1 },
	{ id: 'estilhacos', quadro: 14, nome: 'ESTILHAÇOS', texto: 'ZUMBI MORTO SOLTA ESTILHAÇOS', maximo: 2 },
	{ id: 'fragmentacao', rara: true, quadro: 15, nome: 'FRAGMENTAÇÃO', texto: 'A BOMBA SOLTA ESTILHAÇOS AO EXPLODIR', maximo: 1 },
	{ id: 'segunda_pele', quadro: 16, nome: 'SEGUNDA PELE', texto: 'O ESCUDO DURA O DOBRO', maximo: 1 },
	{ id: 'ira', quadro: 17, nome: 'IRA ÉLFICA', texto: 'A FÚRIA ENCHE 40% MAIS RÁPIDO', maximo: 2 },
	{ id: 'olho', quadro: 18, nome: 'OLHO CLÍNICO', texto: '+8% DE CHANCE DE CRÍTICO', maximo: 2 },
]
export const VIDAS_EXTRAS_MAXIMO = 2 // com o Coração Extra, o máximo de vidas sobe até 5 + 2

// ---------- chefão ----------
// a imagem tem quadros de 64x64; o corpo ocupa este pedaço (sem contar a escala)
export const CHEFE = { escala: 2, vida_base: 45, vida_por_chefe: 25, pontos: 1000, corpo: { x: 18, y: 6, l: 28, a: 54 } }

// cada chefão tem nome, cor e ataques próprios; depois do último eles voltam do começo, mais fortes e com tudo
//   cuspe = leque de cuspe no elfo, chamar = chama zumbis corredores,
//   investida = avisa (fica vermelho e treme) e desce correndo em cima do elfo, chuva = cuspe caindo do céu
export const CHEFES = [
	{ nome: 'O REI ZUMBI', cor: null, ataques: ['cuspe', 'chamar'], fala: 'MAS ELE ERA SÓ O PRIMEIRO...' },
	{ nome: 'O CARNICEIRO', cor: 0xff9a9a, ataques: ['cuspe', 'investida'], fala: 'O PÂNTANO FICOU EM SILÊNCIO.' },
	{ nome: 'O PODRE', cor: 0xa8ff8a, ataques: ['cuspe', 'chuva', 'chamar'], fala: 'O CHEIRO JÁ ESTÁ INDO EMBORA.' },
	// teleporte = some e aparece em outro lugar; fantasmas = chama zumbis fantasmas
	{ nome: 'A BRUXA', cor: 0xd08aff, ataques: ['cuspe', 'teleporte', 'fantasmas'], fala: 'O FEITIÇO SOBRE A VILA SE QUEBROU.' },
	// ossos = ossos girando em volta dele seguram os tiros (voltam depois de um tempo);
	// levantar = zumbis saem das manchas de sangue do chão
	{ nome: 'O NECROMANTE', cor: 0x7af0d8, ataques: ['cuspe', 'ossos', 'levantar'], fala: 'ALGO DESPERTOU LÁ EMBAIXO, NO FOGO...' },
	// meteoros = chama meteoros perto do elfo; labareda = jorro de fogo que vai seguindo o elfo
	{ nome: 'O DEMÔNIO', cor: 0xff6a4a, ataques: ['cuspe', 'meteoros', 'labareda'], fala: 'O FRIO VEM DO NORTE. O FIM ESTÁ PERTO.' },
]
// chefão final, na fase 50: tem todos os ataques, é maior e bem mais forte; vencer mostra o final do jogo
export const CHEFE_FINAL = { fase: 50, nome: 'O SENHOR DOS MORTOS', cor: 0xb08aff, vida: 1.6, escala: 2.4 }
// classes do elfo (escolhidas no título); libera = o que precisa para aparecer
export const CLASSES = [
	{ id: 'guerreiro', nome: 'GUERREIRO', texto: 'O ELFO DE SEMPRE' },
	{ id: 'arqueiro', nome: 'ARQUEIRO', texto: 'COMEÇA COM O ARCO NÍVEL II', libera: { conquistas: 5 } },
	{ id: 'bombardeiro', nome: 'BOMBARDEIRO', texto: '+4 BOMBAS E EXPLOSÕES MAIORES, 1 CORAÇÃO A MENOS', libera: { fase: 15 } },
]

// a classe está liberada? (pelas conquistas feitas ou pela melhor fase)
export function classe_liberada(classe, feitas, melhor_fase) {
	const l = classe.libera
	return !l || (l.conquistas && feitas.size >= l.conquistas) || (l.fase && melhor_fase >= l.fase)
}

// modificadores (ligados nas Opções): deixam o jogo mais difícil e multiplicam os pontos
export const MODIFICADORES = {
	vidro: { nome: 'ELFO DE VIDRO', pontos: 2 }, // só 1 vida
	turbo: { nome: 'TURBO', pontos: 1.5, velocidade: 1.3 }, // zumbis mais rápidos e mais frequentes
	pistola: { nome: 'SÓ PISTOLA', pontos: 1.5 }, // não caem caixas de arma
}

// capítulos em que dá para começar a partida (liberados quando a melhor fase chega neles)
export const CAPITULOS = [1, 11, 21, 31, 41]

export const OSSOS = { quantos: 6, raio: 58, giro: 0.025, volta_em: 700 }
