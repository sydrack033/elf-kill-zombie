// Parte da cena Jogo: zumbis: criação, movimento, morte; horda, perigos de cenário, lodo e elite.
// Os métodos desta classe são copiados para a cena em Jogo.js (por isso usam this como se fossem dela).
import Phaser from 'phaser'
import { ALTURA, texto } from '../tela.js'
import * as R from '../regras.js'
import { desbloquear } from '../conquistas.js'
import { marcar_visto, nome_de } from '../Bestiario.js'
import { efeito, opcoes } from '../opcoes.js'
import { sortear, corpo, de_quem } from './comum.js'

export default class Zumbis {
	// ------------------------------------------------------------------ zumbis

	criar_zumbis() {
		// enquanto o chefão está na tela (ou chegando), só ele manda zumbis; na horda, só ela
		if (this.chefe || this.chefe_em > 0 || this.chuva_de_moedas > 0 || (this.horda && this.horda.ha < R.HORDA.duracao)) {
			return
		}
		this.proximo_zumbi--
		if (this.proximo_zumbi > 0) {
			return
		}

		// (na Partida do Dia o sorteio tem semente: a mesma sequência para todo mundo naquele dia)
		const r = this.rng
		const entre = (a, b) => a + Math.floor(r() * (b - a + 1))
		// quanto maior o nível, mais zumbis e mais rápidos
		const n = this.nivel - 1
		this.proximo_zumbi = (Math.max(35, 155 - n * 8) + entre(0, 60)) / this.dificuldade.frequencia

		// às vezes vem uma fileira de zumbis juntos
		const sorte_fileira = r() // sorteado sempre, para a sequência não depender da fase
		const sorte_elite = r()
		if (this.nivel >= 3 && sorte_fileira < 0.12) {
			const quantos = entre(3, 5)
			const espaco = Math.min(50, (this.largura - 44) / quantos)
			const inicio = entre(0, Math.max(0, Math.floor(this.largura - 44 - espaco * (quantos - 1))))
			for (let i = 0; i < quantos; i++) {
				this.criar_zumbi('comum', inicio + i * espaco, -44 - (i % 2) * 20)
			}
			this.proximo_zumbi += 80
			return
		}

		const tipos = Object.keys(R.ZUMBIS)
		const tipo = sortear(tipos, (t) => R.ZUMBIS[t].peso(this.nivel), r)
		const tamanho = 44 * R.ZUMBIS[tipo].escala
		if (R.ZUMBIS[tipo].cava) {
			this.criar_escavador()
			return
		}
		const zumbi = this.criar_zumbi(tipo, entre(0, Math.max(0, Math.floor(this.largura - tamanho))), -tamanho)
		if (this.nivel >= R.ELITE.a_partir_da_fase && sorte_elite < R.ELITE.chance) {
			this.tornar_elite(zumbi)
		}
	}

	// escombros (ruínas) e meteoros (inferno): a sombra cresce no chão e depois a coisa cai
	mover_perigos() {
		this.mover_lodo()
		this.mover_chuva_de_moedas()
		this.criar_covas()
		const regra = R.PERIGOS[this.cenario().perigo]
		if (regra && !this.chefe && this.chefe_em == 0 && this.chuva_de_moedas <= 0) {
			this.proxima_queda--
			if (this.proxima_queda <= 0) {
				this.proxima_queda = Phaser.Math.Between(regra.a_cada[0], regra.a_cada[1])
				this.criar_queda(regra)
			}
		}
		for (const q of this.quedas) {
			q.ha++
			const t = q.ha / q.regra.aviso
			q.sombra.setSize(q.regra.raio * 2 * t, q.regra.raio * t)
			q.sombra.setFillStyle(0x000000, 0.2 + 0.35 * t)
			// cai nos últimos 30% do aviso
			const queda = Phaser.Math.Clamp((t - 0.7) / 0.3, 0, 1)
			q.pedra.setPosition(q.x, -20 + (q.y + 20) * queda * queda)
			if (q.regra.cor == 0xff7a2a && this.quadro_atual % 3 == 0 && queda > 0) {
				// rastro de fogo do meteoro
				const brasa = this.add.circle(q.x + Phaser.Math.Between(-3, 3), q.pedra.y - 6, 3, 0xffc040, 0.8).setDepth(7.4)
				this.tweens.add({ targets: brasa, alpha: 0, scale: 0.3, duration: 300, onComplete: () => brasa.destroy() })
			}
			if (q.ha >= q.regra.aviso) {
				q.sombra.destroy()
				q.pedra.destroy()
				this.explodir(q.x, q.y, q.regra.raio, 3, true, true, true)
				// escombros levantam poeira e granizo estoura em gelo, em vez de fogo
				if (q.regra.cor != 0xff7a2a) {
					this.explosoes[this.explosoes.length - 1].sprite.setTint(q.regra.cor)
				}
			}
		}
		this.quedas = this.quedas.filter((q) => q.ha < q.regra.aviso)
	}

	// algo vai cair perto do elfo: a sombra aparece agora e a coisa cai no fim do aviso
	criar_queda(regra) {
		const h = Phaser.Utils.Array.GetRandom(this.herois()) // com 2 jogadores, cai perto de um dos dois
		const x = Phaser.Math.Clamp(h.x + 12 + Phaser.Math.Between(-70, 70), 20, this.largura - 20)
		const y = Phaser.Math.Clamp(h.y + 18 + Phaser.Math.Between(-60, 30), ALTURA * 0.35, ALTURA - 20)
		const sombra = this.add.ellipse(x, y, 4, 2, 0x000000, 0.45).setDepth(1.6)
		const pedra = this.add.circle(x, -20, regra.raio * 0.35, regra.cor).setStrokeStyle(2, 0x000000).setDepth(7.5)
		this.quedas.push({ x, y, ha: 0, sombra, pedra, regra })
	}

