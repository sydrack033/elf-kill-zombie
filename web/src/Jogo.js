import Phaser from 'phaser'
import { ALTURA, ajustar_tela, texto, tecla_tela_cheia, tecla_som, ler_recorde, gravar_recorde } from './tela.js'

// Igual à versão do Portugol, o jogo anda em "ticks" de 10 ms e cada tick roda
// entrada() -> processamento() -> saida(). Velocidades são em pixels por tick.
const TICK_MS = 10

const VELOCIDADE_HEROI = 1.6
const VELOCIDADE_TIRO = 6
const INVENCIVEL_DEPOIS_DE_APANHAR = 150 // ticks (1,5 s)
const VIDAS_NO_COMECO = 3
const VIDAS_NO_MAXIMO = 5
const MORTES_POR_NIVEL = 12
const CHANCE_DE_CORACAO = 0.08 // chance de um zumbi morto soltar um coração

// armas: espera = ticks entre um disparo e outro; abertura = ângulo entre os tiros do triplo;
// tremida = quanto a mira treme; municao = disparos até voltar para a pistola
// som = como o som de tiro toca para cada arma (rate muda o tom: menor = mais grave)
const ARMAS = {
	pistola: { nome: 'PISTOLA', quadro: 0, espera: 22, tiros: 1, abertura: 0, tremida: 0, municao: Infinity, som: { volume: 0.5, rate: 1 } },
	triplo: { nome: 'TRIPLO', quadro: 1, espera: 30, tiros: 3, abertura: 0.22, tremida: 0, municao: 40, som: { volume: 0.6, rate: 0.75 } },
	metralhadora: { nome: 'METRALHADORA', quadro: 2, espera: 7, tiros: 1, abertura: 0, tremida: 0.08, municao: 150, som: { volume: 0.3, rate: 1.3 } },
}

// caixas que descem rolando com o chão; quadro = quadro da imagem itens.png
const ITENS = [
	{ tipo: 'triplo', quadro: 0, chance: 0.35 },
	{ tipo: 'metralhadora', quadro: 1, chance: 0.25 },
	{ tipo: 'bomba', quadro: 2, chance: 0.4 },
]
const BOMBAS_NO_COMECO = 2
const BOMBAS_NO_MAXIMO = 9
const BOMBAS_POR_CAIXA = 3
const RAIO_DA_EXPLOSAO = 46
const DANO_DA_EXPLOSAO = 3

// a imagem do zumbi tem 44x44, mas o corpo dele ocupa só este pedaço
const CORPO_ZUMBI = { x: 10, y: 4, l: 24, a: 36 }

// verdadeiro se o retângulo a (x, y, largura, altura) encosta no retângulo b
function encostou(ax, ay, al, aa, bx, by, bl, ba) {
	return ax < bx + bl && bx < ax + al && ay < by + ba && by < ay + aa
}

export default class Jogo extends Phaser.Scene {
	constructor() {
		super('Jogo')
	}

