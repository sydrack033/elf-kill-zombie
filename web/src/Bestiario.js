import Phaser from 'phaser'
import { ALTURA, ajustar_tela, texto, ler_estatisticas } from './tela.js'
import { ZUMBIS, CHEFES } from './regras.js'

// Galeria dos inimigos que o jogador já encontrou (tecla B na tela de título).
const CHAVE = 'elf-kill-zombie-vistos'

const FICHAS = [
	{ tipo: 'comum', nome: 'ZUMBI', texto: 'DESCE DEVAGAR.\nALGUNS VÃO ATRÁS DE VOCÊ.' },
	{ tipo: 'corredor', nome: 'CORREDOR', texto: 'PEQUENO E RÁPIDO.\nMORRE COM UM TIRO.' },
	{ tipo: 'brutamontes', nome: 'BRUTAMONTES', texto: 'LENTO E MUITO FORTE.\nNÃO RECUA.' },
	{ tipo: 'cuspidor', nome: 'CUSPIDOR', texto: 'PARA LÁ EM CIMA\nE COSPE EM VOCÊ.' },
	{ tipo: 'bombado', nome: 'BOMBADO', texto: 'EXPLODE QUANDO MORRE.\nNÃO FIQUE PERTO.' },
	{ tipo: 'fantasma', nome: 'FANTASMA', texto: 'SOME DE VEZ EM QUANDO;\nO TIRO PASSA DIRETO.' },
	{ tipo: 'escavador', nome: 'ESCAVADOR', texto: 'SAI DA TERRA PERTO DE\nVOCÊ. A TERRA TREME ANTES.' },
	{ tipo: 'coveiro', nome: 'COVEIRO', texto: 'A LÁPIDE SEGURA O TIRO.\nACERTE DE LADO OU EXPLODA.' },
	{ tipo: 'gosma', nome: 'GOSMA', texto: 'QUANDO MORRE, VIRA\nDUAS GOSMINHAS.' },
	{ tipo: 'corvo', nome: 'CORVO', texto: 'VEM EM BANDO,\nVOANDO EM DIAGONAL.' },
	...CHEFES.map((c, i) => ({ tipo: 'chefe' + (i + 1), nome: c.nome, texto: 'CHEFÃO DA FASE ' + (i + 1) * 5 + '.', chefe: c })),
]

// devolve a ficha do inimigo se for a primeira vez que ele aparece (senão, null)
export function marcar_visto(tipo) {
	try {
		const vistos = new Set(JSON.parse(localStorage.getItem(CHAVE) || '[]'))
		if (!vistos.has(tipo)) {
			vistos.add(tipo)
			localStorage.setItem(CHAVE, JSON.stringify([...vistos]))
			return FICHAS.find((f) => f.tipo == tipo) || null
		}
	} catch {
		// sem localStorage: a galeria só não guarda
	}
	return null
}

function ler_vistos() {
	try {
		return new Set(JSON.parse(localStorage.getItem(CHAVE) || '[]'))
	} catch {
		return new Set()
	}
}

export default class Bestiario extends Phaser.Scene {
	constructor() {
		super('Bestiario')
	}

	create() {
		this.chao = this.add.tileSprite(0, 0, 10, ALTURA, 'chao').setOrigin(0).setTint(0x505868)
		const vistos = ler_vistos()
		const abatidos = ler_estatisticas().por_tipo || {}
		this.titulo = texto(this, 0, 14, 'BESTIÁRIO  ' + FICHAS.filter((f) => vistos.has(f.tipo)).length + '/' + FICHAS.length, 16, '#ffd34d').setOrigin(0.5, 0)
		this.cartas = FICHAS.map((ficha) => {
			const visto = vistos.has(ficha.tipo)
			const fundo = this.add.rectangle(0, 0, 92, 84, 0x101018, 0.75).setStrokeStyle(1, visto ? 0x6a8a5a : 0x3a3a44)
			let figura
			if (ficha.chefe) {
				figura = this.add.sprite(0, 0, 'chefe', 0).setScale(0.6)
				if (ficha.chefe.cor) figura.setTint(ficha.chefe.cor)
			}
			else if (ficha.tipo == 'corvo') {
				figura = this.add.sprite(0, 0, 'corvo', 0).setScale(2)
			}
			else {
				const regra = ZUMBIS[ficha.tipo]
				figura = this.add.sprite(0, 0, 'zumbi', 0).setScale(Math.min(1, regra.escala))
				if (regra.cor) figura.setTint(regra.cor)
			}
			// ainda não visto: só a silhueta
			if (!visto) {
				figura.setTint(0x000000).setTintMode(Phaser.TintModes.FILL).setAlpha(0.6)
			}
			const nome = texto(this, 0, 0, visto ? ficha.nome : '???', 8, visto ? '#ffffff' : '#6a6a70').setOrigin(0.5)
			const n = abatidos[ficha.tipo] || 0
			const desc = texto(this, 0, 0, visto ? ficha.texto : '', 8, '#9fbf8a').setOrigin(0.5, 0).setLineSpacing(1).setScale(0.75)
			// quantos já foram abatidos em todas as partidas, no canto de cima da carta
			const conta = texto(this, 0, 0, visto && !ficha.chefe ? 'x' + n.toLocaleString('pt-BR') : '', 8, '#ffd34d').setOrigin(1, 0)
			return { fundo, figura, nome, desc, conta, ficha, base: figura.scaleX }
		})
		this.voltar = texto(this, 0, ALTURA - 12, 'ESC, ESPAÇO OU CLIQUE: VOLTAR', 8, '#cfcfcf').setOrigin(0.5)
		ajustar_tela(this)
		this.cameras.main.fadeIn(250, 0, 0, 0)

		const voltar = () => this.scene.start('Titulo')
		this.input.keyboard.once('keydown-ESC', voltar)
		this.input.keyboard.once('keydown-SPACE', voltar)
		this.input.keyboard.once('keydown-B', voltar)
		this.input.once('pointerdown', voltar)
		if (this.input.gamepad) this.input.gamepad.once('down', voltar)
	}

	// cartas em grade: quantas colunas couberem na largura
	ao_redimensionar() {
		this.chao.setSize(this.largura, ALTURA)
		this.titulo.x = this.largura / 2
		this.voltar.x = this.largura / 2
		const colunas = Math.max(2, Math.min(6, Math.floor((this.largura - 10) / 98)))
		const linhas = Math.ceil(this.cartas.length / colunas)
		const escala = Math.min(1, (ALTURA - 60) / (linhas * 90))
		const largura_grade = colunas * 98 * escala
		this.cartas.forEach((c, i) => {
			const coluna = i % colunas
			const linha = Math.floor(i / colunas)
			const x = (this.largura - largura_grade) / 2 + (coluna + 0.5) * 98 * escala
			const y = 42 + (linha + 0.5) * 90 * escala
			c.fundo.setPosition(x, y).setScale(escala)
			c.figura.setPosition(x, y - 18 * escala).setScale(c.base * escala)
			c.nome.setPosition(x, y + 12 * escala).setScale(escala)
			c.desc.setPosition(x, y + 20 * escala).setScale(0.75 * escala)
			c.conta.setPosition(x + 43 * escala, y - 39 * escala).setScale(0.75 * escala)
		})
	}

	update() {
		this.chao.tilePositionY -= 0.2
		// os vistos ficam andando no lugar
		const quadro = Math.floor(this.time.now / 140) % 7
		for (const c of this.cartas) {
			c.figura.setFrame(c.ficha.tipo == 'corvo' ? [0, 1, 2, 1][quadro % 4] : quadro)
		}
	}
}