	mover_lodo() {
		if (this.cenario().perigo == 'lodo') {
			this.proxima_poca--
			if (this.proxima_poca <= 0) {
				this.proxima_poca = Phaser.Math.Between(R.LODO.a_cada[0], R.LODO.a_cada[1])
				const x = Phaser.Math.Between(30, Math.max(31, Math.floor(this.largura - 30)))
				const sprite = this.add.ellipse(x, -20, R.LODO.largura, R.LODO.altura, 0x2c3a1c, 0.85).setStrokeStyle(2, 0x4a5a2a, 0.9).setDepth(1.55)
				this.pocas.push({ x, y: -20, sprite })
			}
		}
		for (const p of this.pocas) {
			p.y += R.ROLAGEM_DO_CHAO
			p.sprite.setY(Math.round(p.y))
			// bolhas de vez em quando
			if (Math.random() < 0.01) {
				const bolha = this.add.circle(p.x + Phaser.Math.Between(-20, 20), p.y + Phaser.Math.Between(-6, 6), 2, 0x6a7a3a).setDepth(1.56)
				this.tweens.add({ targets: bolha, scale: 2, alpha: 0, duration: 600, onComplete: () => bolha.destroy() })
			}
			if (p.y > ALTURA + 30) {
				p.sprite.destroy()
				p.sumiu = true
			}
		}
		this.pocas = this.pocas.filter((p) => !p.sumiu)
	}

	// o ponto (x, y) está dentro de alguma poça de lodo?
	no_lodo(x, y) {
		return this.pocas.some((p) => ((x - p.x) / (R.LODO.largura / 2)) ** 2 + ((y - p.y) / (R.LODO.altura / 2)) ** 2 < 1)
	}

	// fase bônus: moedas (e às vezes um coração) caindo do céu, sem zumbis
	mover_chuva_de_moedas() {
		if (this.chuva_de_moedas <= 0 || this.estado != 'jogando') {
			return
		}
		this.chuva_de_moedas--
		if (this.chuva_de_moedas % R.CHUVA_DE_MOEDAS.a_cada == 0) {
			const x = Phaser.Math.Between(10, Math.floor(this.largura - 20))
			if (Math.random() < 0.04) {
				this.soltar_coracao(x, -14)
			}
			else {
				const sprite = this.add.sprite(x, -10, 'moeda').setScale(1.5).setDepth(1.8)
				this.moedas.push({ sprite, x: x - 6, y: -16 })
			}
		}
		if (this.chuva_de_moedas == 0) {
			this.anunciar('FIM DO BÔNUS!', 150, '#ffd34d')
		}
	}

	// de tempos em tempos uma cova aberta aparece lá em cima
	criar_covas() {
		if (this.nivel < R.COVAS.a_partir_da_fase || this.chefe || this.chefe_em > 0 || this.chuva_de_moedas > 0 || this.modo_chefes) {
			return
		}
		this.proxima_cova = (this.proxima_cova ?? R.COVAS.a_cada[0]) - 1
		if (this.proxima_cova > 0) {
			return
		}
		this.proxima_cova = Phaser.Math.Between(R.COVAS.a_cada[0], R.COVAS.a_cada[1])
		this.criar_zumbi('cova', Phaser.Math.Between(10, Math.max(11, Math.floor(this.largura - 50))), -50)
	}

	// a cova desce junto com o chão e solta zumbis; saindo por baixo, só some
	mover_cova(cova) {
		cova.y += R.ROLAGEM_DO_CHAO
		cova.ninho_ha++
		if (cova.ninho_ha % cova.regra.ninho == 0 && cova.y > -20 && cova.y < ALTURA * 0.45 && !this.chefe && this.chefe_em == 0) {
			const z = this.criar_zumbi('comum', cova.x - 2, cova.y + 6)
			z.sprite.setAlpha(0)
			this.tweens.add({ targets: z.sprite, alpha: 1, duration: 300 })
			efeito(this, 'cuspe', { volume: 0.4, rate: 0.5 })
		}
		if (cova.y > ALTURA) {
			cova.morrendo = true
			cova.morto_ha = 75
		}
	}

	comecar_horda() {
		this.horda = { ha: 0, zumbis: [], mortos: 0 }
		this.horda_na_fase = this.nivel
		this.anunciar('HORDA!', 220, '#ff5a5a')
		efeito(this, 'rugido', { volume: 0.9, rate: 0.85 })
		this.tremer(500, 0.006)
	}

	// durante a horda os zumbis vêm em sequência; acabou quando o último da horda cair (ou fugir)
	mover_horda() {
		const h = this.horda
		if (!h || this.estado != 'jogando') {
			return
		}
		h.ha++
		if (h.ha < R.HORDA.duracao && h.ha % R.HORDA.a_cada == 0) {
			const tipo = Math.random() < 0.3 && this.nivel >= 2 ? 'corredor' : 'comum'
			const tamanho = 44 * R.ZUMBIS[tipo].escala
			const zumbi = this.criar_zumbi(tipo, Phaser.Math.Between(0, Math.max(0, Math.floor(this.largura - tamanho))), -tamanho)
			zumbi.horda = true
			h.zumbis.push(zumbi)
		}
		if (h.ha >= R.HORDA.duracao && h.zumbis.every((z) => z.morrendo || z.fugiu || !this.zumbis.includes(z))) {
			this.horda = null
			// só ganha o prêmio quem matou a maior parte da horda (deixar passar não vale)
			if (h.mortos < h.zumbis.length * 0.6) {
				this.anunciar('A HORDA PASSOU...', 180, '#cfcfcf')
				return
			}
			this.stats.hordas++
			desbloquear(this, 'horda')
			this.anunciar('HORDA DERROTADA!', 220, '#9ff07a')
			efeito(this, 'combo', { volume: 0.7, rate: 0.8 })
			// prêmio: duas caixas, um coração e moedas
			const meio = this.largura / 2
			this.soltar_item(meio - 30, -16)
			this.soltar_item(meio + 14, -30)
			this.soltar_coracao(meio - 7, -50)
			this.moedas_extras += R.HORDA.moedas
			this.flutuar(meio, ALTURA / 2 - 30, '+' + R.HORDA.moedas + ' MOEDAS', '#ffd34d')
			efeito(this, 'moeda', { volume: 0.6 })
		}
	}

