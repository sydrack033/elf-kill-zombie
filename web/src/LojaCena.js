import Phaser from 'phaser'
import { ALTURA, ajustar_tela, texto } from './tela.js'
import { efeito } from './opcoes.js'
import { PRODUTOS, ler_loja, preco, comprar } from './moedas.js'

// Loja (tecla L no título): gasta as moedas das partidas em vantagens para o começo do jogo.
export default class Loja extends Phaser.Scene {
	constructor() {
		super('Loja')
	}

	create() {
		this.chao = this.add.tileSprite(0, 0, 10, ALTURA, 'chao').setOrigin(0).setTint(0x605848)
		this.titulo = texto(this, 0, 16, 'LOJA DO ELFO', 16, '#ffd34d').setOrigin(0.5, 0)
		this.carteira = texto(this, 0, 44, '', 8, '#ffd34d').setOrigin(0, 0.5)
		this.icone = this.add.sprite(0, 44, 'moeda').setScale(1.5)
		this.linhas = PRODUTOS.map((produto, i) => {
			const y = 66 + i * 44
			const fundo = this.add.rectangle(0, y, 10, 38, 0x101018, 0.75).setOrigin(0.5, 0).setStrokeStyle(1, 0x3a3a44)
				.setInteractive({ useHandCursor: true })
			fundo.on('pointerover', () => this.escolher(i))
			fundo.on('pointerdown', () => {
				this.escolher(i)
				this.comprar_escolhido()
			})
			const nome = texto(this, 0, y + 6, produto.nome, 8, '#ffffff')
			const desc = texto(this, 0, y + 18, produto.texto, 8, '#9fbf8a')
			// um quadradinho por nível: aceso = comprado
			const nivel = produto.custo.map(() => this.add.rectangle(0, y + 10, 6, 6, 0x3a3a44).setStrokeStyle(1, 0x000000))
			const valor = texto(this, 0, y + 18, '', 8, '#ffd34d').setOrigin(1, 0)
			return { produto, fundo, nome, desc, nivel, valor }
		})
		this.ajuda = texto(this, 0, ALTURA - 14, '', 8, '#cfcfcf').setOrigin(0.5)
		this.escolhido = 0
		this.atualizar()

		ajustar_tela(this)
		this.cameras.main.fadeIn(250, 0, 0, 0)

		const voltar = () => this.scene.start('Titulo')
		this.input.keyboard.once('keydown-ESC', voltar)
		this.input.keyboard.once('keydown-L', voltar)
		this.input.keyboard.on('keydown-UP', () => this.escolher(this.escolhido - 1))
		this.input.keyboard.on('keydown-DOWN', () => this.escolher(this.escolhido + 1))
		this.input.keyboard.on('keydown-W', () => this.escolher(this.escolhido - 1))
		this.input.keyboard.on('keydown-S', () => this.escolher(this.escolhido + 1))
		this.input.keyboard.on('keydown-ENTER', () => this.comprar_escolhido())
		this.input.keyboard.on('keydown-SPACE', () => this.comprar_escolhido())
		// controle: direcional escolhe, A compra, B volta
		if (this.input.gamepad) {
			this.input.gamepad.on('down', (pad, botao) => {
				if (botao.index == 12) this.escolher(this.escolhido - 1)
				else if (botao.index == 13) this.escolher(this.escolhido + 1)
				else if (botao.index == 0) this.comprar_escolhido()
				else if (botao.index == 1 || botao.index == 8) voltar()
			})
		}
		// no celular: tocar fora das linhas volta
		this.input.on('pointerdown', (p, alvos) => {
			if (!alvos.length) voltar()
		})
		this.ajuda.setText(this.sys.game.device.os.desktop
			? 'SETAS: ESCOLHER   ENTER: COMPRAR   ESC: VOLTAR'
			: 'TOQUE PARA COMPRAR   TOQUE FORA PARA VOLTAR')
	}

	escolher(i) {
		const n = this.linhas.length
		this.escolhido = (i + n) % n
		this.atualizar()
	}

	comprar_escolhido() {
		const linha = this.linhas[this.escolhido]
		if (comprar(linha.produto)) {
			efeito(this, 'item', { volume: 0.7, rate: 1.1 })
			this.cameras.main.flash(150, 255, 220, 120)
			this.tweens.add({ targets: [linha.nome], scale: 1.15, duration: 90, yoyo: true })
		}
		else {
			efeito(this, 'acerto', { volume: 0.5, rate: 0.6 })
			this.tweens.add({ targets: this.carteira, x: this.carteira.x + 3, duration: 40, yoyo: true, repeat: 2 })
		}
		this.atualizar()
	}

	atualizar() {
		const loja = ler_loja()
		this.carteira.setText(loja.moedas + ' MOEDAS')
		this.linhas.forEach((l, i) => {
			const nivel = loja.compras[l.produto.id] || 0
			const custo = preco(loja, l.produto)
			l.nivel.forEach((q, n) => q.setFillStyle(n < nivel ? 0x9ff07a : 0x3a3a44))
			l.valor.setText(custo == null ? 'COMPLETO' : custo + ' MOEDAS')
			l.valor.setColor(custo == null ? '#9ff07a' : loja.moedas >= custo ? '#ffd34d' : '#8a6a6a')
			l.fundo.setStrokeStyle(i == this.escolhido ? 2 : 1, i == this.escolhido ? 0xffd34d : 0x3a3a44)
		})
		if (this.largura) this.ao_redimensionar()
	}

	ao_redimensionar() {
		const meio = this.largura / 2
		const largura = Math.min(320, this.largura - 12)
		const esquerda = meio - largura / 2
		this.chao.setSize(this.largura, ALTURA)
		this.titulo.x = meio
		this.ajuda.x = meio
		this.ajuda.setScale(Math.min(1, (this.largura - 8) / this.ajuda.width))
		this.icone.x = meio - this.carteira.width / 2 - 4
		this.carteira.x = this.icone.x + 7
		for (const l of this.linhas) {
			l.fundo.setSize(largura, 38).setPosition(meio, l.fundo.y)
			l.fundo.input.hitArea.setSize(largura, 38)
			l.nome.x = esquerda + 8
			l.desc.x = esquerda + 8
			l.nivel.forEach((q, n) => (q.x = esquerda + largura - 11 - (l.nivel.length - 1 - n) * 9))
			l.valor.x = esquerda + largura - 8
			// em tela estreita a descrição encolhe para não encostar no preço
			const espaco = largura - 16 - l.valor.width - 6
			l.desc.setScale(Math.min(1, espaco / l.desc.width))
		}
	}

	update() {
		this.chao.tilePositionY -= 0.2
	}
}