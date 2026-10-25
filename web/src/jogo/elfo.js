// Parte da cena Jogo: o elfo: andar, esquiva, mira, tiro, fúria, raio, dano; e o jogador 2.
// Os métodos desta classe são copiados para a cena em Jogo.js (por isso usam this como se fossem dela).
import Phaser from 'phaser'
import { ALTURA, texto } from '../tela.js'
import * as R from '../regras.js'
import { desbloquear } from '../conquistas.js'
import { efeito } from '../opcoes.js'
import { encostou, COR_P2, corpo, corpo_chefe } from './comum.js'

export default class Elfo {
	// ------------------------------------------------------------------ elfo

	mover_heroi() {
		// o elfo anda pela parte de baixo da tela
		const lodo = this.no_lodo(this.heroi_x + 12, this.heroi_y + 22) ? R.LODO.lenta : 1
		const v = (this.poderes.velocidade > 0 ? R.VELOCIDADE_HEROI_RAPIDO : R.VELOCIDADE_HEROI) * (1 + 0.12 * this.m('velocidade')) * lodo
		let vx = 0
		let vy = 0
		if (this.toque_vx || this.toque_vy) {
			// joystick (dedo ou controle): a velocidade acompanha o quanto foi empurrado
			vx = this.toque_vx
			vy = this.toque_vy
		}
		else {
			vx = (this.dir_on ? 1 : 0) - (this.esq_on ? 1 : 0)
			vy = (this.baixo_on ? 1 : 0) - (this.cima_on ? 1 : 0)
		}
		if (vx || vy) {
			this.andou = true
			const tamanho = Math.hypot(vx, vy)
			this.ultima_direcao = { x: vx / tamanho, y: vy / tamanho }
		}

		// esquiva: arrancada na direção em que o elfo está andando (ou na última em que andou)
		if (this.esquiva_espera > 0) {
			this.esquiva_espera--
		}
		if (this.esquiva_on && this.esquiva_ha == 0 && this.esquiva_espera == 0) {
			this.esquiva_ha = R.ESQUIVA.duracao
			this.esquiva_espera = R.ESQUIVA.espera
			this.esquiva_direcao = this.ultima_direcao
			efeito(this, 'arremesso', { volume: 0.5, rate: 1.6 })
		}
		if (this.esquiva_ha > 0) {
			this.esquiva_ha--
			this.heroi_x += this.esquiva_direcao.x * R.ESQUIVA.velocidade
			this.heroi_y += this.esquiva_direcao.y * R.ESQUIVA.velocidade
			if (this.esquiva_ha % 3 == 0) {
				this.deixar_rastro()
			}
		}
		else {
			this.heroi_x += vx * v
			this.heroi_y += vy * v
		}
		this.heroi_x = Phaser.Math.Clamp(this.heroi_x, 0, this.largura - 25)
		this.heroi_y = Phaser.Math.Clamp(this.heroi_y, ALTURA * 0.55, ALTURA - 27)
	}

	// ------------------------------------------------------------------ 2 jogadores

	// os elfos em jogo (posição do canto de cima à esquerda, como heroi_x/heroi_y)
	herois() {
		const lista = [{ x: this.heroi_x, y: this.heroi_y }]
		if (this.p2) {
			lista.push({ x: this.p2.x, y: this.p2.y })
		}
		return lista
	}

	// o elfo mais perto de um ponto (os zumbis perseguem o mais perto)
	heroi_mais_perto(x, y) {
		let melhor = null
		for (const h of this.herois()) {
			const d = Phaser.Math.Distance.Between(x, y, h.x + 12, h.y + 12)
			if (!melhor || d < melhor.d) melhor = { ...h, d }
		}
		return melhor
	}

	// algum elfo encosta neste retângulo? (corpo do elfo: um pouco menor que a imagem de 25x25)
	encosta_em_heroi(x, y, l, a) {
		return this.herois().some((h) => encostou(x, y, l, a, h.x + 4, h.y + 2, 17, 22))
	}

	// segundo elfo: anda com as setas (ou com o controle, se tiver um ligado) e mira e atira sozinho
	criar_p2() {
		const p2 = { x: this.largura / 2 + 20, y: ALTURA - 50, xi: 0, direcao: 'cima', angulo: -Math.PI / 2, espera_tiro: 0, arma_nome: 'pistola', municao: Infinity }
		p2.sprite = this.add.sprite(p2.x, p2.y, 'heroi_parado_cima').setOrigin(0).setDepth(5).setTint(COR_P2)
		p2.arma = this.add.sprite(0, 0, 'armas', 0).setOrigin(3 / 16, 4 / 8).setDepth(6)
		p2.rotulo = texto(this, 0, 0, 'P2', 8, '#d0a0ff').setOrigin(0.5).setDepth(6)
		this.p2 = p2
	}