	soltar_estilhacos(x, y, quantos) {
		const arma = { projetil: 'tiro', dano: 1, empurra: 0, alcance: 22, sem_pontaria: true }
		const giro = Math.random() * Math.PI * 2
		for (let i = 0; i < quantos; i++) {
			const angulo = giro + (i / quantos) * Math.PI * 2
			const sprite = this.add.sprite(x, y, 'tiro', 0).setRotation(angulo).setScale(0.5).setTint(0xff9a3c).setDepth(4)
			this.tiros.push({
				sprite, x, y, arma, ha: 0,
				vx: Math.cos(angulo) * 4, vy: Math.sin(angulo) * 4,
				dano: 1, perfura: 0, acertou: new Set(),
			})
		}
	}

	// primeira vez que um tipo de zumbi aparece: faixa em cima com o nome e a dica
	apresentar_inimigo(ficha) {
		// se já tem outra faixa na tela, esta vai embaixo dela (no máximo duas, para não tapar o jogo)
		if (this.faixas >= 2) {
			this.fila_faixas.push(ficha) // aparece quando uma das duas sumir
			return
		}
		this.faixas = (this.faixas || 0) + 1
		const y = 104 + (this.faixas - 1) * 38 // abaixo do aviso de conquista
		const fundo = this.add.rectangle(this.largura / 2, y, 210, 34, 0x1c1630, 0.92).setStrokeStyle(1, 0xff6a6a).setDepth(12.5)
		const nome = texto(this, this.largura / 2, y - 8, 'NOVO: ' + ficha.nome, 8, '#ff9a9a').setOrigin(0.5).setDepth(12.5)
		const dica = texto(this, this.largura / 2, y + 7, ficha.texto.replace('\n', ' '), 8, '#ffffff').setOrigin(0.5).setDepth(12.5)
		dica.setScale(Math.min(1, 200 / dica.width))
		const objetos = [fundo, nome, dica]
		for (const o of objetos) o.setAlpha(0)
		this.tweens.add({ targets: objetos, alpha: 1, duration: 200 })
		this.tweens.add({
			targets: objetos, alpha: 0, delay: 3500, duration: 400,
			onComplete: () => {
				objetos.forEach((o) => o.destroy())
				this.faixas--
				if (this.fila_faixas.length) {
					this.apresentar_inimigo(this.fila_faixas.shift())
				}
			},
		})
	}

	// perto de um tamborzeiro vivo, o zumbi anda mais rápido
	batida_do_tambor(zumbi) {
		for (const t of this.zumbis) {
			if (t != zumbi && t.regra.aura && !t.morrendo && Phaser.Math.Distance.Between(t.x, t.y, zumbi.x, zumbi.y) < t.regra.aura) {
				return t.regra.acelera
			}
		}
		return 1
	}

	tornar_elite(zumbi) {
		zumbi.elite = true
		zumbi.vida = zumbi.vida_max = zumbi.vida * R.ELITE.vida
		zumbi.escala *= R.ELITE.escala
		zumbi.sprite.setScale(zumbi.escala)
		zumbi.vy *= 0.85
		if (zumbi.escudo) {
			zumbi.escudo = zumbi.escudo_max = zumbi.escudo * 2
		}
	}

	criar_zumbi(tipo, x, y) {
		const regra = R.ZUMBIS[tipo]
		const novo = marcar_visto(tipo) // para o bestiário
		if (novo && this.nivel > 1) {
			this.apresentar_inimigo(novo)
		}
		const n = this.nivel - 1
		const persegue = Math.random() < Math.min(0.7, 0.2 + n * 0.08)
		const zumbi = {
			tipo,
			regra,
			escala: regra.escala,
			x,
			y,
			vx: persegue ? 0.12 + n * 0.02 : 0, // os que perseguem vão se ajeitando na direção do elfo
			vy: regra.vy * (1 + n * R.ACELERACAO_POR_NIVEL) * (0.9 + Math.random() * 0.25) * this.dificuldade.velocidade * (this.lua_de_sangue ? R.LUA_DE_SANGUE.velocidade : 1),
			vida: regra.vida + Math.floor(n / 3),
			morrendo: false,
			morto_ha: 0,
			flash: 0,
			xi: Phaser.Math.Between(0, 6),
			// o cuspidor para numa altura da parte de cima e fica cuspindo
			parar_em: regra.cospe ? Phaser.Math.Between(40, 130) : null,
			espera_cuspe: Phaser.Math.Between(80, 160),
			// o fantasma alterna: visível por 200 ticks, transparente por 120
			ciclo: Phaser.Math.Between(0, 200),
			intangivel: false,
		}
		zumbi.vida_max = zumbi.vida
		if (regra.voa) {
			// voando fica por cima de tudo que está no chão
			zumbi.vida = regra.vida
			zumbi.sprite = this.add.sprite(x, y, regra.textura, 0).setOrigin(0.5).setScale(1.4).setDepth(4.6)
			this.zumbis.push(zumbi)
			return zumbi
		}
		if (regra.ninho) {
			// cova: uma lápide grande e escura (o buraco é o corpo dela)
			zumbi.sprite = this.add.sprite(x, y, regra.textura, 0).setOrigin(0).setScale(2).setDepth(1.9).setTint(0x9a9aa8)
			zumbi.ninho_ha = 0
			zumbi.vx = 0
			this.zumbis.push(zumbi)
			return zumbi
		}
		zumbi.sprite = this.add.sprite(x, y, 'zumbi', zumbi.xi).setOrigin(0).setScale(regra.escala).setDepth(2)
		// os zumbis sem cor própria pegam o tom do cenário (azulados no gelo, avermelhados no inferno...)
		zumbi.cor = regra.cor || this.cenario().cor_zumbi || null
		if (zumbi.cor) {
			zumbi.sprite.setTint(zumbi.cor)
		}
		if (regra.aura) {
			// círculo vermelho mostrando até onde vai o efeito do tambor
			zumbi.aura = this.add.circle(x, y, regra.aura, 0xff4a4a, 0.07).setStrokeStyle(1, 0xff6a6a, 0.35).setDepth(1.6)
		}
		if (regra.escudo) {
			zumbi.escudo = zumbi.escudo_max = regra.escudo + Math.floor(n / 4)
			zumbi.lapide = this.add.sprite(x, y, 'lapide', 0).setOrigin(0.5, 0).setDepth(2.1)
		}
		this.zumbis.push(zumbi)
		return zumbi
	}

