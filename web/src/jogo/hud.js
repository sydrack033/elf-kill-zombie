// Parte da cena Jogo: HUD (vidas, pontos, barras) e dicas da primeira partida.
// Os métodos desta classe são copiados para a cena em Jogo.js (por isso usam this como se fossem dela).
import Phaser from 'phaser'
import { ALTURA, texto } from '../tela.js'
import * as R from '../regras.js'

export default class Hud {
	// ------------------------------------------------------------------ HUD

	criar_hud() {
		this.hud_coracoes = []
		for (let i = 0; i < R.VIDAS_NO_MAXIMO + R.VIDAS_EXTRAS_MAXIMO + 2; i++) { // +2 da loja
			this.hud_coracoes.push(this.add.sprite(8 + i * 11, 8, 'coracao', 0).setOrigin(0).setDepth(10))
		}
		this.hud_melhorias = [] // ícones das melhorias pegas, embaixo da fase
		this.hud_pontos = texto(this, 0, 8, '', 8).setOrigin(1, 0).setDepth(10)
		this.hud_combo = texto(this, 0, 22, '', 8, '#ff9a3c').setOrigin(1, 0).setDepth(10)
		this.hud_nivel = texto(this, 8, 22, '', 8).setDepth(10)
		// barrinha de quanto falta para a próxima fase
		this.hud_progresso_fundo = this.add.rectangle(8, 32, 50, 2, 0x000000, 0.6).setOrigin(0).setDepth(10)
		this.hud_progresso = this.add.rectangle(8, 32, 0, 2, 0x9ff07a).setOrigin(0).setDepth(10)
		this.hud_arma = texto(this, 8, ALTURA - 24, '', 8, '#ffd34d').setDepth(10)
		this.hud_bombas = texto(this, 8, ALTURA - 12, '', 8).setDepth(10)
		// barra da fúria élfica (acima do nome da arma)
		this.hud_furia_fundo = this.add.rectangle(8, ALTURA - 32, 50, 3, 0x000000, 0.6).setOrigin(0).setDepth(10)
		this.hud_furia = this.add.rectangle(8, ALTURA - 32, 0, 3, 0xff9aff).setOrigin(0).setDepth(10)
		this.hud_furia_texto = texto(this, 62, ALTURA - 35, '', 8, '#ff9aff').setDepth(10)
		this.hud_poderes = texto(this, 0, ALTURA - 12, '', 8, '#9fd8ff').setOrigin(1, 0).setDepth(10)

		// barra de vida do chefão
		this.barra_fundo = this.add.rectangle(0, 40, 10, 6, 0x000000, 0.7).setOrigin(0.5, 0).setDepth(10).setVisible(false)
		this.barra_rastro = this.add.rectangle(0, 41, 10, 4, 0xffe080).setOrigin(0, 0).setDepth(10).setVisible(false)
		this.barra_vida = this.add.rectangle(0, 41, 10, 4, 0xd02828).setOrigin(0, 0).setDepth(10).setVisible(false)
		this.barra_nome = texto(this, 0, 29, 'ZUMBI REI', 8, '#ff6a6a').setOrigin(0.5, 0).setDepth(10).setVisible(false)

		this.vermelho = this.add.rectangle(0, 0, 10, ALTURA, 0xff0000, 0).setOrigin(0).setDepth(8)
		// fundo escuro atrás das mensagens de pausa e fim de jogo
		this.escurecer = this.add.rectangle(0, 0, 10, ALTURA, 0x000000, 0.6).setOrigin(0).setDepth(9).setVisible(false)
		this.aviso = texto(this, 0, ALTURA / 2 - 60, '', 16, '#ffd34d').setOrigin(0.5).setDepth(10)
		this.aviso_ha = 0
		this.mensagem = texto(this, 0, ALTURA / 2 + 30, '', 8).setOrigin(0.5).setDepth(10).setLineSpacing(8)
		this.atualizar_hud()
	}

