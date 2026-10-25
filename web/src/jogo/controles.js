// Parte da cena Jogo: controles de toque (celular) e partes da entrada.
// Os métodos desta classe são copiados para a cena em Jogo.js (por isso usam this como se fossem dela).
import Phaser from 'phaser'
import { ALTURA, texto } from '../tela.js'
import * as R from '../regras.js'
import { corpo, corpo_chefe, memoria } from './comum.js'

export default class Controles {
	// ------------------------------------------------------------------ controles de toque

	ao_tocar(p) {
		if (!p.wasTouch) {
			return
		}
		if (!this.modo_toque) {
			this.ligar_toque()
		}
		if (this.estado == 'pausado') {
			this.pausar() // tocar na tela continua o jogo
			return
		}
		const ponto = this.cameras.main.getWorldPoint(p.x, p.y)
		if (this.estado == 'jogando' && Phaser.Math.Distance.Between(ponto.x, ponto.y, this.botao_pausa.x, this.botao_pausa.y) < 16) {
			this.pausar()
		}
	}

	ligar_toque() {
		this.modo_toque = true
		memoria.usou_toque = true
		this.input.setDefaultCursor('default')
		const fundo = (raio) => this.add.circle(0, 0, raio, 0x000000, 0.35).setStrokeStyle(1, 0xffffff, 0.5).setDepth(11)
		this.joystick_base = fundo(24).setVisible(false)
		this.joystick_botao = this.add.circle(0, 0, 10, 0xffffff, 0.45).setDepth(11).setVisible(false)
		this.botao_bomba = fundo(16)
		this.icone_bomba = this.add.image(0, 0, 'bomba').setScale(1.4).setDepth(11)
		this.botao_esquiva = fundo(14)
		this.icone_esquiva = texto(this, 0, 0, '>>', 8).setOrigin(0.5).setDepth(11)
		this.botao_furia = fundo(14)
		this.icone_furia = texto(this, 0, 0, 'F', 8, '#ff9aff').setOrigin(0.5).setDepth(11)
		this.botao_pausa = fundo(11)
		this.icone_pausa = texto(this, 0, 0, 'II', 8).setOrigin(0.5).setDepth(11)
		this.posicionar_botoes()
	}

	posicionar_botoes() {
		this.botao_bomba.setPosition(this.largura - 24, ALTURA - 58)
		this.icone_bomba.setPosition(this.largura - 24, ALTURA - 58)
		this.botao_esquiva.setPosition(this.largura - 58, ALTURA - 36)
		this.icone_esquiva.setPosition(this.largura - 58, ALTURA - 36)
		this.botao_furia.setPosition(this.largura - 24, ALTURA - 96)
		this.icone_furia.setPosition(this.largura - 24, ALTURA - 96)
		this.botao_pausa.setPosition(this.largura / 2, 14)
		this.icone_pausa.setPosition(this.largura / 2, 14)
	}