	// o tiro bate na lápide do coveiro: faísca, tim e a pedra vai rachando até quebrar
	bater_na_lapide(zumbi, tiro) {
		tiro.sumiu = true
		zumbi.escudo -= tiro.dano
		zumbi.lapide_flash = 4
		const l = zumbi.lapide
		// o lança-chamas solta muitas labaredas: só a pedra rachando, sem faísca nem som a cada uma
		if (tiro.arma.chama) {
			if (zumbi.escudo <= zumbi.escudo_max / 2) l.setFrame(1)
			if (zumbi.escudo <= 0) {
				this.soltar_lapide(zumbi)
				this.lapides_quebradas++
				if (this.lapides_quebradas >= 10) desbloquear(this, 'pedreiro')
			}
			return
		}
		efeito(this, 'pedra', { volume: 0.45, rate: 0.9 + Math.random() * 0.2 })
		for (let i = 0; i < 3; i++) {
			const faisca = this.add.rectangle(tiro.x, l.y + 2, 2, 2, 0xffe9a0).setDepth(7)
			this.tweens.add({
				targets: faisca, x: tiro.x + Phaser.Math.Between(-14, 14), y: l.y - Phaser.Math.Between(4, 14), alpha: 0,
				duration: 220, onComplete: () => faisca.destroy(),
			})
		}
		if (zumbi.escudo <= zumbi.escudo_max / 2) {
			l.setFrame(1)
		}
		if (zumbi.escudo <= 0) {
			this.soltar_lapide(zumbi)
			efeito(this, 'escudo_quebra', { volume: 0.6, rate: 0.7 })
			this.flutuar(l.x, l.y - 6, 'QUEBROU!', '#cfcfd8')
			this.lapides_quebradas = (this.lapides_quebradas || 0) + 1
			if (this.lapides_quebradas >= 10) desbloquear(this, 'pedreiro')
		}
	}

	// a lápide cai para o lado e some (quebrou, ou o coveiro morreu)
	soltar_lapide(zumbi) {
		const l = zumbi.lapide
		if (!l) {
			return
		}
		zumbi.lapide = null
		zumbi.escudo = 0
		l.setFrame(1).clearTint()
		this.tweens.add({
			targets: l, y: l.y + 14, angle: Phaser.Math.Between(0, 1) ? 80 : -80, alpha: 0,
			duration: 600, ease: 'Quad.easeIn', onComplete: () => l.destroy(),
		})
	}

	ferir_zumbi(zumbi, dano, empurra = 0) {
		zumbi.vida -= dano
		zumbi.flash = 5
		if (opcoes.numeros_dano) {
			// número do dano subindo (opção da tela de Opções)
			const c = corpo(zumbi)
			const n = texto(this, c.x + c.l / 2 + Phaser.Math.Between(-6, 6), c.y, String(dano), 8, dano >= 3 ? '#ffd34d' : '#ffffff').setOrigin(0.5).setDepth(8)
			this.tweens.add({ targets: n, y: n.y - 14, alpha: 0, duration: 450, onComplete: () => n.destroy() })
		}
		if (zumbi.regra.empurravel) {
			zumbi.y -= empurra
		}
		if (zumbi.vida <= 0) {
			this.matar_zumbi(zumbi)
		}
	}

