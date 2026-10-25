// Parte da cena Jogo: desenho de tudo a cada quadro (saída).
// Os métodos desta classe são copiados para a cena em Jogo.js (por isso usam this como se fossem dela).
import Phaser from 'phaser'
import * as R from '../regras.js'
import { corpo, corpo_chefe } from './comum.js'

export default class Desenho {
	// ------------------------------------------------------------------ desenho

	saida() {
		this.desenhar_heroi()
		if (this.p2) {
			this.desenhar_p2()
		}
		this.desenhar_zumbis()
		this.desenhar_chefe()
		this.desenhar_resto()
		this.desenhar_sombras()
		this.desenhar_clima()
		this.desenhar_hud_do_tick()
		this.quadro_atual++
	}

	// raios: linhas em zigue-zague (sorteado de novo a cada tick, para "tremer") que somem em 12 ticks
	desenhar_raios() {
		const g = this.desenho_raios
		g.clear()
		for (const raio of this.raios) {
			raio.ha++
			const forca = 1 - raio.ha / 12
			for (const [largura, cor, alfa] of [[3, 0x60a8ff, 0.5], [1, 0xe8f4ff, 1]]) {
				g.lineStyle(largura, cor, alfa * forca)
				g.beginPath()
				g.moveTo(raio.pontos[0][0], raio.pontos[0][1])
				for (let i = 1; i < raio.pontos.length; i++) {
					const [x0, y0] = raio.pontos[i - 1]
					const [x1, y1] = raio.pontos[i]
					// 4 pedacinhos tortos entre um alvo e o próximo
					for (let k = 1; k <= 4; k++) {
						const t = k / 4
						const torto = k < 4 ? (Math.random() * 2 - 1) * 6 : 0
						g.lineTo(x0 + (x1 - x0) * t + torto, y0 + (y1 - y0) * t + torto)
					}
				}
				g.strokePath()
			}
		}
		this.raios = this.raios.filter((raio) => raio.ha < 12)
	}

	desenhar_clima() {
		const alvo = this.cenario().neblina || 0
		this.neblina.alpha += (alvo - this.neblina.alpha) * 0.01
		this.neblina.tilePositionX += 0.12
		this.neblina.tilePositionY -= R.ROLAGEM_DO_CHAO * 0.4
		this.desenhar_eclipse()
		const vermelho = this.lua_de_sangue ? 1 : 0
		this.tom_vermelho.fillAlpha += (vermelho * 0.13 - this.tom_vermelho.fillAlpha) * 0.02
		this.lua.alpha += (vermelho * 0.9 - this.lua.alpha) * 0.02
		this.lua_brilho.alpha = this.lua.alpha * (0.25 + 0.08 * Math.sin(this.quadro_atual / 25))
		const g = this.chuva
		g.clear()
		if (this.gotas.length && this.clima == 'brasas') {
			for (const gota of this.gotas) {
				// pisca entre laranja e amarelo
				g.fillStyle(gota.v > 6.5 ? 0xffe080 : 0xff8a30, 0.5 + 0.4 * Math.sin((this.quadro_atual + gota.v * 40) / 10))
				g.fillRect(Math.round(gota.x), Math.round(gota.y), 1, 1)
			}
		}
		else if (this.gotas.length && this.clima == 'neve') {
			for (const gota of this.gotas) {
				// flocos grandes (mais perto) e pequenos (mais longe)
				g.fillStyle(0xffffff, gota.v > 6.5 ? 0.9 : 0.6)
				g.fillRect(Math.round(gota.x), Math.round(gota.y), gota.v > 6.5 ? 2 : 1, gota.v > 6.5 ? 2 : 1)
			}
		}
		else if (this.gotas.length) {
			g.lineStyle(1, 0xa8c0ff, 0.45)
			for (const gota of this.gotas) {
				g.lineBetween(gota.x, gota.y, gota.x + 2, gota.y - 7)
			}
		}
		// relâmpago: um clarão forte, um apagão rápido e um segundo clarão mais fraco
		const t = this.relampago_ha
		const brilho = t > 32 ? 0.55 : t > 26 ? 0 : t > 18 ? 0.35 : t > 0 ? (t / 18) * 0.15 : 0
		this.relampago.setFillStyle(0xe8f0ff, brilho)
		for (const mancha of this.manchas) {
			mancha.sprite.setY(Math.round(mancha.y))
			mancha.sprite.setAlpha(mancha.ha < 600 ? 0.9 : 0.9 * (1 - (mancha.ha - 600) / 300))
		}
	}

