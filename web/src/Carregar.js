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
		this.load.image('chao_gelo', PASTA + 'chao_gelo.png')
		this.load.spritesheet('melhorias', PASTA + 'melhorias.png', { frameWidth: 16, frameHeight: 16 })
		// sombra escura nas bordas da tela (fica mais forte à noite)
		this.load.image('vinheta', PASTA + 'vinheta.png')
		// corvo visto de cima: 3 quadros de 16x12 (asas abertas, no meio, fechadas)
		this.load.spritesheet('corvo', PASTA + 'corvo.png', { frameWidth: 16, frameHeight: 12 })
		// troféu das conquistas: quadro 0 dourado, quadro 1 cinza
		this.load.spritesheet('trofeu', PASTA + 'trofeu.png', { frameWidth: 12, frameHeight: 12 })
		// manchas de sangue que ficam no chão: 3 quadros de 24x14
		// lápide do coveiro: quadro 0 inteira, quadro 1 rachada (20x22)
		this.load.spritesheet('lapide', PASTA + 'lapide.png', { frameWidth: 20, frameHeight: 22 })
		// torreta montada no chão (o cano é desenhado por cima e gira)
		this.load.image('torreta', PASTA + 'torreta.png')
		this.load.image('bumerangue', PASTA + 'bumerangue.png')
		this.load.spritesheet('mancha', PASTA + 'mancha.png', { frameWidth: 24, frameHeight: 14 })

		// efeitos e músicas são gerados por ferramentas/gerar_sons.mjs
		const sons = [
			'tiro', 'laser', 'foguete', 'acerto', 'explosao', 'zumbi_morre', 'rugido', 'cuspe', 'item', 'poder',
			'escudo_quebra', 'perder_vida', 'arremesso', 'combo', 'fase', 'fim', 'trovao', 'fantasma', 'chama', 'raio',
			'pedra', 'bumerangue', 'torreta', 'moeda',
		]
		for (const som of sons) {
			this.load.audio(som, 'assets/sons/' + som + '.wav')
		}
		// músicas comprimidas (ferramentas/comprimir_musicas.mjs): o navegador fica com o OGG ou, se não
		// souber tocar (Safari antigo), com o MP3
		const musicas = ['titulo', 'jogo', 'chefe', 'pantano', 'ruinas', 'inferno', 'gelo', 'final']
		for (const musica of musicas) {
			this.load.audio('musica_' + musica, ['assets/sons/musica_' + musica + '.ogg', 'assets/sons/musica_' + musica + '.mp3'])
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

		// osso do escudo do Necromante (12x6), desenhado aqui mesmo
		const g = this.make.graphics({ x: 0, y: 0 }, false)
		g.fillStyle(0x2a2420).fillRect(2, 1, 8, 4).fillRect(0, 0, 3, 6).fillRect(9, 0, 3, 6)
		g.fillStyle(0xe8e0c8).fillRect(3, 2, 6, 2).fillRect(1, 1, 1, 4).fillRect(10, 1, 1, 4)
		g.fillStyle(0xffffff).fillRect(3, 2, 6, 1)
		g.generateTexture('osso', 12, 6)
		// moeda da loja (8x8)
		g.clear()
		g.fillStyle(0x6a4a10).fillRect(2, 0, 4, 8).fillRect(0, 2, 8, 4).fillRect(1, 1, 6, 6)
		g.fillStyle(0xffd34d).fillRect(2, 1, 4, 6).fillRect(1, 2, 6, 4)
		g.fillStyle(0xfff0a0).fillRect(2, 2, 1, 3)
		g.fillStyle(0xc89a20).fillRect(4, 2, 1, 4)
		g.generateTexture('moeda', 8, 8)

		// chapéus da loja (14x10), desenhados aqui mesmo: cada linha é [cor, x, y, largura, altura]
		const CHAPEUS = {
			chapeu_coroa: [[0x6a4a10, 1, 3, 12, 7], [0xffd34d, 2, 4, 10, 5], [0x6a4a10, 1, 0, 2, 4], [0x6a4a10, 6, 0, 2, 4], [0x6a4a10, 11, 0, 2, 4],
				[0xffd34d, 2, 1, 1, 3], [0xffd34d, 7, 1, 1, 3], [0xffd34d, 11, 1, 1, 3], [0xd82a2a, 6, 5, 2, 2], [0xfff0a0, 3, 5, 1, 1]],
			chapeu_cartola: [[0x000000, 0, 7, 14, 3], [0x2a2a30, 1, 8, 12, 1], [0x000000, 3, 0, 8, 8], [0x2a2a30, 4, 1, 6, 6], [0xd82a2a, 4, 5, 6, 1], [0x4a4a54, 5, 1, 1, 4]],
			chapeu_gorro: [[0xffffff, 0, 7, 14, 3], [0x8a1010, 3, 2, 8, 5], [0xd82a2a, 4, 3, 6, 4], [0x8a1010, 9, 0, 3, 3], [0xd82a2a, 9, 1, 2, 2], [0xffffff, 11, 0, 3, 3]],
			chapeu_bruxa: [[0x1a0a2a, 0, 7, 14, 3], [0x5a2a8a, 1, 8, 12, 1], [0x1a0a2a, 4, 2, 6, 6], [0x5a2a8a, 5, 3, 4, 4], [0x1a0a2a, 6, 0, 3, 3], [0x5a2a8a, 7, 1, 1, 2], [0xffd34d, 5, 6, 4, 1]],
			chapeu_viking: [[0x2a2a30, 2, 3, 10, 7], [0x9aa0aa, 3, 4, 8, 5], [0xc8ccd4, 4, 4, 3, 2], [0xf0e8d0, 0, 0, 2, 5], [0xf0e8d0, 12, 0, 2, 5], [0x8a7a5a, 1, 4, 2, 2], [0x8a7a5a, 11, 4, 2, 2], [0x6a6a74, 3, 8, 8, 1]],
		}
		for (const [chave, partes] of Object.entries(CHAPEUS)) {
			g.clear()
			for (const [cor, x, y, l, a] of partes) {
				g.fillStyle(cor).fillRect(x, y, l, a)
			}
			g.generateTexture(chave, 14, 10)
		}
		g.destroy()

		// neblina: manchas brancas bem suaves, que emendam nas bordas (para rolar sem costura)
		const neblina = this.textures.createCanvas('neblina', 256, 128)
		const ctx = neblina.getContext()
		for (let i = 0; i < 26; i++) {
			const x = Math.random() * 256
			const y = Math.random() * 128
			const r = 24 + Math.random() * 40
			for (const dx of [-256, 0, 256]) {
				for (const dy of [-128, 0, 128]) {
					const grad = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r)
					grad.addColorStop(0, 'rgba(220,235,225,0.22)')
					grad.addColorStop(1, 'rgba(220,235,225,0)')
					ctx.fillStyle = grad
					ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2)
				}
			}
		}
		neblina.refresh()

		// luz em volta do elfo no eclipse: branco no meio sumindo para as bordas
		const luz = this.textures.createCanvas('luz', 128, 128)
		const ctx_luz = luz.getContext()
		const grad_luz = ctx_luz.createRadialGradient(64, 64, 8, 64, 64, 64)
		grad_luz.addColorStop(0, 'rgba(255,255,255,1)')
		grad_luz.addColorStop(0.5, 'rgba(255,255,255,0.8)')
		grad_luz.addColorStop(1, 'rgba(255,255,255,0)')
		ctx_luz.fillStyle = grad_luz
		ctx_luz.fillRect(0, 0, 128, 128)
		luz.refresh()
		neblina.setFilter(Phaser.Textures.FilterMode.LINEAR)
		this.scene.start('Titulo')
	}
}
