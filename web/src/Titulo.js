import Phaser from 'phaser'
import { ALTURA, ajustar_tela, texto, tecla_tela_cheia, tecla_som, ler_recorde, ler_placar } from './tela.js'
import { tocar_musica, tecla_musica } from './musica.js'

// Tela de título: enquanto espera, roda uma demonstração no fundo (o elfo atirando nos zumbis).
export default class Titulo extends Phaser.Scene {
	constructor() {
		super('Titulo')
	}

	create() {
		this.chao = this.add.tileSprite(0, 0, 10, ALTURA, 'chao').setOrigin(0)

		// demonstração
		this.demo_zumbis = [] // { sprite, x, y, vida, morto_ha }
		this.demo_tiros = [] // { sprite, x, y }
		this.demo_sangues = []
		this.demo_heroi = this.add.sprite(0, ALTURA - 45, 'heroi_parado_cima').setOrigin(0.5, 0).setDepth(2)
		this.demo_arma = this.add.sprite(0, 0, 'armas', 0).setOrigin(3 / 16, 4 / 8).setRotation(-Math.PI / 2).setDepth(2)
		this.demo_x = 0
		this.demo_proximo = 0
		this.demo_espera_tiro = 0

		// véu escuro para o texto aparecer bem por cima da demonstração
		this.veu = this.add.rectangle(0, 0, 10, ALTURA, 0x000000, 0.45).setOrigin(0).setDepth(5)

		this.nome = texto(this, 0, 70, 'ELF KILL\nZOMBIE', 24, '#e8f5c8').setOrigin(0.5).setDepth(6)
		this.subtitulo = texto(this, 0, 120, 'O CEMITÉRIO NÃO DORME', 8, '#9fbf8a').setOrigin(0.5).setDepth(6)
		this.comecar = texto(this, 0, 165, 'CLIQUE OU\nAPERTE ESPAÇO', 10, '#ffd34d').setOrigin(0.5).setDepth(6)

		// placar dos 5 melhores
		const placar = ler_placar()
		const linhas = placar.length
			? ['MELHORES'].concat(placar.map((p, i) => i + 1 + '. ' + String(p.pontos).padStart(6, ' ') + '  FASE ' + p.fase))
			: ['RECORDE: ' + ler_recorde()]
		this.placar = texto(this, 0, 240, placar.length || ler_recorde() ? linhas.join('\n') : '', 8, '#ffffff').setOrigin(0.5).setDepth(6)

		this.controles = texto(
			this, 0, 318,
			'WASD/SETAS: ANDAR   MOUSE: MIRAR\nCLIQUE: ATIRAR   CLIQUE DIREITO: BOMBA\nP: PAUSA  F: TELA CHEIA  M: SOM  N: MÚSICA',
			8, '#cfcfcf',
		).setOrigin(0.5).setDepth(6)

		this.quadro = 0
		ajustar_tela(this)
		tecla_tela_cheia(this)
		tecla_som(this)
		tecla_musica(this)
		tocar_musica(this, 'musica_titulo')

		const comecar = () => this.scene.start('Jogo')
		this.input.keyboard.once('keydown-SPACE', comecar)
		this.input.keyboard.once('keydown-ENTER', comecar)
		this.input.once('pointerdown', comecar)
	}

	ao_redimensionar() {
		const meio = this.largura / 2
		this.chao.setSize(this.largura, ALTURA)
		this.veu.setSize(this.largura, ALTURA)
		for (const objeto of [this.nome, this.subtitulo, this.comecar, this.placar, this.controles]) {
			objeto.x = meio
		}
		// em tela estreita os controles ficam grandes demais: diminui para caber
		const escala = Math.min(1, (this.largura - 10) / this.controles.width)
		this.controles.setScale(escala)
		if (this.demo_x == 0) {
			this.demo_x = meio
		}
	}