	matar_zumbi(zumbi) {
		zumbi.morrendo = true
		zumbi.morto_ha = 0
		this.stats.mortos++
		this.stats.por_tipo[zumbi.tipo] = (this.stats.por_tipo[zumbi.tipo] || 0) + 1
		if (zumbi.elite) this.stats.elites++
		if (zumbi.horda && this.horda) this.horda.mortos++
		// cada zumbi geme num tom um pouco diferente (os grandes mais grave)
		efeito(this, 'zumbi_morre', { volume: 0.6, rate: (0.85 + Math.random() * 0.3) / zumbi.escala })

		// combo: mortes emendadas multiplicam os pontos
		this.combo = this.combo_ha > 0 ? this.combo + 1 : 1
		this.combo_ha = R.COMBO_TEMPO
		const antes = this.multiplicador
		this.multiplicador = Math.min(R.COMBO_MAXIMO, 1 + Math.floor((this.combo - 1) / 4))
		if (this.multiplicador > antes) {
			efeito(this, 'combo', { volume: 0.5, rate: 0.8 + this.multiplicador * 0.15 })
		}
		this.stats.melhor_combo = Math.max(this.stats.melhor_combo, this.combo)
		desbloquear(this, 'primeiro')
		this.encher_furia(R.FURIA.por_morte)
		if (this.stats.mortos >= 100) desbloquear(this, 'cem')
		if (this.combo >= 20) desbloquear(this, 'combo20')
		// marcos do combo: aviso grande que pula na tela
		const marcos = { 10: 'EMBALADO!', 25: 'IMPARÁVEL!', 50: 'LENDÁRIO!', 100: 'DEUS DOS ELFOS!' }
		if (marcos[this.combo] && this.estado == 'jogando') {
			const aviso = texto(this, this.largura / 2, 96, 'COMBO ' + this.combo + '\n' + marcos[this.combo], 16, '#ff9a3c').setOrigin(0.5).setDepth(12).setScale(0.4)
			this.tweens.add({ targets: aviso, scale: 1, duration: 260, ease: 'Back.Out' })
			this.tweens.add({ targets: aviso, alpha: 0, y: 80, delay: 1100, duration: 400, onComplete: () => aviso.destroy() })
			efeito(this, 'fase', { volume: 0.5, rate: 1.2 })
		}

		// várias mortes quase juntas: DUPLO!, TRIPLO!, MASSACRE!
		this.mortes_recentes = this.mortes_recentes.filter((t) => this.quadro_atual - t < 15)
		this.mortes_recentes.push(this.quadro_atual)
		const juntas = this.mortes_recentes.length
		if (juntas >= 2) {
			const nomes = ['', '', 'DUPLO!', 'TRIPLO!', 'QUÁDRUPLO!']
			const c0 = corpo(zumbi)
			this.flutuar(c0.x + c0.l / 2, c0.y - 10, nomes[juntas] || 'MASSACRE!', '#ff5a5a')
			this.pontos += 25 * juntas * this.nivel
		}
		// cova quebrada: some na hora (poeira) e solta moedas
		if (zumbi.regra.ninho) {
			this.covas_quebradas = (this.covas_quebradas || 0) + 1
			if (this.covas_quebradas >= 5 && !this.treino) desbloquear(this, 'covas5')
			zumbi.morto_ha = 75
			const cx = zumbi.x + 20
			const cy = zumbi.y + 22
			this.explodir(cx, cy, 20, 0, false)
			this.explosoes[this.explosoes.length - 1].sprite.setTint(0x9a9aa8)
			efeito(this, 'pedra', { volume: 0.7, rate: 0.6 })
			for (let i = 0; i < 3; i++) {
				const sprite = this.add.sprite(cx, cy, 'moeda').setScale(1.5).setDepth(1.8)
				this.moedas.push({ sprite, x: cx - 6 + (i - 1) * 14, y: cy - 6 })
			}
		}
		// gosma: se divide em duas menores, mais rápidas e com 1 de vida
		if (zumbi.regra.divide && !zumbi.filhote) {
			for (const lado of [-1, 1]) {
				const filho = this.criar_zumbi(zumbi.tipo, Phaser.Math.Clamp(zumbi.x + lado * 14, 0, this.largura - 30), zumbi.y + 6)
				filho.filhote = true
				filho.escala = zumbi.escala * 0.6
				filho.sprite.setScale(filho.escala)
				filho.vida = filho.vida_max = 1
				filho.vy = zumbi.vy * 1.5
				filho.vx = Math.max(zumbi.vx, 0.25)
				filho.y -= lado * 2
			}
			efeito(this, 'cuspe', { volume: 0.6, rate: 0.6 })
		}
		// Vampiro: a cada 30 mortes cura um coração
		if (this.m('vampiro')) {
			this.mortes_vampiro = (this.mortes_vampiro || 0) + 1
			if (this.mortes_vampiro % 30 == 0 && this.vidas < this.vidas_max) {
				this.vidas++
				this.flutuar(this.heroi_x + 12, this.heroi_y - 10, '+1 VIDA', '#ff6a6a')
				efeito(this, 'item', { volume: 0.5, rate: 0.8 })
			}
		}
		// Estilhaços: o zumbi estoura em pedaços que acertam quem está perto
		if (this.m('estilhacos') && this.tiros.length < 200) {
			const ce = corpo(zumbi)
			this.soltar_estilhacos(ce.x + ce.l / 2, ce.y + ce.a / 2, 1 + 2 * this.m('estilhacos'))
		}
		const lua = this.lua_de_sangue ? R.LUA_DE_SANGUE.pontos : 1
		const elite = zumbi.elite ? R.ELITE.pontos : 1
		const ganho = Math.round(zumbi.regra.pontos * this.nivel * this.multiplicador * this.dificuldade.pontos * lua * elite)
		if (zumbi.elite) {
			// elite: caixa garantida e moedas para a loja
			const ce = corpo(zumbi)
			this.soltar_item(ce.x + ce.l / 2 - 8, ce.y + ce.a / 2)
			this.moedas_extras += R.ELITE.moedas
			this.flutuar(ce.x + ce.l / 2, ce.y - 22, '+' + R.ELITE.moedas + ' MOEDAS', '#ffd34d')
			efeito(this, 'moeda', { volume: 0.6 })
		}
		this.pontos += ganho
		if (this.pontos >= 50000) desbloquear(this, 'rico')
		const c = corpo(zumbi)
		this.flutuar(c.x + c.l / 2, c.y, '+' + ganho, this.multiplicador > 1 ? '#ff9a3c' : '#ffffff')
		if (zumbi.regra.voa) {
			zumbi.morto_ha = 75 // o corvo some na hora (sem a animação do zumbi caindo)
		}
		else if (!zumbi.regra.fantasma) {
			this.deixar_mancha(c.x + c.l / 2, c.y + c.a - 2)
			if (zumbi.regra.divide) {
				this.manchas[this.manchas.length - 1].sprite.setTint(0x7aff9a) // poça de gosma em vez de sangue
			}
		}

		const sorte = 1 + this.m('sorte')
		// por um fio (1 coração): o dobro de chance de cair coração
		const fio = this.vidas == 1 && !this.mod.vidro ? 2 : 1
		if (Math.random() < R.CHANCE_DE_CORACAO * sorte * fio) {
			this.soltar_coracao(c.x + c.l / 2 - 7, c.y + c.a / 2)
		}
		else if (Math.random() < R.CHANCE_DE_ITEM * sorte) {
			this.soltar_item(c.x + c.l / 2 - 8, c.y + c.a / 2)
		}
		else if (Math.random() < R.CHANCE_DE_MOEDA * sorte) {
			const sprite = this.add.sprite(c.x + c.l / 2, c.y + c.a / 2, 'moeda').setScale(1.5).setDepth(1.8)
			this.moedas.push({ sprite, x: c.x + c.l / 2 - 6, y: c.y + c.a / 2 - 6 })
		}

		// em nível de chefão as mortes não contam para subir de nível
		// (e os da horda também não: a horda é um extra no meio da fase)
		if (this.chefe == null && this.chefe_em == 0 && !zumbi.horda && this.estado != 'fim') {
			this.mortes_no_nivel++
			// na metade de algumas fases começa a horda
			const meta = R.MORTES_POR_NIVEL(this.nivel)
			if (this.nivel % 5 == R.HORDA.fase && this.nivel >= R.HORDA.a_partir_da_fase && !this.horda && this.horda_na_fase != this.nivel && this.mortes_no_nivel == Math.floor(meta / 2) && !this.modo_chefes) {
				this.comecar_horda()
			}
			if (this.mortes_no_nivel >= meta) {
				this.subir_nivel()
			}
		}
		this.atualizar_hud()
	}

