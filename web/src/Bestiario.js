import Phaser from 'phaser'
import { ALTURA, ajustar_tela, texto, ler_estatisticas } from './tela.js'
import { ZUMBIS, CHEFES, CHEFE_FINAL, ITENS, ARMAS, PODERES } from './regras.js'

// Galeria dos inimigos que o jogador já encontrou (tecla B na tela de título).
const CHAVE = 'elf-kill-zombie-vistos'
const ABAS = ['INIMIGOS', 'CAIXAS', 'EVENTOS']

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
	{ tipo: 'tamborzeiro', nome: 'TAMBORZEIRO', texto: 'OS ZUMBIS PERTO DELE\nANDAM MAIS RÁPIDO.' },
	{ tipo: 'cova', nome: 'COVA ABERTA', texto: 'SOLTA ZUMBIS ATÉ SER\nQUEBRADA. DÁ MOEDAS.' },
	{ tipo: 'morcego', nome: 'MORCEGO', texto: 'VOA EM ZIGUE-ZAGUE\nE MERGULHA EM VOCÊ.' },
	{ tipo: 'corvo', nome: 'CORVO', texto: 'VEM EM BANDO,\nVOANDO EM DIAGONAL.' },
	{ tipo: 'saqueador', nome: 'SAQUEADOR', texto: 'FOGE DE LADO COM MOEDAS.\nPEGUE ANTES QUE SUMA!' },
	...CHEFES.map((c, i) => ({ tipo: 'chefe' + (i + 1), nome: c.nome, texto: 'CHEFÃO DA FASE ' + (i + 1) * 5 + '.', chefe: c })),
	{ tipo: 'chefe_final', nome: CHEFE_FINAL.nome, texto: 'O CHEFÃO FINAL,\nNA FASE ' + CHEFE_FINAL.fase + '.', chefe: CHEFE_FINAL },
]

// nome do inimigo para mostrar (ex.: 'brutamontes' -> 'BRUTAMONTES')
export function nome_de(tipo) {
	const ficha = FICHAS.find((f) => f.tipo == tipo)
	return ficha ? ficha.nome : tipo.toUpperCase()
}

