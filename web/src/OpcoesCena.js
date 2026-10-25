import Phaser from 'phaser'
import { ALTURA, ajustar_tela, texto } from './tela.js'
import { opcoes, gravar_opcoes, efeito } from './opcoes.js'
import { atualizar_volume_musica, tocar_musica } from './musica.js'

// vitrola: as músicas do jogo, para ouvir nas opções
const MUSICAS = [
	['musica_titulo', 'TÍTULO'], ['musica_jogo', 'CEMITÉRIO'], ['musica_pantano', 'PÂNTANO'], ['musica_ruinas', 'RUÍNAS'],
	['musica_inferno', 'INFERNO'], ['musica_gelo', 'TERRA GELADA'], ['musica_chefe', 'CHEFÃO'], ['musica_final', 'CHEFÃO FINAL'],
]

// Opções (tecla O no título): volumes, tremor, tela cheia e rever as dicas e explicações.
const LINHAS = [
	{ rotulo: 'MÚSICA', chave: 'musica' },
	{ rotulo: 'EFEITOS', chave: 'efeitos' },
	{ rotulo: 'TREMOR', chave: 'tremor', liga: true },
	{ rotulo: 'TIRO AUTOMÁTICO', chave: 'tiro_auto', liga: true }, // no computador: atira sem segurar o botão
	{ rotulo: 'NÚMEROS DE DANO', chave: 'numeros_dano', liga: true },
	{ rotulo: 'VIDRO (PTS X2)', modificador: 'vidro', liga: true },
	{ rotulo: 'TURBO (PTS X1,5)', modificador: 'turbo', liga: true },
	{ rotulo: 'SÓ PISTOLA (PTS X1,5)', modificador: 'pistola', liga: true },
	{ rotulo: 'TELA CHEIA', acao: 'tela_cheia' },
	{ rotulo: 'VER AS DICAS DE NOVO', acao: 'dicas' },
	{ rotulo: 'VITROLA: TÍTULO', acao: 'vitrola' },
	{ rotulo: 'CRÉDITOS', acao: 'creditos' },
]

export default class OpcoesCena extends Phaser.Scene {
	constructor() {
		super('Opcoes')
	}

	create() {
		this.chao = this.add.tileSprite(0, 0, 10, ALTURA, 'chao').setOrigin(0).setTint(0x505868)
		this.titulo = texto(this, 0, 36, 'OPÇÕES', 16, '#ffd34d').setOrigin(0.5)
		this.linhas = LINHAS.map((linha, i) => {
			const y = 66 + i * 22
			const tem_valor = linha.chave || linha.modificador
			const rotulo = texto(this, 0, y, linha.rotulo, 8, linha.modificador ? '#ff9a9a' : '#ffffff').setOrigin(tem_valor ? 1 : 0.5, 0.5)
				.setInteractive({ useHandCursor: true })
			rotulo.on('pointerdown', () => this.mexer(i, 1))
			const objetos = { ...linha, rotulo, barras: [], valor: null, menos: null, mais: null }
			if (tem_valor) {
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
		this.aviso = texto(this, 0, 341, '', 8, '#9ff07a').setOrigin(0.5, 0).setLineSpacing(1)
		this.voltar = texto(this, 0, ALTURA - 14, 'SETAS: ESCOLHER E AJUSTAR   ESC: VOLTAR', 8, '#cfcfcf').setOrigin(0.5)
		this.escolhida = 0
		this.desenhar()

		ajustar_tela(this)
		this.cameras.main.fadeIn(250, 0, 0, 0)
		const voltar = () => {
			// a vitrola pode ter trocado a música: o título volta com a dele
			if (this.faixa) tocar_musica(this, 'musica_titulo')
			this.scene.start('Titulo')
		}
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
			this.gravar(linha, !this.ler(linha))
		}
		else if (linha.chave) {
			opcoes[linha.chave] = Math.round(Phaser.Math.Clamp(opcoes[linha.chave] + direcao * 0.1, 0, 1) * 10) / 10
			if (linha.chave == 'musica') atualizar_volume_musica()
		}
		else if (linha.acao == 'tela_cheia') {
			this.scale.toggleFullscreen()
		}
		else if (linha.acao == 'vitrola') {
			this.faixa = ((this.faixa ?? 0) + (direcao < 0 ? MUSICAS.length - 1 : 1)) % MUSICAS.length
			tocar_musica(this, MUSICAS[this.faixa][0])
			linha.rotulo.setText('VITROLA: ' + MUSICAS[this.faixa][1])
		}
		else if (linha.acao == 'creditos') {
			this.aviso.setText('ELF KILL ZOMBIE COMEÇOU COMO UM JOGO EM PORTUGOL STUDIO, NA FACULDADE.\nVERSÃO WEB FEITA COM PHASER 4 E VITE.\nIMAGENS E SONS NOVOS GERADOS POR SCRIPTS (PASTA FERRAMENTAS).').setColor('#cfcfcf')
			this.aviso.setScale(Math.min(1, (this.largura - 10) / this.aviso.width))
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
			this.aviso.setText('AS DICAS VÃO APARECER NA PRÓXIMA PARTIDA').setColor('#9ff07a').setScale(1)
		}
		gravar_opcoes()
		efeito(this, 'combo', { volume: 0.5 })
		this.desenhar()
	}

	// os modificadores ficam guardados em opcoes.modificadores; o resto direto em opcoes
	ler(linha) {
		return linha.modificador ? !!opcoes.modificadores[linha.modificador] : opcoes[linha.chave]
	}

	gravar(linha, valor) {
		if (linha.modificador) {
			opcoes.modificadores = { ...opcoes.modificadores, [linha.modificador]: valor }
		}
		else {
			opcoes[linha.chave] = valor
		}
	}

	desenhar() {
		this.linhas.forEach((l, i) => {
			l.rotulo.setColor(i == this.escolhida ? '#ffd34d' : l.modificador ? '#ff9a9a' : '#ffffff')
			if (l.valor) {
				l.valor.setText(this.ler(l) ? 'LIGADO' : 'DESLIGADO').setColor(this.ler(l) ? '#9ff07a' : '#ff6a6a')
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
			if (l.chave || l.modificador) {
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