	subir_nivel(venceu_chefe = false) {
		if (this.estado == 'fim' || this.estado == 'final') {
			return
		}
		const cenario_antes = this.cenario()
		if (!this.apanhou_na_fase && this.nivel >= 3) desbloquear(this, 'intocavel')
		// fase perfeita (sem apanhar): pontos extras e uma moeda
		if (!this.apanhou_na_fase && this.nivel >= 2 && this.estado == 'jogando') {
			const bonus = 100 * this.nivel
			this.pontos += bonus
			this.moedas_extras++
			this.flutuar(this.heroi_x + 12, this.heroi_y - 24, 'FASE PERFEITA! +' + bonus, '#9ff07a')
		}
		this.apanhou_na_fase = false
		// modo chefões: pula direto para a próxima fase de chefão
		if (this.modo_chefes) {
			this.nivel = Math.ceil((this.nivel + 1) / R.NIVEIS_ENTRE_CHEFOES) * R.NIVEIS_ENTRE_CHEFOES - 1
		}
		this.nivel++
		const de_verdade = !this.comecou_adiantado && !this.modo_chefes && !this.treino // fases pulando não contam
		if (this.nivel >= 10 && de_verdade) desbloquear(this, 'fase10')
		if (this.nivel >= 20 && de_verdade) desbloquear(this, 'fase20')
		if (this.nivel >= 10 && this.mod.vidro && de_verdade) desbloquear(this, 'vidro10')
		this.mortes_no_nivel = 0
		const fase_de_chefao = this.nivel % R.NIVEIS_ENTRE_CHEFOES == 0
		if (fase_de_chefao) {
			this.chefe_em = 300 // antes de trocar o cenário, para não tocar a música dele por 3 segundos
		}
		const cenario = this.cenario()
		if (this.chao.texture.key != cenario.textura) {
			this.trocar_cenario(cenario)
			// abertura de capítulo, como no cinema
			if (cenario.lema) this.capitulo_pendente = cenario // mostrado no fim do subir_nivel, se não abrir a escolha de melhoria
		}
		this.pintar_noite()
		if (this.m('anjo')) {
			this.poderes.escudo = Math.max(this.poderes.escudo, 500 * (this.m('segunda_pele') ? 2 : 1))
		}
		if (this.lua_de_sangue) desbloquear(this, 'lua') // passou a fase da lua de sangue
		// sorteia a lua de sangue para a fase nova (nunca duas seguidas, nem em fase de chefão)
		const lua = R.LUA_DE_SANGUE
		this.lua_de_sangue = !fase_de_chefao && !this.lua_de_sangue && !this.modo_chefes &&
			this.nivel >= lua.a_partir_da_fase && Math.random() < lua.chance
		// e o eclipse (nunca junto com a lua, nem dois seguidos)
		const eclipse = R.ECLIPSE
		this.eclipse = !fase_de_chefao && !this.lua_de_sangue && !this.eclipse && !this.modo_chefes &&
			this.nivel >= eclipse.a_partir_da_fase && Math.random() < eclipse.chance
		if (fase_de_chefao) {
			// (o nome do cenário novo aparece na abertura de capítulo)
			this.anunciar('CHEFÃO A CAMINHO!', 300, '#ff5a5a')
			// no modo chefões, cada vitória dá uma melhoria antes do próximo
			if (this.modo_chefes && venceu_chefe) {
				this.texto_da_fase = 'CHEFÃO A CAMINHO!'
				this.oferecer_melhorias()
			}
		}
		else {
			this.texto_da_fase = 'FASE ' + this.nivel
			if (this.eclipse) {
				this.texto_da_fase = 'FASE ' + this.nivel + '\nECLIPSE!'
			}
			if (this.lua_de_sangue) {
				this.texto_da_fase = 'FASE ' + this.nivel + '\nLUA DE SANGUE!'
				efeito(this, 'rugido', { volume: 0.6, rate: 0.6 })
			}
			this.anunciar(this.texto_da_fase, cenario != cenario_antes || this.lua_de_sangue ? 300 : 200, this.lua_de_sangue ? '#ff5a5a' : '#ffd34d')
			efeito(this, 'fase', { volume: 0.6 })
			// a cada 2 fases, e sempre depois de vencer um chefão, escolhe uma melhoria
			if (venceu_chefe || this.nivel % 2 == 0) {
				this.oferecer_melhorias()
			}
		}
		this.mostrar_capitulo()
		this.atualizar_hud()
	}

