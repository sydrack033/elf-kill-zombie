// Parte da cena Jogo: fim de jogo: morte do elfo, placar, nome e reinício.
// Os métodos desta classe são copiados para a cena em Jogo.js (por isso usam this como se fossem dela).
import Phaser from 'phaser'
import { ALTURA, texto, gravar_recorde, gravar_placar, renomear_no_placar, somar_estatisticas, gravar_historico, gravar_recorde_do_dia } from '../tela.js'
import { parar_musica } from '../musica.js'
import { desbloquear } from '../conquistas.js'
import { efeito, opcoes } from '../opcoes.js'
import { moedas_da_partida, ganhar_moedas } from '../moedas.js'
import { conferir_desafios, PREMIO } from '../desafios.js'

export default class Fim {
	// ------------------------------------------------------------------ fim de jogo

	fim_de_jogo() {
		this.estado = 'fim'
		this.barra_carga.setVisible(false)
		parar_musica(300)
		efeito(this, 'fim', { volume: 0.7 })

		// o elfo cai: fica vermelho, tomba de lado e vai sumindo; depois aparece o placar
		this.dica_texto.setVisible(false)
		this.arma_na_mao.setVisible(false)
		this.bolha.setVisible(false)
		this.heroi.setVisible(true).setTint(0xff3030).setTintMode(Phaser.TintModes.FILL)
		this.heroi.setOrigin(0.5, 1).setPosition(this.heroi_x + 12, this.heroi_y + 25)
		for (let i = 0; i < 3; i++) {
			this.espirrar_sangue(this.heroi_x + 6 + i * 6, this.heroi_y + 8 + (i % 2) * 6)
		}
		this.deixar_mancha(this.heroi_x + 12, this.heroi_y + 24)
		this.tremer(400, 0.012)
		this.tweens.add({ targets: this.heroi, angle: 90, duration: 500, ease: 'Bounce.Out' })
		if (this.chapeu) {
			// o chapéu voa longe
			this.chapeu.setVisible(true)
			this.tweens.add({ targets: this.chapeu, x: this.chapeu.x + 30, y: this.chapeu.y - 30, angle: 200, duration: 450, ease: 'Quad.Out' })
			this.tweens.add({ targets: this.chapeu, y: this.heroi_y + 24, delay: 450, duration: 350, ease: 'Bounce.Out' })
		}
		this.tweens.add({ targets: this.heroi, alpha: 0.35, delay: 400, duration: 600 })
		if (this.p2) {
			// o segundo elfo cai junto
			const p2 = this.p2
			p2.arma.setVisible(false)
			p2.rotulo.setVisible(false)
			p2.sprite.setVisible(true).setTint(0xff3030).setTintMode(Phaser.TintModes.FILL)
			p2.sprite.setOrigin(0.5, 1).setPosition(p2.x + 12, p2.y + 25)
			this.tweens.add({ targets: p2.sprite, angle: -90, duration: 500, ease: 'Bounce.Out' })
			this.tweens.add({ targets: p2.sprite, alpha: 0.35, delay: 400, duration: 600 })
		}
		this.time.delayedCall(1100, () => this.mostrar_fim())
	}