	create() {
		this.chao = this.add.tileSprite(0, 0, 10, ALTURA, 'chao').setOrigin(0)
		ajustar_tela(this)

		this.heroi_x = this.largura / 2 - 12
		this.heroi_y = ALTURA - 50
		this.heroi_xi = 0
		this.heroi_direcao = 'cima'
		this.heroi = this.add.sprite(this.heroi_x, this.heroi_y, 'heroi_parado_cima').setOrigin(0).setDepth(5)
		// a arma gira em volta da empunhadura, que fica no pixel (3, 4) da imagem
		this.arma_na_mao = this.add.sprite(0, 0, 'armas', 0).setOrigin(3 / 16, 4 / 8).setDepth(6)

		this.vidas = VIDAS_NO_COMECO
		this.invencivel = 0
		this.pontos = 0
		this.nivel = 1
		this.mortes_no_nivel = 0
		this.recorde = ler_recorde()

		this.arma = 'pistola'
		this.municao = Infinity
		this.bombas = BOMBAS_NO_COMECO
		this.mouse_mexeu = false // até mexer o mouse, o elfo mira para cima

		this.tiros = [] // { sprite, x, y, vx, vy }
		this.espera_tiro = 0
		this.espera_bomba = 0
		this.bombas_voando = [] // { sprite, x0, y0, x1, y1, ha, duracao }
		this.explosoes = [] // { sprite, ha }
		this.zumbis = [] // { sprite, x, y, vx, vy, vida, morrendo, morto_ha, xi }
		this.proximo_zumbi = 60
		this.sangues = [] // { sprite, ha }
		this.coracoes = [] // corações caindo para pegar: { sprite, x, y }
		this.itens = [] // caixas de arma e de bomba: { sprite, tipo, x, y }
		this.proximo_item = 600

		this.quadro_atual = 0
		this.estado = 'jogando' // 'jogando', 'pausado' ou 'fim'

		this.criar_hud()
		this.ao_redimensionar()
		this.anunciar('NÍVEL 1')

		this.teclas = this.input.keyboard.addKeys({
			esquerda: 'LEFT',
			direita: 'RIGHT',
			acima: 'UP',
			abaixo: 'DOWN',
			a: 'A',
			d: 'D',
			w: 'W',
			s: 'S',
			espaco: 'SPACE',
			q: 'Q',
		})
		tecla_tela_cheia(this)
		tecla_som(this)
		this.input.keyboard.on('keydown-P', () => this.pausar())
		this.input.keyboard.on('keydown-ESC', () => this.pausar())

		this.input.mouse.disableContextMenu() // o botão direito joga bomba em vez de abrir o menu
		this.input.setDefaultCursor('crosshair')
		this.input.on('pointermove', () => (this.mouse_mexeu = true))

		this.tempo_acumulado = 0
	}

	criar_hud() {
		this.hud_coracoes = []
		for (let i = 0; i < VIDAS_NO_MAXIMO; i++) {
			this.hud_coracoes.push(this.add.sprite(8 + i * 11, 8, 'coracao', 0).setOrigin(0).setDepth(10))
		}
		this.hud_pontos = texto(this, 0, 8, '', 8).setOrigin(1, 0).setDepth(10)
		this.hud_nivel = texto(this, 8, 22, '', 8).setDepth(10)
		this.hud_arma = texto(this, 8, ALTURA - 24, '', 8, '#ffd34d').setDepth(10)
		this.hud_bombas = texto(this, 8, ALTURA - 12, '', 8).setDepth(10)
		// fundo escuro atrás das mensagens de pausa e fim de jogo
		this.escurecer = this.add.rectangle(0, 0, 10, ALTURA, 0x000000, 0.55).setOrigin(0).setDepth(9).setVisible(false)
		this.aviso = texto(this, 0, ALTURA / 2 - 50, '', 16, '#ffd34d').setOrigin(0.5).setDepth(10)
		this.aviso_ha = 0
		this.mensagem = texto(this, 0, ALTURA / 2 + 20, '', 8).setOrigin(0.5).setDepth(10).setLineSpacing(8)
		this.atualizar_hud()
	}

	// a janela mudou de tamanho: reposiciona o que depende da largura
	ao_redimensionar() {
		if (!this.hud_pontos) {
			return
		}
		this.chao.setSize(this.largura, ALTURA)
		this.hud_pontos.x = this.largura - 8
		this.escurecer.setSize(this.largura, ALTURA)
		this.aviso.x = this.largura / 2
		this.mensagem.x = this.largura / 2
		this.heroi_x = Phaser.Math.Clamp(this.heroi_x, 0, this.largura - 25)
	}

	atualizar_hud() {
		// mostra pelo menos 3 espaços de coração; o 4º e o 5º só aparecem quando você ganha vida extra
		this.hud_coracoes.forEach((coracao, i) => {
			coracao.setVisible(i < Math.max(VIDAS_NO_COMECO, this.vidas))
			coracao.setFrame(i < this.vidas ? 0 : 1)
		})
		this.hud_pontos.setText('PONTOS ' + String(this.pontos).padStart(6, '0'))
		this.hud_nivel.setText('NÍVEL ' + this.nivel)
		const arma = ARMAS[this.arma]
		this.hud_arma.setText(this.municao == Infinity ? arma.nome : arma.nome + ' ' + this.municao)
		this.hud_bombas.setText('BOMBAS ' + this.bombas)
	}

	// mensagem grande que some sozinha
	anunciar(mensagem, ticks = 200) {
		this.aviso.setText(mensagem).setVisible(true)
		this.aviso_ha = ticks
	}