	entrada_p2() {
		const p2 = this.p2
		const controle = this.input.gamepad && this.input.gamepad.total ? this.input.gamepad.getPad(0) : null
		let vx = 0
		let vy = 0
		p2.mira = null
		if (controle) {
			const zona = 0.22
			vx = Math.abs(controle.leftStick.x) > zona ? controle.leftStick.x : (controle.right ? 1 : 0) - (controle.left ? 1 : 0)
			vy = Math.abs(controle.leftStick.y) > zona ? controle.leftStick.y : (controle.down ? 1 : 0) - (controle.up ? 1 : 0)
			const rx = controle.rightStick.x
			const ry = controle.rightStick.y
			if (Math.hypot(rx, ry) > 0.35) {
				p2.mira = { x: p2.x + 12 + rx * 120, y: p2.y + 15 + ry * 120 }
			}
		}
		else {
			const t = this.teclas
			vx = (t.direita.isDown ? 1 : 0) - (t.esquerda.isDown ? 1 : 0)
			vy = (t.abaixo.isDown ? 1 : 0) - (t.acima.isDown ? 1 : 0)
		}
		p2.vx = Phaser.Math.Clamp(vx, -1, 1)
		p2.vy = Phaser.Math.Clamp(vy, -1, 1)
	}

	processar_p2() {
		const p2 = this.p2
		const lodo = this.no_lodo(p2.x + 12, p2.y + 22) ? R.LODO.lenta : 1
		const v = (this.poderes.velocidade > 0 ? R.VELOCIDADE_HEROI_RAPIDO : R.VELOCIDADE_HEROI) * (1 + 0.12 * this.m('velocidade')) * lodo
		p2.x = Phaser.Math.Clamp(p2.x + p2.vx * v, 0, this.largura - 25)
		p2.y = Phaser.Math.Clamp(p2.y + p2.vy * v, ALTURA * 0.55, ALTURA - 27)

		// mira: o analógico direito do controle ou, sem ele, o inimigo mais perto
		const alvo = p2.mira || this.inimigo_mais_perto(p2.x + 12, p2.y + 12)
		const mao_x = p2.x + 12
		const mao_y = p2.y + 15
		if (alvo) {
			p2.angulo = Math.atan2(alvo.y - mao_y, alvo.x - mao_x)
		}
		const dx = Math.cos(p2.angulo)
		const dy = Math.sin(p2.angulo)
		p2.direcao = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'direita' : 'esquerda') : dy > 0 ? 'baixo' : 'cima'

