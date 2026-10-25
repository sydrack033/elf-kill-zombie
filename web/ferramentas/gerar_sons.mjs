// Gera as músicas e os efeitos sonoros do jogo (WAV 16 bits mono), no estilo chiptune.
// Rode de novo depois de mudar alguma nota ou som:  node ferramentas/gerar_sons.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const PASTA = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'sons')
mkdirSync(PASTA, { recursive: true })
const TAXA = 22050

function salvar(nome, amostras) {
	const dados = Buffer.alloc(amostras.length * 2)
	for (let i = 0; i < amostras.length; i++) {
		// limita suavemente para não estourar quando os canais somam
		const v = Math.tanh(amostras[i] * 1.2)
		dados.writeInt16LE(Math.round(v * 32000), i * 2)
	}
	const cab = Buffer.alloc(44)
	cab.write('RIFF', 0); cab.writeUInt32LE(36 + dados.length, 4); cab.write('WAVE', 8)
	cab.write('fmt ', 12); cab.writeUInt32LE(16, 16); cab.writeUInt16LE(1, 20); cab.writeUInt16LE(1, 22)
	cab.writeUInt32LE(TAXA, 24); cab.writeUInt32LE(TAXA * 2, 28); cab.writeUInt16LE(2, 32); cab.writeUInt16LE(16, 34)
	cab.write('data', 36); cab.writeUInt32LE(dados.length, 40)
	writeFileSync(join(PASTA, nome + '.wav'), Buffer.concat([cab, dados]))
	console.log(nome, (amostras.length / TAXA).toFixed(2) + 's')
}

// ruído com semente fixa (sai sempre igual)
let semente = 12345
const ruido = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x3fffffff) - 1

// ---------------------------------------------------------------- notas

