import Phaser from 'phaser'
import { ALTURA, ajustar_tela, texto, tecla_tela_cheia, tecla_som, ler_recorde, gravar_recorde, gravar_placar, renomear_no_placar } from './tela.js'
import * as R from './regras.js'
import { tocar_musica, parar_musica, tecla_musica } from './musica.js'
import { desbloquear } from './conquistas.js'

// Igual à versão do Portugol, o jogo anda em "ticks" de 10 ms e cada tick roda
// entrada() -> processamento() -> saida(). Os números de dificuldade ficam em regras.js.

// verdadeiro se o retângulo a (x, y, largura, altura) encosta no retângulo b
function encostou(ax, ay, al, aa, bx, by, bl, ba) {
	return ax < bx + bl && bx < ax + al && ay < by + ba && by < ay + aa
}

// sorteia um item de uma lista em que cada um tem um peso (chance relativa)
function sortear(lista, peso) {
	const total = lista.reduce((soma, item) => soma + peso(item), 0)
	let sorteio = Math.random() * total
	for (const item of lista) {
		sorteio -= peso(item)
		if (sorteio < 0) {
			return item
		}
	}
	return lista[lista.length - 1]
}

// o pedaço da tela que o corpo do zumbi ocupa (a imagem tem sobra transparente em volta)
function corpo(zumbi) {
	const proprio = zumbi.regra.corpo // o corvo tem um corpo próprio, sem escala
	if (proprio) {
		return { x: zumbi.x + proprio.x, y: zumbi.y + proprio.y, l: proprio.l, a: proprio.a }
	}
	const e = zumbi.escala
	return {
		x: zumbi.x + R.CORPO_ZUMBI.x * e,
		y: zumbi.y + R.CORPO_ZUMBI.y * e,
		l: R.CORPO_ZUMBI.l * e,
		a: R.CORPO_ZUMBI.a * e,
	}
}

function corpo_chefe(chefe) {
	const e = R.CHEFE.escala
	const c = R.CHEFE.corpo
	return { x: chefe.x + c.x * e, y: chefe.y + c.y * e, l: c.l * e, a: c.a * e }
}

export default class Jogo extends Phaser.Scene {
	constructor() {
		super('Jogo')
	}