// devolve a ficha do inimigo se for a primeira vez que ele aparece (senão, null)
// eventos e perigos (aba EVENTOS): nome, cor e explicação
const EVENTOS = [
	{ nome: 'HORDA', cor: '#ff6a6a', texto: 'NA METADE DAS FASES 8, 13, 18... VEM UMA ENXURRADA DE ZUMBIS. SOBREVIVA E GANHE UM PRÊMIO.' },
	{ nome: 'LUA DE SANGUE', cor: '#ff5a5a', texto: 'UMA FASE INTEIRA COM ZUMBIS MAIS RÁPIDOS, MAS QUE VALEM O DOBRO DE PONTOS.' },
	{ nome: 'ECLIPSE', cor: '#9fd8ff', texto: 'A FASE FICA ESCURA: SÓ DÁ PARA VER EM VOLTA DO ELFO E DAS EXPLOSÕES.' },
	{ nome: 'ZUMBI DE ELITE', cor: '#ffd34d', texto: 'DOURADO, MAIOR E MAIS FORTE. SEMPRE SOLTA UMA CAIXA E DÁ MOEDAS.' },
	{ nome: 'LODO (PÂNTANO)', cor: '#9fbf8a', texto: 'POÇAS QUE DESCEM COM O CHÃO E DEIXAM O ELFO LENTO.' },
	{ nome: 'ESCOMBROS, METEOROS E GRANIZO', cor: '#ff9a3c', texto: 'CAEM DO CÉU NAS RUÍNAS, NO INFERNO E NO GELO. A SOMBRA NO CHÃO AVISA ANTES.' },
	{ nome: 'CHEFÃO ENFURECIDO', cor: '#ff8a7a', texto: 'COM METADE DA VIDA, O CHEFÃO ANDA E ATACA MAIS RÁPIDO.' },
	{ nome: 'CHUVA DE MOEDAS', cor: '#ffd34d', texto: 'DEPOIS DO 2º, 4º, 6º... CHEFÃO: ALGUNS SEGUNDOS SEM ZUMBIS, COM MOEDAS CAINDO DO CÉU.' },
	{ nome: 'FASE PERFEITA', cor: '#9ff07a', texto: 'PASSE UMA FASE SEM APANHAR: PONTOS EXTRAS E UMA MOEDA.' },
]

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
		// duas abas: os inimigos e as caixas (o que cada uma faz)
		this.abas = ABAS.map((nome, i) => {
			const aba = texto(this, 0, 42, nome, 8, '#ffffff').setOrigin(0.5).setInteractive({ useHandCursor: true })
			aba.on('pointerdown', () => this.mostrar_aba(i))
			return aba
		})
		this.eventos = EVENTOS.map((e) => ({
			nome: texto(this, 0, 0, e.nome, 8, e.cor),
			desc: texto(this, 0, 0, e.texto, 8, '#cfcfcf').setAlign('left').setLineSpacing(2),
		}))
		this.caixas = ITENS.map((item) => {
			const nome = ARMAS[item.tipo] ? ARMAS[item.tipo].nome : PODERES[item.tipo] ? PODERES[item.tipo].nome : item.tipo.toUpperCase()
			return {
				icone: this.add.sprite(0, 0, 'itens', item.quadro).setScale(1.5),
				nome: texto(this, 0, 0, nome, 8, '#ffd34d'),
				desc: texto(this, 0, 0, item.texto || '', 8, '#cfcfcf'),
			}
		})
		this.cartas = FICHAS.map((ficha) => {
			const visto = vistos.has(ficha.tipo)
			const fundo = this.add.rectangle(0, 0, 92, 84, 0x101018, 0.75).setStrokeStyle(1, visto ? 0x6a8a5a : 0x3a3a44)
			let figura
			if (ficha.chefe) {
				figura = this.add.sprite(0, 0, 'chefe', 0).setScale(0.6)
				if (ficha.chefe.cor) figura.setTint(ficha.chefe.cor)
			}
			else if (ZUMBIS[ficha.tipo] && ZUMBIS[ficha.tipo].ninho) {
				figura = this.add.sprite(0, 0, 'lapide', 0).setScale(1.6).setTint(0x9a9aa8)
			}
			else if (ZUMBIS[ficha.tipo] && ZUMBIS[ficha.tipo].voa) {
				figura = this.add.sprite(0, 0, 'corvo', 0).setScale(2)
				if (ZUMBIS[ficha.tipo].cor) figura.setTint(ZUMBIS[ficha.tipo].cor)
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
			const conta = texto(this, 0, 0, visto && !ficha.chefe ? 'x' + n.toLocaleString('pt-BR') : visto ? 'TREINAR' : '', 8, ficha.chefe ? '#9fd8ff' : '#ffd34d').setOrigin(1, 0)
			// chefão já visto: tocar na carta começa um treino contra ele
			if (visto && ficha.chefe) {
				const numero = ficha.tipo == 'chefe_final' ? CHEFE_FINAL.fase / 5 : Number(ficha.tipo.slice(5))
				fundo.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('Jogo', { treino: numero }))
			}
			return { fundo, figura, nome, desc, conta, ficha, base: figura.scaleX }
		})
		this.voltar = texto(this, 0, ALTURA - 12, 'ESC, ESPAÇO OU CLIQUE: VOLTAR', 8, '#cfcfcf').setOrigin(0.5)
		ajustar_tela(this)
		this.cameras.main.fadeIn(250, 0, 0, 0)

		const voltar = () => this.scene.start('Titulo')
		this.input.keyboard.once('keydown-ESC', voltar)
		this.input.keyboard.once('keydown-SPACE', voltar)
		this.input.keyboard.once('keydown-B', voltar)
		// tocar fora das abas volta; setas e TAB trocam de aba
		this.input.on('pointerdown', (p, alvos) => {
			if (!alvos.length) voltar()
		})
		this.input.keyboard.on('keydown-LEFT', () => this.mostrar_aba((this.aba + ABAS.length - 1) % ABAS.length))
		this.input.keyboard.on('keydown-RIGHT', () => this.mostrar_aba((this.aba + 1) % ABAS.length))
		this.input.keyboard.on('keydown-TAB', (ev) => {
			ev.preventDefault()
			this.mostrar_aba((this.aba + 1) % ABAS.length)
		})
		if (this.input.gamepad) {
			this.input.gamepad.on('down', (pad, botao) => {
				if (botao.index == 14 || botao.index == 4) this.mostrar_aba((this.aba + ABAS.length - 1) % ABAS.length)
				else if (botao.index == 15 || botao.index == 5) this.mostrar_aba((this.aba + 1) % ABAS.length)
				else voltar()
			})
		}
		this.mostrar_aba(0)
	}

	mostrar_aba(i) {
		this.aba = i
		this.abas.forEach((a, n) => a.setColor(n == i ? '#ffd34d' : '#8a8a90').setText(n == i ? '[ ' + ABAS[n] + ' ]' : ABAS[n]))
		for (const e of this.eventos) {
			e.nome.setVisible(i == 2)
			e.desc.setVisible(i == 2)
		}
		for (const c of this.cartas) {
			for (const o of [c.fundo, c.figura, c.nome, c.desc, c.conta]) o.setVisible(i == 0)
		}
		for (const c of this.caixas) {
			for (const o of [c.icone, c.nome, c.desc]) o.setVisible(i == 1)
		}
		if (this.largura) this.ao_redimensionar()
	}

	// cartas em grade: quantas colunas couberem na largura
	ao_redimensionar() {
		this.chao.setSize(this.largura, ALTURA)
		this.titulo.x = this.largura / 2
		this.voltar.x = this.largura / 2
		this.abas.forEach((a, i) => (a.x = this.largura / 2 + (i - (ABAS.length - 1) / 2) * Math.min(100, this.largura / 3.2)))
		// eventos: nome e explicação, um embaixo do outro
		const largura_eventos = Math.min(420, this.largura - 20)
		// em tela estreita a letra encolhe um pouco para caber tudo
		const escala_eventos = this.largura < 420 ? 0.8 : 1
		let y_evento = 58
		for (const e of this.eventos) {
			e.nome.setScale(escala_eventos).setPosition((this.largura - largura_eventos) / 2, y_evento)
			e.desc.setScale(escala_eventos).setWordWrapWidth(largura_eventos / escala_eventos).setPosition((this.largura - largura_eventos) / 2, y_evento + 10 * escala_eventos)
			y_evento += (14 + e.desc.height) * escala_eventos
		}
		// caixas: lista em uma ou duas colunas
		const colunas_caixas = this.largura >= 520 ? 2 : 1
		const largura_caixa = Math.min(250, (this.largura - 16) / colunas_caixas)
		const linhas_caixas = Math.ceil(this.caixas.length / colunas_caixas)
		const espaco = Math.min(30, (ALTURA - 80) / linhas_caixas)
		const x0 = (this.largura - largura_caixa * colunas_caixas) / 2
		this.caixas.forEach((c, i) => {
			const coluna = Math.floor(i / linhas_caixas)
			const y = 60 + (i % linhas_caixas) * espaco
			const x = x0 + coluna * largura_caixa
			c.icone.setPosition(x + 14, y + 8)
			c.nome.setPosition(x + 30, y)
			c.desc.setPosition(x + 30, y + 10).setScale(Math.min(1, (largura_caixa - 34) / c.desc.width))
		})
		const colunas = Math.max(2, Math.min(6, Math.floor((this.largura - 10) / 98)))
		const linhas = Math.ceil(this.cartas.length / colunas)
		const escala = Math.min(1, (ALTURA - 78) / (linhas * 90))
		const largura_grade = colunas * 98 * escala
		this.cartas.forEach((c, i) => {
			const coluna = i % colunas
			const linha = Math.floor(i / colunas)
			const x = (this.largura - largura_grade) / 2 + (coluna + 0.5) * 98 * escala
			const y = 54 + (linha + 0.5) * 90 * escala
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
			if (ZUMBIS[c.ficha.tipo] && ZUMBIS[c.ficha.tipo].ninho) continue
			c.figura.setFrame(ZUMBIS[c.ficha.tipo] && ZUMBIS[c.ficha.tipo].voa ? [0, 1, 2, 1][quadro % 4] : quadro)
		}
	}
}