		// atira com a arma dele (a pistola ou a que pegou numa caixa), com as melhorias de dano, cadência e perfuração
		if (p2.espera_tiro > 0) {
			p2.espera_tiro--
		}
		else if (alvo) {
			const arma = R.ARMAS[p2.arma_nome]
			for (let i = 0; i < arma.tiros; i++) {
				const angulo = p2.angulo + (i - (arma.tiros - 1) / 2) * arma.abertura + (Math.random() * 2 - 1) * arma.tremida
				const x = mao_x + Math.cos(angulo) * 14
				const y = mao_y + Math.sin(angulo) * 14
				const sprite = this.add.sprite(x, y, arma.projetil, 0).setRotation(angulo).setDepth(4)
				if (arma.chama) {
					sprite.setScale(0.5).setTint(Math.random() < 0.5 ? 0xffd060 : 0xff8a30)
				}
				else if (arma.projetil == 'tiro') {
					sprite.setTint(COR_P2)
				}
				this.tiros.push({
					sprite, x, y, arma, ha: 0, dono: p2,
					vx: Math.cos(angulo) * arma.velocidade, vy: Math.sin(angulo) * arma.velocidade,
					dano: arma.dano + this.m('dano'), perfura: arma.atravessa ? Infinity : this.m('perfura'), acertou: new Set(),
				})
				this.stats.disparos++
			}
			p2.espera_tiro = Math.round(arma.espera * Math.pow(0.85, this.m('cadencia')))
			efeito(this, arma.som.chave, { ...arma.som, volume: arma.som.volume * 0.7 })
			if (p2.municao != Infinity) {
				p2.municao--
				if (p2.municao <= 0) {
					this.trocar_arma_p2('pistola')
				}
			}
		}
	}

	// o jogador 2 pegou uma arma (o raio fica para o jogador 1, porque mira pela mão dele)
	trocar_arma_p2(arma) {
		const p2 = this.p2
		p2.arma_nome = arma
		p2.municao = arma == 'pistola' ? Infinity : Math.round(R.ARMAS[arma].municao * (1 + 0.5 * this.m('cinto')))
		p2.arma.setFrame(R.ARMAS[arma].quadro)
	}

	desenhar_p2() {
		const p2 = this.p2
		const andando = p2.vx || p2.vy
		if (andando) {
			p2.sprite.setTexture('heroi_' + p2.direcao, p2.xi)
			if (this.quadro_atual % 5 == 0)
				p2.xi = (p2.xi + 1) % 10
		}
		else {
			p2.sprite.setTexture('heroi_parado_' + p2.direcao)
		}
		const visivel = this.invencivel == 0 || Math.floor(this.invencivel / 8) % 2 == 0
		p2.sprite.setPosition(Math.round(p2.x), Math.round(p2.y)).setVisible(visivel)
		if (this.vermelho_heroi > 0) {
			p2.sprite.setTint(0xff3030).setTintMode(Phaser.TintModes.FILL)
		}
		else {
			p2.sprite.setTint(COR_P2).setTintMode(Phaser.TintModes.MULTIPLY)
		}
		p2.arma.setPosition(Math.round(p2.x + 12), Math.round(p2.y + 15)).setRotation(p2.angulo)
		p2.arma.setFlipY(Math.abs(p2.angulo) > Math.PI / 2).setVisible(visivel)
		p2.rotulo.setPosition(Math.round(p2.x + 12), Math.round(p2.y - 6))
		// com arma especial, mostra a munição em cima dele
		p2.rotulo.setText(p2.municao == Infinity ? 'P2' : 'P2 ' + p2.municao)
	}

	// "fantasma" do elfo que fica para trás durante a esquiva
	deixar_rastro() {
		const sprite = this.add.sprite(this.heroi_x, this.heroi_y, this.heroi.texture.key, this.heroi.frame.name)
			.setOrigin(0).setDepth(4.8).setTint(0x9fd8ff).setTintMode(Phaser.TintModes.FILL).setAlpha(0.5)
		this.rastros.push({ sprite, ha: 0 })
	}

	// o elfo está fora de alcance: piscando depois de apanhar ou no meio da esquiva
	get intocavel() {
		return this.invencivel > 0 || this.esquiva_ha > 0
	}

	// o elfo olha para o lado da mira (o lado em que ela está mais longe)
	mirar() {
		this.mao_x = this.heroi_x + 12
		this.mao_y = this.heroi_y + 15
		const dx = this.mira_x - this.mao_x
		const dy = this.mira_y - this.mao_y
		this.angulo = Math.atan2(dy, dx)
		if (Math.abs(dx) > Math.abs(dy))
			this.heroi_direcao = dx > 0 ? 'direita' : 'esquerda'
		else
			this.heroi_direcao = dy > 0 ? 'baixo' : 'cima'
	}

	atirar() {
		if (this.espera_tiro > 0) {
			this.espera_tiro--
			return
		}
		if (!this.atirar_on) {
			return
		}

		const arma = R.ARMAS[this.arma]
		// com a Mão Dupla a pistola dá dois tiros lado a lado
		const lado_a_lado = this.arma == 'pistola' && this.m('mao_dupla') ? [-4, 4] : [0]
		const tiros = arma.especial == 'raio' ? 0 : arma.tiros
		if (arma.especial == 'raio') {
			this.disparar_raio(arma)
		}
		for (let i = 0; i < tiros; i++) {
			// o triplo sai em leque: um no meio e um para cada lado
			const desvio = (i - (arma.tiros - 1) / 2) * arma.abertura
			const angulo = this.angulo + desvio + (Math.random() * 2 - 1) * arma.tremida
			const vx = Math.cos(angulo) * arma.velocidade
			const vy = Math.sin(angulo) * arma.velocidade
			for (const afasta of lado_a_lado) {
				// sai da ponta da arma
				const x = this.mao_x + Math.cos(angulo) * 14 - Math.sin(angulo) * afasta
				const y = this.mao_y + Math.sin(angulo) * 14 + Math.cos(angulo) * afasta
				const sprite = this.add.sprite(x, y, arma.projetil, 0).setRotation(angulo).setDepth(4)
				if (arma.chama) {
					sprite.setScale(0.5).setTint(Math.random() < 0.5 ? 0xffd060 : 0xff8a30)
				}
				else if (arma.chumbo) {
					sprite.setScale(0.45).setTint(0xd8d8e0)
				}
				this.tiros.push({
					sprite, x, y, vx, vy, arma, ha: 0,
					dano: arma.dano + this.m('dano'),
					// quantos zumbis ainda pode atravessar
					perfura: arma.atravessa ? Infinity : this.m('perfura'),
					acertou: new Set(),
				})
				this.stats.disparos++
			}
		}
		this.espera_tiro = Math.round(arma.espera * Math.pow(0.85, this.m('cadencia')))
		efeito(this, arma.som.chave, arma.som)

		this.clarao_ha = 4
		this.clarao.setPosition(this.mao_x + Math.cos(this.angulo) * 15, this.mao_y + Math.sin(this.angulo) * 15)

		if (this.municao != Infinity) {
			this.municao--
			if (this.municao == 0) {
				this.trocar_arma('pistola')
			}
			this.atualizar_hud()
		}
	}

	encher_furia(quanto) {
		const antes = this.furia
		this.furia = Math.min(1, this.furia + quanto)
		if (antes < 1 && this.furia >= 1) {
			this.flutuar(this.heroi_x + 12, this.heroi_y - 10, 'FÚRIA PRONTA!', '#ff9aff')
			efeito(this, 'poder', { volume: 0.5, rate: 1.3 })
		}
	}

	// fúria élfica: anel de fogo em todas as direções, que atravessa tudo
	soltar_furia() {
		if (!this.furia_on || this.furia < 1) {
			return
		}
		this.furia = 0
		const arma = { projetil: 'tiro', dano: R.FURIA.dano + this.m('dano'), empurra: 4, atravessa: true, furia: true, sem_pontaria: true }
		for (let i = 0; i < R.FURIA.tiros; i++) {
			const angulo = (i / R.FURIA.tiros) * Math.PI * 2
			const x = this.heroi_x + 12 + Math.cos(angulo) * 10
			const y = this.heroi_y + 12 + Math.sin(angulo) * 10
			const sprite = this.add.sprite(x, y, 'tiro', 0).setRotation(angulo).setScale(1.3).setTint(0xff9aff).setDepth(4)
			this.tiros.push({
				sprite, x, y, arma, ha: 0,
				vx: Math.cos(angulo) * R.FURIA.velocidade,
				vy: Math.sin(angulo) * R.FURIA.velocidade,
				dano: arma.dano, perfura: Infinity, acertou: new Set(),
			})
		}
		this.invencivel = Math.max(this.invencivel, 80)
		this.cameras.main.flash(250, 255, 160, 255)
		this.tremer(250, 0.008)
		efeito(this, 'explosao', { volume: 0.7, rate: 1.4 })
		efeito(this, 'poder', { volume: 0.6, rate: 0.7 })
	}

	// raio: acerta o inimigo mais perto da mira e vai pulando para os vizinhos
	disparar_raio(arma) {
		this.stats.disparos++
		const dano = arma.dano + this.m('dano')
		const alvos = []
		const vivos = () => {
			const lista = this.zumbis.filter((z) => !z.morrendo && !z.intangivel && !alvos.includes(z)).map((z) => {
				const c = corpo(z)
				return { alvo: z, x: c.x + c.l / 2, y: c.y + c.a / 2 }
			})
			if (this.chefe && this.chefe.fase != 'morrendo' && !this.chefe.intangivel && !alvos.includes(this.chefe)) {
				const c = corpo_chefe(this.chefe)
				lista.push({ alvo: this.chefe, x: c.x + c.l / 2, y: c.y + c.a / 2 })
			}
			return lista
		}
		const mais_perto = (x, y, limite) => {
			let melhor = null
			for (const v of vivos()) {
				const d = Phaser.Math.Distance.Between(x, y, v.x, v.y)
				if (d < limite && (!melhor || d < melhor.d)) melhor = { ...v, d }
			}
			return melhor
		}
		// o primeiro alvo: o inimigo mais perto do ponto da mira, sem passar do alcance do elfo
		const pontos = [[this.mao_x, this.mao_y]]
		let atual = mais_perto(this.mira_x, this.mira_y, 90)
		if (atual && Phaser.Math.Distance.Between(this.mao_x, this.mao_y, atual.x, atual.y) > arma.alcance) {
			atual = null
		}
		for (let salto = 0; atual && salto <= arma.saltos; salto++) {
			alvos.push(atual.alvo)
			pontos.push([atual.x, atual.y])
			this.espirrar_sangue(atual.x, atual.y)
			if (atual.alvo == this.chefe) {
				this.ferir_chefe(dano, atual.x, atual.y)
			}
			else {
				this.ferir_zumbi(atual.alvo, dano, arma.empurra)
			}
			atual = mais_perto(atual.x, atual.y, 75)
		}
		if (alvos.length) {
			this.stats.acertos++
		}
		else {
			// errou: o raio sai na direção da mira e se perde
			pontos.push([this.mao_x + Math.cos(this.angulo) * 70, this.mao_y + Math.sin(this.angulo) * 70])
		}
		this.raios.push({ pontos, ha: 0 })
	}

	trocar_arma(arma) {
		this.arma = arma
		this.usou_arma(arma)
		// o Cinto de Balas aumenta a munição das armas especiais
		this.municao = Math.round(R.ARMAS[arma].municao * (1 + 0.5 * this.m('cinto')))
		this.arma_na_mao.setFrame(R.ARMAS[arma].quadro)
		this.atualizar_hud()
	}

	// para a conquista Arsenal (vale arma pega por qualquer um dos dois elfos)
	usou_arma(arma) {
		this.armas_usadas.add(arma)
		if (this.armas_usadas.size >= Object.keys(R.ARMAS).length) desbloquear(this, 'arsenal')
	}

	// o elfo leva um golpe: o escudo segura, senão perde uma vida
	levar_dano() {
		if (this.intocavel || this.estado != 'jogando') {
			return
		}
		if (this.poderes.escudo > 0) {
			this.poderes.escudo = 0
			this.invencivel = 60
			this.flutuar(this.heroi_x + 12, this.heroi_y - 6, 'ESCUDO!', '#9fd8ff')
			efeito(this, 'escudo_quebra', { volume: 0.7 })
			return
		}
		this.perder_vida()
	}

	perder_vida() {
		if (this.estado != 'jogando') {
			return
		}
		this.vidas--
		this.parada = 6
		this.apanhou_na_fase = true
		this.vermelho_heroi = 20 // o elfo fica vermelho por um instante
		if (navigator.vibrate) {
			navigator.vibrate(this.vidas <= 0 ? [80, 60, 200] : 120)
		}
		this.invencivel = R.INVENCIVEL_DEPOIS_DE_APANHAR
		this.dano_ha = 30
		this.combo = 0
		this.combo_ha = 0
		this.multiplicador = 1
		this.tremer(200, 0.01)
		this.vibrar(0.8, 220)
		efeito(this, 'perder_vida', { volume: 0.7 })
		this.atualizar_hud()
		if (this.vidas <= 0 && this.pode_reviver) {
			this.reviver()
		}
		else if (this.vidas <= 0) {
			this.fim_de_jogo()
		}
	}

	// Segunda Chance (loja): na hora de morrer, o elfo volta com um coração e uma onda empurra tudo
	reviver() {
		this.pode_reviver = false
		this.vidas = 1
		this.invencivel = 300
		this.anunciar('SEGUNDA CHANCE!', 200, '#9ff07a')
		this.cameras.main.flash(400, 200, 255, 200)
		efeito(this, 'poder', { volume: 0.8, rate: 0.6 })
		const cx = this.heroi_x + 12
		const cy = this.heroi_y + 12
		const onda = this.add.circle(cx, cy, 10).setStrokeStyle(3, 0x9ff07a).setDepth(7)
		this.tweens.add({ targets: onda, radius: 140, alpha: 0, duration: 500, onComplete: () => onda.destroy() })
		for (const zumbi of this.zumbis) {
			const c = corpo(zumbi)
			if (!zumbi.morrendo && Phaser.Math.Distance.Between(cx, cy, c.x + c.l / 2, c.y + c.a / 2) < 140) {
				this.matar_zumbi(zumbi)
			}
		}
		this.cuspes.forEach((cuspe) => {
			cuspe.sumiu = true
			cuspe.sprite.destroy()
		})
		this.cuspes = []
		this.atualizar_hud()
	}
}