	create() {
		// a cena é reaproveitada quando o jogo recomeça: esquece os objetos da partida anterior
		this.hud_pontos = null
		this.botao_bomba = null
		this.objetos_escolha = []
		this.cartas = []
		this.digitando_nome = false
		this.pode_reiniciar = false

		this.chao = this.add.tileSprite(0, 0, 10, ALTURA, 'chao').setOrigin(0)
		ajustar_tela(this)

		// sombras de todo mundo, redesenhadas a cada tick
		this.sombras = this.add.graphics().setDepth(1.5)

		this.heroi_x = this.largura / 2 - 12
		this.heroi_y = ALTURA - 50
		this.heroi_xi = 0
		this.heroi_direcao = 'cima'
		this.heroi = this.add.sprite(this.heroi_x, this.heroi_y, 'heroi_parado_cima').setOrigin(0).setDepth(5)
		// a arma gira em volta da empunhadura, que fica no pixel (3, 4) da imagem
		this.arma_na_mao = this.add.sprite(0, 0, 'armas', 0).setOrigin(3 / 16, 4 / 8).setDepth(6)
		this.clarao = this.add.circle(0, 0, 4, 0xffe680).setDepth(7).setVisible(false)
		this.clarao_ha = 0
		this.bolha = this.add.circle(0, 0, 21).setStrokeStyle(2, 0x70c8ff, 0.9).setFillStyle(0x70c8ff, 0.15).setDepth(6.5).setVisible(false)

		this.vidas = R.VIDAS_NO_COMECO
		this.vidas_max = R.VIDAS_NO_MAXIMO
		this.melhorias = {} // id da melhoria -> quantas vezes foi pega
		this.armas_usadas = new Set(['pistola']) // para a conquista Arsenal
		this.apanhou_na_fase = false // para a conquista Intocável
		this.invencivel = 0
		this.pontos = 0
		this.nivel = 1
		this.mortes_no_nivel = 0
		this.recorde = ler_recorde()
		this.combo = 0
		this.combo_ha = 0
		this.multiplicador = 1

		// números para a tela de fim de jogo
		this.stats = { mortos: 0, disparos: 0, acertos: 0, ticks: 0, melhor_combo: 0, chefes: 0 }

		this.arma = 'pistola'
		this.municao = Infinity
		this.bombas = R.BOMBAS_NO_COMECO
		this.poderes = { escudo: 0, velocidade: 0, congelar: 0 } // ticks que faltam de cada poder
		this.mouse_mexeu = false // até mexer o mouse, o elfo mira para cima
		this.andou = false // para as dicas da primeira partida
		this.ultima_direcao = { x: 1, y: 0 }
		this.esquiva_ha = 0 // ticks que faltam da esquiva
		this.esquiva_espera = 0 // ticks até poder esquivar de novo
		this.rastros = [] // { sprite, ha }

		this.tiros = [] // { sprite, x, y, vx, vy, arma, acertou: Set }
		this.espera_tiro = 0
		this.espera_bomba = 0
		this.bombas_voando = [] // { sprite, x0, y0, x1, y1, altura, ha, duracao }
		this.explosoes = [] // { sprite, ha }
		this.zumbis = [] // ver criar_zumbi()
		this.proximo_zumbi = 60
		this.proxima_revoada = Phaser.Math.Between(R.CORVOS.a_cada[0], R.CORVOS.a_cada[1])
		this.chefe = null
		this.chefe_em = 0 // ticks até o chefão entrar (0 = não tem chefão vindo)
		this.cuspes = [] // { sprite, x, y, vx, vy }
		this.sangues = [] // { sprite, ha }
		this.coracoes = [] // corações caindo para pegar: { sprite, x, y }
		this.itens = [] // caixas: { sprite, tipo, x, y }
		this.proximo_item = 500
		this.textos = [] // pontos e avisos que sobem e somem: { obj, ha }
		this.dano_ha = 0 // tela vermelha quando o elfo apanha
		this.vermelho_heroi = 0 // elfo pintado de vermelho logo depois de apanhar
		this.mortes_recentes = [] // ticks das últimas mortes, para o DUPLO! TRIPLO!
		this.manchas = [] // sangue que fica no chão: { sprite, y, ha }

		// chuva e relâmpagos quando a noite chega
		this.chuva = this.add.graphics().setDepth(8.5)
		this.gotas = []
		this.relampago = this.add.rectangle(0, 0, 10, ALTURA, 0xe8f0ff, 0).setOrigin(0).setDepth(8.6)
		this.vinheta = this.add.image(0, 0, 'vinheta').setOrigin(0).setDepth(8.4)
		this.relampago_ha = 0
		this.proximo_trovao = 900

		this.quadro_atual = 0
		this.estado = 'jogando' // 'jogando', 'pausado', 'escolhendo' (melhoria) ou 'fim'

		this.criar_hud()
		this.criar_dicas()
		this.ao_redimensionar()
		this.anunciar('FASE 1')
		this.pintar_noite()

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
			shift: 'SHIFT',
		})
		tecla_tela_cheia(this)
		tecla_som(this)
		tecla_musica(this)
		tocar_musica(this, 'musica_jogo')
		this.input.keyboard.on('keydown-P', () => this.pausar())
		this.input.keyboard.on('keydown-ESC', () => this.pausar())
		this.input.keyboard.on('keydown-T', () => {
			if (this.estado == 'pausado') {
				this.sound.resumeAll()
				this.scene.start('Titulo')
			}
		})

		// botões do controle que não são "segurar": Start pausa, e A/direcional servem nos menus
		this.mira_controle = null
		if (this.input.gamepad) {
			this.input.gamepad.on('down', (pad, botao) => this.botao_do_controle(botao.index))
		}

		this.input.mouse.disableContextMenu() // o botão direito joga bomba em vez de abrir o menu
		this.input.setDefaultCursor('crosshair')
		this.input.on('pointermove', (p) => {
			if (!p.wasTouch) this.mouse_mexeu = true
		})

		// toque (celular/tablet): os controles na tela aparecem no primeiro toque
		this.modo_toque = false
		this.toque_vx = 0
		this.toque_vy = 0
		this.input.addPointer(2)
		this.input.on('pointerdown', (p) => this.ao_tocar(p))

		// se a janela perder o foco (trocou de aba, alt+tab), pausa sozinho
		const ao_perder_foco = () => {
			if (this.estado == 'jogando') {
				this.pausar()
			}
		}
		this.game.events.on(Phaser.Core.Events.BLUR, ao_perder_foco)
		this.events.once('shutdown', () => this.game.events.off(Phaser.Core.Events.BLUR, ao_perder_foco))

		this.tempo_acumulado = 0
	}

	// ------------------------------------------------------------------ HUD

	criar_hud() {
		this.hud_coracoes = []
		for (let i = 0; i < R.VIDAS_NO_MAXIMO + R.VIDAS_EXTRAS_MAXIMO; i++) {
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
		this.hud_poderes = texto(this, 0, ALTURA - 12, '', 8, '#9fd8ff').setOrigin(1, 0).setDepth(10)

		// barra de vida do chefão
		this.barra_fundo = this.add.rectangle(0, 40, 10, 6, 0x000000, 0.7).setOrigin(0.5, 0).setDepth(10).setVisible(false)
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
		this.aviso.x = meio
		this.mensagem.x = meio
		this.barra_fundo.x = meio
		this.barra_nome.x = meio
		const largura_barra = Math.min(200, this.largura - 40)
		this.barra_fundo.setSize(largura_barra + 2, 6)
		this.barra_vida.x = meio - largura_barra / 2
		this.largura_barra = largura_barra
		this.heroi_x = Phaser.Math.Clamp(this.heroi_x, 0, this.largura - 25)
		if (this.botao_bomba) {
			this.posicionar_botoes()
		}
	}

	atualizar_hud() {
		// mostra pelo menos 3 espaços de coração; o 4º e o 5º só aparecem quando você ganha vida extra
		this.hud_coracoes.forEach((coracao, i) => {
			coracao.setVisible(i < Math.max(R.VIDAS_NO_COMECO, this.vidas))
			coracao.setFrame(i < this.vidas ? 0 : 1)
		})
		this.hud_pontos.setText('PONTOS ' + String(this.pontos).padStart(6, '0'))
		this.hud_nivel.setText('FASE ' + this.nivel)
		const em_chefe = this.chefe != null || this.chefe_em > 0
		this.hud_progresso.setSize(em_chefe ? 50 : (50 * this.mortes_no_nivel) / R.MORTES_POR_NIVEL(this.nivel), 2)
		this.hud_progresso.setFillStyle(em_chefe ? 0xd02828 : 0x9ff07a)
		const arma = R.ARMAS[this.arma]
		this.hud_arma.setText(this.municao == Infinity ? arma.nome : arma.nome + ' ' + this.municao)
		this.hud_bombas.setText('BOMBAS ' + this.bombas)
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

	// ------------------------------------------------------------------ melhorias

	// quantas vezes a melhoria foi pega (0 = não tem)
	m(id) {
		return this.melhorias[id] || 0
	}

	// pausa o jogo e mostra 3 melhorias para escolher
	oferecer_melhorias() {
		const possiveis = R.MELHORIAS.filter((mel) => this.m(mel.id) < mel.maximo)
		if (possiveis.length == 0) {
			return
		}
		const opcoes = Phaser.Utils.Array.Shuffle(possiveis.slice()).slice(0, 3)
		this.estado = 'escolhendo'
		this.opcoes = opcoes
		this.escurecer.setVisible(true)
		this.aviso.setVisible(false) // o "FASE N" aparece depois da escolha

		const objetos = []
		const largura_carta = Math.min(96, (this.largura - 24) / 3)
		const altura_carta = 120
		const meio = this.largura / 2
		const topo = ALTURA / 2 - altura_carta / 2 + 10
		objetos.push(texto(this, meio, topo - 26, 'ESCOLHA UMA MELHORIA', 16, '#c08aff').setOrigin(0.5).setDepth(12))
		opcoes.forEach((mel, i) => {
			const x = meio + (i - 1) * (largura_carta + 6)
			const carta = this.add.rectangle(x, topo, largura_carta, altura_carta, 0x1c1630, 0.95)
				.setOrigin(0.5, 0).setStrokeStyle(2, 0x7a3ab0).setDepth(11).setInteractive({ useHandCursor: true })
			carta.on('pointerover', () => this.destacar_carta(i))
			carta.on('pointerdown', () => this.escolher(i))
			const icone = this.add.sprite(x, topo + 22, 'melhorias', mel.quadro).setScale(2).setDepth(12)
			const tem = this.m(mel.id)
			const nome = texto(this, x, topo + 46, mel.nome + (tem ? ' ' + (tem + 1) : ''), 8, '#ffd34d').setOrigin(0.5, 0).setDepth(12)
			nome.setWordWrapWidth(largura_carta - 6)
			const desc = texto(this, x, topo + 66, mel.texto, 8, '#ffffff').setOrigin(0.5, 0).setDepth(12)
			desc.setWordWrapWidth(largura_carta - 8).setLineSpacing(2)
			const tecla = texto(this, x, topo + altura_carta - 7, this.modo_toque ? '' : String(i + 1), 8, '#9a8ab0').setOrigin(0.5).setDepth(12)
			objetos.push(carta, icone, nome, desc, tecla)
		})
		this.objetos_escolha = objetos
		this.cartas = objetos.filter((o) => o.type == 'Rectangle')
		this.carta_destacada = -1

		// espera um pouco antes de aceitar: quem está segurando o botão de atirar não escolhe sem querer
		this.pode_escolher = false
		this.time.delayedCall(700, () => (this.pode_escolher = true))
		this.input.keyboard.once('keydown-ONE', () => this.escolher(0))
		this.input.keyboard.once('keydown-TWO', () => this.escolher(1))
		this.input.keyboard.once('keydown-THREE', () => this.escolher(2))
		this.sound.play('poder', { volume: 0.5, rate: 0.7 })
	}

	// a carta destacada fica com a borda amarela (mouse em cima ou direcional do controle)
	destacar_carta(i) {
		this.carta_destacada = i
		this.cartas.forEach((carta, j) => carta.setStrokeStyle(2, j == i ? 0xffd34d : 0x7a3ab0))
	}

	escolher(i) {
		if (this.estado != 'escolhendo' || !this.pode_escolher || !this.opcoes[i]) {
			return
		}
		const mel = this.opcoes[i]
		this.melhorias[mel.id] = this.m(mel.id) + 1
		if (Object.values(this.melhorias).reduce((a, b) => a + b, 0) >= 6) desbloquear(this, 'colecao')
		this.aplicar_melhoria(mel.id)
		for (const objeto of this.objetos_escolha) {
			objeto.destroy()
		}
		this.objetos_escolha = []
		this.input.keyboard.removeAllListeners('keydown-ONE')
		this.input.keyboard.removeAllListeners('keydown-TWO')
		this.input.keyboard.removeAllListeners('keydown-THREE')
		this.escurecer.setVisible(false)
		this.estado = 'jogando'
		this.tempo_acumulado = 0
		this.sound.play('item', { volume: 0.6, rate: 0.8 })
		this.flutuar(this.heroi_x + 12, this.heroi_y - 8, mel.nome + '!', '#c08aff')
		this.anunciar(this.texto_da_fase || 'FASE ' + this.nivel, 250)
		this.atualizar_hud_melhorias()
		this.atualizar_hud()
	}

	// o que muda na hora em que a melhoria é escolhida (o resto é conferido durante o jogo com this.m())
	aplicar_melhoria(id) {
		if (id == 'vida_max') {
			this.vidas_max++
			this.vidas = Math.min(this.vidas_max, this.vidas + 1)
		}
		else if (id == 'mochila') {
			this.bombas = Math.min(this.bombas_max(), this.bombas + 3)
		}
		else if (id == 'anjo') {
			this.poderes.escudo = Math.max(this.poderes.escudo, 500)
		}
	}

	bombas_max() {
		return R.BOMBAS_NO_MAXIMO + 3 * this.m('mochila')
	}

	atualizar_hud_melhorias() {
		for (const objeto of this.hud_melhorias) {
			objeto.destroy()
		}
		this.hud_melhorias = []
		let x = 8
		for (const mel of R.MELHORIAS) {
			const n = this.m(mel.id)
			if (n == 0) {
				continue
			}
			this.hud_melhorias.push(this.add.sprite(x, 37, 'melhorias', mel.quadro).setOrigin(0).setScale(0.75).setDepth(10))
			if (n > 1) {
				this.hud_melhorias.push(texto(this, x + 11, 45, String(n), 8, '#ffffff').setDepth(10))
			}
			x += 14
		}
	}

	// mensagem grande que some sozinha
	anunciar(mensagem, ticks = 200, cor = '#ffd34d') {
		this.aviso.setText(mensagem).setColor(cor).setVisible(true).setY(ALTURA / 2 - 60)
		this.aviso_ha = ticks
	}

	// texto pequeno que sobe e some (pontos, avisos rápidos)
	flutuar(x, y, mensagem, cor = '#ffffff') {
		const obj = texto(this, x, y, mensagem, 8, cor).setOrigin(0.5).setDepth(9.5)
		this.textos.push({ obj, ha: 0 })
	}

	// em cada cenário o chão vai escurecendo conforme as fases passam, como se a noite chegasse
	pintar_noite() {
		const cenario = this.cenario()
		const t = Math.min(1, (this.nivel - cenario.a_partir_da_fase) / 9)
		const dia = Phaser.Display.Color.ValueToColor(0xffffff)
		const noite = Phaser.Display.Color.ValueToColor(0x6a72a8)
		const c = Phaser.Display.Color.Interpolate.ColorWithColor(dia, noite, 100, t * 100)
		this.chao.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b))
		if (this.vinheta) {
			this.vinheta.setAlpha(0.35 + 0.5 * t)
		}
	}

	// o cenário da fase atual (cemitério, pântano...)
	cenario() {
		let atual = R.CENARIOS[0]
		for (const c of R.CENARIOS) {
			if (this.nivel >= c.a_partir_da_fase) atual = c
		}
		return atual
	}

	// troca o chão aos poucos: o novo aparece por cima do velho e o velho some
	trocar_cenario(cenario) {
		const velho = this.chao
		const novo = this.add.tileSprite(0, 0, this.largura, ALTURA, cenario.textura).setOrigin(0).setDepth(0.1).setAlpha(0)
		novo.tilePositionY = velho.tilePositionY
		this.chao = novo
		this.pintar_noite()
		this.tweens.add({
			targets: novo,
			alpha: 1,
			duration: 2500,
			onComplete: () => {
				velho.destroy()
				novo.setDepth(0)
			},
		})
		// o velho continua rolando junto até sumir
		this.chao_velho = velho
	}

	pausar() {
		if (this.estado == 'jogando') {
			this.estado = 'pausado'
			this.escurecer.setVisible(true)
			this.mensagem.setText(this.modo_toque ? 'PAUSADO\n\nTOQUE PARA CONTINUAR' : 'PAUSADO\n\nP OU ESC: CONTINUAR\nT: SAIR PARA O MENU')
			this.sound.pauseAll()
		}
		else if (this.estado == 'pausado') {
			this.estado = 'jogando'
			this.escurecer.setVisible(false)
			this.mensagem.setText('')
			this.sound.resumeAll()
		}
	}

	// ------------------------------------------------------------------ laço do jogo

	update(time, delta) {
		if (this.estado != 'jogando') {
			return
		}

		// se a aba ficou em segundo plano, não tenta recuperar mais que 100 ms de jogo
		this.tempo_acumulado = Math.min(this.tempo_acumulado + delta, 10 * R.TICK_MS)

		while (this.tempo_acumulado >= R.TICK_MS && this.estado == 'jogando') {
			this.tempo_acumulado -= R.TICK_MS
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
		this.atirar_on = t.espaco.isDown || (mouse.leftButtonDown() && !mouse.wasTouch)
		this.bomba_on = t.q.isDown || (mouse.rightButtonDown() && !mouse.wasTouch)
		this.esquiva_on = t.shift.isDown
		this.toque_vx = 0
		this.toque_vy = 0

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

		if (this.modo_toque) {
			this.ler_toque()
		}
		const controle = this.input.gamepad && this.input.gamepad.total ? this.input.gamepad.getPad(0) : null
		if (controle) {
			this.ler_controle(controle)
		}
	}

	// controle de videogame, estilo "dois analógicos": o esquerdo anda e o direito mira e atira
	ler_controle(pad) {
		const zona_morta = 0.22
		let vx = Math.abs(pad.leftStick.x) > zona_morta ? pad.leftStick.x : (pad.right ? 1 : 0) - (pad.left ? 1 : 0)
		let vy = Math.abs(pad.leftStick.y) > zona_morta ? pad.leftStick.y : (pad.down ? 1 : 0) - (pad.up ? 1 : 0)
		if (vx || vy) {
			this.toque_vx = Phaser.Math.Clamp(vx, -1, 1)
			this.toque_vy = Phaser.Math.Clamp(vy, -1, 1)
			this.esq_on = vx < -0.3
			this.dir_on = vx > 0.3
			this.cima_on = vy < -0.3
			this.baixo_on = vy > 0.3
		}
		const rx = pad.rightStick.x
		const ry = pad.rightStick.y
		if (Math.hypot(rx, ry) > 0.35) {
			this.mira_controle = { x: rx, y: ry }
			this.atirar_on = true
		}
		if (this.mira_controle) {
			// guarda a última direção do analógico direito
			this.mira_x = this.heroi_x + 12 + this.mira_controle.x * 120
			this.mira_y = this.heroi_y + 15 + this.mira_controle.y * 120
		}
		if (pad.R2 > 0.3 || pad.R1 || pad.A) this.atirar_on = true
		if (pad.L2 > 0.3 || pad.L1 || pad.X) this.bomba_on = true
		if (pad.B) this.esquiva_on = true
	}

	// índices padrão: 0 = A, 9 = Start, 14 = esquerda, 15 = direita no direcional
	botao_do_controle(indice) {
		if (indice == 9 && (this.estado == 'jogando' || this.estado == 'pausado')) {
			this.pausar()
		}
		else if (this.estado == 'pausado' && indice == 0) {
			this.pausar()
		}
		else if (this.estado == 'escolhendo') {
			if (indice == 14 || indice == 15) {
				this.destacar_carta((this.carta_destacada + (indice == 15 ? 1 : this.opcoes.length - 1)) % this.opcoes.length)
			}
			else if (indice == 0) {
				this.escolher(this.carta_destacada)
			}
		}
		else if (this.estado == 'fim' && this.pode_reiniciar && (indice == 0 || indice == 9)) {
			this.scene.restart()
		}
	}

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
		this.input.setDefaultCursor('default')
		const fundo = (raio) => this.add.circle(0, 0, raio, 0x000000, 0.35).setStrokeStyle(1, 0xffffff, 0.5).setDepth(11)
		this.joystick_base = fundo(24).setVisible(false)
		this.joystick_botao = this.add.circle(0, 0, 10, 0xffffff, 0.45).setDepth(11).setVisible(false)
		this.botao_bomba = fundo(16)
		this.icone_bomba = this.add.image(0, 0, 'bomba').setScale(1.4).setDepth(11)
		this.botao_esquiva = fundo(14)
		this.icone_esquiva = texto(this, 0, 0, '>>', 8).setOrigin(0.5).setDepth(11)
		this.botao_pausa = fundo(11)
		this.icone_pausa = texto(this, 0, 0, 'II', 8).setOrigin(0.5).setDepth(11)
		this.posicionar_botoes()
	}

	posicionar_botoes() {
		this.botao_bomba.setPosition(this.largura - 24, ALTURA - 58)
		this.icone_bomba.setPosition(this.largura - 24, ALTURA - 58)
		this.botao_esquiva.setPosition(this.largura - 58, ALTURA - 36)
		this.icone_esquiva.setPosition(this.largura - 58, ALTURA - 36)
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
	inimigo_mais_perto() {
		let melhor = null
		let menor = Infinity
		const considerar = (x, y) => {
			if (y < 0) return
			const d = Phaser.Math.Distance.Between(this.heroi_x + 12, this.heroi_y + 12, x, y)
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
		if (this.chefe && this.chefe.fase != 'morrendo') {
			const c = corpo_chefe(this.chefe)
			considerar(c.x + c.l / 2, c.y + c.a / 2)
		}
		return melhor
	}

	processamento() {
		this.stats.ticks++
		this.mover_heroi()
		this.mirar()
		this.atirar()
		this.jogar_bomba()
		this.criar_zumbis()
		this.chamar_chefe()
		this.criar_revoada()
		this.criar_itens()
		this.mover_tiros()
		this.mover_cuspes()
		this.mover_bombas()
		this.mover_zumbis()
		this.mover_chefe()
		this.mover_coracoes()
		this.mover_itens()
		this.mover_manchas()
		this.mover_chuva()
		this.mostrar_dicas()
		this.contar_tempos()

		this.chao.tilePositionY -= R.ROLAGEM_DO_CHAO // o chão rola para dar a impressão de que o elfo avança
		if (this.chao_velho && this.chao_velho.active) {
			this.chao_velho.tilePositionY -= R.ROLAGEM_DO_CHAO
		}
	}

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
		const fase_no_cenario = this.nivel - cenario.a_partir_da_fase + 1
		const brasas = cenario.clima == 'brasas'
		let quantas = 0
		if (brasas) {
			quantas = 50
		}
		else if (fase_no_cenario >= R.FASE_DA_CHUVA) {
			quantas = Math.min(140, 40 + (fase_no_cenario - R.FASE_DA_CHUVA) * 15)
		}
		while (this.gotas.length < quantas) {
			this.gotas.push({ x: Math.random() * (this.largura + 60), y: Math.random() * ALTURA, v: 5 + Math.random() * 3 })
		}
		this.gotas.length = Math.min(this.gotas.length, quantas)
		this.clima = brasas ? 'brasas' : 'chuva'
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
		if (quantas > 0 && !brasas) {
			this.proximo_trovao--
			if (this.proximo_trovao <= 0) {
				this.proximo_trovao = Phaser.Math.Between(1200, 2600)
				this.relampago_ha = 40
				this.sound.play('trovao', { volume: 0.55 })
			}
		}
	}

	contar_tempos() {
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

	// ------------------------------------------------------------------ elfo

	mover_heroi() {
		// o elfo anda pela parte de baixo da tela
		const v = (this.poderes.velocidade > 0 ? R.VELOCIDADE_HEROI_RAPIDO : R.VELOCIDADE_HEROI) * (1 + 0.12 * this.m('velocidade'))
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
			this.sound.play('arremesso', { volume: 0.5, rate: 1.6 })
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
		for (let i = 0; i < arma.tiros; i++) {
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
				this.tiros.push({
					sprite, x, y, vx, vy, arma,
					dano: arma.dano + this.m('dano'),
					// quantos zumbis ainda pode atravessar
					perfura: arma.atravessa ? Infinity : this.m('perfura'),
					acertou: new Set(),
				})
				this.stats.disparos++
			}
		}
		this.espera_tiro = Math.round(arma.espera * Math.pow(0.85, this.m('cadencia')))
		this.sound.play(arma.som.chave, arma.som)

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

	trocar_arma(arma) {
		this.arma = arma
		this.armas_usadas.add(arma)
		if (this.armas_usadas.size >= Object.keys(R.ARMAS).length) desbloquear(this, 'arsenal')
		// o Cinto de Balas aumenta a munição das armas especiais
		this.municao = Math.round(R.ARMAS[arma].municao * (1 + 0.5 * this.m('cinto')))
		this.arma_na_mao.setFrame(R.ARMAS[arma].quadro)
		this.atualizar_hud()
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
			this.sound.play('escudo_quebra', { volume: 0.7 })
			return
		}
		this.perder_vida()
	}

	perder_vida() {
		if (this.estado != 'jogando') {
			return
		}
		this.vidas--
		this.apanhou_na_fase = true
		this.vermelho_heroi = 20 // o elfo fica vermelho por um instante
		if (navigator.vibrate) {
			navigator.vibrate(this.vidas == 0 ? [80, 60, 200] : 120)
		}
		this.invencivel = R.INVENCIVEL_DEPOIS_DE_APANHAR
		this.dano_ha = 30
		this.combo = 0
		this.combo_ha = 0
		this.multiplicador = 1
		this.cameras.main.shake(200, 0.01)
		this.sound.play('perder_vida', { volume: 0.7 })
		this.atualizar_hud()
		if (this.vidas == 0) {
			this.fim_de_jogo()
		}
	}

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
		this.sound.play('arremesso', { volume: 0.5 })
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
	explodir(x, y, raio, dano, com_som = true, fere_heroi = false) {
		const sprite = this.add.sprite(x, y, 'explosao', 0).setDepth(7).setScale(raio / R.RAIO_DA_EXPLOSAO)
		this.explosoes.push({ sprite, ha: 0 })
		this.cameras.main.shake(150, 0.004 + raio / 10000)
		if (com_som) {
			this.sound.play('explosao', { volume: 0.8, rate: raio < R.RAIO_DA_EXPLOSAO ? 1.25 : 1 })
		}
		if (fere_heroi && Phaser.Math.Distance.Between(x, y, this.heroi_x + 12, this.heroi_y + 12) < raio * 0.8) {
			this.levar_dano()
		}
		const mortos_antes = this.stats.mortos

		for (const zumbi of this.zumbis) {
			if (zumbi.morrendo || dano == 0) {
				continue
			}
			const c = corpo(zumbi)
			if (Phaser.Math.Distance.Between(x, y, c.x + c.l / 2, c.y + c.a / 2) <= raio + c.l / 4) {
				this.espirrar_sangue(c.x + c.l / 2, c.y + c.a / 2)
				this.ferir_zumbi(zumbi, dano, 6)
			}
		}
		if (this.stats.mortos - mortos_antes >= 5) {
			desbloquear(this, 'bomba5')
		}
		if (this.chefe && this.chefe.fase != 'morrendo') {
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

	// ------------------------------------------------------------------ tiros

	mover_tiros() {
		for (const tiro of this.tiros) {
			tiro.x += tiro.vx
			tiro.y += tiro.vy
			// o foguete pisca a chama
			if (tiro.arma.projetil == 'foguete') {
				tiro.sprite.setFrame(Math.floor(this.quadro_atual / 4) % 2)
			}

			for (const zumbi of this.zumbis) {
				// fantasma transparente: o tiro passa direto
				if (zumbi.morrendo || zumbi.intangivel || tiro.acertou.has(zumbi)) {
					continue
				}
				const c = corpo(zumbi)
				// o tiro conta como um quadradinho de 8x8 em volta do centro dele
				if (encostou(tiro.x - 4, tiro.y - 4, 8, 8, c.x, c.y, c.l, c.a)) {
					this.acertar(tiro, Phaser.Math.Clamp(tiro.x, c.x, c.x + c.l), Phaser.Math.Clamp(tiro.y, c.y, c.y + c.a))
					this.ferir_zumbi(zumbi, tiro.dano, tiro.arma.empurra)
					tiro.acertou.add(zumbi)
					if (tiro.sumiu) {
						break
					}
				}
			}

			if (!tiro.sumiu && this.chefe && this.chefe.fase != 'morrendo' && !tiro.acertou.has(this.chefe)) {
				const c = corpo_chefe(this.chefe)
				if (encostou(tiro.x - 4, tiro.y - 4, 8, 8, c.x, c.y, c.l, c.a)) {
					this.acertar(tiro, tiro.x, tiro.y)
					this.ferir_chefe(tiro.dano, tiro.x, tiro.y)
					tiro.acertou.add(this.chefe)
				}
			}

			const saiu = tiro.x < -20 || tiro.x > this.largura + 20 || tiro.y < -20 || tiro.y > ALTURA + 20
			if (saiu) {
				tiro.sumiu = true
			}
			if (tiro.sumiu) {
				tiro.sprite.destroy()
			}
		}
		this.tiros = this.tiros.filter((tiro) => !tiro.sumiu)
	}

	// o tiro bateu em alguém em (x, y): sangue, som e, conforme a arma, some ou explode
	acertar(tiro, x, y) {
		if (tiro.acertou.size == 0) {
			this.stats.acertos++
		}
		this.espirrar_sangue(x, y)
		this.sound.play('acerto', { volume: 0.5 })
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

	// ------------------------------------------------------------------ zumbis

	criar_zumbis() {
		// enquanto o chefão está na tela (ou chegando), só ele manda zumbis
		if (this.chefe || this.chefe_em > 0) {
			return
		}
		this.proximo_zumbi--
		if (this.proximo_zumbi > 0) {
			return
		}

		// quanto maior o nível, mais zumbis e mais rápidos
		const n = this.nivel - 1
		this.proximo_zumbi = Math.max(35, 140 - n * 8) + Phaser.Math.Between(0, 60)

		// às vezes vem uma fileira de zumbis juntos
		if (this.nivel >= 3 && Math.random() < 0.12) {
			const quantos = Phaser.Math.Between(3, 5)
			const espaco = Math.min(50, (this.largura - 44) / quantos)
			const inicio = Phaser.Math.Between(0, Math.max(0, Math.floor(this.largura - 44 - espaco * (quantos - 1))))
			for (let i = 0; i < quantos; i++) {
				this.criar_zumbi('comum', inicio + i * espaco, -44 - (i % 2) * 20)
			}
			this.proximo_zumbi += 80
			return
		}

		const tipos = Object.keys(R.ZUMBIS)
		const tipo = sortear(tipos, (t) => R.ZUMBIS[t].peso(this.nivel))
		const tamanho = 44 * R.ZUMBIS[tipo].escala
		this.criar_zumbi(tipo, Phaser.Math.Between(0, Math.max(0, Math.floor(this.largura - tamanho))), -tamanho)
	}

	criar_zumbi(tipo, x, y) {
		const regra = R.ZUMBIS[tipo]
		const n = this.nivel - 1
		const persegue = Math.random() < Math.min(0.7, 0.2 + n * 0.08)
		const zumbi = {
			tipo,
			regra,
			escala: regra.escala,
			x,
			y,
			vx: persegue ? 0.12 + n * 0.02 : 0, // os que perseguem vão se ajeitando na direção do elfo
			vy: regra.vy * (1 + n * R.ACELERACAO_POR_NIVEL) * (0.9 + Math.random() * 0.25),
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
		zumbi.sprite = this.add.sprite(x, y, 'zumbi', zumbi.xi).setOrigin(0).setScale(regra.escala).setDepth(2)
		if (regra.cor) {
			zumbi.sprite.setTint(regra.cor)
		}
		this.zumbis.push(zumbi)
		return zumbi
	}

	ferir_zumbi(zumbi, dano, empurra = 0) {
		zumbi.vida -= dano
		zumbi.flash = 5
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
		// cada zumbi geme num tom um pouco diferente (os grandes mais grave)
		this.sound.play('zumbi_morre', { volume: 0.6, rate: (0.85 + Math.random() * 0.3) / zumbi.escala })

		// combo: mortes emendadas multiplicam os pontos
		this.combo = this.combo_ha > 0 ? this.combo + 1 : 1
		this.combo_ha = R.COMBO_TEMPO
		const antes = this.multiplicador
		this.multiplicador = Math.min(R.COMBO_MAXIMO, 1 + Math.floor((this.combo - 1) / 4))
		if (this.multiplicador > antes) {
			this.sound.play('combo', { volume: 0.5, rate: 0.8 + this.multiplicador * 0.15 })
		}
		this.stats.melhor_combo = Math.max(this.stats.melhor_combo, this.combo)
		desbloquear(this, 'primeiro')
		if (this.stats.mortos >= 100) desbloquear(this, 'cem')
		if (this.combo >= 20) desbloquear(this, 'combo20')

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
		const ganho = zumbi.regra.pontos * this.nivel * this.multiplicador
		this.pontos += ganho
		if (this.pontos >= 50000) desbloquear(this, 'rico')
		const c = corpo(zumbi)
		this.flutuar(c.x + c.l / 2, c.y, '+' + ganho, this.multiplicador > 1 ? '#ff9a3c' : '#ffffff')
		if (zumbi.regra.voa) {
			zumbi.morto_ha = 75 // o corvo some na hora (sem a animação do zumbi caindo)
		}
		else if (!zumbi.regra.fantasma) {
			this.deixar_mancha(c.x + c.l / 2, c.y + c.a - 2)
		}

		const sorte = 1 + this.m('sorte')
		if (Math.random() < R.CHANCE_DE_CORACAO * sorte) {
			this.soltar_coracao(c.x + c.l / 2 - 7, c.y + c.a / 2)
		}
		else if (Math.random() < R.CHANCE_DE_ITEM * sorte) {
			this.soltar_item(c.x + c.l / 2 - 8, c.y + c.a / 2)
		}

		// em nível de chefão as mortes não contam para subir de nível
		if (this.chefe == null && this.chefe_em == 0) {
			this.mortes_no_nivel++
			if (this.mortes_no_nivel >= R.MORTES_POR_NIVEL(this.nivel)) {
				this.subir_nivel()
			}
		}
		this.atualizar_hud()
	}

	subir_nivel(venceu_chefe = false) {
		const cenario_antes = this.cenario()
		if (!this.apanhou_na_fase && this.nivel >= 3) desbloquear(this, 'intocavel')
		this.apanhou_na_fase = false
		this.nivel++
		if (this.nivel >= 10) desbloquear(this, 'fase10')
		if (this.nivel >= 20) desbloquear(this, 'fase20')
		this.mortes_no_nivel = 0
		const cenario = this.cenario()
		if (this.chao.texture.key != cenario.textura) {
			this.trocar_cenario(cenario)
		}
		this.pintar_noite()
		if (this.m('anjo')) {
			this.poderes.escudo = Math.max(this.poderes.escudo, 500)
		}
		if (this.nivel % R.NIVEIS_ENTRE_CHEFOES == 0) {
			this.chefe_em = 300
			this.anunciar('ZUMBI REI!', 300, '#ff5a5a')
		}
		else {
			this.texto_da_fase = cenario != cenario_antes ? cenario.nome + '\nFASE ' + this.nivel : 'FASE ' + this.nivel
			this.anunciar(this.texto_da_fase, cenario != cenario_antes ? 300 : 200)
			this.sound.play('fase', { volume: 0.6 })
			// a cada 2 fases, e sempre depois de vencer um chefão, escolhe uma melhoria
			if (venceu_chefe || this.nivel % 2 == 0) {
				this.oferecer_melhorias()
			}
		}
		this.atualizar_hud()
	}

	mover_zumbis() {
		const meio_heroi = this.heroi_x + 12

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

			if (zumbi.regra.voa) {
				this.voar(zumbi)
				continue
			}

			if (zumbi.regra.fantasma) {
				zumbi.ciclo = (zumbi.ciclo + 1) % 320
				const estava = zumbi.intangivel
				zumbi.intangivel = zumbi.ciclo >= 200
				if (zumbi.intangivel && !estava && zumbi.y > 0) {
					this.sound.play('fantasma', { volume: 0.25, rate: 0.9 + Math.random() * 0.2 })
				}
			}

			if (zumbi.parar_em == null || zumbi.y < zumbi.parar_em) {
				zumbi.y += zumbi.vy
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
			if (meio_zumbi < meio_heroi - 2)
				zumbi.x += zumbi.vx
			else if (meio_zumbi > meio_heroi + 2)
				zumbi.x -= zumbi.vx

			const c = corpo(zumbi)
			const mordeu = encostou(c.x, c.y, c.l, c.a, this.heroi_x + 4, this.heroi_y + 2, 17, 22)
			if (mordeu && !this.intocavel) {
				// o zumbi que mordeu se desfaz (o brutamontes aguenta e continua)
				if (zumbi.tipo != 'brutamontes') {
					zumbi.morrendo = true
					zumbi.morto_ha = 0
				}
				this.levar_dano()
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
		const quantos = Phaser.Math.Between(R.CORVOS.quantos[0], R.CORVOS.quantos[1])
		for (let i = 0; i < quantos; i++) {
			const x = da_esquerda ? -20 - i * 18 : this.largura + 4 + i * 18
			const corvo = this.criar_zumbi('corvo', x, 10 + i * 12 + Math.random() * 30)
			corvo.vx = (da_esquerda ? 1 : -1) * R.CORVOS.velocidade * (0.9 + Math.random() * 0.2)
			corvo.vy = 0.5 + Math.random() * 0.25
			corvo.voo = Math.random() * 100
		}
		this.sound.play('fantasma', { volume: 0.2, rate: 1.8 }) // grasnado
	}

	voar(corvo) {
		corvo.voo++
		corvo.x += corvo.vx
		corvo.y += corvo.vy + Math.sin(corvo.voo / 12) * 0.6 // voo ondulado
		const c = corpo(corvo)
		if (!this.intocavel && encostou(c.x, c.y, c.l, c.a, this.heroi_x + 4, this.heroi_y + 2, 17, 22)) {
			corvo.morrendo = true
			corvo.morto_ha = 75
			this.espirrar_sangue(c.x + c.l / 2, c.y + c.a / 2)
			this.levar_dano()
		}
		// saiu pelos lados ou por baixo: só vai embora (corvo não custa vida)
		if (corvo.x < -60 || corvo.x > this.largura + 60 || corvo.y > ALTURA + 20) {
			corvo.morrendo = true
			corvo.morto_ha = 75
		}
	}

	// cospe "quantos" cuspes em leque na direção do elfo
	cuspir(x, y, quantos, abertura) {
		const angulo = Math.atan2(this.heroi_y + 12 - y, this.heroi_x + 12 - x)
		for (let i = 0; i < quantos; i++) {
			const a = angulo + (i - (quantos - 1) / 2) * abertura
			const sprite = this.add.sprite(x, y, 'cuspe', 0).setDepth(4.5)
			this.cuspes.push({ sprite, x, y, vx: Math.cos(a) * R.VELOCIDADE_CUSPE, vy: Math.sin(a) * R.VELOCIDADE_CUSPE })
		}
		this.sound.play('cuspe', { volume: 0.5, rate: 0.9 + Math.random() * 0.2 })
	}

	mover_cuspes() {
		for (const cuspe of this.cuspes) {
			if (!this.congelado) {
				cuspe.x += cuspe.vx
				cuspe.y += cuspe.vy
			}
			if (encostou(cuspe.x - 3, cuspe.y - 3, 6, 6, this.heroi_x + 5, this.heroi_y + 3, 15, 20) && !this.intocavel) {
				cuspe.sumiu = true
				this.levar_dano()
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
		const vida = R.CHEFE.vida_base + R.CHEFE.vida_por_chefe * (numero - 1)
		const tamanho = 64 * R.CHEFE.escala
		const tipo = R.CHEFES[(numero - 1) % R.CHEFES.length]
		// quando os chefões voltam do começo ganham um número: O REI ZUMBI II, III...
		const volta = Math.floor((numero - 1) / R.CHEFES.length) + 1
		const romanos = ['', '', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X']
		this.chefe = {
			numero,
			nome: tipo.nome + (romanos[volta] ?? ' ' + volta),
			cor: tipo.cor,
			// do 4º chefão em diante ele usa todos os ataques
			ataques: numero > R.CHEFES.length ? ['cuspe', 'chamar', 'investida', 'chuva'] : tipo.ataques,
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
			investida: null, // { etapa: 'aviso' | 'descendo' | 'voltando', ha, alvo_x, alvo_y }
			morto_ha: 0,
		}
		this.chefe.sprite = this.add.sprite(this.chefe.x, this.chefe.y, 'chefe', 0).setOrigin(0).setScale(R.CHEFE.escala).setDepth(3)
		this.barra_nome.setText(this.chefe.nome)
		this.sound.play('rugido', { volume: 0.9 })
		tocar_musica(this, 'musica_chefe')
		this.cameras.main.shake(400, 0.008)
	}

	ferir_chefe(dano, x, y) {
		const chefe = this.chefe
		chefe.vida -= dano
		chefe.flash = 5
		this.espirrar_sangue(x, y)
		if (chefe.vida <= 0) {
			chefe.fase = 'morrendo'
			chefe.morto_ha = 0
			this.stats.chefes++
			desbloquear(this, 'chefe' + (((chefe.numero - 1) % R.CHEFES.length) + 1))
			const ganho = R.CHEFE.pontos * chefe.numero
			this.pontos += ganho
			this.flutuar(chefe.x + 64, chefe.y + 20, '+' + ganho, '#ff9a3c')
			this.sound.play('rugido', { volume: 1, rate: 0.75 })
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
				tocar_musica(this, 'musica_jogo')
				this.subir_nivel(true)
			}
			return
		}
		if (this.congelado) {
			return
		}

		const tamanho = 64 * R.CHEFE.escala
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
			const amplitude = Math.max(0, this.largura / 2 - tamanho / 2 - 10)
			chefe.x = this.largura / 2 - tamanho / 2 + Math.sin(chefe.ha / (140 - chefe.numero * 10)) * amplitude
			chefe.y = 48 + Math.sin(chefe.ha / 37) * 8
			this.atacar(chefe)
		}
		if (chefe.atacando > 0)
			chefe.atacando--

		const c = corpo_chefe(chefe)
		if (encostou(c.x, c.y, c.l, c.a, this.heroi_x + 4, this.heroi_y + 2, 17, 22)) {
			this.levar_dano()
		}
	}

	// cada ataque tem seu relógio; o chefão só usa os ataques da lista dele
	atacar(chefe) {
		const tem = (ataque) => chefe.ataques.includes(ataque)
		const c = corpo_chefe(chefe)

		chefe.espera_cuspe--
		if (tem('cuspe') && chefe.espera_cuspe <= 0) {
			const quantos = Math.min(9, 3 + chefe.numero * 2)
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
				const x = i == 0 ? this.heroi_x + 12 : Math.random() * this.largura
				const sprite = this.add.sprite(x, -10 - Math.random() * 120, 'cuspe', 0).setDepth(4.5)
				this.cuspes.push({ sprite, x, y: sprite.y, vx: 0, vy: R.VELOCIDADE_CUSPE * 1.1 })
			}
			this.sound.play('cuspe', { volume: 0.6, rate: 0.7 })
			chefe.atacando = 40
			chefe.espera_chuva = Math.max(220, 380 - chefe.numero * 20)
		}

		chefe.espera_investida--
		if (tem('investida') && chefe.espera_investida <= 0) {
			chefe.investida = { etapa: 'aviso', ha: 0 }
			chefe.espera_investida = Math.max(300, 520 - chefe.numero * 30)
			this.sound.play('rugido', { volume: 0.7, rate: 1.3 })
		}
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
				inv.alvo_x = Phaser.Math.Clamp(this.heroi_x + 12 - tamanho / 2, 0, this.largura - tamanho)
				inv.alvo_y = ALTURA - tamanho - 10
				this.cameras.main.shake(300, 0.006)
			}
		}
		else if (inv.etapa == 'descendo') {
			const dx = inv.alvo_x - chefe.x
			const dy = inv.alvo_y - chefe.y
			const d = Math.hypot(dx, dy)
			const v = 3.5 + chefe.numero * 0.2
			if (d <= v) {
				inv.etapa = 'voltando'
				this.cameras.main.shake(200, 0.01)
			}
			else {
				chefe.x += (dx / d) * v
				chefe.y += (dy / d) * v
			}
		}
		else {
			// volta para o ponto do balanço onde estava
			const amplitude = Math.max(0, this.largura / 2 - tamanho / 2 - 10)
			const volta_x = this.largura / 2 - tamanho / 2 + Math.sin(chefe.ha / (140 - chefe.numero * 10)) * amplitude
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

	// ------------------------------------------------------------------ itens, corações e poderes

	criar_itens() {
		this.proximo_item--
		if (this.proximo_item > 0) {
			return
		}
		this.proximo_item = Phaser.Math.Between(R.ITEM_A_CADA[0], R.ITEM_A_CADA[1])
		this.soltar_item(Phaser.Math.Between(8, Math.floor(this.largura) - 24), -16)
	}

	soltar_item(x, y) {
		const possiveis = R.ITENS.filter((item) => item.nivel <= this.nivel)
		const item = sortear(possiveis, (i) => i.peso)
		const sprite = this.add.sprite(x, y, 'itens', item.quadro).setOrigin(0).setDepth(1.8)
		this.itens.push({ sprite, tipo: item.tipo, x, y })
	}

	soltar_coracao(x, y) {
		const sprite = this.add.sprite(x, y, 'coracao', 0).setOrigin(0).setScale(1.5).setDepth(1.8)
		this.coracoes.push({ sprite, x, y })
	}

	mover_itens() {
		for (const item of this.itens) {
			item.y += 0.5
			this.puxar(item, 8)
			if (encostou(item.x, item.y, 16, 16, this.heroi_x, this.heroi_y, 25, 25)) {
				item.pegou = true
				this.pegar(item.tipo)
			}
			if (item.pegou || item.y > ALTURA) {
				item.sprite.destroy()
			}
		}
		this.itens = this.itens.filter((item) => !item.pegou && item.y <= ALTURA)
	}

	// com o Ímã, caixas e corações perto do elfo vão até ele (meio = metade do tamanho do objeto)
	puxar(objeto, meio) {
		const nivel = this.m('ima')
		if (nivel == 0) {
			return
		}
		const dx = this.heroi_x + 12 - (objeto.x + meio)
		const dy = this.heroi_y + 12 - (objeto.y + meio)
		const distancia = Math.hypot(dx, dy)
		if (distancia < 50 + 40 * nivel && distancia > 1) {
			objeto.x += (dx / distancia) * 1.8
			objeto.y += (dy / distancia) * 1.8
		}
	}

	pegar(tipo) {
		this.sound.play(R.PODERES[tipo] ? 'poder' : 'item', { volume: 0.6 })
		if (tipo == 'bomba') {
			this.bombas = Math.min(this.bombas_max(), this.bombas + R.BOMBAS_POR_CAIXA)
			this.anunciar('+' + R.BOMBAS_POR_CAIXA + ' BOMBAS', 100)
		}
		else if (R.PODERES[tipo]) {
			this.poderes[tipo] = R.PODERES[tipo].duracao
			this.anunciar(R.PODERES[tipo].nome + '!', 100, '#9fd8ff')
		}
		else {
			this.trocar_arma(tipo)
			this.anunciar(R.ARMAS[tipo].nome + '!', 100)
		}
		this.atualizar_hud()
	}

	mover_coracoes() {
		for (const coracao of this.coracoes) {
			coracao.y += 0.6
			this.puxar(coracao, 7)
			if (encostou(coracao.x, coracao.y, 14, 12, this.heroi_x, this.heroi_y, 25, 25)) {
				coracao.pegou = true
				this.sound.play('item', { volume: 0.6, rate: 1.25 })
				if (this.vidas < this.vidas_max) {
					this.vidas++
				}
				else {
					this.pontos += 50 // com as vidas cheias, o coração vale pontos
					this.flutuar(coracao.x + 7, coracao.y, '+50')
				}
				this.atualizar_hud()
			}
			if (coracao.pegou || coracao.y > ALTURA) {
				coracao.sprite.destroy()
			}
		}
		this.coracoes = this.coracoes.filter((coracao) => !coracao.pegou && coracao.y <= ALTURA)
	}

	espirrar_sangue(x, y) {
		const sprite = this.add.sprite(x, y, 'sangue', 0).setDepth(3.5)
		this.sangues.push({ sprite, ha: 0 })
	}

	// ------------------------------------------------------------------ fim de jogo

	fim_de_jogo() {
		this.estado = 'fim'
		parar_musica(300)
		this.sound.play('fim', { volume: 0.7 })

		// o elfo cai: fica vermelho, tomba de lado e vai sumindo; depois aparece o placar
		this.dica_texto.setVisible(false)
		this.arma_na_mao.setVisible(false)
		this.bolha.setVisible(false)
		this.heroi.setVisible(true).setTint(0xff3030).setTintMode(Phaser.TintModes.FILL)
		this.heroi.setOrigin(0.5, 1).setPosition(this.heroi_x + 12, this.heroi_y + 25)
		for (let i = 0; i < 3; i++) {
			this.espirrar_sangue(this.heroi_x + 6 + i * 6, this.heroi_y + 8 + (i % 2) * 6)
		}
		this.deixar_mancha(this.heroi_x + 12, this.heroi_y + 24)
		this.cameras.main.shake(400, 0.012)
		this.tweens.add({ targets: this.heroi, angle: 90, duration: 500, ease: 'Bounce.Out' })
		this.tweens.add({ targets: this.heroi, alpha: 0.35, delay: 400, duration: 600 })
		this.time.delayedCall(1100, () => this.mostrar_fim())
	}

	mostrar_fim() {
		const novo_recorde = this.pontos > this.recorde
		if (novo_recorde) {
			this.recorde = this.pontos
			gravar_recorde(this.pontos)
		}
		const { posicao, id } = gravar_placar(this.pontos, this.nivel)
		const segundos = Math.floor(this.stats.ticks / 100)
		const tempo = Math.floor(segundos / 60) + ':' + String(segundos % 60).padStart(2, '0')
		const pontaria = this.stats.disparos ? Math.round((100 * this.stats.acertos) / this.stats.disparos) : 0
		if (pontaria >= 70 && this.stats.disparos >= 200) desbloquear(this, 'mira')

		this.escurecer.setVisible(true)
		this.vermelho.setFillStyle(0xff0000, 0)
		this.aviso.setText('FIM DE\nJOGO').setColor('#ffd34d').setVisible(true).setY(ALTURA / 2 - 105)
		this.aviso_ha = 0
		this.mensagem.setY(ALTURA / 2 + 25)
		this.mensagem.setText(
			'PONTOS: ' + this.pontos + '\n' +
			(novo_recorde ? 'NOVO RECORDE!' : posicao ? posicao + 'º LUGAR NO PLACAR' : 'RECORDE: ' + this.recorde) + '\n\n' +
			'FASE ' + this.nivel + '   TEMPO ' + tempo + '\n' +
			'ZUMBIS ' + this.stats.mortos + '   CHEFÕES ' + this.stats.chefes + '\n' +
			'PONTARIA ' + pontaria + '%   MAIOR COMBO ' + this.stats.melhor_combo,
		)
		this.instrucao = texto(this, this.largura / 2, ALTURA - 50, '', 8, '#cfcfcf').setOrigin(0.5).setDepth(10)

		// entrou no placar e tem teclado: pede as 3 letras do nome, como nos fliperamas
		const usa_controle = this.input.gamepad && this.input.gamepad.total > 0
		if (posicao && !this.modo_toque && !usa_controle) {
			this.pedir_nome(id)
		}
		else {
			this.liberar_reinicio()
		}
	}

	pedir_nome(id) {
		let nome = ''
		this.digitando_nome = true // enquanto isso, F, M e N viram letras em vez de atalhos
		const desenhar = () => {
			const cursor = Math.floor(this.time.now / 300) % 2 ? '_' : ' '
			this.instrucao.setText('SEU NOME: ' + (nome + cursor + '___').slice(0, 3) + '\nDIGITE 3 LETRAS E APERTE ENTER')
		}
		desenhar()
		const piscar = this.time.addEvent({ delay: 150, loop: true, callback: desenhar })
		const ao_digitar = (evento) => {
			if (evento.key == 'Enter') {
				this.input.keyboard.off('keydown', ao_digitar)
				this.digitando_nome = false
				piscar.remove()
				renomear_no_placar(id, nome || 'ELF')
				this.sound.play('item', { volume: 0.6 })
				this.liberar_reinicio()
				return
			}
			if (evento.key == 'Backspace') {
				nome = nome.slice(0, -1)
			}
			else if (/^[a-zA-Z0-9]$/.test(evento.key) && nome.length < 3) {
				nome += evento.key.toUpperCase()
				this.sound.play('combo', { volume: 0.4 })
			}
			desenhar()
		}
		// espera um pouco para não pegar a tecla que estava apertada na hora de morrer
		this.time.delayedCall(500, () => this.input.keyboard.on('keydown', ao_digitar))
	}

	liberar_reinicio() {
		this.instrucao.setText(this.modo_toque ? 'TOQUE PARA JOGAR DE NOVO' : 'CLIQUE OU ESPAÇO: JOGAR DE NOVO\nESC: MENU')
		// espera um pouco para quem está atirando não reiniciar sem querer
		this.time.delayedCall(1000, () => {
			this.pode_reiniciar = true // vale para o botão A/Start do controle
			const reiniciar = () => this.scene.restart()
			this.input.keyboard.once('keydown-SPACE', reiniciar)
			this.input.once('pointerdown', reiniciar)
			this.input.keyboard.once('keydown-ESC', () => this.scene.start('Titulo'))
		})
	}

	// ------------------------------------------------------------------ desenho

	saida() {
		this.desenhar_heroi()
		this.desenhar_zumbis()
		this.desenhar_chefe()
		this.desenhar_resto()
		this.desenhar_sombras()
		this.desenhar_clima()
		this.desenhar_hud_do_tick()
		this.quadro_atual++
	}

	desenhar_clima() {
		const g = this.chuva
		g.clear()
		if (this.gotas.length && this.clima == 'brasas') {
			for (const gota of this.gotas) {
				// pisca entre laranja e amarelo
				g.fillStyle(gota.v > 6.5 ? 0xffe080 : 0xff8a30, 0.5 + 0.4 * Math.sin((this.quadro_atual + gota.v * 40) / 10))
				g.fillRect(Math.round(gota.x), Math.round(gota.y), 1, 1)
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
		else {
			this.heroi.clearTint().setTintMode(Phaser.TintModes.MULTIPLY)
		}

		// a arma acompanha a mira; virada para a esquerda ela é espelhada para não ficar de cabeça para baixo
		this.arma_na_mao.setPosition(Math.round(this.mao_x), Math.round(this.mao_y))
		this.arma_na_mao.setRotation(this.angulo)
		this.arma_na_mao.setFlipY(Math.abs(this.angulo) > Math.PI / 2)
		this.arma_na_mao.setVisible(visivel)
		this.clarao.setVisible(this.clarao_ha > 0)

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
			this.pintar(s, zumbi.flash, zumbi.regra.cor)

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
		this.pintar(chefe.sprite, chefe.flash, avisando ? 0xff3030 : chefe.cor)

		this.barra_vida.setSize(Math.max(0, (this.largura_barra * chefe.vida) / chefe.vida_max), 4)
	}

	desenhar_resto() {
		for (const tiro of this.tiros) {
			tiro.sprite.setPosition(Math.round(tiro.x), Math.round(tiro.y))
		}
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
		g.fillEllipse(this.heroi_x + 12.5, this.heroi_y + 25, 18, 6)
		for (const zumbi of this.zumbis) {
			if (zumbi.morrendo) {
				continue
			}
			const c = corpo(zumbi)
			if (zumbi.regra.voa) {
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
