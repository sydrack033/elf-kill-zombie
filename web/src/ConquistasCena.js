import Phaser from 'phaser'
import { ALTURA, ajustar_tela, texto, ler_estatisticas } from './tela.js'
import { CONQUISTAS, ler_conquistas } from './conquistas.js'
import { ELFOS } from './regras.js'

const R = { ELFOS }

// tela com a lista de conquistas (aberta pelo título com a tecla C)
export default class ConquistasCena extends Phaser.Scene {
	constructor() {
		super('Conquistas')
	}

	create() {
		this.chao = this.add.tileSprite(0, 0, 10, ALTURA, 'chao').setOrigin(0).setTint(0x606878)
		const feitas = ler_conquistas()
		this.objetos = []
		this.titulo = texto(this, 0, 18, 'CONQUISTAS  ' + feitas.size + '/' + CONQUISTAS.length, 16, '#ffd34d').setOrigin(0.5, 0)

		CONQUISTAS.forEach((c, i) => {
			const tem = feitas.has(c.id)
			const y = 42 + i * 19
			const trofeu = this.add.sprite(0, y + 6, 'trofeu', tem ? 0 : 1)
			const nome = texto(this, 0, y, c.nome, 8, tem ? '#ffd34d' : '#8a8a90')
			const desc = texto(this, 0, y + 10, c.texto, 8, tem ? '#ffffff' : '#6a6a70')
			this.objetos.push({ trofeu, nome, desc })
		})
		this.voltar = texto(this, 0, ALTURA - 14, 'ESC, ESPAÇO OU CLIQUE: VOLTAR', 8, '#cfcfcf').setOrigin(0.5)
		// as conquistas liberam cores novas para o elfo
		const proximo = R.ELFOS.find((e) => feitas.size < e.conquistas)
		this.premio = texto(
			this, 0, ALTURA - 48,
			proximo ? 'COM ' + proximo.conquistas + ' CONQUISTAS: ' + proximo.nome : 'TODAS AS CORES DO ELFO LIBERADAS!',
			8, '#c08aff',
		).setOrigin(0.5)
		// números de todas as partidas somadas
		const e = ler_estatisticas()
		const horas = Math.floor(e.segundos / 3600)
		const minutos = Math.floor((e.segundos % 3600) / 60)
		this.estatisticas = texto(
			this, 0, ALTURA - 32,
			'PARTIDAS ' + e.partidas + '   ZUMBIS ' + e.zumbis.toLocaleString('pt-BR') + '   CHEFÕES ' + e.chefes +
			'   MELHOR FASE ' + e.melhor_fase + '   TEMPO ' + (horas ? horas + 'H ' : '') + minutos + 'MIN',
			8, '#9fd8ff',
		).setOrigin(0.5)
		this.cameras.main.fadeIn(250, 0, 0, 0)

		ajustar_tela(this)
		const voltar = () => this.scene.start('Titulo')
		this.input.keyboard.once('keydown-ESC', voltar)
		this.input.keyboard.once('keydown-SPACE', voltar)
		this.input.keyboard.once('keydown-C', voltar)
		this.input.once('pointerdown', voltar)
		if (this.input.gamepad) {
			this.input.gamepad.once('down', voltar)
		}
	}

	ao_redimensionar() {
		this.chao.setSize(this.largura, ALTURA)
		this.titulo.x = this.largura / 2
		this.voltar.x = this.largura / 2
		this.premio.x = this.largura / 2
		this.estatisticas.x = this.largura / 2
		this.estatisticas.setScale(Math.min(1, (this.largura - 10) / this.estatisticas.width))
		// lista alinhada à esquerda, com a coluna centralizada na tela
		const largura_lista = Math.max(...this.objetos.map((o) => Math.max(o.nome.width, o.desc.width))) + 18
		const x = Math.max(6, (this.largura - largura_lista) / 2)
		for (const o of this.objetos) {
			o.trofeu.x = x + 6
			o.nome.x = x + 16
			o.desc.x = x + 16
		}
	}

	update() {
		this.chao.tilePositionY -= 0.2
	}
}