	mostrar_fim() {
		// treino não vale nada: sem placar, moedas, estatísticas ou desafios
		if (this.treino) {
			this.escurecer.setVisible(true)
			this.aviso.setText('TREINO').setColor('#9fd8ff').setVisible(true).setY(ALTURA / 2 - 60)
			this.aviso_ha = 0
			this.mensagem.setY(ALTURA / 2).setText('O CHEFÃO VENCEU DESTA VEZ.\nO TREINO NÃO CONTA PARA O PLACAR.')
			this.instrucao = texto(this, this.largura / 2, ALTURA - 50, '', 8, '#cfcfcf').setOrigin(0.5).setDepth(10)
			this.liberar_reinicio()
			return
		}
		const novo_recorde = this.pontos > this.recorde
		if (novo_recorde) {
			this.recorde = this.pontos
			gravar_recorde(this.pontos)
		}
		const { posicao, id } = gravar_placar(this.pontos, this.nivel, opcoes.dificuldade, opcoes.modo)
		if (this.diario) gravar_recorde_do_dia(this.dia, this.pontos)
		gravar_historico({ fase: this.nivel, pontos: this.pontos, dificuldade: opcoes.dificuldade, modo: opcoes.modo })
		somar_estatisticas({ zumbis: this.stats.mortos, chefes: this.stats.chefes, segundos: Math.floor(this.stats.ticks / 100), fase: this.nivel, por_tipo: this.stats.por_tipo })
		const segundos = Math.floor(this.stats.ticks / 100)
		const tempo = Math.floor(segundos / 60) + ':' + String(segundos % 60).padStart(2, '0')
		const pontaria = this.stats.disparos ? Math.round((100 * this.stats.acertos) / this.stats.disparos) : 0
		if (pontaria >= 70 && this.stats.disparos >= 200) desbloquear(this, 'mira')
		// desafios do dia cumpridos nesta partida
		const cumpridos = conferir_desafios(this.dia, this.resumo_da_partida())
		const moedas = moedas_da_partida(Math.round(this.pontos / this.multiplicador_mod), this.stats.chefes) + this.moedas_extras + cumpridos.length * PREMIO
		const carteira = ganhar_moedas(moedas)

		this.escurecer.setVisible(true)
		this.vermelho.setFillStyle(0xff0000, 0)
		this.aviso.setText('FIM DE\nJOGO').setColor('#ffd34d').setVisible(true).setY(ALTURA / 2 - 105)
		this.aviso_ha = 0
		this.mensagem.setY(ALTURA / 2 + 25)
		this.mensagem.setText(
			'PONTOS: ' + this.pontos + '\n' +
			(novo_recorde ? 'NOVO RECORDE!' : posicao ? posicao + 'º LUGAR NO PLACAR' : 'RECORDE: ' + this.recorde) + '\n\n' +
			'FASE ' + this.nivel + '   TEMPO ' + tempo + '\n' +
			'ZUMBIS ' + this.stats.mortos + '   CHEFÕES ' + this.stats.chefes + '\n' +
			'PONTARIA ' + pontaria + '%   MAIOR COMBO ' + this.stats.melhor_combo + '\n' +
			'+' + moedas + ' MOEDAS  (' + carteira + ' NA CARTEIRA)' +
			cumpridos.map((m) => m.texto).concat(this.desafios_pagos || []).map((t) => '\nDESAFIO CUMPRIDO: ' + t).join(''),
		)
		this.instrucao = texto(this, this.largura / 2, ALTURA - 50, '', 8, '#cfcfcf').setOrigin(0.5).setDepth(10)
		if (novo_recorde && this.pontos > 0) {
			this.soltar_confete()
		}

		// entrou no placar e tem teclado: pede as 3 letras do nome, como nos fliperamas
		const usa_controle = this.input.gamepad && this.input.gamepad.total > 0
		if (posicao && !this.modo_toque && !usa_controle) {
			this.pedir_nome(id)
		}
		else {
			this.liberar_reinicio()
		}
	}

	// novo recorde: chuva de papel picado colorido
	soltar_confete() {
		const cores = [0xffd34d, 0x9ff07a, 0xff6a6a, 0x9fd8ff, 0xc08aff]
		for (let i = 0; i < 70; i++) {
			const x = Math.random() * this.largura
			const papel = this.add.rectangle(x, -10 - Math.random() * 120, 3, 5, cores[i % cores.length]).setDepth(9.5)
			this.tweens.add({
				targets: papel,
				y: ALTURA + 10,
				x: x + Phaser.Math.Between(-40, 40),
				angle: Phaser.Math.Between(-540, 540),
				duration: Phaser.Math.Between(1800, 3200),
				delay: Math.random() * 600,
				onComplete: () => papel.destroy(),
			})
		}
		efeito(this, 'fase', { volume: 0.6 })
	}

	pedir_nome(id) {
		let nome = ''
		this.digitando_nome = true // enquanto isso, F, M e N viram letras em vez de atalhos
		const desenhar = () => {
			const cursor = Math.floor(this.time.now / 300) % 2 ? '_' : ' '
			this.instrucao.setText('SEU NOME: ' + (nome + cursor + '___').slice(0, 3) + '\nDIGITE 3 LETRAS E APERTE ENTER')
		}
		desenhar()
		const piscar = this.time.addEvent({ delay: 150, loop: true, callback: desenhar })
		const ao_digitar = (evento) => {
			if (evento.key == 'Enter') {
				this.input.keyboard.off('keydown', ao_digitar)
				this.digitando_nome = false
				piscar.remove()
				renomear_no_placar(id, nome || 'ELF')
				efeito(this, 'item', { volume: 0.6 })
				this.liberar_reinicio()
				return
			}
			if (evento.key == 'Backspace') {
				nome = nome.slice(0, -1)
			}
			else if (/^[a-zA-Z0-9]$/.test(evento.key) && nome.length < 3) {
				nome += evento.key.toUpperCase()
				efeito(this, 'combo', { volume: 0.4 })
			}
			desenhar()
		}
		// espera um pouco para não pegar a tecla que estava apertada na hora de morrer
		this.time.delayedCall(500, () => this.input.keyboard.on('keydown', ao_digitar))
	}

	liberar_reinicio() {
		this.instrucao.setText(this.modo_toque ? 'TOQUE PARA JOGAR DE NOVO' : 'CLIQUE OU ESPAÇO: JOGAR DE NOVO\nESC: MENU')
		// espera um pouco para quem está atirando não reiniciar sem querer
		this.time.delayedCall(1000, () => {
			this.pode_reiniciar = true // vale para o botão A/Start do controle
			const reiniciar = () => this.scene.restart()
			this.input.keyboard.once('keydown-SPACE', reiniciar)
			this.input.once('pointerdown', reiniciar)
			this.input.keyboard.once('keydown-ESC', () => this.scene.start('Titulo'))
		})
	}
}