	pausar() {
		if (this.estado == 'jogando') {
			this.estado = 'pausado'
			this.escurecer.setVisible(true)
			this.mensagem.setText('PAUSADO\n\nP PARA\nCONTINUAR')
		}
		else if (this.estado == 'pausado') {
			this.estado = 'jogando'
			this.escurecer.setVisible(false)
			this.mensagem.setText('')
		}
	}

	update(time, delta) {
		if (this.estado != 'jogando') {
			return
		}

		// se a aba ficou em segundo plano, não tenta recuperar mais que 100 ms de jogo
		this.tempo_acumulado = Math.min(this.tempo_acumulado + delta, 10 * TICK_MS)

		while (this.tempo_acumulado >= TICK_MS && this.estado == 'jogando') {
			this.tempo_acumulado -= TICK_MS
			this.entrada()
			this.processamento()
			this.saida()
		}
	}

	entrada() {
		const t = this.teclas
		const mouse = this.input.activePointer
		this.esq_on = t.esquerda.isDown || t.a.isDown
		this.dir_on = t.direita.isDown || t.d.isDown
		this.cima_on = t.acima.isDown || t.w.isDown
		this.baixo_on = t.abaixo.isDown || t.s.isDown
		this.atirar_on = t.espaco.isDown || mouse.leftButtonDown()
		this.bomba_on = t.q.isDown || mouse.rightButtonDown()

		// para onde o elfo mira: o ponto do mouse dentro do jogo
		if (this.mouse_mexeu) {
			const ponto = this.cameras.main.getWorldPoint(mouse.x, mouse.y)
			this.mira_x = ponto.x
			this.mira_y = ponto.y
		}
		else {
			this.mira_x = this.heroi_x + 12
			this.mira_y = 0
		}
	}

	processamento() {
		this.mover_heroi()
		this.mirar()
		this.atirar()
		this.jogar_bomba()
		this.criar_zumbis()
		this.criar_itens()
		this.mover_tiros()
		this.mover_bombas()
		this.mover_zumbis()
		this.mover_coracoes()
		this.mover_itens()

		this.chao.tilePositionY -= 0.3 // o chão rola para dar a impressão de que o elfo avança

		if (this.invencivel > 0) {
			this.invencivel--
		}
		if (this.aviso_ha > 0) {
			this.aviso_ha--
			if (this.aviso_ha == 0) {
				this.aviso.setVisible(false)
			}
		}
	}

	mover_heroi() {
		// o elfo anda pela parte de baixo da tela
		if (this.esq_on)
			this.heroi_x -= VELOCIDADE_HEROI
		if (this.dir_on)
			this.heroi_x += VELOCIDADE_HEROI
		if (this.cima_on)
			this.heroi_y -= VELOCIDADE_HEROI
		if (this.baixo_on)
			this.heroi_y += VELOCIDADE_HEROI
		this.heroi_x = Phaser.Math.Clamp(this.heroi_x, 0, this.largura - 25)
		this.heroi_y = Phaser.Math.Clamp(this.heroi_y, ALTURA * 0.55, ALTURA - 27)
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

		const arma = ARMAS[this.arma]
		for (let i = 0; i < arma.tiros; i++) {
			// o triplo sai em leque: um no meio e um para cada lado
			const desvio = (i - (arma.tiros - 1) / 2) * arma.abertura
			const angulo = this.angulo + desvio + (Math.random() * 2 - 1) * arma.tremida
			const vx = Math.cos(angulo) * VELOCIDADE_TIRO
			const vy = Math.sin(angulo) * VELOCIDADE_TIRO
			// sai da ponta da arma
			const x = this.mao_x + Math.cos(angulo) * 14
			const y = this.mao_y + Math.sin(angulo) * 14
			const sprite = this.add.image(x, y, 'tiro').setRotation(angulo).setDepth(4)
			this.tiros.push({ sprite, x, y, vx, vy })
		}
		this.espera_tiro = arma.espera
		this.sound.play('tiro', arma.som)

		if (this.municao != Infinity) {
			this.municao--
			if (this.municao == 0) {
				this.trocar_arma('pistola')
			}
			this.atualizar_hud()
		}
	}

