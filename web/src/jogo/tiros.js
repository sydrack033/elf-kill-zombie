// Parte da cena Jogo: tiros, bumerangue e acertos.
// Os métodos desta classe são copiados para a cena em Jogo.js (por isso usam this como se fossem dela).
import Phaser from 'phaser'
import { ALTURA } from '../tela.js'
import { efeito } from '../opcoes.js'
import { encostou, corpo, corpo_chefe } from './comum.js'

export default class Tiros {
	// ------------------------------------------------------------------ tiros

	mover_tiros() {
		for (const tiro of this.tiros) {
			if (tiro.arma.volta) {
				this.voar_bumerangue(tiro)
			}
			tiro.x += tiro.vx
			tiro.y += tiro.vy
			// o foguete pisca a chama
			if (tiro.arma.projetil == 'foguete') {
				tiro.sprite.setFrame(Math.floor(this.quadro_atual / 4) % 2)
			}

			for (const zumbi of this.zumbis.slice()) { // slice: filhotes de gosma nascem durante o laço
				// fantasma transparente: o tiro passa direto
				if (zumbi.morrendo || zumbi.intangivel || tiro.acertou.has(zumbi)) {
					continue
				}
				const c = corpo(zumbi)
				// o tiro conta como um quadradinho de 8x8 em volta do centro dele
				if (encostou(tiro.x - 4, tiro.y - 4, 8, 8, c.x, c.y, c.l, c.a)) {
					// coveiro: tiro vindo de baixo bate na lápide
					if (zumbi.escudo > 0 && tiro.vy < 0 && !tiro.arma.furia) {
						// a bazuca explode na pedra (e a explosão passa por cima da lápide)
						if (tiro.arma.explode) {
							this.acertar(tiro, tiro.x, tiro.y)
						}
						else {
							this.bater_na_lapide(zumbi, tiro)
						}
						break
					}
					this.acertar(tiro, Phaser.Math.Clamp(tiro.x, c.x, c.x + c.l), Phaser.Math.Clamp(tiro.y, c.y, c.y + c.a))
					this.ferir_zumbi(zumbi, tiro.dano, tiro.arma.empurra)
					tiro.acertou.add(zumbi)
					if (tiro.sumiu) {
						break
					}
				}
			}

			// ossos do Necromante: o tiro quebra o osso (o que atravessa segue em frente)
			if (!tiro.sumiu && this.chefe && this.chefe.ossos.length) {
				for (const osso of this.chefe.ossos) {
					if (encostou(tiro.x - 4, tiro.y - 4, 8, 8, osso.x - 7, osso.y - 7, 14, 14)) {
						this.quebrar_osso(osso)
						if (!tiro.arma.atravessa) {
							tiro.sumiu = true
						}
						break
					}
				}
			}

			if (!tiro.sumiu && this.chefe && this.chefe.fase != 'morrendo' && !this.chefe.intangivel && !tiro.acertou.has(this.chefe)) {
				const c = corpo_chefe(this.chefe)
				if (encostou(tiro.x - 4, tiro.y - 4, 8, 8, c.x, c.y, c.l, c.a)) {
					this.acertar(tiro, tiro.x, tiro.y)
					this.ferir_chefe(tiro.dano, tiro.x, tiro.y)
					tiro.acertou.add(this.chefe)
				}
			}

			tiro.ha++
			// Ricochete: o tiro comum quica uma vez nas bordas dos lados e de cima
		if (this.m('ricochete') && !tiro.quicou && !tiro.arma.volta && !tiro.arma.chama && !tiro.arma.furia && !tiro.arma.alcance) {
			if ((tiro.x < 0 && tiro.vx < 0) || (tiro.x > this.largura && tiro.vx > 0)) {
				tiro.vx = -tiro.vx
				tiro.quicou = true
			}
			else if (tiro.y < 0 && tiro.vy < 0) {
				tiro.vy = -tiro.vy
				tiro.quicou = true
			}
			if (tiro.quicou) {
				tiro.sprite.setRotation(Math.atan2(tiro.vy, tiro.vx))
				tiro.acertou.clear()
			}
		}
		// o bumerangue pode sair um pouco da tela, porque volta
		const margem = tiro.arma.volta ? 80 : 20
		const saiu = tiro.x < -margem || tiro.x > this.largura + margem || tiro.y < -margem || tiro.y > ALTURA + margem
			if (saiu || (tiro.arma.alcance && tiro.ha >= tiro.arma.alcance)) {
				tiro.sumiu = true
			}
			if (tiro.sumiu) {
				tiro.sprite.destroy()
			}
		}
		this.tiros = this.tiros.filter((tiro) => !tiro.sumiu)
	}

	// bumerangue: gira, e depois de um tempo faz a curva e volta para o elfo; sumiu quando ele pega de volta
	voar_bumerangue(tiro) {
		tiro.sprite.rotation += 0.45
		if (!tiro.voltando && tiro.ha >= tiro.arma.volta) {
			tiro.voltando = true
			tiro.acertou.clear() // na volta acerta de novo quem já levou na ida
		}
		if (tiro.voltando) {
			// volta para quem jogou
			const dono = tiro.dono || { x: this.heroi_x, y: this.heroi_y }
			const dx = dono.x + 12 - tiro.x
			const dy = dono.y + 12 - tiro.y
			const d = Math.hypot(dx, dy)
			// vai virando aos poucos na direção do elfo (curva) e acelera
			const v = Math.min(7, Math.hypot(tiro.vx, tiro.vy) + 0.08)
			tiro.vx += ((dx / d) * v - tiro.vx) * 0.12
			tiro.vy += ((dy / d) * v - tiro.vy) * 0.12
			if (d < 14 || tiro.ha > 400) {
				tiro.sumiu = true
				efeito(this, 'item', { volume: 0.25, rate: 1.6 })
			}
		}
		else {
			// freia no fim da ida
			tiro.vx *= 0.985
			tiro.vy *= 0.985
		}
	}

	// o tiro bateu em alguém em (x, y): sangue, som e, conforme a arma, some ou explode
	acertar(tiro, x, y) {
		// os tiros da fúria não contam na pontaria (não contam como disparos também)
		// conta uma vez por tiro (o bumerangue e o ricochete acertam de novo, mas é o mesmo disparo)
		if (!tiro.contou && !tiro.arma.sem_pontaria) {
			tiro.contou = true
			this.stats.acertos++
		}
		if (!tiro.arma.chama || Math.random() < 0.15) {
			this.espirrar_sangue(x, y)
			efeito(this, 'acerto', { volume: tiro.arma.chama ? 0.25 : 0.5 })
		}
		if (tiro.arma.explode) {
			tiro.sumiu = true
			this.explodir(x, y, tiro.arma.explode * this.tamanho_explosao(), tiro.dano)
		}
		else if (tiro.perfura > 0) {
			tiro.perfura-- // atravessa e segue em frente
		}
		else {
			tiro.sumiu = true
		}
	}

	// a Pólvora deixa as explosões maiores
	tamanho_explosao() {
		return 1 + 0.25 * this.m('polvora')
	}
}