	update(time, delta) {
		const passo = Math.min(delta, 50) / 10 // em ticks de 10 ms, como no jogo
		this.quadro += passo
		this.chao.tilePositionY -= 0.4 * passo
		this.comecar.setVisible(Math.floor(time / 500) % 2 == 0)
		this.nome.y = 70 + Math.sin(time / 600) * 3
		this.rodar_demo(passo)
	}

	rodar_demo(passo) {
		// aparece um zumbi de vez em quando
		this.demo_proximo -= passo
		if (this.demo_proximo <= 0) {
			this.demo_proximo = Phaser.Math.Between(90, 160)
			const x = Phaser.Math.Between(30, Math.max(31, Math.floor(this.largura - 30)))
			const sprite = this.add.sprite(x, -44, 'zumbi', 0).setOrigin(0.5, 0).setDepth(1)
			this.demo_zumbis.push({ sprite, x, y: -44, vida: 2, morto_ha: -1, xi: 0 })
		}

		// o elfo vai atrás do zumbi mais baixo e atira para cima
		const vivos = this.demo_zumbis.filter((z) => z.morto_ha < 0)
		const alvo = vivos.sort((a, b) => b.y - a.y)[0]
		if (alvo) {
			const d = alvo.x - this.demo_x
			this.demo_x += Math.sign(d) * Math.min(Math.abs(d), 1.2 * passo)
		}
		this.demo_heroi.setPosition(Math.round(this.demo_x), ALTURA - 45)
		this.demo_heroi.setTexture(alvo && Math.abs(alvo.x - this.demo_x) > 2 ? 'heroi_cima' : 'heroi_parado_cima', Math.floor(this.quadro / 5) % 10)
		this.demo_arma.setPosition(Math.round(this.demo_x), ALTURA - 30)

		this.demo_espera_tiro -= passo
		if (alvo && this.demo_espera_tiro <= 0 && Math.abs(alvo.x - this.demo_x) < 8) {
			this.demo_espera_tiro = 30
			const sprite = this.add.image(this.demo_x, ALTURA - 50, 'tiro').setRotation(-Math.PI / 2).setDepth(1.5)
			this.demo_tiros.push({ sprite, x: this.demo_x, y: ALTURA - 50 })
		}

		for (const tiro of this.demo_tiros) {
			tiro.y -= 6 * passo
			for (const z of this.demo_zumbis) {
				if (z.morto_ha < 0 && Math.abs(tiro.x - z.x) < 12 && tiro.y > z.y && tiro.y < z.y + 40) {
					tiro.acertou = true
					z.vida--
					const sangue = this.add.sprite(tiro.x, tiro.y, 'sangue', 0).setDepth(1.6)
					this.demo_sangues.push({ sprite: sangue, ha: 0 })
					if (z.vida == 0) z.morto_ha = 0
					break
				}
			}
			if (tiro.acertou || tiro.y < -20) tiro.sprite.destroy()
		}
		this.demo_tiros = this.demo_tiros.filter((t) => !t.acertou && t.y >= -20)

		for (const z of this.demo_zumbis) {
			if (z.morto_ha < 0) {
				z.y += 0.45 * passo
				z.sprite.setTexture('zumbi', Math.floor(this.quadro / 12) % 7)
			}
			else {
				z.morto_ha += passo
				z.sprite.setTexture('zumbi_morre', Math.min(4, Math.floor(z.morto_ha / 15)))
			}
			z.sprite.setPosition(Math.round(z.x), Math.round(z.morto_ha < 0 ? z.y : z.y - 27))
			if (z.morto_ha > 75 || z.y > ALTURA) z.sprite.destroy()
		}
		this.demo_zumbis = this.demo_zumbis.filter((z) => z.morto_ha <= 75 && z.y <= ALTURA)

		for (const s of this.demo_sangues) {
			s.ha += passo
			if (s.ha >= 36) s.sprite.destroy()
			else s.sprite.setFrame(Math.floor(s.ha / 6))
		}
		this.demo_sangues = this.demo_sangues.filter((s) => s.ha < 36)
	}
}