	trocar_arma(arma) {
		this.arma = arma
		this.municao = ARMAS[arma].municao
		this.arma_na_mao.setFrame(ARMAS[arma].quadro)
		this.atualizar_hud()
	}

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
		this.atualizar_hud()
	}

	mover_bombas() {
		for (const bomba of this.bombas_voando) {
			bomba.ha++
			if (bomba.ha >= bomba.duracao) {
				bomba.explodiu = true
				bomba.sprite.destroy()
				this.explodir(bomba.x1, bomba.y1)
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

	explodir(x, y) {
		const sprite = this.add.sprite(x, y, 'explosao', 0).setDepth(7)
		this.explosoes.push({ sprite, ha: 0 })
		this.cameras.main.shake(150, 0.006)
		this.sound.play('explosao', { volume: 0.8 })

		for (const zumbi of this.zumbis) {
			if (zumbi.morrendo) {
				continue
			}
			const meio_x = zumbi.x + CORPO_ZUMBI.x + CORPO_ZUMBI.l / 2
			const meio_y = zumbi.y + CORPO_ZUMBI.y + CORPO_ZUMBI.a / 2
			if (Phaser.Math.Distance.Between(x, y, meio_x, meio_y) <= RAIO_DA_EXPLOSAO) {
				this.espirrar_sangue(meio_x, meio_y)
				this.ferir_zumbi(zumbi, DANO_DA_EXPLOSAO)
			}
		}
	}

	criar_zumbis() {
		this.proximo_zumbi--
		if (this.proximo_zumbi > 0) {
			return
		}

		// quanto maior o nível, mais zumbis, mais rápidos e mais resistentes
		const n = this.nivel - 1
		this.proximo_zumbi = Math.max(30, 130 - n * 12) + Phaser.Math.Between(0, 60)

		const x = Phaser.Math.Between(0, Math.floor(this.largura) - 44)
		const persegue = Math.random() < Math.min(0.7, 0.2 + n * 0.08)
		const zumbi = {
			x,
			y: -44,
			vx: persegue ? 0.12 + n * 0.02 : 0, // os que perseguem vão se ajeitando na direção do elfo
			vy: 0.3 + n * 0.05 + Math.random() * 0.12,
			vida: Math.min(5, 2 + Math.floor(n / 3)),
			morrendo: false,
			morto_ha: 0,
			xi: Phaser.Math.Between(0, 6),
		}
		zumbi.sprite = this.add.sprite(x, zumbi.y, 'zumbi', zumbi.xi).setOrigin(0).setDepth(2)
		this.zumbis.push(zumbi)
	}

	// de tempos em tempos desce uma caixa com arma ou bomba
	criar_itens() {
		this.proximo_item--
		if (this.proximo_item > 0) {
			return
		}
		this.proximo_item = Phaser.Math.Between(900, 1400)

		let sorteio = Math.random()
		let item = ITENS[0]
		for (const possivel of ITENS) {
			item = possivel
			sorteio -= possivel.chance
			if (sorteio < 0) {
				break
			}
		}
		const x = Phaser.Math.Between(8, Math.floor(this.largura) - 24)
		const sprite = this.add.sprite(x, -16, 'itens', item.quadro).setOrigin(0).setDepth(1)
		this.itens.push({ sprite, tipo: item.tipo, x, y: -16 })
	}

	mover_itens() {
		for (const item of this.itens) {
			item.y += 0.5
			if (encostou(item.x, item.y, 16, 16, this.heroi_x, this.heroi_y, 25, 25)) {
				item.pegou = true
				this.sound.play('item', { volume: 0.6 })
				if (item.tipo == 'bomba') {
					this.bombas = Math.min(BOMBAS_NO_MAXIMO, this.bombas + BOMBAS_POR_CAIXA)
					this.anunciar('+' + BOMBAS_POR_CAIXA + ' BOMBAS', 100)
				}
				else {
					this.trocar_arma(item.tipo)
					this.anunciar(ARMAS[item.tipo].nome + '!', 100)
				}
				this.atualizar_hud()
			}
			if (item.pegou || item.y > ALTURA) {
				item.sprite.destroy()
			}
		}
		this.itens = this.itens.filter((item) => !item.pegou && item.y <= ALTURA)
	}

	mover_tiros() {
		for (const tiro of this.tiros) {
			tiro.x += tiro.vx
			tiro.y += tiro.vy

			for (const zumbi of this.zumbis) {
				if (zumbi.morrendo) {
					continue
				}
				const zx = zumbi.x + CORPO_ZUMBI.x
				const zy = zumbi.y + CORPO_ZUMBI.y
				// o tiro conta como um quadradinho de 8x8 em volta do centro dele
				if (encostou(tiro.x - 4, tiro.y - 4, 8, 8, zx, zy, CORPO_ZUMBI.l, CORPO_ZUMBI.a)) {
					this.espirrar_sangue(
						Phaser.Math.Clamp(tiro.x, zx, zx + CORPO_ZUMBI.l),
						Phaser.Math.Clamp(tiro.y, zy, zy + CORPO_ZUMBI.a),
					)
					tiro.acertou = true
					this.sound.play('acerto', { volume: 0.5 })
					this.ferir_zumbi(zumbi, 1)
					break
				}
			}

			const saiu = tiro.x < -20 || tiro.x > this.largura + 20 || tiro.y < -20 || tiro.y > ALTURA + 20
			if (tiro.acertou || saiu) {
				tiro.sumiu = true
				tiro.sprite.destroy()
			}
		}
		this.tiros = this.tiros.filter((tiro) => !tiro.sumiu)
	}

	ferir_zumbi(zumbi, dano) {
		zumbi.vida -= dano
		if (zumbi.vida <= 0) {
			this.matar_zumbi(zumbi)
		}
	}

	matar_zumbi(zumbi) {
		zumbi.morrendo = true
		zumbi.morto_ha = 0
		// cada zumbi geme num tom um pouco diferente
		this.sound.play('zumbi_morre', { volume: 0.6, rate: 0.85 + Math.random() * 0.3 })
		this.pontos += 10 * this.nivel
		this.mortes_no_nivel++

		if (Math.random() < CHANCE_DE_CORACAO) {
			const x = zumbi.x + 17
			const y = zumbi.y + 18
			const sprite = this.add.sprite(x, y, 'coracao', 0).setOrigin(0).setScale(1.5).setDepth(1)
			this.coracoes.push({ sprite, x, y })
		}

		if (this.mortes_no_nivel == MORTES_POR_NIVEL) {
			this.nivel++
			this.mortes_no_nivel = 0
			this.anunciar('NÍVEL ' + this.nivel)
		}
		this.atualizar_hud()
	}

	mover_zumbis() {
		const meio_heroi = this.heroi_x + 12

		for (const zumbi of this.zumbis) {
			if (zumbi.morrendo) {
				zumbi.morto_ha++
				continue
			}

			zumbi.y += zumbi.vy
			const meio_zumbi = zumbi.x + 22
			if (meio_zumbi < meio_heroi - 2)
				zumbi.x += zumbi.vx
			else if (meio_zumbi > meio_heroi + 2)
				zumbi.x -= zumbi.vx

			const mordeu = encostou(
				zumbi.x + CORPO_ZUMBI.x, zumbi.y + CORPO_ZUMBI.y, CORPO_ZUMBI.l, CORPO_ZUMBI.a,
				this.heroi_x + 4, this.heroi_y + 2, 17, 22,
			)
			if (mordeu && this.invencivel == 0) {
				// o zumbi que mordeu se desfaz e o elfo perde uma vida
				zumbi.morrendo = true
				zumbi.morto_ha = 0
				this.perder_vida()
			}
			else if (zumbi.y > ALTURA) {
				// passou pelo elfo e fugiu pela parte de baixo: também custa uma vida
				zumbi.fugiu = true
				this.perder_vida()
			}
		}

		// a animação de morrer dura 75 ticks
		for (const zumbi of this.zumbis) {
			if (zumbi.fugiu || (zumbi.morrendo && zumbi.morto_ha >= 75)) {
				zumbi.sprite.destroy()
			}
		}
		this.zumbis = this.zumbis.filter((zumbi) => !zumbi.fugiu && !(zumbi.morrendo && zumbi.morto_ha >= 75))
	}

	mover_coracoes() {
		for (const coracao of this.coracoes) {
			coracao.y += 0.6
			if (encostou(coracao.x, coracao.y, 14, 12, this.heroi_x, this.heroi_y, 25, 25)) {
				coracao.pegou = true
				this.sound.play('item', { volume: 0.6, rate: 1.25 })
				if (this.vidas < VIDAS_NO_MAXIMO) {
					this.vidas++
				}
				else {
					this.pontos += 50 // com as vidas cheias, o coração vale pontos
				}
				this.atualizar_hud()
			}
			if (coracao.pegou || coracao.y > ALTURA) {
				coracao.sprite.destroy()
			}
		}
		this.coracoes = this.coracoes.filter((coracao) => !coracao.pegou && coracao.y <= ALTURA)
	}

	perder_vida() {
		if (this.estado != 'jogando') {
			return
		}
		this.vidas--
		this.invencivel = INVENCIVEL_DEPOIS_DE_APANHAR
		this.cameras.main.shake(200, 0.01)
		this.sound.play('perder_vida', { volume: 0.7 })
		this.atualizar_hud()
		if (this.vidas == 0) {
			this.fim_de_jogo()
		}
	}

	fim_de_jogo() {
		this.estado = 'fim'
		const novo_recorde = this.pontos > this.recorde
		if (novo_recorde) {
			this.recorde = this.pontos
			gravar_recorde(this.pontos)
		}
		this.escurecer.setVisible(true)
		this.aviso.setText('FIM DE\nJOGO').setVisible(true)
		this.aviso_ha = 0
		this.mensagem.setText(
			'PONTOS: ' + this.pontos + '\n' +
			(novo_recorde ? 'NOVO RECORDE!' : 'RECORDE: ' + this.recorde) +
			'\n\nCLIQUE OU ESPAÇO\nPARA JOGAR DE NOVO',
		)
		// espera um pouco para quem está atirando não reiniciar sem querer
		this.time.delayedCall(800, () => {
			const reiniciar = () => this.scene.restart()
			this.input.keyboard.once('keydown-SPACE', reiniciar)
			this.input.once('pointerdown', reiniciar)
		})
	}

	espirrar_sangue(x, y) {
		const sprite = this.add.sprite(x, y, 'sangue', 0).setDepth(3)
		this.sangues.push({ sprite, ha: 0 })
	}

	saida() {
		// elfo: olha para a mira; andando usa o sprite de andar, parado o de parado
		const andando = this.esq_on || this.dir_on || this.cima_on || this.baixo_on
		if (andando) {
			this.heroi.setTexture('heroi_' + this.heroi_direcao, this.heroi_xi)
			if (this.quadro_atual % 5 == 0)
				this.heroi_xi = (this.heroi_xi + 1) % 10
		}
		else {
			this.heroi.setTexture('heroi_parado_' + this.heroi_direcao)
		}
		this.heroi.setPosition(Math.round(this.heroi_x), Math.round(this.heroi_y))
		// piscando enquanto está invencível
		const visivel = this.invencivel == 0 || Math.floor(this.invencivel / 8) % 2 == 0
		this.heroi.setVisible(visivel)

		// a arma acompanha a mira; virada para a esquerda ela é espelhada para não ficar de cabeça para baixo
		this.arma_na_mao.setPosition(Math.round(this.mao_x), Math.round(this.mao_y))
		this.arma_na_mao.setRotation(this.angulo)
		this.arma_na_mao.setFlipY(Math.abs(this.angulo) > Math.PI / 2)
		this.arma_na_mao.setVisible(visivel)

		for (const tiro of this.tiros) {
			tiro.sprite.setPosition(Math.round(tiro.x), Math.round(tiro.y))
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

		for (const zumbi of this.zumbis) {
			if (!zumbi.morrendo) {
				zumbi.sprite.setFrame(zumbi.xi)
				zumbi.sprite.setPosition(Math.round(zumbi.x), Math.round(zumbi.y))
				if (this.quadro_atual % 12 == 0)
					zumbi.xi = (zumbi.xi + 1) % 7
			}
			else {
				// morrendo: um quadro a cada 15 ticks, com os pés no mesmo lugar
				zumbi.sprite.setTexture('zumbi_morre', Math.min(4, Math.floor(zumbi.morto_ha / 15)))
				zumbi.sprite.setPosition(Math.round(zumbi.x) + 22 - 30, Math.round(zumbi.y) + 44 - 71)
			}
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

		this.quadro_atual++
	}
}
