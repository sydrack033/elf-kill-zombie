import Phaser from 'phaser'
import { ALTURA, ajustar_tela, texto } from './tela.js'
import { desafios_de_hoje, PREMIO } from './desafios.js'

// Desafios do dia (tecla D no título): 3 missões que mudam à meia-noite.
export default class DesafiosCena extends Phaser.Scene {
	constructor() {
		super('Desafios')
	}

	create() {
		this.chao = this.add.tileSprite(0, 0, 10, ALTURA, 'chao').setOrigin(0).setTint(0x506058)
		this.titulo = texto(this, 0, 40, 'DESAFIOS DE HOJE', 16, '#ffd34d').setOrigin(0.5)
		this.sub = texto(this, 0, 64, 'CUMPRA NUMA PARTIDA SÓ. CADA UM VALE ' + PREMIO + ' MOEDAS.', 8, '#9fbf8a').setOrigin(0.5)
		this.linhas = desafios_de_hoje().map((d, i) => {
			const y = 110 + i * 52
			const fundo = this.add.rectangle(0, y, 10, 40, d.feita ? 0x1c3018 : 0x101018, 0.8).setStrokeStyle(1, d.feita ? 0x6ac04a : 0x3a3a44)
			const marca = this.add.sprite(0, y, 'trofeu', d.feita ? 0 : 1).setScale(1.5)
			const nome = texto(this, 0, y, d.texto, 8, d.feita ? '#9ff07a' : '#ffffff').setOrigin(0, 0.5)
			const estado = texto(this, 0, y, d.feita ? 'FEITO!' : '+' + PREMIO, 8, d.feita ? '#9ff07a' : '#ffd34d').setOrigin(1, 0.5)
			return { fundo, marca, nome, estado }
		})
		// quanto falta para trocar
		const agora = new Date()
		const meia_noite = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1)
		const minutos = Math.ceil((meia_noite - agora) / 60000)
		this.troca = texto(this, 0, 280, 'NOVOS DESAFIOS EM ' + Math.floor(minutos / 60) + 'H ' + (minutos % 60) + 'MIN', 8, '#cfcfcf').setOrigin(0.5)
		this.voltar = texto(this, 0, ALTURA - 14, 'ESC, ESPAÇO OU CLIQUE: VOLTAR', 8, '#cfcfcf').setOrigin(0.5)

		ajustar_tela(this)
		this.cameras.main.fadeIn(250, 0, 0, 0)
		const voltar = () => this.scene.start('Titulo')
		this.input.keyboard.once('keydown-ESC', voltar)
		this.input.keyboard.once('keydown-SPACE', voltar)
		this.input.keyboard.once('keydown-D', voltar)
		this.input.once('pointerdown', voltar)
		if (this.input.gamepad) this.input.gamepad.once('down', voltar)
	}

	ao_redimensionar() {
		const meio = this.largura / 2
		const largura = Math.min(330, this.largura - 12)
		const esquerda = meio - largura / 2
		this.chao.setSize(this.largura, ALTURA)
		for (const o of [this.titulo, this.sub, this.troca, this.voltar]) o.x = meio
		this.sub.setScale(Math.min(1, (this.largura - 8) / this.sub.width))
		for (const l of this.linhas) {
			l.fundo.setSize(largura, 40).setPosition(meio, l.fundo.y)
			l.marca.x = esquerda + 16
			l.nome.x = esquerda + 30
			l.estado.x = esquerda + largura - 10
			l.nome.setScale(Math.min(1, (largura - 30 - 50) / l.nome.width))
		}
	}

	update() {
		this.chao.tilePositionY -= 0.2
	}
}