	desenhar_heroi() {
		// elfo: olha para a mira; andando usa o sprite de andar, parado o de parado
		const andando = this.esq_on || this.dir_on || this.cima_on || this.baixo_on
		if (andando) {
			this.heroi.setTexture('heroi_' + this.heroi_direcao, this.heroi_xi)
			// com as botas as pernas também andam mais rápido
			const passo = this.poderes.velocidade > 0 ? 3 : 5
			if (this.quadro_atual % passo == 0)
				this.heroi_xi = (this.heroi_xi + 1) % 10
		}
		else {
			this.heroi.setTexture('heroi_parado_' + this.heroi_direcao)
		}
		this.heroi.setPosition(Math.round(this.heroi_x), Math.round(this.heroi_y))
		// piscando enquanto está invencível
		const visivel = this.invencivel == 0 || Math.floor(this.invencivel / 8) % 2 == 0
		this.heroi.setVisible(visivel)
		if (this.vermelho_heroi > 0) {
			this.heroi.setTint(0xff3030).setTintMode(Phaser.TintModes.FILL)
		}
		else if (this.cor_do_elfo == 'arco') {
			this.heroi.setTint(R.cor_arco_iris(this.time.now)).setTintMode(Phaser.TintModes.MULTIPLY)
		}
		else if (this.cor_do_elfo) {
			this.heroi.setTint(this.cor_do_elfo).setTintMode(Phaser.TintModes.MULTIPLY)
		}
		else {
			this.heroi.clearTint().setTintMode(Phaser.TintModes.MULTIPLY)
		}

		// a arma acompanha a mira; virada para a esquerda ela é espelhada para não ficar de cabeça para baixo
		this.arma_na_mao.setPosition(Math.round(this.mao_x), Math.round(this.mao_y))
		this.arma_na_mao.setRotation(this.angulo)
		this.arma_na_mao.setFlipY(Math.abs(this.angulo) > Math.PI / 2)
		this.arma_na_mao.setVisible(visivel)
		this.clarao.setVisible(this.clarao_ha > 0)
		// barrinha da carga do arco em cima do elfo (pisca quando está cheia)
		this.barra_carga.setVisible(this.carga > 0).setPosition(Math.round(this.heroi_x + 2), Math.round(this.heroi_y - 4))
		this.barra_carga.width = 20 * this.carga
		this.barra_carga.setFillStyle(this.carga >= 1 && Math.floor(this.quadro_atual / 6) % 2 ? 0xffffff : 0x9ff07a)
		if (this.chapeu) {
			// em cima da cabeça; de lado a cabeça fica um pouco mais para a frente
			const dx = { esquerda: -1, direita: 1 }[this.heroi_direcao] || 0
			const pulo = andando && this.heroi_xi % 5 < 2 ? 1 : 0
			this.chapeu.setPosition(Math.round(this.heroi_x + 12 + dx), Math.round(this.heroi_y + 6 - pulo))
			this.chapeu.setFlipX(this.heroi_direcao == 'esquerda').setVisible(visivel)
		}

		// bolha do escudo: pisca quando está acabando
		const escudo = this.poderes.escudo
		this.bolha.setPosition(this.heroi_x + 12, this.heroi_y + 13)
		this.bolha.setVisible(escudo > 0 && (escudo > 150 || Math.floor(escudo / 10) % 2 == 0))
	}