	// abertura de capítulo do cenário novo; se a escolha de melhoria estiver aberta, espera ela fechar
	mostrar_capitulo() {
		const cenario = this.capitulo_pendente
		if (!cenario || this.estado != 'jogando') {
			return
		}
		this.capitulo_pendente = null
		this.apresentar_chefe(cenario.nome, cenario.lema, '#9ff07a')
		efeito(this, 'sino', { volume: 0.6 })
	}

	mover_zumbis() {

		for (const zumbi of this.zumbis) {
			if (zumbi.flash > 0)
				zumbi.flash--
			if (zumbi.morrendo) {
				zumbi.morto_ha++
				// o bombado estoura logo depois de cair (dá tempo de ver o começo da animação)
				if (zumbi.regra.explode && zumbi.morto_ha == 10 && !zumbi.estourou) {
					zumbi.estourou = true
					const c = corpo(zumbi)
					this.explodir(c.x + c.l / 2, c.y + c.a / 2, zumbi.regra.explode * this.tamanho_explosao(), 3, true, true)
				}
				continue
			}
			if (this.congelado) {
				continue
			}

			if (zumbi.regra.ninho) {
				this.mover_cova(zumbi)
				continue
			}
			if (zumbi.regra.voa) {
				this.voar(zumbi)
				continue
			}

			if (zumbi.cavando > 0) {
				zumbi.cavando--
				if (zumbi.cavando == 0) {
					// saiu da terra
					zumbi.intangivel = false
					zumbi.sprite.setVisible(true).setAlpha(0)
					this.tweens.add({ targets: zumbi.sprite, alpha: 1, duration: 300 })
					efeito(this, 'cuspe', { volume: 0.5, rate: 0.45 })
					this.tremer(120, 0.004)
				}
				continue
			}

			if (zumbi.regra.fantasma) {
				zumbi.ciclo = (zumbi.ciclo + 1) % 320
				const estava = zumbi.intangivel
				zumbi.intangivel = zumbi.ciclo >= 200
				if (zumbi.intangivel && !estava && zumbi.y > 0) {
					efeito(this, 'fantasma', { volume: 0.25, rate: 0.9 + Math.random() * 0.2 })
				}
			}

			if (zumbi.parar_em == null || zumbi.y < zumbi.parar_em) {
				zumbi.y += zumbi.vy * this.batida_do_tambor(zumbi)
			}
			else {
				// cuspidor parado: cospe no elfo de tempos em tempos e depois volta a descer
				zumbi.espera_cuspe--
				if (zumbi.espera_cuspe <= 0) {
					const c = corpo(zumbi)
					this.cuspir(c.x + c.l / 2, c.y + c.a / 2, 1, 0)
					zumbi.cuspidas = (zumbi.cuspidas || 0) + 1
					zumbi.espera_cuspe = Phaser.Math.Between(120, 180)
					if (zumbi.cuspidas >= 3) {
						zumbi.parar_em = null
					}
				}
			}

			const meio_zumbi = zumbi.x + 22 * zumbi.escala
			const meio_heroi = this.heroi_mais_perto(meio_zumbi, zumbi.y).x + 12
			if (meio_zumbi < meio_heroi - 2)
				zumbi.x += zumbi.vx
			else if (meio_zumbi > meio_heroi + 2)
				zumbi.x -= zumbi.vx

			const c = corpo(zumbi)
			const mordeu = this.encosta_em_heroi(c.x, c.y, c.l, c.a)
			if (mordeu && !this.intocavel) {
				// o zumbi que mordeu se desfaz (o brutamontes aguenta e continua)
				if (zumbi.tipo != 'brutamontes') {
					zumbi.morrendo = true
					zumbi.morto_ha = 0
				}
				this.levar_dano('MORDIDA DE ' + nome_de(zumbi.tipo))
			}
			else if (zumbi.y > ALTURA) {
				// passou pelo elfo e fugiu pela parte de baixo: também custa uma vida
				zumbi.fugiu = true
				// (os chamados pelo chefão só atrapalham: passar por eles não custa vida)
				if (!zumbi.chamado) this.perder_vida(nome_de(zumbi.tipo) + ' PASSOU POR VOCÊ')
			}
		}

		// a animação de morrer dura 75 ticks
		for (const zumbi of this.zumbis) {
			if (zumbi.fugiu || (zumbi.morrendo && zumbi.morto_ha >= 75)) {
				zumbi.sprite.destroy()
				if (zumbi.lapide) zumbi.lapide.destroy()
				if (zumbi.aura) zumbi.aura.destroy()
			}
		}
		this.zumbis = this.zumbis.filter((zumbi) => !zumbi.fugiu && !(zumbi.morrendo && zumbi.morto_ha >= 75))
	}

