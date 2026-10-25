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
			// a posição de verdade é calculada em ao_redimensionar (1 ou 2 colunas)
			const trofeu = this.add.sprite(0, 0, 'trofeu', tem ? 0 : 1)
			const nome = texto(this, 0, 0, c.nome, 8, tem ? '#ffd34d' : '#8a8a90')
			const desc = texto(this, 0, 0, c.texto, 8, tem ? '#ffffff' : '#6a6a70')
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
		// numa coluna só a lista pode passar da tela: arrastar, roda do mouse ou setas rolam;
		// um toque sem arrastar volta para o título
		this.rolagem = 0
		let inicio = null
		this.input.on('pointerdown', (p) => (inicio = { y: p.y, rolagem: this.rolagem, mexeu: false }))
		this.input.on('pointermove', (p) => {
			if (!inicio || !p.isDown) return
			if (Math.abs(p.y - inicio.y) > 6) inicio.mexeu = true
			this.rolar(inicio.rolagem - (p.y - inicio.y) / (this.zoom || 1), true)
		})
		this.input.on('pointerup', () => {
			if (inicio && !inicio.mexeu) voltar()
			inicio = null
		})
		this.input.on('wheel', (p, objetos, dx, dy) => this.rolar(this.rolagem + dy * 0.3, true))
		this.input.keyboard.on('keydown-DOWN', () => this.rolar(this.rolagem + 20, true))
		this.input.keyboard.on('keydown-UP', () => this.rolar(this.rolagem - 20, true))
		if (this.input.gamepad) {
			this.input.gamepad.once('down', voltar)
		}
	}

	ao_redimensionar() {
		this.rolagem = this.rolagem || 0
		this.chao.setSize(this.largura, ALTURA)
		this.titulo.x = this.largura / 2
		this.voltar.x = this.largura / 2
		this.premio.x = this.largura / 2
		this.estatisticas.x = this.largura / 2
		this.estatisticas.setScale(Math.min(1, (this.largura - 10) / this.estatisticas.width))
		// lista alinhada à esquerda; em tela larga vira duas colunas
		const largura_item = Math.max(...this.objetos.map((o) => Math.max(o.nome.width, o.desc.width))) + 18
		const colunas = this.largura >= largura_item * 2 + 24 ? 2 : 1
		const linhas = Math.ceil(this.objetos.length / colunas)
		// em duas colunas tudo cabe; numa coluna só a lista rola (espaço mínimo de 21)
		const espaco = Math.max(colunas == 1 ? 21 : 0, Math.min(24, (ALTURA - 42 - 56) / linhas))
		const escala = Math.min(1, (this.largura - 8) / largura_item)
		this.rolagem_max = Math.max(0, linhas * espaco - (ALTURA - 40 - 58))
		const largura_total = (largura_item * escala) * colunas + 16 * (colunas - 1)
		const x0 = Math.max(4, (this.largura - largura_total) / 2)
		this.objetos.forEach((o, i) => {
			const coluna = Math.floor(i / linhas)
			const y = 40 + (i % linhas) * espaco - this.rolagem
			// fora da faixa da lista: escondido (por cima do título ou do rodapé)
			const visivel = y >= 34 && y <= ALTURA - 66
			o.trofeu.setVisible(visivel)
			o.nome.setVisible(visivel)
			o.desc.setVisible(visivel)
			const x = x0 + coluna * (largura_item * escala + 16)
			o.trofeu.setPosition(x + 6 * escala, y + 6 * escala).setScale(escala)
			o.nome.setPosition(x + 16 * escala, y).setScale(escala)
			o.desc.setPosition(x + 16 * escala, y + 10 * escala).setScale(escala)
		})
	}

	rolar(valor, redesenhar) {
		this.rolagem = Phaser.Math.Clamp(valor, 0, this.rolagem_max || 0)
		if (redesenhar) this.ao_redimensionar()
	}

	update() {
		this.chao.tilePositionY -= 0.2
	}
}