	// a janela mudou de tamanho: reposiciona o que depende da largura
	ao_redimensionar() {
		if (!this.hud_pontos) {
			return
		}
		const meio = this.largura / 2
		this.chao.setSize(this.largura, ALTURA)
		// texto e botões do final do jogo acompanham o meio da tela
		for (const o of this.objetos_final || []) {
			if (o.active) o.x = meio
		}
		if (this.chao_velho && this.chao_velho.active) {
			this.chao_velho.setSize(this.largura, ALTURA)
		}
		this.hud_pontos.x = this.largura - 8
		this.hud_combo.x = this.largura - 8
		this.hud_poderes.x = this.largura - 8
		this.vermelho.setSize(this.largura, ALTURA)
		this.escurecer.setSize(this.largura, ALTURA)
		this.relampago.setSize(this.largura, ALTURA)
		this.vinheta.setDisplaySize(this.largura, ALTURA)
		this.neblina.setSize(this.largura, ALTURA)
		this.escuro.resize(Math.ceil(this.largura), ALTURA)
		this.tom_vermelho.setSize(this.largura, ALTURA)
		this.lua.x = this.lua_brilho.x = Math.round(this.largura * 0.72)
		this.aviso.x = meio
		this.mensagem.x = meio
		this.barra_fundo.x = meio
		this.barra_nome.x = meio
		const largura_barra = Math.min(200, this.largura - 40)
		this.barra_fundo.setSize(largura_barra + 2, 6)
		this.barra_vida.x = meio - largura_barra / 2
		this.barra_rastro.x = meio - largura_barra / 2
		this.largura_barra = largura_barra
		this.heroi_x = Phaser.Math.Clamp(this.heroi_x, 0, this.largura - 25)
		if (this.botao_bomba) {
			this.posicionar_botoes()
		}
	}

	atualizar_hud() {
		// mostra pelo menos 3 espaços de coração; o 4º e o 5º só aparecem quando você ganha vida extra
		this.hud_coracoes.forEach((coracao, i) => {
			coracao.setVisible(i < Math.max(this.dificuldade.vidas, this.vidas))
			coracao.setFrame(i < this.vidas ? 0 : 1)
		})
		this.hud_pontos.setText('PONTOS ' + String(this.pontos).padStart(6, '0'))
		this.hud_nivel.setText('FASE ' + this.nivel)
		const em_chefe = this.chefe != null || this.chefe_em > 0
		this.hud_progresso.setSize(em_chefe ? 50 : (50 * this.mortes_no_nivel) / R.MORTES_POR_NIVEL(this.nivel), 2)
		this.hud_progresso.setFillStyle(em_chefe ? 0xd02828 : 0x9ff07a)
		const arma = R.ARMAS[this.arma]
		const nivel = ['', '', ' II', ' III'][this.nivel_arma || 1]
		this.hud_arma.setText(this.municao == Infinity ? arma.nome : arma.nome + nivel + ' ' + this.municao)
		this.hud_bombas.setText('BOMBAS ' + this.bombas + (this.moedas_extras ? '   MOEDAS ' + this.moedas_extras : ''))
	}

	// ------------------------------------------------------------------ dicas da primeira partida

	criar_dicas() {
		this.dicas = []
		this.dica_texto = texto(this, 0, ALTURA - 62, '', 8, '#9ff07a').setOrigin(0.5).setDepth(10)
		let ja_viu = false
		try {
			ja_viu = localStorage.getItem('elf-kill-zombie-dicas') == 'sim'
		} catch {
			// sem localStorage: mostra as dicas
		}
		if (ja_viu) {
			return
		}
		const disparos = () => this.stats.disparos
		// cada dica some quando o jogador faz o que ela pede (ou depois de "maximo" ticks)
		this.dicas = [
			{ teclado: 'WASD OU SETAS PARA ANDAR', toque: 'ARRASTE O DEDO NA ESQUERDA PARA ANDAR', feita: () => this.andou, maximo: 600 },
			{ teclado: 'MIRE COM O MOUSE E CLIQUE PARA ATIRAR', toque: 'O ELFO ATIRA SOZINHO; TOQUE NA DIREITA PARA MIRAR', feita: () => disparos() >= 5, maximo: 700 },
			{ teclado: 'CLIQUE DIREITO JOGA UMA BOMBA NA MIRA', toque: 'O BOTÃO DA BOMBA FICA EMBAIXO À DIREITA', feita: () => this.bombas < R.BOMBAS_NO_COMECO, maximo: 600 },
			{ teclado: 'PEGUE AS CAIXAS QUE CAEM: ARMAS E PODERES', toque: 'PEGUE AS CAIXAS QUE CAEM: ARMAS E PODERES', feita: () => this.arma != 'pistola', maximo: 500 },
		]
		this.dica_ha = 0
	}

	mostrar_dicas() {
		const dica = this.dicas[0]
		if (!dica) {
			this.dica_texto.setVisible(false)
			return
		}
		this.dica_ha++
		if (dica.feita() || this.dica_ha > dica.maximo) {
			this.dicas.shift()
			this.dica_ha = 0
			if (this.dicas.length == 0) {
				try {
					localStorage.setItem('elf-kill-zombie-dicas', 'sim')
				} catch {
					// sem localStorage: mostra de novo na próxima vez
				}
			}
			return
		}
		this.dica_texto.setText(this.modo_toque ? dica.toque : dica.teclado)
		this.dica_texto.setPosition(this.largura / 2, ALTURA - 62)
		this.dica_texto.setVisible(Math.floor(this.dica_ha / 40) % 4 != 3) // pisca de leve
	}
}