const NOMES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 }
function frequencia(nota) {
	const m = /^([A-G]#?)(\d)$/.exec(nota)
	const midi = 12 * (Number(m[2]) + 1) + NOMES[m[1]]
	return 440 * Math.pow(2, (midi - 69) / 12)
}

// formas de onda (fase de 0 a 1)
const ONDAS = {
	quadrada: (f) => (f < 0.5 ? 1 : -1),
	fina: (f) => (f < 0.25 ? 1 : -1), // quadrada com 25%: som mais "nasal", bom para melodia
	finissima: (f) => (f < 0.125 ? 1 : -1),
	triangulo: (f) => (f < 0.5 ? f * 4 - 1 : 3 - f * 4),
	serra: (f) => f * 2 - 1,
}

// ---------------------------------------------------------------- sequenciador
// Cada canal é uma lista de compassos; cada compasso é uma string de 16 passos separados por espaço:
//   "A4" começa a nota, "." segura a anterior, "-" silêncio.

function canal_melodico(compassos, { onda, volume, bpm, ataque = 0.005, queda = 0.25, sustento = 0.6, vibrato = 0, oitava = 0 }) {
	const passo = 60 / bpm / 4
	const passos = compassos.join(' ').trim().split(/\s+/)
	const total = Math.round(passos.length * passo * TAXA)
	const saida = new Float32Array(total)
	// junta os passos em notas com duração
	const notas = []
	for (let i = 0; i < passos.length; i++) {
		const p = passos[i]
		if (p == '.') {
			if (notas.length && notas[notas.length - 1].aberta) notas[notas.length - 1].passos++
		}
		else {
			if (notas.length) notas[notas.length - 1].aberta = false
			if (p != '-') notas.push({ nota: p, inicio: i, passos: 1, aberta: true })
		}
	}
	const forma = ONDAS[onda]
	for (const n of notas) {
		const f = frequencia(n.nota) * Math.pow(2, oitava)
		const ini = Math.round(n.inicio * passo * TAXA)
		const dur = n.passos * passo
		const fim = Math.min(total, Math.round((n.inicio + n.passos) * passo * TAXA))
		let fase = 0
		for (let i = ini; i < fim; i++) {
			const t = (i - ini) / TAXA
			// envelope: ataque, queda até o sustento e um corte suave no fim
			let env = t < ataque ? t / ataque : sustento + (1 - sustento) * Math.exp(-(t - ataque) / queda)
			const resto = dur - t
			if (resto < 0.012) env *= resto / 0.012
			const vib = vibrato && t > 0.15 ? Math.sin(t * 2 * Math.PI * 5.5) * vibrato : 0
			fase = (fase + (f * (1 + vib)) / TAXA) % 1
			saida[i] += forma(fase) * env * volume
		}
	}
	return saida
}

// bateria: "k" bumbo, "s" caixa, "h" chimbal, "-" nada
function canal_bateria(compassos, { volume, bpm }) {
	const passo = 60 / bpm / 4
	const passos = compassos.join(' ').trim().split(/\s+/)
	const total = Math.round(passos.length * passo * TAXA)
	const saida = new Float32Array(total)
	passos.forEach((p, i) => {
		const ini = Math.round(i * passo * TAXA)
		for (const golpe of p) {
			if (golpe == 'k') {
				// bumbo: seno caindo de 150 para 45 Hz
				let fase = 0
				for (let j = 0; j < 0.16 * TAXA && ini + j < total; j++) {
					const t = j / TAXA
					fase += (45 + 105 * Math.exp(-t * 30)) / TAXA
					saida[ini + j] += Math.sin(fase * 2 * Math.PI) * Math.exp(-t * 18) * volume * 1.3
				}
			}
			else if (golpe == 's') {
				let ant = 0
				for (let j = 0; j < 0.14 * TAXA && ini + j < total; j++) {
					const t = j / TAXA
					ant = ant * 0.4 + ruido() * 0.6
					saida[ini + j] += ant * Math.exp(-t * 22) * volume * 0.7
				}
			}
			else if (golpe == 'h') {
				let ant = 0
				for (let j = 0; j < 0.04 * TAXA && ini + j < total; j++) {
					const t = j / TAXA
					const r = ruido()
					const agudo = r - ant // só o chiado agudo
					ant = r
					saida[ini + j] += agudo * Math.exp(-t * 90) * volume * 0.25
				}
			}
		}
	})
	return saida
}

function misturar(...canais) {
	const total = Math.max(...canais.map((c) => c.length))
	const saida = new Float32Array(total)
	for (const c of canais) for (let i = 0; i < c.length; i++) saida[i] += c[i]
	return saida
}

// repete cada compasso n vezes (para o baixo e a bateria que se repetem)
const rep = (compasso, n) => Array(n).fill(compasso)

// arpejo de 16 passos com as notas do acorde
function arpejo(notas, padrao = [0, 1, 2, 1]) {
	const passos = []
	for (let i = 0; i < 16; i++) passos.push(notas[padrao[i % padrao.length] % notas.length])
	return passos.join(' ')
}

// baixo pulsando em colcheias: nota, silêncio, oitava, silêncio...
function baixo(nota, oitava_acima) {
	return [nota, '-', nota, '-', oitava_acima, '-', nota, '-', nota, '-', nota, '-', oitava_acima, '-', nota, '-'].join(' ')
}

// ---------------------------------------------------------------- música do jogo (lá menor, 140 bpm)

{
	const bpm = 140
	const melodia = [
		'A4 . . C5 . E5 . . D5 . C5 . B4 . A4 .',
		'A4 . . . F4 . A4 . C5 . . . A4 . . .',
		'G4 . . C5 . E5 . . G5 . E5 . D5 . C5 .',
		'B4 . . . G4 . B4 . D5 . . . - - - -',
		'E5 . E5 . D5 . C5 . D5 . . . C5 . B4 .',
		'A4 . . . C5 . . . F5 . E5 . D5 . C5 .',
		'B4 . . . D5 . . . G5 . F5 . E5 . D5 .',
		'E5 . . . G#4 . . . B4 . . . E5 . . .',
	]
	const acordes = [
		['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['C4', 'E4', 'G4'], ['G3', 'B3', 'D4'],
		['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4'], ['E3', 'G#3', 'B3'],
	]
	const raizes = [['A2', 'A3'], ['F2', 'F3'], ['C3', 'C4'], ['G2', 'G3'], ['A2', 'A3'], ['F2', 'F3'], ['G2', 'G3'], ['E2', 'E3']]
	// primeira volta: só baixo, arpejo e bateria; segunda volta: entra a melodia
	const silencio = rep('- - - - - - - - - - - - - - - -', 8)
	const musica = misturar(
		canal_melodico([...silencio, ...melodia, ...melodia], { onda: 'fina', volume: 0.22, bpm, queda: 0.3, sustento: 0.5, vibrato: 0.006 }),
		canal_melodico([...acordes, ...acordes, ...acordes].map((a) => arpejo(a, [0, 1, 2, 1])), { onda: 'finissima', volume: 0.07, bpm, queda: 0.06, sustento: 0.2 }),
		canal_melodico([...raizes, ...raizes, ...raizes].map(([n, o]) => baixo(n, o)), { onda: 'triangulo', volume: 0.32, bpm, queda: 0.1, sustento: 0.6 }),
		canal_bateria(
			[...rep('k - h - s - h - k - k h s - h h', 8), ...rep('k - h - s - h - k - k h s - h h', 15), 'k - s - s - s s k s s s s s s s'],
			{ volume: 0.35, bpm },
		),
	)
	salvar('musica_jogo', musica)
}

// ---------------------------------------------------------------- música do chefão (ré menor, 165 bpm, mais pesada)

{
	const bpm = 165
	const melodia = [
		'D5 . . D5 . . F5 . E5 . . D5 . . C5 .',
		'D5 . . . . . A4 . . . C5 . D5 . . .',
		'D5 . . D5 . . F5 . G5 . . F5 . . E5 .',
		'F5 . E5 . D5 . C#5 . . . A4 . . . . .',
	]
	const raizes = ['D2', 'A#1', 'C2', 'A1']
	// baixo em semicolcheias, sem parar
	const baixo_corrido = raizes.map((n) => {
		const o = n.replace(/\d/, (d) => String(Number(d) + 1))
		return [n, n, o, n, n, n, o, n, n, n, o, n, n, o, n, o].join(' ')
	})
	const acordes = [['D4', 'F4', 'A4'], ['A#3', 'D4', 'F4'], ['C4', 'E4', 'G4'], ['A3', 'C#4', 'E4']]
	const musica = misturar(
		canal_melodico([...melodia, ...melodia], { onda: 'quadrada', volume: 0.15, bpm, queda: 0.2, sustento: 0.55, vibrato: 0.008 }),
		canal_melodico([...acordes, ...acordes].map((a) => arpejo(a, [0, 2, 1, 2])), { onda: 'finissima', volume: 0.06, bpm, queda: 0.05, sustento: 0.2 }),
		canal_melodico([...baixo_corrido, ...baixo_corrido], { onda: 'triangulo', volume: 0.3, bpm, queda: 0.06, sustento: 0.5 }),
		canal_bateria(rep('k h s h k k s h k h s h k k s s', 8), { volume: 0.38, bpm }),
	)
	salvar('musica_chefe', musica)
}

// ---------------------------------------------------------------- música do título (lá menor, 92 bpm, sombria)

{
	const bpm = 92
	const acordes = [['A3', 'C4', 'E4', 'A4'], ['F3', 'A3', 'C4', 'F4'], ['D3', 'F3', 'A3', 'D4'], ['E3', 'G#3', 'B3', 'E4']]
	const melodia = [
		'E5 . . . . . . . D5 . C5 . B4 . . .',
		'C5 . . . . . . . A4 . . . - - - -',
		'D5 . . . F5 . . . E5 . D5 . C5 . . .',
		'B4 . . . . . . . G#4 . . . - - - -',
	]
	const musica = misturar(
		canal_melodico([...acordes, ...acordes].map((a) => arpejo(a, [0, 1, 2, 3, 2, 1])), { onda: 'triangulo', volume: 0.16, bpm, queda: 0.18, sustento: 0.3 }),
		canal_melodico([...rep('- - - - - - - - - - - - - - - -', 4), ...melodia], { onda: 'fina', volume: 0.13, bpm, queda: 0.6, sustento: 0.5, vibrato: 0.01 }),
		canal_melodico(['A1 . . . . . . . . . . . . . . .', 'F1 . . . . . . . . . . . . . . .', 'D2 . . . . . . . . . . . . . . .', 'E2 . . . . . . . . . . . . . . .'].concat(
			['A1 . . . . . . . . . . . . . . .', 'F1 . . . . . . . . . . . . . . .', 'D2 . . . . . . . . . . . . . . .', 'E2 . . . . . . . . . . . . . . .']), { onda: 'triangulo', volume: 0.3, bpm, queda: 1.5, sustento: 0.4 }),
	)
	salvar('musica_titulo', musica)
}

// ---------------------------------------------------------------- vinhetas

// subiu de fase: arpejo rápido subindo
salvar('fase', canal_melodico(['A4 C5 E5 A5 . . . . - - - - - - - -'], { onda: 'fina', volume: 0.3, bpm: 260, queda: 0.15, sustento: 0.5 }))

// fim de jogo: descendo devagar
salvar('fim', misturar(
	canal_melodico(['E5 . . . D5 . . . C5 . . . B4 . . .', 'A4 . . . . . . . . . . . - - - -'], { onda: 'fina', volume: 0.28, bpm: 150, queda: 0.4, sustento: 0.5, vibrato: 0.012 }),
	canal_melodico(['A2 . . . . . . . G2 . . . . . . .', 'A1 . . . . . . . . . . . - - - -'], { onda: 'triangulo', volume: 0.32, bpm: 150, queda: 0.8, sustento: 0.5 }),
))

// ---------------------------------------------------------------- efeitos sonoros

function gerar(duracao, f) {
	const n = Math.floor(duracao * TAXA)
	const saida = new Float32Array(n)
	let fase = 0
	for (let i = 0; i < n; i++) {
		const t = i / TAXA
		saida[i] = f(t, i / n, (freq) => { fase += freq / TAXA; return fase % 1 })
	}
	return saida
}
const { quadrada, serra } = ONDAS

// tiro: "piu" de onda quadrada caindo de 1100 para 250 Hz
salvar('tiro', gerar(0.09, (t, p, osc) => quadrada(osc(1100 - 850 * p)) * 0.35 * (1 - p)))

// laser: zumbido agudo subindo e caindo rápido
salvar('laser', gerar(0.16, (t, p, osc) => ONDAS.fina(osc(1800 + Math.sin(p * Math.PI) * 900 - p * 1200)) * 0.22 * (1 - p)))

// foguete saindo: chiado com um tom grave
let anterior = 0
salvar('foguete', gerar(0.35, (t, p, osc) => {
	anterior = anterior * 0.85 + ruido() * 0.15
	return (anterior * 2 + serra(osc(110 - 50 * p)) * 0.2) * Math.min(1, p * 20) * (1 - p) * 0.8
}))

// acerto no zumbi: batidinha curta de ruído grave
anterior = 0
salvar('acerto', gerar(0.07, (t, p) => { anterior = anterior * 0.75 + ruido() * 0.25; return anterior * 1.6 * (1 - p) }))

// explosão: ruído que vai ficando mais grave e some devagar
anterior = 0
salvar('explosao', gerar(0.75, (t, p) => {
	const filtro = 0.5 - p * 0.42
	anterior = anterior * (1 - filtro) + ruido() * filtro
	return anterior * 1.8 * Math.pow(1 - p, 1.6)
}))

// zumbi morrendo: gemido em dente de serra descendo, com um pouco de ruído
salvar('zumbi_morre', gerar(0.5, (t, p, osc) => {
	const freq = 190 - 130 * p + Math.sin(t * 40) * 12
	return (serra(osc(freq)) * 0.3 + ruido() * 0.08) * Math.min(1, p * 12) * (1 - p)
}))

// rugido do chefão: grave, longo e rasgado
anterior = 0
salvar('rugido', gerar(1.3, (t, p, osc) => {
	anterior = anterior * 0.7 + ruido() * 0.3
	const freq = 95 + Math.sin(t * 9) * 15 - 40 * p
	return (serra(osc(freq)) * 0.4 + anterior * 0.5) * Math.min(1, p * 6) * Math.pow(1 - p, 0.8)
}))

// cuspe: "plop" molhado
salvar('cuspe', gerar(0.14, (t, p, osc) => (Math.sin(osc(500 - 380 * p) * 2 * Math.PI) * 0.4 + ruido() * 0.1 * (1 - p)) * (1 - p)))

// pegar item: arpejo subindo (dó, mi, sol, dó)
const notas_item = [523, 659, 784, 1047]
salvar('item', gerar(0.28, (t, p, osc) => quadrada(osc(notas_item[Math.min(3, Math.floor(p * 4))])) * 0.22 * (1 - p * 0.5)))

// poder (escudo, botas, gelo): brilho subindo com vibrato
salvar('poder', gerar(0.5, (t, p, osc) => ONDAS.triangulo(osc(600 + 900 * p + Math.sin(t * 50) * 40)) * 0.35 * (1 - p)))

// escudo quebrando: vidro
salvar('escudo_quebra', gerar(0.3, (t, p, osc) => (ONDAS.finissima(osc(2400 - 1600 * p)) * 0.2 + ruido() * 0.2) * Math.pow(1 - p, 2)))

// perder vida: tom descendo com vibrato
salvar('perder_vida', gerar(0.55, (t, p, osc) => quadrada(osc(520 - 380 * p + Math.sin(t * 60) * 25)) * 0.3 * (1 - p)))

// bomba arremessada: assobio descendo
salvar('arremesso', gerar(0.25, (t, p, osc) => Math.sin(osc(1400 - 700 * p) * 2 * Math.PI) * 0.25 * Math.sin(p * Math.PI)))

// trovão: estalo seco seguido de um ronco grave que vai sumindo
anterior = 0
let anterior2 = 0
salvar('trovao', gerar(2.6, (t, p) => {
	anterior = anterior * 0.96 + ruido() * 0.04 // ruído bem grave (ronco)
	anterior2 = anterior2 * 0.5 + ruido() * 0.5 // ruído agudo (estalo)
	const estalo = t < 0.25 ? anterior2 * (1 - t / 0.25) * 0.6 : 0
	const ronco = anterior * 9 * Math.min(1, t * 6) * Math.pow(1 - p, 1.4) * (0.8 + 0.2 * Math.sin(t * 13))
	return estalo + ronco
}))

// fantasma: uivo que sobe e desce
salvar('fantasma', gerar(0.6, (t, p, osc) => Math.sin(osc(380 + Math.sin(p * Math.PI * 2) * 120) * 2 * Math.PI) * 0.25 * Math.sin(p * Math.PI)))

// combo: plim curto (toca mais agudo conforme o multiplicador)
salvar('combo', gerar(0.12, (t, p, osc) => ONDAS.fina(osc(1320)) * 0.2 * (1 - p)))
