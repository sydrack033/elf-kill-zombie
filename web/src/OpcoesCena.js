import Phaser from 'phaser'
import { ALTURA, ajustar_tela, texto } from './tela.js'
import { opcoes, gravar_opcoes, efeito } from './opcoes.js'
import { atualizar_volume_musica } from './musica.js'

// Opções (tecla O no título): volumes, tremor, tela cheia e rever as dicas e explicações.
const LINHAS = [
	{ rotulo: 'MÚSICA', chave: 'musica' },
	{ rotulo: 'EFEITOS', chave: 'efeitos' },
	{ rotulo: 'TREMOR', chave: 'tremor', liga: true },
	{ rotulo: 'TIRO AUTOMÁTICO', chave: 'tiro_auto', liga: true }, // no computador: atira sem segurar o botão
	{ rotulo: 'TELA CHEIA', acao: 'tela_cheia' },
	{ rotulo: 'VER AS DICAS DE NOVO', acao: 'dicas' },
]

export default class OpcoesCena extends Phaser.Scene {
	constructor() {
		super('Opcoes')
	}

	create() {
		this.chao = this.add.tileSprite(0, 0, 10, ALTURA, 'chao').setOrigin(0).setTint(0x505868)
		this.titulo = texto(this, 0, 50, 'OPÇÕES', 16, '#ffd34d').setOrigin(0.5)
		this.linhas = LINHAS.map((linha, i) => {
			const y = 110 + i * 34
			const rotulo = texto(this, 0, y, linha.rotulo, 8, '#ffffff').setOrigin(linha.chave ? 1 : 0.5, 0.5)
				.setInteractive({ useHandCursor: true })
			rotulo.on('pointerdown', () => this.mexer(i, 1))
			const objetos = { ...linha, rotulo, barras: [], valor: null, menos: null, mais: null }
			if (linha.chave) {
				objetos.menos = texto(this, 0, y, '<', 8).setOrigin(0.5).setInteractive({ useHandCursor: true })
				objetos.mais = texto(this, 0, y, '>', 8).setOrigin(0.5).setInteractive({ useHandCursor: true })
				objetos.menos.on('pointerdown', () => this.mexer(i, -1))
				objetos.mais.on('pointerdown', () => this.mexer(i, 1))
				if (linha.liga) {
					objetos.valor = texto(this, 0, y, '', 8).setOrigin(0.5)
				}
				else {
					for (let b = 0; b < 10; b++) objetos.barras.push(this.add.rectangle(0, y, 7, 6, 0xffffff))
				}
			}
			return objetos
		})
		this.aviso = texto(this, 0, 320, '', 8, '#9ff07a').setOrigin(0.5)
		this.voltar = texto(this, 0, ALTURA - 14, 'SETAS: ESCOLHER E AJUSTAR   ESC: VOLTAR', 8, '#cfcfcf').setOrigin(0.5)
		this.escolhida = 0
		this.desenhar()

		ajustar_tela(this)
		this.cameras.main.fadeIn(250, 0, 0, 0)
		const voltar = () => this.scene.start('Titulo')
		this.input.keyboard.once('keydown-ESC', voltar)
		this.input.keyboard.once('keydown-O', voltar)
		this.input.keyboard.on('keydown-UP', () => this.escolher(this.escolhida - 1))
		this.input.keyboard.on('keydown-DOWN', () => this.escolher(this.escolhida + 1))
		this.input.keyboard.on('keydown-LEFT', () => this.mexer(this.escolhida, -1))
		this.input.keyboard.on('keydown-RIGHT', () => this.mexer(this.escolhida, 1))
		this.input.keyboard.on('keydown-ENTER', () => this.mexer(this.escolhida, 1))
		this.input.keyboard.on('keydown-SPACE', () => this.mexer(this.escolhida, 1))
		if (this.input.gamepad) {
			this.input.gamepad.on('down', (pad, botao) => {
				const acoes = {
					12: () => this.escolher(this.escolhida - 1), 13: () => this.escolher(this.escolhida + 1),
					14: () => this.mexer(this.escolhida, -1), 15: () => this.mexer(this.escolhida, 1),
					0: () => this.mexer(this.escolhida, 1), 1: voltar, 8: voltar,
				}
				if (acoes[botao.index]) acoes[botao.index]()
			})
		}
		// tocar fora das linhas volta
		this.input.on('pointerdown', (p, alvos) => {
			if (!alvos.length) voltar()
		})
	}

	escolher(i) {
		this.escolhida = (i + LINHAS.length) % LINHAS.length
		this.desenhar()
	}

	mexer(i, direcao) {
		this.escolhida = i
		const linha = this.linhas[i]
		if (linha.liga) {
			opcoes[linha.chave] = !opcoes[linha.chave]
		}
		else if (linha.chave) {
			opcoes[linha.chave] = Math.round(Phaser.Math.Clamp(opcoes[linha.chave] + direcao * 0.1, 0, 1) * 10) / 10
			if (linha.chave == 'musica') atualizar_volume_musica()
		}
		else if (linha.acao == 'tela_cheia') {
			this.scale.toggleFullscreen()
		}
		else if (linha.acao == 'dicas') {
			// a próxima partida mostra as dicas, e as caixas voltam a ser explicadas
			// (os inimigos não: o bestiário continua com os que já foram vistos)
			try {
				localStorage.removeItem('elf-kill-zombie-dicas')
				localStorage.removeItem('elf-kill-zombie-itens')
			} catch {
				// sem localStorage: as dicas já aparecem sempre
			}
			this.aviso.setText('AS DICAS VÃO APARECER NA PRÓXIMA PARTIDA')
		}
		gravar_opcoes()
		efeito(this, 'combo', { volume: 0.5 })
		this.desenhar()
	}

	desenhar() {
		this.linhas.forEach((l, i) => {
			l.rotulo.setColor(i == this.escolhida ? '#ffd34d' : '#ffffff')
			if (l.valor) {
				l.valor.setText(opcoes[l.chave] ? 'LIGADO' : 'DESLIGADO').setColor(opcoes[l.chave] ? '#9ff07a' : '#ff6a6a')
			}
			const valor = Math.round((opcoes[l.chave] || 0) * 10)
			l.barras.forEach((b, n) => b.setFillStyle(n < valor ? 0x9ff07a : 0x3a3a44))
		})
	}

	ao_redimensionar() {
		const meio = this.largura / 2
		this.chao.setSize(this.largura, ALTURA)
		for (const o of [this.titulo, this.aviso, this.voltar]) o.x = meio
		this.voltar.setScale(Math.min(1, (this.largura - 8) / this.voltar.width))
		for (const l of this.linhas) {
			if (l.chave) {
				l.rotulo.x = meio - 50
				l.rotulo.setScale(Math.min(1, (meio - 54) / l.rotulo.width)) // celular estreito
				l.menos.x = meio - 38
				l.mais.x = meio + 62
				if (l.valor) l.valor.x = meio + 12
				l.barras.forEach((b, n) => (b.x = meio - 28 + n * 9))
			}
			else {
				l.rotulo.x = meio
			}
		}
	}

	update() {
		this.chao.tilePositionY -= 0.2
	}
}
