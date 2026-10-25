// Parte da cena Jogo: bombas e explosões.
// Os métodos desta classe são copiados para a cena em Jogo.js (por isso usam this como se fossem dela).
import Phaser from 'phaser'
import { ALTURA } from '../tela.js'
import * as R from '../regras.js'
import { desbloquear } from '../conquistas.js'
import { efeito } from '../opcoes.js'
import { corpo, corpo_chefe } from './comum.js'

export default class Explosoes {
	// ------------------------------------------------------------------ bombas e explosões

	jogar_bomba() {
		if (this.espera_bomba > 0) {
			this.espera_bomba--
			return
		}
		if (!this.bomba_on || this.bombas == 0) {
			return
		}
		// a bomba voa da mão do elfo até o ponto da mira (sem sair da tela)
		const x1 = Phaser.Math.Clamp(this.mira_x, 0, this.largura)
		const y1 = Phaser.Math.Clamp(this.mira_y, 0, ALTURA)
		const distancia = Phaser.Math.Distance.Between(this.mao_x, this.mao_y, x1, y1)
		const sprite = this.add.image(this.mao_x, this.mao_y, 'bomba').setDepth(7)
		this.bombas_voando.push({
			sprite,
			x0: this.mao_x,
			y0: this.mao_y,
			x1,
			y1,
			altura: Math.min(50, distancia * 0.35),
			ha: 0,
			duracao: Math.max(20, Math.round(distancia / 3)),
		})
		this.bombas--
		this.espera_bomba = 40
		efeito(this, 'arremesso', { volume: 0.5 })
		this.atualizar_hud()
	}

	mover_bombas() {
		for (const bomba of this.bombas_voando) {
			bomba.ha++
			if (bomba.ha >= bomba.duracao) {
				bomba.explodiu = true
				bomba.sprite.destroy()
				this.explodir(bomba.x1, bomba.y1, R.RAIO_DA_EXPLOSAO * this.tamanho_explosao(), R.DANO_DA_EXPLOSAO)
			}
		}
		this.bombas_voando = this.bombas_voando.filter((bomba) => !bomba.explodiu)

		// a explosão tem 7 quadros, um a cada 5 ticks
		for (const explosao of this.explosoes) {
			explosao.ha++
			if (explosao.ha == 7 * 5) {
				explosao.sprite.destroy()
			}
		}
		this.explosoes = this.explosoes.filter((explosao) => explosao.ha < 7 * 5)
	}

	// explosão em (x, y): machuca todo zumbi dentro do raio e desfaz os cuspes;
	// a do zumbi bombado também machuca o elfo (fere_heroi)
	// do_cenario: escombros, meteoros e granizo (não ferem o chefão nem contam como explosão do jogador)
	explodir(x, y, raio, dano, com_som = true, fere_heroi = false, do_cenario = false) {
		const sprite = this.add.sprite(x, y, 'explosao', 0).setDepth(7).setScale(raio / R.RAIO_DA_EXPLOSAO)
		this.explosoes.push({ sprite, ha: 0 })
		this.tremer(150, 0.004 + raio / 10000)
		this.vibrar(0.25 + raio / 200, 120)
		if (com_som) {
			efeito(this, 'explosao', { volume: 0.8, rate: raio < R.RAIO_DA_EXPLOSAO ? 1.25 : 1 })
		}
		if (fere_heroi && this.herois().some((h) => Phaser.Math.Distance.Between(x, y, h.x + 12, h.y + 12) < raio * 0.8)) {
			this.levar_dano()
		}
		const mortos_antes = this.stats.mortos
		if (this.chefe && dano > 0 && !do_cenario) {
			for (const osso of this.chefe.ossos.slice()) {
				if (Phaser.Math.Distance.Between(x, y, osso.x, osso.y) < raio) {
					this.quebrar_osso(osso)
				}
			}
		}

		// slice: a gosma que morre aqui cria filhotes, e eles não podem levar a mesma explosão
		for (const zumbi of this.zumbis.slice()) {
			if (zumbi.morrendo || zumbi.intangivel || dano == 0) {
				continue
			}
			const c = corpo(zumbi)
			if (Phaser.Math.Distance.Between(x, y, c.x + c.l / 2, c.y + c.a / 2) <= raio + c.l / 4) {
				this.espirrar_sangue(c.x + c.l / 2, c.y + c.a / 2)
				this.ferir_zumbi(zumbi, dano, 6)
			}
		}
		if (this.stats.mortos - mortos_antes >= 3) {
			this.parada = Math.max(this.parada, 5)
		}
		if (this.stats.mortos - mortos_antes >= 5 && !do_cenario) {
			desbloquear(this, 'bomba5')
		}
		if (!do_cenario) {
			this.stats.por_explosao += this.stats.mortos - mortos_antes
		}
		if (this.chefe && !do_cenario && this.chefe.fase != 'morrendo' && !this.chefe.intangivel) {
			const c = corpo_chefe(this.chefe)
			if (Phaser.Math.Distance.Between(x, y, c.x + c.l / 2, c.y + c.a / 2) <= raio + c.l / 2) {
				this.ferir_chefe(dano, x, y)
			}
		}
		for (const cuspe of this.cuspes) {
			if (Phaser.Math.Distance.Between(x, y, cuspe.x, cuspe.y) <= raio) {
				cuspe.sumiu = true
				cuspe.sprite.destroy()
			}
		}
		this.cuspes = this.cuspes.filter((cuspe) => !cuspe.sumiu)
	}
}
