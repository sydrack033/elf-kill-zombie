import Phaser from 'phaser'
import { ALTURA, ajustar_tela, texto, tecla_tela_cheia, tecla_som, ler_recorde } from './tela.js'

export default class Titulo extends Phaser.Scene {
	constructor() {
		super('Titulo')
	}

	create() {
		this.chao = this.add.tileSprite(0, 0, 10, ALTURA, 'chao').setOrigin(0)

		this.nome = texto(this, 0, 90, 'ELF KILL\nZOMBIE', 24, '#e8f5c8').setOrigin(0.5)
		this.zumbi = this.add.sprite(0, 170, 'zumbi', 0)
		this.heroi = this.add.sprite(0, 275, 'heroi_parado_cima')

		this.comecar = texto(this, 0, 225, 'CLIQUE OU\nAPERTE ESPAÇO', 10, '#ffd34d').setOrigin(0.5)
		this.controles = texto(
			this, 0, 348,
			'WASD OU SETAS: ANDAR\nMOUSE: MIRAR E ATIRAR\nCLIQUE DIREITO: BOMBA\nP: PAUSA  F: TELA CHEIA\nM: SOM',
			8, '#cfcfcf',
		).setOrigin(0.5)
		this.controles.setLineSpacing(6)

		const recorde = ler_recorde()
		this.recorde = texto(this, 0, 300, recorde > 0 ? 'RECORDE: ' + recorde : '', 8, '#ffffff').setOrigin(0.5)

		this.quadro = 0
		ajustar_tela(this)
		tecla_tela_cheia(this)
		tecla_som(this)

		this.input.keyboard.once('keydown-SPACE', () => this.scene.start('Jogo'))
		this.input.once('pointerdown', () => this.scene.start('Jogo'))
	}

	ao_redimensionar() {
		const meio = this.largura / 2
		this.chao.setSize(this.largura, ALTURA)
		for (const objeto of [this.nome, this.zumbi, this.heroi, this.comecar, this.controles, this.recorde]) {
			objeto.x = meio
		}
	}

	update(time) {
		this.chao.tilePositionY -= 0.4
		this.quadro++
		this.zumbi.setFrame(Math.floor(this.quadro / 8) % 7)
		this.comecar.setVisible(Math.floor(time / 500) % 2 == 0)
	}
}