	desenhar_zumbis() {
		for (const zumbi of this.zumbis) {
			const s = zumbi.sprite
			if (zumbi.regra.voa) {
				// bate as asas (0, 1, 2, 1...) e aponta o bico para onde voa
				const quadros = [0, 1, 2, 1]
				if (!this.congelado) {
					s.setFrame(quadros[Math.floor(this.quadro_atual / 5) % 4])
				}
				s.setPosition(Math.round(zumbi.x + 8), Math.round(zumbi.y + 6))
				s.setRotation(Math.atan2(zumbi.vy, zumbi.vx) - Math.PI / 2)
				this.pintar(s, zumbi.flash, null)
				continue
			}
			if (!zumbi.morrendo) {
				s.setFrame(zumbi.xi)
				s.setPosition(Math.round(zumbi.x), Math.round(zumbi.y))
				if (this.quadro_atual % 12 == 0 && !this.congelado)
					zumbi.xi = (zumbi.xi + 1) % 7
			}
			else {
				// morrendo: um quadro a cada 15 ticks, com os pés no mesmo lugar
				s.setTexture('zumbi_morre', Math.min(4, Math.floor(zumbi.morto_ha / 15)))
				const e = zumbi.escala
				s.setPosition(Math.round(zumbi.x + (22 - 30) * e), Math.round(zumbi.y + (44 - 71) * e))
			}
			this.pintar(s, zumbi.flash, zumbi.cor)
			// elite: pisca dourado e solta faíscas
			if (zumbi.elite && !zumbi.morrendo && zumbi.flash == 0 && !this.congelado) {
				if (Math.floor(this.quadro_atual / 8) % 2 == 0) {
					s.setTint(0xffe070).setTintMode(Phaser.TintModes.MULTIPLY)
				}
				if (this.quadro_atual % 9 == 0) {
					const c = corpo(zumbi)
					const faisca = this.add.rectangle(c.x + Math.random() * c.l, c.y + Math.random() * c.a, 2, 2, 0xffe070).setDepth(4)
					this.tweens.add({ targets: faisca, y: faisca.y - 12, alpha: 0, duration: 500, onComplete: () => faisca.destroy() })
				}
			}

			// tamborzeiro: a aura pulsa no ritmo do tambor (e some quando ele morre)
			if (zumbi.aura) {
				if (zumbi.morrendo) {
					zumbi.aura.destroy()
					zumbi.aura = null
				}
				else {
					const c = corpo(zumbi)
					zumbi.aura.setPosition(c.x + c.l / 2, c.y + c.a / 2).setScale(0.95 + 0.05 * Math.sin(this.quadro_atual / 6))
				}
			}

			// coveiro: a lápide vai na frente, nas mãos dele
			if (zumbi.lapide) {
				if (zumbi.morrendo) {
					this.soltar_lapide(zumbi)
				}
				else {
					const e = zumbi.escala
					zumbi.lapide.setPosition(Math.round(zumbi.x + 22 * e), Math.round(zumbi.y + 20 * e + Math.sin(this.quadro_atual / 10) * 1))
					if (zumbi.lapide_flash > 0) zumbi.lapide_flash--
					this.pintar(zumbi.lapide, zumbi.lapide_flash, null)
				}
			}

			// fantasma: some e aparece aos poucos
			if (zumbi.regra.fantasma && !zumbi.morrendo) {
				const c = zumbi.ciclo
				const alvo = zumbi.intangivel ? 0.18 : 0.85
				const transicao = c >= 200 ? Math.min(1, (c - 200) / 20) : c < 20 ? c / 20 : 1
				s.setAlpha(zumbi.intangivel ? 0.85 - (0.85 - alvo) * transicao : 0.18 + (alvo - 0.18) * transicao)
			}
			// bombado: incha e desincha
			if (zumbi.regra.explode && !zumbi.morrendo) {
				s.setScale(zumbi.escala * (1 + Math.sin(this.quadro_atual / 8) * 0.04))
			}
		}
	}

