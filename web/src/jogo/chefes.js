// Parte da cena Jogo: chefões: chegada, ataques, investida, ossos, morte e final do jogo.
// Os métodos desta classe são copiados para a cena em Jogo.js (por isso usam this como se fossem dela).
import Phaser from 'phaser'
import { ALTURA, texto } from '../tela.js'
import * as R from '../regras.js'
import { tocar_musica, parar_musica } from '../musica.js'
import { desbloquear } from '../conquistas.js'
import { marcar_visto } from '../Bestiario.js'
import { efeito, opcoes } from '../opcoes.js'
import { corpo_chefe } from './comum.js'

export default class Chefes {
	// ------------------------------------------------------------------ chefão

	chamar_chefe() {
		if (this.chefe_em == 0) {
			return
		}
		this.chefe_em--
		if (this.chefe_em > 0) {
			return
		}
		const numero = this.nivel / R.NIVEIS_ENTRE_CHEFOES
		// na fase 50 vem o chefão final: maior, mais forte e com todos os ataques
		const final = this.nivel == R.CHEFE_FINAL.fase
		const vida = Math.round((R.CHEFE.vida_base + R.CHEFE.vida_por_chefe * (numero - 1)) * this.dificuldade.chefe * (final ? R.CHEFE_FINAL.vida : 1))
		const escala = final ? R.CHEFE_FINAL.escala : R.CHEFE.escala
		const tamanho = 64 * escala
		const tipo = final ? R.CHEFE_FINAL : R.CHEFES[(numero - 1) % R.CHEFES.length]
		marcar_visto(final ? 'chefe_final' : 'chefe' + (((numero - 1) % R.CHEFES.length) + 1))
		// quando os chefões voltam do começo ganham um número: O REI ZUMBI II, III...
		const volta = Math.floor((numero - 1) / R.CHEFES.length) + 1
		const romanos = ['', '', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X']
		this.chefe = {
			numero,
			nome: final ? tipo.nome : tipo.nome + (romanos[volta] ?? ' ' + volta),
			final,
			escala,
			cor: tipo.cor,
			// do 4º chefão em diante ele usa todos os ataques
			ataques: final || numero > R.CHEFES.length ? ['cuspe', 'chamar', 'investida', 'chuva', 'teleporte', 'fantasmas', 'ossos', 'levantar', 'meteoros', 'labareda'] : tipo.ataques,
			x: this.largura / 2 - tamanho / 2,
			y: -tamanho,
			vida,
			vida_max: vida,
			fase: 'entrando',
			ha: 0, // relógio do balanço de um lado para o outro (para durante a investida)
			flash: 0,
			atacando: 0,
			espera_cuspe: 120,
			espera_chamar: 400,
			espera_investida: 300,
			espera_chuva: 250,
			espera_teleporte: 250,
			espera_fantasmas: 400,
			espera_levantar: 300,
			espera_meteoros: 200,
			espera_labareda: 320,
			labareda: 0, // ticks que faltam do jorro de fogo
			espera_ossos: 60,
			ossos: [], // ossos girando em volta: { angulo, sprite, x, y }
			teleporte: null, // { ha } enquanto some e aparece em outro lugar
			investida: null, // { etapa: 'aviso' | 'descendo' | 'voltando', ha, alvo_x, alvo_y }
			morto_ha: 0,
		}
		this.chefe.sprite = this.add.sprite(this.chefe.x, this.chefe.y, 'chefe', 0).setOrigin(0).setScale(escala).setDepth(3)
		this.barra_nome.setText(this.chefe.nome)
		this.barra_vida.setFillStyle(0xd02828)
		this.barra_rastro.setSize(this.largura_barra, 4)
		this.apresentar_chefe(this.chefe.nome, final ? 'CHEFÃO FINAL' : 'CHEFÃO ' + numero)
		efeito(this, 'rugido', { volume: 0.9 })
		tocar_musica(this, final ? 'musica_final' : 'musica_chefe')
		this.tremer(400, 0.008)
	}

	ferir_chefe(dano, x, y) {
		const chefe = this.chefe
		chefe.vida -= dano
		chefe.flash = 5
		this.encher_furia(R.FURIA.por_acerto_no_chefe)
		// com metade da vida ele enfurece: anda e ataca mais rápido (o primeiro chefão não, para aprender)
		if (!chefe.furioso && chefe.numero >= 2 && chefe.vida > 0 && chefe.vida <= chefe.vida_max / 2) {
			chefe.furioso = true
			this.anunciar('ENFURECIDO!', 150, '#ff5a5a')
			efeito(this, 'rugido', { volume: 0.9, rate: 1.15 })
			this.tremer(300, 0.008)
			this.barra_vida.setFillStyle(0xff7a20)
		}
		this.espirrar_sangue(x, y)
		if (chefe.vida <= 0) {
			for (const osso of chefe.ossos.slice()) {
				this.quebrar_osso(osso)
			}
			chefe.fase = 'morrendo'
			chefe.morto_ha = 0
			this.parada = 18
			this.stats.chefes++
			if (!chefe.final && !this.treino) desbloquear(this, 'chefe' + (((chefe.numero - 1) % R.CHEFES.length) + 1))
			if (this.modo_chefes && this.stats.chefes >= 4) desbloquear(this, 'maratona')
			const ganho = R.CHEFE.pontos * chefe.numero
			this.pontos += ganho
			this.flutuar(chefe.x + 64, chefe.y + 20, '+' + ganho, '#ff9a3c')
			efeito(this, 'rugido', { volume: 1, rate: 0.75 })
			this.vibrar(1, 600)
			// zoom rápido na câmera e volta: o golpe final pesa
			if (opcoes.tremor) {
				const cam = this.cameras.main
				cam.once('camerazoomcomplete', () => cam.zoomTo(this.zoom, 500, 'Sine.easeInOut', true))
				cam.zoomTo(this.zoom * 1.12, 180, 'Sine.easeOut', true)
			}
			this.atualizar_hud()
		}
	}

	mover_chefe() {
		const chefe = this.chefe
		if (!chefe) {
			return
		}
		if (chefe.flash > 0)
			chefe.flash--

		if (chefe.fase == 'morrendo') {
			chefe.morto_ha++
			// pipoca de explosões em cima dele
			if (chefe.morto_ha % 12 == 0 && chefe.morto_ha <= 96) {
				const c = corpo_chefe(chefe)
				this.explodir(c.x + Math.random() * c.l, c.y + Math.random() * c.a, 30, 0, chefe.morto_ha % 24 == 0)
			}
			if (chefe.morto_ha == 120) {
				// deixa presentes e o jogo segue para o próximo nível
				const c = corpo_chefe(chefe)
				this.soltar_coracao(c.x + c.l / 2 - 20, c.y + c.a / 2)
				this.soltar_item(c.x + c.l / 2, c.y + c.a / 2)
				this.soltar_item(c.x + c.l / 2 + 22, c.y + c.a / 2 - 10)
				chefe.sprite.destroy()
				this.chefe = null
				if (this.treino) {
					// treino vencido: volta para o bestiário
					this.anunciar('TREINO VENCIDO!', 300, '#9ff07a')
					efeito(this, 'fase', { volume: 0.7 })
					this.estado = 'fim'
					this.time.delayedCall(2200, () => this.scene.start('Bestiario'))
				}
				else if (chefe.final) {
					this.mostrar_final()
				}
				else {
					tocar_musica(this, this.cenario().musica)
					// depois do 2º, 4º, 6º... chefão vem a chuva de moedas
					// uma frase da história depois de cada chefão (só na primeira volta)
					const tipo = R.CHEFES[chefe.numero - 1]
					if (tipo && tipo.fala) {
						this.apresentar_chefe(tipo.nome + ' CAIU', tipo.fala, '#9ff07a') // a fila de cartões cuida da ordem
					}
					if (chefe.numero % 2 == 0 && !this.modo_chefes) {
						this.chuva_de_moedas = R.CHUVA_DE_MOEDAS.duracao
						// bônus de verdade: some quem sobrou da luta e os cuspes no ar
						this.zumbis.forEach((z) => !z.morrendo && (z.morrendo = true))
						this.cuspes.forEach((c) => c.sprite.destroy())
						this.cuspes = []
					}
					this.subir_nivel(true)
					if (this.chuva_de_moedas > 0) {
						// (a escolha de melhoria anuncia o texto_da_fase quando fechar)
						this.texto_da_fase = 'FASE ' + this.nivel + '\nCHUVA DE MOEDAS!'
						if (this.estado == 'jogando') this.anunciar(this.texto_da_fase, 250, '#ffd34d')
					}
				}
			}
			return
		}
		if (this.congelado) {
			return
		}

		const tamanho = 64 * chefe.escala
		if (chefe.fase == 'entrando') {
			chefe.y += 0.5
			if (chefe.y >= 48) {
				chefe.fase = 'lutando'
				chefe.ha = 0
			}
		}
		else if (chefe.investida) {
			this.investir(chefe, tamanho)
		}
		else {
			// anda de um lado para o outro na parte de cima, balançando
			chefe.ha++
			if (chefe.teleporte) {
				chefe.teleporte.ha++
				if (chefe.teleporte.ha == 30) {
					chefe.ha += Phaser.Math.Between(150, 500) // reaparece em outro ponto do balanço
				}
				chefe.intangivel = chefe.teleporte.ha > 12 && chefe.teleporte.ha < 48
				if (chefe.teleporte.ha >= 60) {
					chefe.teleporte = null
					chefe.intangivel = false
				}
			}
			const amplitude = Math.max(0, this.largura / 2 - tamanho / 2 - 10)
			chefe.x = this.largura / 2 - tamanho / 2 + Math.sin(chefe.ha / Math.max(40, 140 - chefe.numero * 10)) * amplitude
			chefe.y = 48 + Math.sin(chefe.ha / 37) * 8
			this.atacar(chefe)
			if (chefe.furioso) {
				chefe.ha += 0.3
				// os relógios dos ataques andam 50% mais rápido
				if (chefe.ha % 2 < 1) {
					this.atacar(chefe)
				}
			}
		}
		if (chefe.atacando > 0)
			chefe.atacando--
		this.girar_ossos(chefe)

		const c = corpo_chefe(chefe)
		if (!chefe.intangivel && this.encosta_em_heroi(c.x, c.y, c.l, c.a)) {
			this.levar_dano()
		}
	}

	// entrada de cinema: faixas pretas em cima e embaixo e o nome do chefão atravessando a tela
	// também usada na chegada de cada cenário (com outra cor)
	apresentar_chefe(nome, subtitulo, cor = '#ff5a5a') {
		// um cartão por vez: se já tem um na tela, este espera ele acabar
		// (conta em ticks do jogo, que param na pausa junto com as animações do cartão)
		const agora = this.quadro_atual
		if (this.cartao_ate && this.cartao_ate > agora) {
			this.time.delayedCall((this.cartao_ate - agora) * 10 + 50, () => this.apresentar_chefe(nome, subtitulo, cor))
			return
		}
		this.cartao_ate = agora + 245
		const L = this.largura
		const faixa_cima = this.add.rectangle(0, 0, L, 0, 0x000000).setOrigin(0).setDepth(9.6)
		const faixa_baixo = this.add.rectangle(0, ALTURA, L, 0, 0x000000).setOrigin(0, 1).setDepth(9.6)
		const titulo = texto(this, -150, ALTURA / 2 - 10, nome, 16, cor).setOrigin(0.5).setDepth(9.7)
		const sub = texto(this, L + 150, ALTURA / 2 + 12, subtitulo, 8, '#ffd34d').setOrigin(0.5).setDepth(9.7)
		this.tweens.add({ targets: [faixa_cima, faixa_baixo], height: 26, duration: 300 })
		this.tweens.add({
			targets: titulo, x: L / 2, duration: 450, ease: 'Back.Out',
			onComplete: () => this.tweens.add({ targets: titulo, x: L + 200, delay: 1300, duration: 350, ease: 'Back.In' }),
		})
		this.tweens.add({
			targets: sub, x: L / 2, duration: 450, delay: 100, ease: 'Back.Out',
			onComplete: () => this.tweens.add({ targets: sub, x: -200, delay: 1200, duration: 350, ease: 'Back.In' }),
		})
		this.time.delayedCall(2100, () => {
			this.tweens.add({
				targets: [faixa_cima, faixa_baixo], height: 0, duration: 300,
				onComplete: () => [faixa_cima, faixa_baixo, titulo, sub].forEach((o) => o.destroy()),
			})
		})
	}

	// cada ataque tem seu relógio; o chefão só usa os ataques da lista dele
	atacar(chefe) {
		const tem = (ataque) => chefe.ataques.includes(ataque)
		const c = corpo_chefe(chefe)

		chefe.espera_cuspe--
		if (tem('cuspe') && chefe.espera_cuspe <= 0) {
			const quantos = Math.min(9, 1 + chefe.numero * 2) // 3 no primeiro chefão, 5 no segundo...
			this.cuspir(c.x + c.l / 2, c.y + c.a * 0.4, quantos, 0.18)
			chefe.atacando = 40
			chefe.espera_cuspe = Math.max(70, 150 - chefe.numero * 15)
		}

		chefe.espera_chamar--
		if (tem('chamar') && chefe.espera_chamar <= 0) {
			for (let i = 0; i < 1 + chefe.numero; i++) {
				this.criar_zumbi('corredor', Phaser.Math.Clamp(c.x + Math.random() * c.l - 18, 0, this.largura - 36), c.y + c.a - 20)
			}
			chefe.atacando = 40
			chefe.espera_chamar = 500
		}

		chefe.espera_chuva--
		if (tem('chuva') && chefe.espera_chuva <= 0) {
			// cuspe caindo do céu em lugares sorteados (um deles sempre em cima do elfo)
			const quantos = 5 + chefe.numero
			for (let i = 0; i < quantos; i++) {
				const x = i < this.herois().length ? this.herois()[i].x + 12 : Math.random() * this.largura
				const sprite = this.add.sprite(x, -10 - Math.random() * 120, 'cuspe', 0).setDepth(4.5)
				this.cuspes.push({ sprite, x, y: sprite.y, vx: 0, vy: R.VELOCIDADE_CUSPE * 1.1 })
			}
			efeito(this, 'cuspe', { volume: 0.6, rate: 0.7 })
			chefe.atacando = 40
			chefe.espera_chuva = Math.max(220, 380 - chefe.numero * 20)
		}

		chefe.espera_investida--
		if (tem('investida') && chefe.espera_investida <= 0 && !chefe.teleporte) {
			chefe.investida = { etapa: 'aviso', ha: 0 }
			chefe.espera_investida = Math.max(300, 520 - chefe.numero * 30)
			efeito(this, 'rugido', { volume: 0.7, rate: 1.3 })
		}

		chefe.espera_teleporte--
		if (tem('teleporte') && chefe.espera_teleporte <= 0 && !chefe.teleporte && !chefe.investida) {
			chefe.teleporte = { ha: 0 }
			chefe.espera_teleporte = Math.max(220, 360 - chefe.numero * 15)
			efeito(this, 'fantasma', { volume: 0.6, rate: 0.6 })
		}

		chefe.espera_meteoros--
		if (tem('meteoros') && chefe.espera_meteoros <= 0) {
			for (let i = 0; i < 3 + Math.floor(chefe.numero / 6); i++) {
				this.criar_queda(R.PERIGOS.meteoros)
			}
			chefe.atacando = 40
			chefe.espera_meteoros = Math.max(260, 440 - chefe.numero * 10)
			efeito(this, 'rugido', { volume: 0.6, rate: 1.4 })
		}

		// labareda: um jorro de bolas de fogo que vai seguindo o elfo
		chefe.espera_labareda--
		if (tem('labareda') && chefe.espera_labareda <= 0 && chefe.labareda == 0) {
			chefe.labareda = 70
			chefe.espera_labareda = Math.max(300, 420 - chefe.numero * 10)
		}
		if (chefe.labareda > 0) {
			chefe.labareda--
			chefe.atacando = 10
			if (chefe.labareda % 5 == 0) {
				this.cuspir(c.x + c.l / 2, c.y + c.a * 0.35, 1, 0)
				this.cuspes[this.cuspes.length - 1].sprite.setTint(0xff8a30).setTintMode(Phaser.TintModes.FILL).setScale(1.4)
				efeito(this, 'chama', { volume: 0.4 })
			}
		}

		chefe.espera_levantar--
		if (tem('levantar') && chefe.espera_levantar <= 0) {
			this.levantar_mortos(chefe)
			chefe.atacando = 40
			chefe.espera_levantar = Math.max(320, 540 - chefe.numero * 20)
		}

		// os ossos voltam um tempo depois de quebrar todos
		if (tem('ossos') && chefe.ossos.length == 0) {
			chefe.espera_ossos--
			if (chefe.espera_ossos <= 0) {
				this.criar_ossos(chefe)
				chefe.espera_ossos = R.OSSOS.volta_em
			}
		}

		chefe.espera_fantasmas--
		if (tem('fantasmas') && chefe.espera_fantasmas <= 0) {
			for (let i = 0; i < 2; i++) {
				this.criar_zumbi('fantasma', Phaser.Math.Clamp(c.x + Math.random() * c.l - 22, 0, this.largura - 44), c.y + c.a - 30)
			}
			chefe.atacando = 40
			chefe.espera_fantasmas = 520
		}
	}

	// escudo de ossos: giram em volta do chefão e seguram os tiros
	criar_ossos(chefe) {
		const quantos = R.OSSOS.quantos + Math.floor(chefe.numero / 5)
		for (let i = 0; i < quantos; i++) {
			const sprite = this.add.sprite(0, 0, 'osso').setDepth(3.5).setScale(1.4).setAlpha(0)
			this.tweens.add({ targets: sprite, alpha: 1, duration: 400 })
			chefe.ossos.push({ angulo: (i / quantos) * Math.PI * 2, sprite, x: -100, y: -100 })
		}
		efeito(this, 'fantasma', { volume: 0.5, rate: 1.4 })
	}

	girar_ossos(chefe) {
		const c = corpo_chefe(chefe)
		const cx = c.x + c.l / 2
		const cy = c.y + c.a / 2
		for (const osso of chefe.ossos) {
			osso.angulo += R.OSSOS.giro
			osso.x = cx + Math.cos(osso.angulo) * R.OSSOS.raio
			osso.y = cy + Math.sin(osso.angulo) * R.OSSOS.raio * 0.8
			osso.sprite.setPosition(Math.round(osso.x), Math.round(osso.y)).setRotation(osso.angulo + Math.PI / 2)
		}
	}

	quebrar_osso(osso) {
		const chefe = this.chefe
		if (chefe) {
			chefe.ossos = chefe.ossos.filter((o) => o != osso)
		}
		efeito(this, 'acerto', { volume: 0.4, rate: 1.7 })
		this.tweens.add({
			targets: osso.sprite, y: osso.y + 20, angle: osso.sprite.angle + 200, alpha: 0,
			duration: 450, onComplete: () => osso.sprite.destroy(),
		})
	}

	// levanta zumbis das manchas de sangue mais perto do elfo (ou da terra perto dele, se não tiver mancha)
	levantar_mortos(chefe) {
		const quantos = 2 + Math.floor(chefe.numero / 5)
		const h = this.heroi_mais_perto(this.heroi_x, this.heroi_y)
		const manchas = this.manchas
			.filter((m) => m.sprite.y > ALTURA * 0.35 && m.sprite.y < ALTURA - 30)
			.sort((a, b) => Math.abs(a.sprite.x - h.x) + Math.abs(a.sprite.y - h.y) - Math.abs(b.sprite.x - h.x) - Math.abs(b.sprite.y - h.y))
		for (let i = 0; i < quantos; i++) {
			const m = manchas[i + 1] || manchas[i] // a mais perto de todas fica de fora: dá um respiro
			const x = m ? m.sprite.x : Phaser.Math.Clamp(h.x + Phaser.Math.Between(-120, 120), 20, this.largura - 20)
			const y = m ? m.sprite.y : Phaser.Math.Between(Math.round(ALTURA * 0.4), Math.round(ALTURA * 0.6))
			if (m) {
				m.sprite.setTint(0x7af0d8)
			}
			const zumbi = this.criar_zumbi('comum', Phaser.Math.Clamp(x - 22, 0, this.largura - 44), y - 40)
			zumbi.cavando = 90
			zumbi.intangivel = true
			zumbi.vx = 0.3
			zumbi.sprite.setVisible(false)
			if (m) manchas.splice(manchas.indexOf(m), 1)
		}
		efeito(this, 'fantasma', { volume: 0.6, rate: 0.5 })
	}

	// investida: treme vermelho por um tempo (dá para fugir), desce correndo e volta para o lugar
	investir(chefe, tamanho) {
		const inv = chefe.investida
		inv.ha++
		if (inv.etapa == 'aviso') {
			chefe.x += Math.random() < 0.5 ? -1 : 1 // tremendo
			if (inv.ha >= 70) {
				inv.etapa = 'descendo'
				// mira onde o elfo está agora
				const alvo = Phaser.Utils.Array.GetRandom(this.herois())
				inv.alvo_x = Phaser.Math.Clamp(alvo.x + 12 - tamanho / 2, 0, this.largura - tamanho)
				inv.alvo_y = ALTURA - tamanho - 10
				this.tremer(300, 0.006)
			}
		}
		else if (inv.etapa == 'descendo') {
			const dx = inv.alvo_x - chefe.x
			const dy = inv.alvo_y - chefe.y
			const d = Math.hypot(dx, dy)
			const v = 3.5 + chefe.numero * 0.2
			if (d <= v) {
				inv.etapa = 'voltando'
				this.tremer(200, 0.01)
			}
			else {
				chefe.x += (dx / d) * v
				chefe.y += (dy / d) * v
			}
		}
		else {
			// volta para o ponto do balanço onde estava
			const amplitude = Math.max(0, this.largura / 2 - tamanho / 2 - 10)
			const volta_x = this.largura / 2 - tamanho / 2 + Math.sin(chefe.ha / Math.max(40, 140 - chefe.numero * 10)) * amplitude
			const dx = volta_x - chefe.x
			const dy = 48 - chefe.y
			const d = Math.hypot(dx, dy)
			if (d <= 1.6) {
				chefe.investida = null
			}
			else {
				chefe.x += (dx / d) * 1.6
				chefe.y += (dy / d) * 1.6
			}
		}
	}

	// venceu o chefão final: a história termina (e dá para continuar jogando no modo infinito)
	mostrar_final() {
		if (this.estado != 'jogando') {
			return // o elfo morreu no mesmo instante: vale o fim de jogo
		}
		this.estado = 'final'
		this.barra_carga.setVisible(false)
		desbloquear(this, 'zerou')
		this.dica_texto.setVisible(false)
		tocar_musica(this, 'musica_titulo')
		this.escurecer.setVisible(true).setAlpha(0)
		this.tweens.add({ targets: this.escurecer, alpha: 1, duration: 1200 })
		const frases = [
			'O SENHOR DOS MORTOS CAIU.',
			'OS SINOS SE CALARAM E OS MORTOS VOLTARAM PARA AS COVAS.',
			'PELA PRIMEIRA VEZ EM MUITO TEMPO,',
			'O CEMITÉRIO DORME.',
			'(O ELFO LENDÁRIO ESTÁ LIBERADO NO TÍTULO)',
			'OBRIGADO POR JOGAR!',
		]
		const meio = this.largura / 2
		const objetos = []
		const linhas = frases.map((_, i) => {
			const linha = texto(this, meio, 90 + i * 26, '', 8, i == frases.length - 1 ? '#ffd34d' : '#e8f5c8').setOrigin(0.5).setDepth(12)
			objetos.push(linha)
			return linha
		})
		this.objetos_final = objetos
		// máquina de escrever, uma letra a cada 45 ms
		let frase = 0
		let letra = 0
		const escrever = this.time.addEvent({
			delay: 45, loop: true, startAt: -1500,
			callback: () => {
				if (frase >= frases.length) {
					escrever.remove()
					this.opcoes_do_final(objetos)
					return
				}
				letra++
				linhas[frase].setText(frases[frase].slice(0, letra))
				linhas[frase].setScale(Math.min(1, (this.largura - 10) / Math.max(1, linhas[frase].width)))
				if (letra >= frases[frase].length) {
					frase++
					letra = 0
				}
			},
		})
	}

	// depois do final: continuar no modo infinito ou terminar a partida (vai para a tela de fim)
	opcoes_do_final(objetos) {
		const meio = this.largura / 2
		const continuar = texto(this, meio, 260, '[ CONTINUAR JOGANDO ]', 8, '#9ff07a').setOrigin(0.5).setDepth(12).setInteractive({ useHandCursor: true })
		const terminar = texto(this, meio, 284, '[ TERMINAR A PARTIDA ]', 8, '#cfcfcf').setOrigin(0.5).setDepth(12).setInteractive({ useHandCursor: true })
		const dica = texto(this, meio, 310, this.modo_toque ? '' : 'ENTER: CONTINUAR   ESC: TERMINAR', 8, '#8a8a90').setOrigin(0.5).setDepth(12)
		objetos.push(continuar, terminar, dica)
		let escolheu = false
		const sair = (seguir) => {
			if (escolheu || this.estado != 'final') return
			escolheu = true
			for (const o of objetos) o.destroy()
			this.input.keyboard.off('keydown-ENTER', seguir_tecla)
			this.input.keyboard.off('keydown-ESC', terminar_tecla)
			if (seguir) {
				this.escurecer.setVisible(false).setAlpha(1)
				this.estado = 'jogando'
				this.tempo_acumulado = 0
				tocar_musica(this, this.cenario().musica)
				this.dica_texto.setVisible(true)
				this.subir_nivel(true)
				// aparece depois da escolha da melhoria (escolher() anuncia o texto_da_fase)
				this.texto_da_fase = 'MODO INFINITO!'
				this.anunciar('MODO INFINITO!', 250, '#c08aff')
			}
			else {
				this.escurecer.setAlpha(1)
				this.estado = 'fim'
				parar_musica(300)
				this.mostrar_fim()
			}
		}
		const seguir_tecla = () => sair(true)
		const terminar_tecla = () => sair(false)
		continuar.on('pointerdown', (p, x, y, ev) => { ev.stopPropagation(); sair(true) })
		terminar.on('pointerdown', (p, x, y, ev) => { ev.stopPropagation(); sair(false) })
		this.input.keyboard.on('keydown-ENTER', seguir_tecla)
		this.input.keyboard.on('keydown-ESC', terminar_tecla)
		this.botoes_do_final = { sair }
	}
}
