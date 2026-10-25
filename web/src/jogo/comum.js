// Funções e valores usados por várias partes da cena Jogo.
import * as R from '../regras.js'

// Igual à versão do Portugol, o jogo anda em "ticks" de 10 ms e cada tick roda
// entrada() -> processamento() -> saida(). Os números de dificuldade ficam em regras.js.

// verdadeiro se o retângulo a (x, y, largura, altura) encosta no retângulo b
export function encostou(ax, ay, al, aa, bx, by, bl, ba) {
	return ax < bx + bl && bx < ax + al && ay < by + ba && by < ay + aa
}

// sorteia um item de uma lista em que cada um tem um peso (chance relativa)
export function sortear(lista, peso, aleatorio = Math.random) {
	const total = lista.reduce((soma, item) => soma + peso(item), 0)
	let sorteio = aleatorio() * total
	for (const item of lista) {
		sorteio -= peso(item)
		if (sorteio < 0) {
			return item
		}
	}
	return lista[lista.length - 1]
}

// cor do segundo elfo (modo 2 jogadores)
export const COR_P2 = 0xd0a0ff

// o pedaço da tela que o corpo do zumbi ocupa (a imagem tem sobra transparente em volta)
export function corpo(zumbi) {
	const proprio = zumbi.regra.corpo // o corvo tem um corpo próprio, sem escala
	if (proprio) {
		return { x: zumbi.x + proprio.x, y: zumbi.y + proprio.y, l: proprio.l, a: proprio.a }
	}
	const e = zumbi.escala
	return {
		x: zumbi.x + R.CORPO_ZUMBI.x * e,
		y: zumbi.y + R.CORPO_ZUMBI.y * e,
		l: R.CORPO_ZUMBI.l * e,
		a: R.CORPO_ZUMBI.a * e,
	}
}

export function corpo_chefe(chefe) {
	const e = chefe.escala || R.CHEFE.escala
	const c = R.CHEFE.corpo
	return { x: chefe.x + c.x * e, y: chefe.y + c.y * e, l: c.l * e, a: c.a * e }
}

// sorteio com semente (mulberry32): a mesma semente dá sempre a mesma sequência
export function sorteador(semente) {
	let a = semente >>> 0
	return () => {
		a = (a + 0x6d2b79f5) >>> 0
		let t = a
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

// quem já jogou com toque continua com os controles na tela ao jogar de novo
export const memoria = { usou_toque: false }
