import Phaser from 'phaser'
import { PASTA } from './tela.js'

// carrega todas as imagens uma vez só e vai para a tela de título
export default class Carregar extends Phaser.Scene {
	constructor() {
		super('Carregar')
	}

	preload() {
		// elfo: andar tem 10 quadros de 25x25, parado é uma imagem só
		for (const direcao of ['direita', 'esquerda', 'cima', 'baixo']) {
			this.load.spritesheet('heroi_' + direcao, PASTA + direcao + '.png', { frameWidth: 25, frameHeight: 25 })
			this.load.image('heroi_parado_' + direcao, PASTA + 'p' + direcao + '.png')
		}

		// o tiro de fogo aponta para a direita; no jogo ele é girado para onde o elfo mira
		this.load.image('tiro', PASTA + 'dfogo.png')

		// armas na mão: pistola, triplo e metralhadora (16x8, apontando para a direita)
		this.load.spritesheet('armas', PASTA + 'armas.png', { frameWidth: 16, frameHeight: 8 })
		// caixas para pegar: triplo, metralhadora e bomba (16x16)
		this.load.spritesheet('itens', PASTA + 'itens.png', { frameWidth: 16, frameHeight: 16 })
		this.load.image('bomba', PASTA + 'bomba.png')
		this.load.spritesheet('explosao', PASTA + 'explosao.png', { frameWidth: 48, frameHeight: 48 })

		// zumbi descendo: 7 quadros de 44x44; morrendo: 5 quadros de 61x71
		this.load.spritesheet('zumbi', PASTA + 'zbaixo.png', { frameWidth: 44, frameHeight: 44 })
		this.load.spritesheet('zumbi_morre', PASTA + 'zmorre.png', { frameWidth: 61, frameHeight: 71 })

		this.load.spritesheet('sangue', PASTA + 'sangue.png', { frameWidth: 32, frameHeight: 32 })

		// coração: quadro 0 cheio, quadro 1 vazio
		this.load.spritesheet('coracao', PASTA + 'coracao.png', { frameWidth: 9, frameHeight: 8 })

		this.load.image('chao', PASTA + 'chao.png')

		// efeitos sonoros
		for (const som of ['tiro', 'acerto', 'explosao', 'zumbi_morre', 'item', 'perder_vida']) {
			this.load.audio(som, 'assets/sons/' + som + '.wav')
		}
	}

	create() {
		this.scene.start('Titulo')
	}
}