	// Dedo que começou na metade esquerda da tela = joystick para andar.
	// Dedo na metade direita = mira (e atira). Sem dedo mirando, o elfo mira e atira sozinho
	// no inimigo mais perto. O botão de bomba joga a bomba onde o elfo está mirando.
	ler_toque() {
		const camera = this.cameras.main
		let mover = null
		let mira = null
		let bomba = false
		let esquiva = false
		for (const p of this.input.manager.pointers) {
			if (!p.isDown || !p.wasTouch) {
				continue
			}
			const agora = camera.getWorldPoint(p.x, p.y)
			const inicio = camera.getWorldPoint(p.downX, p.downY)
			if (Phaser.Math.Distance.Between(inicio.x, inicio.y, this.botao_bomba.x, this.botao_bomba.y) < 20) {
				bomba = true
			}
			else if (Phaser.Math.Distance.Between(inicio.x, inicio.y, this.botao_esquiva.x, this.botao_esquiva.y) < 18) {
				esquiva = true
			}
			else if (Phaser.Math.Distance.Between(inicio.x, inicio.y, this.botao_furia.x, this.botao_furia.y) < 18) {
				this.furia_on = true
			}
			else if (Phaser.Math.Distance.Between(inicio.x, inicio.y, this.botao_pausa.x, this.botao_pausa.y) < 16) {
				continue
			}
			else if (p.downX < this.scale.width / 2) {
				mover = { agora, inicio }
			}
			else {
				mira = agora
			}
		}

		const RAIO = 24
		if (mover) {
			let dx = mover.agora.x - mover.inicio.x
			let dy = mover.agora.y - mover.inicio.y
			const tamanho = Math.hypot(dx, dy)
			if (tamanho > RAIO) {
				dx = (dx / tamanho) * RAIO
				dy = (dy / tamanho) * RAIO
			}
			this.toque_vx = dx / RAIO
			this.toque_vy = dy / RAIO
			this.joystick_base.setPosition(mover.inicio.x, mover.inicio.y).setVisible(true)
			this.joystick_botao.setPosition(mover.inicio.x + dx, mover.inicio.y + dy).setVisible(true)
		}
		else {
			this.toque_vx = 0
			this.toque_vy = 0
			this.joystick_base.setVisible(false)
			this.joystick_botao.setVisible(false)
		}
		// as setas "de mentira" só servem para a animação de andar
		this.esq_on = this.toque_vx < -0.3
		this.dir_on = this.toque_vx > 0.3
		this.cima_on = this.toque_vy < -0.3
		this.baixo_on = this.toque_vy > 0.3

		if (mira) {
			this.mira_x = mira.x
			this.mira_y = mira.y
			this.atirar_on = true
		}
		else {
			const alvo = this.inimigo_mais_perto()
			this.atirar_on = alvo != null
			if (alvo) {
				this.mira_x = alvo.x
				this.mira_y = alvo.y
			}
		}
		this.bomba_on = bomba
		this.esquiva_on = this.esquiva_on || esquiva
		// o botão da esquiva fica apagado enquanto ela recarrega
		this.botao_esquiva.setAlpha(this.esquiva_espera > 0 ? 0.35 : 1)
		this.icone_esquiva.setAlpha(this.esquiva_espera > 0 ? 0.35 : 1)
	}

	// centro do inimigo vivo mais perto do elfo que já está dentro da tela
	inimigo_mais_perto(ox = this.heroi_x + 12, oy = this.heroi_y + 12) {
		let melhor = null
		let menor = Infinity
		const considerar = (x, y) => {
			if (y < 0) return
			const d = Phaser.Math.Distance.Between(ox, oy, x, y)
			if (d < menor) {
				menor = d
				melhor = { x, y }
			}
		}
		for (const zumbi of this.zumbis) {
			if (!zumbi.morrendo && !zumbi.intangivel) {
				const c = corpo(zumbi)
				considerar(c.x + c.l / 2, c.y + c.a / 2)
			}
		}
		if (this.chefe && this.chefe.fase != 'morrendo' && !this.chefe.intangivel) {
			const c = corpo_chefe(this.chefe)
			considerar(c.x + c.l / 2, c.y + c.a / 2)
		}
		return melhor ? { ...melhor, distancia: menor } : null
	}

	processamento() {
		this.stats.ticks++
		this.mover_heroi()
		if (this.p2) {
			this.processar_p2()
		}
		this.mirar()
		this.atirar()
		this.soltar_furia()
		this.jogar_bomba()
		this.criar_zumbis()
		this.mover_horda()
		this.mover_perigos()
		this.chamar_chefe()
		this.criar_revoada()
		this.criar_itens()
		this.mover_tiros()
		this.mover_cuspes()
		this.mover_bombas()
		this.mover_zumbis()
		this.mover_chefe()
		this.mover_coracoes()
		this.mover_moedas()
		this.mover_itens()
		this.mover_torretas()
		this.mover_manchas()
		this.mover_chuva()
		this.mostrar_dicas()
		this.contar_tempos()

		this.chao.tilePositionY -= R.ROLAGEM_DO_CHAO // o chão rola para dar a impressão de que o elfo avança
		if (this.chao_velho && this.chao_velho.active) {
			this.chao_velho.tilePositionY -= R.ROLAGEM_DO_CHAO
		}
	}
}
