// Parte da cena Jogo: manchas de sangue, chuva, neve, brasas e relâmpagos.
// Os métodos desta classe são copiados para a cena em Jogo.js (por isso usam this como se fossem dela).
import Phaser from 'phaser'
import { ALTURA } from '../tela.js'
import * as R from '../regras.js'
import { efeito } from '../opcoes.js'
import { progresso_de_hoje } from '../desafios.js'

export default class Clima {
	// ------------------------------------------------------------------ manchas, chuva e relâmpagos

	deixar_mancha(x, y) {
		if (this.manchas.length >= 40) {
			this.manchas.shift().sprite.destroy() // limite: some a mais antiga
		}
		const sprite = this.add.sprite(x, y, 'mancha', Phaser.Math.Between(0, 2)).setDepth(1.2).setFlipX(Math.random() < 0.5)
		this.manchas.push({ sprite, y, ha: 0 })
	}

	// as manchas andam junto com o chão e vão sumindo
	mover_manchas() {
		for (const mancha of this.manchas) {
			mancha.y += R.ROLAGEM_DO_CHAO
			mancha.ha++
			if (mancha.ha > 900 || mancha.y > ALTURA + 10) {
				mancha.sprite.destroy()
				mancha.sumiu = true
			}
		}
		this.manchas = this.manchas.filter((mancha) => !mancha.sumiu)
	}

	// da 6ª fase de cada cenário em diante chove (cada vez mais forte) e de vez em quando cai um raio;
	// no inferno, em vez de chuva, sobem brasas o tempo todo
	mover_chuva() {
		const cenario = this.cenario()
		const fase_no_cenario = this.fase_no_ciclo() - cenario.a_partir_da_fase + 1
		const brasas = cenario.clima == 'brasas'
		const neve = cenario.clima == 'neve'
		let quantas = 0
		if (brasas) {
			quantas = 50
		}
		else if (neve) {
			// a neve cai sempre, mais forte com as fases
			quantas = Math.min(160, 60 + fase_no_cenario * 10)
		}
		else if (fase_no_cenario >= R.FASE_DA_CHUVA) {
			quantas = Math.min(140, 40 + (fase_no_cenario - R.FASE_DA_CHUVA) * 15)
		}
		while (this.gotas.length < quantas) {
			this.gotas.push({ x: Math.random() * (this.largura + 60), y: Math.random() * ALTURA, v: 5 + Math.random() * 3 })
		}
		this.gotas.length = Math.min(this.gotas.length, quantas)
		this.clima = brasas ? 'brasas' : neve ? 'neve' : 'chuva'
		for (const gota of this.gotas) {
			if (brasas) {
				// brasa: sobe devagar balançando
				gota.y -= gota.v * 0.12
				gota.x += Math.sin((gota.y + gota.v * 50) / 20) * 0.3
				if (gota.y < -5) {
					gota.y = ALTURA + 5
					gota.x = Math.random() * this.largura
				}
				continue
			}
			if (neve) {
				// floco: cai devagar balançando de um lado para o outro
				gota.y += gota.v * 0.18
				gota.x += Math.sin((gota.y + gota.v * 40) / 25) * 0.4 - 0.1
				if (gota.y > ALTURA) {
					gota.y = -5
					gota.x = Math.random() * (this.largura + 60)
				}
				continue
			}
			gota.y += gota.v
			gota.x -= gota.v * 0.25 // vento leve
			if (gota.y > ALTURA) {
				gota.y = -10
				gota.x = Math.random() * (this.largura + 60)
			}
		}

		if (this.relampago_ha > 0) {
			this.relampago_ha--
		}
		if (quantas > 0 && !brasas && !neve) {
			this.proximo_trovao--
			if (this.proximo_trovao <= 0) {
				this.proximo_trovao = Phaser.Math.Between(1200, 2600)
				this.relampago_ha = 40
				efeito(this, 'trovao', { volume: 0.55 })
			}
		}
	}

	contar_tempos() {
		// a cada segundo confere os desafios do dia: o que acabou de ser cumprido ganha um aviso
		if (this.stats.ticks % 100 == 0) {
			for (const d of progresso_de_hoje(this.dia, this.resumo_da_partida())) {
				if (!d.feita && d.atual >= d.meta && !this.desafios_avisados.has(d.texto)) {
					this.desafios_avisados.add(d.texto)
					this.anunciar('DESAFIO CUMPRIDO!\n' + d.texto, 220, '#9ff07a')
					efeito(this, 'moeda', { volume: 0.6 })
				}
			}
		}
		if (this.invencivel > 0)
			this.invencivel--
		if (this.clarao_ha > 0)
			this.clarao_ha--
		if (this.dano_ha > 0)
			this.dano_ha--
		if (this.vermelho_heroi > 0)
			this.vermelho_heroi--
		for (const poder in this.poderes) {
			if (this.poderes[poder] > 0)
				this.poderes[poder]--
		}
		if (this.combo_ha > 0) {
			this.combo_ha--
			if (this.combo_ha == 0) {
				this.combo = 0
				this.multiplicador = 1
			}
		}
		if (this.aviso_ha > 0) {
			this.aviso_ha--
			if (this.aviso_ha == 0) {
				this.aviso.setVisible(false)
			}
		}
		for (const t of this.textos) {
			t.ha++
			if (t.ha == 70) {
				t.obj.destroy()
			}
		}
		this.textos = this.textos.filter((t) => t.ha < 70)
	}

	get congelado() {
		return this.poderes.congelar > 0
	}
}