	// branco quando acabou de levar um tiro, azulado quando congelado, senão a cor do tipo
	pintar(sprite, flash, cor) {
		if (flash > 0) {
			sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL)
		}
		else if (this.congelado) {
			sprite.setTint(0x8cc8ff).setTintMode(Phaser.TintModes.MULTIPLY)
		}
		else if (cor) {
			sprite.setTint(cor).setTintMode(Phaser.TintModes.MULTIPLY)
		}
		else {
			sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY)
		}
	}

	desenhar_chefe() {
		const chefe = this.chefe
		const mostrar_barra = chefe != null && chefe.fase != 'morrendo'
		this.barra_fundo.setVisible(mostrar_barra)
		this.barra_vida.setVisible(mostrar_barra)
		this.barra_rastro.setVisible(mostrar_barra)
		this.barra_nome.setVisible(mostrar_barra)
		if (!chefe) {
			return
		}

		let quadro
		if (chefe.fase == 'morrendo') {
			// linha 6 a partir da 3ª coluna e linha 7: pegando fogo e virando fumaça
			quadro = Math.min(55, 44 + Math.floor(chefe.morto_ha / 10))
		}
		else if (chefe.atacando > 0 || chefe.investida) {
			quadro = 28 + (Math.floor(this.quadro_atual / 8) % 4) // linha 4: braços para cima
		}
		else {
			quadro = Math.floor(this.quadro_atual / 10) % 7 // linha 0: andando para baixo
		}
		chefe.sprite.setFrame(quadro)
		chefe.sprite.setPosition(Math.round(chefe.x), Math.round(chefe.y))
		// avisando a investida: pisca vermelho
		const avisando = chefe.investida && chefe.investida.etapa == 'aviso' && Math.floor(this.quadro_atual / 6) % 2 == 0
		// enfurecido: pulsa avermelhado
		const bravo = chefe.furioso && Math.floor(this.quadro_atual / 15) % 2 == 0
		this.pintar(chefe.sprite, chefe.flash, avisando ? 0xff3030 : bravo ? 0xff8a7a : chefe.cor)
		const tp = chefe.teleporte
		chefe.sprite.setAlpha(tp ? (tp.ha < 30 ? 1 - tp.ha / 30 : (tp.ha - 30) / 30) : 1)

		const largura_vida = Math.max(0, (this.largura_barra * chefe.vida) / chefe.vida_max)
		this.barra_vida.setSize(largura_vida, 4)
		// o rastro amarelo vai alcançando a vida aos poucos e mostra o dano recente
		this.barra_rastro.setSize(Math.max(largura_vida, this.barra_rastro.width - 0.6), 4)
	}

	desenhar_resto() {
		for (const tiro of this.tiros) {
			tiro.sprite.setPosition(Math.round(tiro.x), Math.round(tiro.y))
			if (tiro.arma.chama) {
				const t = tiro.ha / tiro.arma.alcance
				tiro.sprite.setScale(0.5 + t * 1.1).setAlpha(1 - t * 0.85)
			}
		}
		this.desenhar_raios()
		for (const cuspe of this.cuspes) {
			cuspe.sprite.setPosition(Math.round(cuspe.x), Math.round(cuspe.y))
			cuspe.sprite.setFrame(Math.floor(this.quadro_atual / 10) % 2)
		}

		// a bomba faz um arco: sobe e desce enquanto vai até o alvo, girando
		for (const bomba of this.bombas_voando) {
			const t = bomba.ha / bomba.duracao
			const x = bomba.x0 + (bomba.x1 - bomba.x0) * t
			const y = bomba.y0 + (bomba.y1 - bomba.y0) * t - Math.sin(Math.PI * t) * bomba.altura
			bomba.sprite.setPosition(Math.round(x), Math.round(y))
			bomba.sprite.setRotation(t * Math.PI * 3)
		}
		for (const explosao of this.explosoes) {
			explosao.sprite.setFrame(Math.min(6, Math.floor(explosao.ha / 5)))
		}

		for (const coracao of this.coracoes) {
			coracao.sprite.setPosition(Math.round(coracao.x), Math.round(coracao.y))
		}
		// as caixas balançam um pouquinho para chamar atenção
		for (const item of this.itens) {
			const balanco = Math.round(Math.sin(this.quadro_atual / 15) * 2)
			item.sprite.setPosition(Math.round(item.x), Math.round(item.y) + balanco)
		}

		// sangue: um quadro a cada 6 ticks; depois do último, some
		for (const sangue of this.sangues) {
			sangue.sprite.setFrame(Math.floor(sangue.ha / 6))
			sangue.ha++
			if (sangue.ha == 6 * 6) {
				sangue.sprite.destroy()
			}
		}
		this.sangues = this.sangues.filter((sangue) => sangue.ha < 6 * 6)

		for (const rastro of this.rastros) {
			rastro.ha++
			rastro.sprite.setAlpha(0.5 * (1 - rastro.ha / 20))
			if (rastro.ha >= 20) {
				rastro.sprite.destroy()
			}
		}
		this.rastros = this.rastros.filter((rastro) => rastro.ha < 20)

		// textos flutuantes sobem e vão sumindo
		for (const t of this.textos) {
			t.obj.y -= 0.3
			t.obj.setAlpha(t.ha < 40 ? 1 : 1 - (t.ha - 40) / 30)
		}
	}

	desenhar_sombras() {
		const g = this.sombras
		g.clear()
		g.fillStyle(0x000000, 0.28)
		for (const h of this.herois()) {
			g.fillEllipse(h.x + 12.5, h.y + 25, 18, 6)
		}
		for (const zumbi of this.zumbis) {
			if (zumbi.morrendo) {
				continue
			}
			const c = corpo(zumbi)
			if (zumbi.cavando > 0) {
				// terra tremendo onde o escavador vai sair (treme mais quando está quase saindo)
				const tremor = zumbi.cavando < 40 ? 2 : 1
				const tx = c.x + c.l / 2 + (Math.random() * 2 - 1) * tremor
				const ty = c.y + c.a + (Math.random() * 2 - 1) * tremor
				g.fillStyle(0x4a3424, 0.9)
				g.fillEllipse(tx, ty, 20 + (110 - zumbi.cavando) * 0.08, 8)
				g.fillStyle(0x7a5a3a, 1)
				for (let k = 0; k < 4; k++) {
					g.fillRect(Math.round(tx - 8 + k * 5 + Math.random() * 2), Math.round(ty - 2 - Math.random() * 4), 2, 2)
				}
				g.fillStyle(0x000000, 0.28)
			}
			else if (zumbi.regra.voa) {
				// voando alto: a sombra fica bem abaixo dele
				g.fillEllipse(c.x + c.l / 2, c.y + c.a + 24, 10, 3)
			}
			else {
				g.fillEllipse(c.x + c.l / 2, c.y + c.a + 2 * zumbi.escala, c.l * 0.9, 6 * zumbi.escala)
			}
		}
		if (this.chefe && this.chefe.fase != 'morrendo') {
			const c = corpo_chefe(this.chefe)
			g.fillEllipse(c.x + c.l / 2, c.y + c.a + 2, c.l, 12)
		}
		for (const item of this.itens) {
			g.fillEllipse(item.x + 8, item.y + 18, 14, 4)
		}
	}

	desenhar_hud_do_tick() {
		this.vermelho.setFillStyle(0xff0000, this.dano_ha > 0 ? (this.dano_ha / 30) * 0.35 : 0)
		this.hud_combo.setText(this.multiplicador > 1 ? 'COMBO x' + this.multiplicador : '')

		// fúria: a barra pisca quando está cheia
		const cheia = this.furia >= 1
		this.hud_furia.setSize(50 * this.furia, 3)
		this.hud_furia.setFillStyle(cheia && Math.floor(this.quadro_atual / 15) % 2 ? 0xffffff : 0xff9aff)
		this.hud_furia_texto.setText(cheia ? (this.modo_toque ? 'FÚRIA!' : 'E: FÚRIA!') : '')
		if (this.botao_furia) {
			this.botao_furia.setAlpha(cheia ? 1 : 0.3)
			this.icone_furia.setAlpha(cheia ? 1 : 0.3)
		}

		// poderes ativos com os segundos que faltam
		const ativos = []
		for (const poder in this.poderes) {
			if (this.poderes[poder] > 0) {
				ativos.push(R.PODERES[poder].nome + ' ' + Math.ceil(this.poderes[poder] / 100))
			}
		}
		this.hud_poderes.setText(ativos.join('  '))
	}
}