	// escavador: a terra treme perto do elfo e, um tempo depois, o zumbi sai de baixo dela
	criar_escavador() {
		const x = Phaser.Math.Clamp(this.heroi_x - 10 + Phaser.Math.Between(-110, 110), 0, this.largura - 44)
		const y = Phaser.Math.Between(Math.round(ALTURA * 0.42), Math.round(ALTURA * 0.6)) - 44
		const zumbi = this.criar_zumbi('escavador', x, y)
		zumbi.cavando = 110
		zumbi.intangivel = true
		zumbi.vx = 0.35 + (this.nivel - 1) * 0.02 // persegue o elfo
		zumbi.sprite.setVisible(false)
	}

	// revoada: um bando de corvos entra por um canto de cima e atravessa a tela em diagonal
	criar_revoada() {
		if (this.nivel < R.CORVOS.a_partir_da_fase || this.chefe || this.chefe_em > 0) {
			return
		}
		this.proxima_revoada--
		if (this.proxima_revoada > 0) {
			return
		}
		this.proxima_revoada = Phaser.Math.Between(R.CORVOS.a_cada[0], R.CORVOS.a_cada[1])
		const da_esquerda = Math.random() < 0.5
		this.revoada_de_morcegos = Math.random() < 0.5
		const quantos = Phaser.Math.Between(R.CORVOS.quantos[0], R.CORVOS.quantos[1])
		for (let i = 0; i < quantos; i++) {
			const x = da_esquerda ? -20 - i * 18 : this.largura + 4 + i * 18
			// da fase 16 em diante, metade das revoadas são de morcegos
			const tipo = this.nivel >= 16 && this.revoada_de_morcegos ? 'morcego' : 'corvo'
			const corvo = this.criar_zumbi(tipo, x, 10 + i * 12 + Math.random() * 30)
			if (tipo == 'morcego') corvo.sprite.setTint(0x8a6aaa)
			corvo.vx = (da_esquerda ? 1 : -1) * R.CORVOS.velocidade * (0.9 + Math.random() * 0.2)
			corvo.vy = 0.5 + Math.random() * 0.25
			corvo.voo = Math.random() * 100
		}
		efeito(this, 'fantasma', { volume: 0.2, rate: this.revoada_de_morcegos && this.nivel >= 16 ? 2.6 : 1.8 }) // grasnado (ou guincho)
	}

	voar(corvo) {
		corvo.voo++
		if (corvo.regra.mergulha && !corvo.mergulhou && corvo.voo > 70 && Math.random() < 0.02) {
			// morcego: mergulha na direção do elfo (uma vez)
			const h = this.heroi_mais_perto(corvo.x, corvo.y)
			const ang = Math.atan2(h.y + 12 - corvo.y, h.x + 12 - corvo.x)
			corvo.vx = Math.cos(ang) * 2.4
			corvo.vy = Math.sin(ang) * 2.4
			corvo.mergulhou = true
		}
		corvo.x += corvo.vx + (corvo.regra.mergulha && !corvo.mergulhou ? Math.sin(corvo.voo / 6) * 1.2 : 0) // zigue-zague
		corvo.y += corvo.vy + Math.sin(corvo.voo / 12) * 0.6 // voo ondulado
		const c = corpo(corvo)
		if (!this.intocavel && this.encosta_em_heroi(c.x, c.y, c.l, c.a)) {
			corvo.morrendo = true
			corvo.morto_ha = 75
			this.espirrar_sangue(c.x + c.l / 2, c.y + c.a / 2)
			this.levar_dano('BICADA DE ' + nome_de(corvo.tipo))
		}
		// saiu pelos lados ou por baixo: só vai embora (corvo não custa vida)
		if (corvo.x < -60 || corvo.x > this.largura + 60 || corvo.y > ALTURA + 20) {
			corvo.morrendo = true
			corvo.morto_ha = 75
		}
	}

	// cospe "quantos" cuspes em leque na direção do elfo
	cuspir(x, y, quantos, abertura, do_chefe = false) {
		const alvo = this.heroi_mais_perto(x, y)
		const angulo = Math.atan2(alvo.y + 12 - y, alvo.x + 12 - x)
		for (let i = 0; i < quantos; i++) {
			const a = angulo + (i - (quantos - 1) / 2) * abertura
			const sprite = this.add.sprite(x, y, 'cuspe', 0).setDepth(4.5)
			const v = R.VELOCIDADE_CUSPE * this.dificuldade.velocidade
			this.cuspes.push({ sprite, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, do_chefe })
		}
		efeito(this, 'cuspe', { volume: 0.5, rate: 0.9 + Math.random() * 0.2 })
	}

	mover_cuspes() {
		for (const cuspe of this.cuspes) {
			if (!this.congelado) {
				cuspe.x += cuspe.vx
				cuspe.y += cuspe.vy
			}
			if (this.encosta_em_heroi(cuspe.x - 3, cuspe.y - 3, 6, 6) && !this.intocavel) {
				cuspe.sumiu = true
				this.levar_dano(cuspe.do_chefe && this.chefe ? 'ATAQUE ' + de_quem(this.chefe.nome) : 'CUSPE DE ZUMBI')
			}
			if (cuspe.x < -10 || cuspe.x > this.largura + 10 || cuspe.y < -10 || cuspe.y > ALTURA + 10) {
				cuspe.sumiu = true
			}
			if (cuspe.sumiu) {
				cuspe.sprite.destroy()
			}
		}
		this.cuspes = this.cuspes.filter((cuspe) => !cuspe.sumiu)
	}
}
