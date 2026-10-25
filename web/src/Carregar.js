import Phaser from 'phaser'
import { PASTA, FONTE } from './tela.js'

// carrega todas as imagens e sons uma vez só (mostrando uma barra) e vai para a tela de título
export default class Carregar extends Phaser.Scene {
	constructor() {
		super('Carregar')
	}

	preload() {
		this.mostrar_barra()

		// elfo: andar tem 10 quadros de 25x25, parado é uma imagem só
		for (const direcao of ['direita', 'esquerda', 'cima', 'baixo']) {
			this.load.spritesheet('heroi_' + direcao, PASTA + direcao + '.png', { frameWidth: 25, frameHeight: 25 })
			this.load.image('heroi_parado_' + direcao, PASTA + 'p' + direcao + '.png')
		}

		// o tiro de fogo aponta para a direita; no jogo ele é girado para onde o elfo mira
		this.load.image('tiro', PASTA + 'dfogo.png')

		// armas na mão: pistola, triplo, metralhadora, laser e bazuca (16x8, apontando para a direita)
		this.load.spritesheet('armas', PASTA + 'armas.png', { frameWidth: 16, frameHeight: 8 })
		// caixas para pegar (16x16): triplo, metralhadora, bomba, laser, bazuca, escudo, botas e gelo
		this.load.spritesheet('itens', PASTA + 'itens.png', { frameWidth: 16, frameHeight: 16 })
		this.load.image('bomba', PASTA + 'bomba.png')
		this.load.image('laser', PASTA + 'laser.png')
		this.load.spritesheet('foguete', PASTA + 'foguete.png', { frameWidth: 14, frameHeight: 8 })
		this.load.spritesheet('cuspe', PASTA + 'cuspe.png', { frameWidth: 8, frameHeight: 8 })

		// chefão: planilha de 7x8 quadros de 64x64 (linha 0 andando, linha 4 atacando, linhas 6 e 7 morrendo)
		this.load.spritesheet('chefe', PASTA + 'Monster-zombie.png', { frameWidth: 64, frameHeight: 64 })
		this.load.spritesheet('explosao', PASTA + 'explosao.png', { frameWidth: 48, frameHeight: 48 })

		// zumbi descendo: 7 quadros de 44x44; morrendo: 5 quadros de 61x71
		this.load.spritesheet('zumbi', PASTA + 'zbaixo.png', { frameWidth: 44, frameHeight: 44 })
		this.load.spritesheet('zumbi_morre', PASTA + 'zmorre.png', { frameWidth: 61, frameHeight: 71 })

		this.load.spritesheet('sangue', PASTA + 'sangue.png', { frameWidth: 32, frameHeight: 32 })

		// coração: quadro 0 cheio, quadro 1 vazio
		this.load.spritesheet('coracao', PASTA + 'coracao.png', { frameWidth: 9, frameHeight: 8 })

		// chão de cada cenário (256x256, emenda sem costura)
		this.load.image('chao', PASTA + 'chao.png')
		this.load.image('chao_pantano', PASTA + 'chao_pantano.png')
		this.load.image('chao_ruinas', PASTA + 'chao_ruinas.png')
		this.load.image('chao_inferno', PASTA + 'chao_inferno.png')
		this.load.spritesheet('melhorias', PASTA + 'melhorias.png', { frameWidth: 16, frameHeight: 16 })
		// sombra escura nas bordas da tela (fica mais forte à noite)
		this.load.image('vinheta', PASTA + 'vinheta.png')
		// corvo visto de cima: 3 quadros de 16x12 (asas abertas, no meio, fechadas)
		this.load.spritesheet('corvo', PASTA + 'corvo.png', { frameWidth: 16, frameHeight: 12 })
		// troféu das conquistas: quadro 0 dourado, quadro 1 cinza
		this.load.spritesheet('trofeu', PASTA + 'trofeu.png', { frameWidth: 12, frameHeight: 12 })
		// manchas de sangue que ficam no chão: 3 quadros de 24x14
		this.load.spritesheet('mancha', PASTA + 'mancha.png', { frameWidth: 24, frameHeight: 14 })

		// efeitos e músicas são gerados por ferramentas/gerar_sons.mjs
		const sons = [
			'tiro', 'laser', 'foguete', 'acerto', 'explosao', 'zumbi_morre', 'rugido', 'cuspe', 'item', 'poder',
			'escudo_quebra', 'perder_vida', 'arremesso', 'combo', 'fase', 'fim', 'trovao', 'fantasma', 'chama', 'raio',
			'musica_titulo', 'musica_jogo', 'musica_chefe',
		]
		for (const som of sons) {
			this.load.audio(som, 'assets/sons/' + som + '.wav')
		}
	}

	// barra simples no meio da tela (aqui ainda não tem zoom, então é em pixels da janela)
	mostrar_barra() {
		const { width, height } = this.scale
		const largura = Math.min(300, width * 0.6)
		const x = (width - largura) / 2
		const y = height / 2
		this.add.text(width / 2, y - 24, 'CARREGANDO', { fontFamily: FONTE, fontSize: '16px', color: '#e8f5c8' }).setOrigin(0.5)
		this.add.rectangle(x - 2, y - 2, largura + 4, 14, 0x3a4a2c).setOrigin(0)
		const barra = this.add.rectangle(x, y, 0, 10, 0x9ff07a).setOrigin(0)
		this.load.on('progress', (fracao) => barra.setSize(largura * fracao, 10))
	}

	create() {
		// o jogo amplia tudo "em pixels"; só a vinheta é um degradê e precisa ser suavizada
		this.textures.get('vinheta').setFilter(Phaser.Textures.FilterMode.LINEAR)
		this.scene.start('Titulo')
	}
}
