import Phaser from 'phaser'
import { ALTURA, ajustar_tela, texto } from './tela.js'
import { efeito } from './opcoes.js'

const FRASES = [
	'NAQUELA NOITE, O SINO DO CEMITÉRIO TOCOU SOZINHO.',
	'UM POR UM, OS MORTOS SAÍRAM DAS COVAS...',
	'...E COMEÇARAM A ANDAR EM DIREÇÃO À VILA.',
	'SÓ UM ELFO FICOU NO CAMINHO.',
	'ESSE ELFO É VOCÊ.',
]

// Introdução contada frase por frase, como uma máquina de escrever.
// Aparece sozinha antes da primeira partida e depois na tecla H da tela de título.
export default class Historia extends Phaser.Scene {
	constructor() {
		super('Historia')
	}

	create() {
		this.chao = this.add.tileSprite(0, 0, 10, ALTURA, 'chao').setOrigin(0).setTint(0x404860)
		this.linhas = FRASES.map((_, i) => texto(this, 0, 110 + i * 26, '', 8, i == FRASES.length - 1 ? '#ffd34d' : '#e8f5c8').setOrigin(0.5))
		this.pular = texto(this, 0, ALTURA - 16, 'QUALQUER TECLA OU CLIQUE: PULAR', 8, '#8a8a90').setOrigin(0.5)
		// zumbis atravessando devagar no fundo
		this.zumbis = [0, 1, 2].map((i) => this.add.sprite(-40 - i * 70, 300 + (i % 2) * 18, 'zumbi', i * 2).setAlpha(0.7))

		this.frase = 0
		this.letra = 0
		this.ha = 0
		this.pausa = 0
		ajustar_tela(this)
		this.cameras.main.fadeIn(400, 0, 0, 0)

		let saiu = false
		const ir = () => {
			if (saiu) return
			saiu = true
			try {
				localStorage.setItem('elf-kill-zombie-historia', 'vista')
			} catch {
				// sem localStorage: mostra de novo na próxima vez
			}
			this.cameras.main.fadeOut(300, 0, 0, 0)
			this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.depois))
		}
		this.ir = ir
		this.depois = (this.scene.settings.data && this.scene.settings.data.depois) || 'Jogo'
		this.time.delayedCall(400, () => {
			this.input.keyboard.on('keydown', ir)
			this.input.on('pointerdown', ir)
			if (this.input.gamepad) this.input.gamepad.on('down', ir)
		})
	}

	ao_redimensionar() {
		const meio = this.largura / 2
		this.chao.setSize(this.largura, ALTURA)
		for (const linha of this.linhas) linha.x = meio
		this.pular.x = meio
	}

	update(time, delta) {
		const passo = Math.min(delta, 50) / 10
		this.chao.tilePositionY -= 0.2 * passo
		for (const z of this.zumbis) {
			z.x += 0.25 * passo
			z.setFrame(Math.floor(time / 120) % 7)
			if (z.x > this.largura + 40) z.x = -40
		}

		if (this.frase >= FRASES.length) {
			this.ha += passo
			if (this.ha > 220) this.ir()
			return
		}
		if (this.pausa > 0) {
			this.pausa -= passo
			return
		}
		this.ha += passo
		// uma letra a cada 4 ticks, com um "tec" baixinho
		if (this.ha >= 4) {
			this.ha = 0
			const frase = FRASES[this.frase]
			this.letra++
			this.linhas[this.frase].setText(frase.slice(0, this.letra))
			if (frase[this.letra - 1] != ' ') {
				efeito(this, 'tiro', { volume: 0.06, rate: 2.2 })
			}
			if (this.letra >= frase.length) {
				this.frase++
				this.letra = 0
				this.pausa = 70 // respira entre uma frase e outra
			}
		}
	}
}
