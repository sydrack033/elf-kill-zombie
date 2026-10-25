import Phaser from 'phaser'
import { ALTURA, ajustar_tela, texto, tecla_tela_cheia, tecla_som, ler_recorde, gravar_recorde, gravar_placar, renomear_no_placar, somar_estatisticas } from './tela.js'
import * as R from './regras.js'
import { tocar_musica, parar_musica, tecla_musica, atualizar_volume_musica } from './musica.js'
import { desbloquear } from './conquistas.js'
import { marcar_visto } from './Bestiario.js'
import { efeito, opcoes, gravar_opcoes } from './opcoes.js'
import { ler_loja, moedas_da_partida, ganhar_moedas } from './moedas.js'
import { conferir_desafios, dia_de_hoje, PREMIO } from './desafios.js'

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

// cor do segundo elfo (modo 2 jogadores)
const COR_P2 = 0xd0a0ff

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
	const e = chefe.escala || R.CHEFE.escala
	const c = R.CHEFE.corpo
	return { x: chefe.x + c.x * e, y: chefe.y + c.y * e, l: c.l * e, a: c.a * e }
}

// quem já jogou com toque continua com os controles na tela ao jogar de novo
let usou_toque = false

export default class Jogo extends Phaser.Scene {
	constructor() {
		super('Jogo')
	}

	create() {
		// a cena é reaproveitada quando o jogo recomeça: esquece os objetos da partida anterior
		this.hud_pontos = null
		this.botao_bomba = null
		this.botao_furia = null
		this.objetos_escolha = []
		this.menu_pausa = []
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
		// chapéu comprado na loja (só enfeite)
		const compras = ler_loja().compras
		this.chapeu = opcoes.chapeu && compras[opcoes.chapeu] ? this.add.sprite(0, 0, opcoes.chapeu).setOrigin(0.5, 1).setDepth(5.5) : null
		this.bolha = this.add.circle(0, 0, 21).setStrokeStyle(2, 0x70c8ff, 0.9).setFillStyle(0x70c8ff, 0.15).setDepth(6.5).setVisible(false)

		this.dificuldade = R.DIFICULDADES[opcoes.dificuldade] || R.DIFICULDADES.normal
		this.vidas = this.dificuldade.vidas
		const elfo = R.ELFOS.find((e) => e.id == opcoes.elfo)
		this.cor_do_elfo = elfo ? elfo.cor : null
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
		this.stats = { mortos: 0, disparos: 0, acertos: 0, ticks: 0, melhor_combo: 0, chefes: 0, por_tipo: {}, elites: 0, hordas: 0, por_explosao: 0 }

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
		this.moedas = [] // moedas caindo para pegar: { sprite, x, y }
		this.itens = [] // caixas: { sprite, tipo, x, y }
		this.lapides_quebradas = 0
		this.dia = dia_de_hoje() // os desafios valem pelo dia em que a partida começou
		this.faixas = 0
		this.moedas_extras = 0 // moedas dos zumbis de elite e das hordas, somadas no fim
		this.horda = null // { ha, zumbis } enquanto a horda está vindo
		this.pocas = [] // poças de lodo do pântano: { x, y, sprite }
		this.proxima_poca = 0
		this.quedas = [] // escombros e meteoros caindo: { x, y, ha, sombra, pedra, regra }
		this.proxima_queda = 300
		this.horda_na_fase = 0
		this.torretas = [] // torretas montadas: { x, y, base, cano, barra, ha, espera }
		this.proximo_item = 500
		this.textos = [] // pontos e avisos que sobem e somem: { obj, ha }
		this.dano_ha = 0 // tela vermelha quando o elfo apanha
		this.vermelho_heroi = 0 // elfo pintado de vermelho logo depois de apanhar
		this.parada = 0 // ticks de parada de impacto
		this.furia = 0 // barra da fúria élfica, de 0 a 1
		this.mortes_recentes = [] // ticks das últimas mortes, para o DUPLO! TRIPLO!
		this.raios = [] // raios na tela: { pontos: [[x, y]...], ha }
		this.desenho_raios = this.add.graphics().setDepth(7.5)
		this.manchas = [] // sangue que fica no chão: { sprite, y, ha }

		// chuva e relâmpagos quando a noite chega
		this.chuva = this.add.graphics().setDepth(8.5)
		this.gotas = []
		this.relampago = this.add.rectangle(0, 0, 10, ALTURA, 0xe8f0ff, 0).setOrigin(0).setDepth(8.6)
		this.vinheta = this.add.image(0, 0, 'vinheta').setOrigin(0).setDepth(8.4)
		// neblina de alguns cenários (pântano, ruínas): entra e sai devagar
		this.neblina = this.add.tileSprite(0, 0, 10, ALTURA, 'neblina').setOrigin(0).setDepth(8.3).setAlpha(0).setTileScale(2)
		// lua de sangue: a tela fica avermelhada e uma lua vermelha aparece no canto
		this.lua_de_sangue = false
		this.eclipse = false
		this.escuro = this.add.renderTexture(0, 0, 10, ALTURA).setOrigin(0).setDepth(8.37).setVisible(false)
		this.escuro_forca = 0
		this.luz = this.make.image({ key: 'luz', add: false })
		this.tom_vermelho = this.add.rectangle(0, 0, 10, ALTURA, 0xb01818, 0).setOrigin(0).setDepth(8.35)
		this.lua = this.add.circle(0, 36, 11, 0xff4a3a).setDepth(8.36).setAlpha(0)
		this.lua_brilho = this.add.circle(0, 36, 20, 0xff4a3a).setDepth(8.35).setAlpha(0)
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
			e: 'E',
		})
		tecla_tela_cheia(this)
		tecla_som(this)
		tecla_musica(this)
		tocar_musica(this, this.cenario().musica)
		this.input.keyboard.on('keydown-P', () => this.pausar())
		this.input.keyboard.on('keydown-ESC', () => this.pausar())
		// setas e WASD também mexem no menu da pausa
		const direcoes = { UP: 'cima', W: 'cima', DOWN: 'baixo', S: 'baixo', LEFT: 'esquerda', A: 'esquerda', RIGHT: 'direita', D: 'direita' }
		for (const tecla in direcoes) {
			this.input.keyboard.on('keydown-' + tecla, () => this.tecla_no_menu(direcoes[tecla]))
		}
		this.input.keyboard.on('keydown-T', () => this.sair_para_menu())
		this.input.keyboard.on('keydown-R', () => this.reiniciar_da_pausa())

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

		// modo chefões: um chefão atrás do outro, começando com uma melhoria
		if (usou_toque) {
			this.ligar_toque()
		}

		this.aplicar_loja()

		this.modo_chefes = opcoes.modo == 'chefes'
		if (this.modo_chefes) {
			this.texto_da_fase = 'CHEFÃO A CAMINHO!'
			this.subir_nivel()
			this.oferecer_melhorias()
		}

		// modo 2 jogadores (só no computador)
		this.p2 = null
		if (opcoes.jogadores == 2 && this.sys.game.device.os.desktop) {
			this.criar_p2()
		}

		this.tempo_acumulado = 0
		this.cameras.main.fadeIn(300, 0, 0, 0)
	}

	// vantagens compradas na loja valem para o começo de toda partida
	aplicar_loja() {
		const compras = ler_loja().compras
		// os corações comprados valem mesmo quando o jogo já começa com o máximo (fácil)
		this.vidas += compras.vida || 0
		this.vidas_max = Math.max(this.vidas_max, this.vidas)
		this.bombas = Math.min(this.bombas_max(), this.bombas + (compras.bombas || 0))
		if (compras.furia) {
			this.furia = 0.5
		}
		if (compras.ima) {
			this.melhorias.ima = 1
		}
		if (compras.melhoria) {
			const possiveis = R.MELHORIAS.filter((mel) => this.m(mel.id) < mel.maximo)
			const mel = Phaser.Utils.Array.GetRandom(possiveis)
			this.melhorias[mel.id] = this.m(mel.id) + 1
			this.aplicar_melhoria(mel.id)
		}
		if (compras.arma) {
			this.trocar_arma('triplo')
		}
		this.pode_reviver = !!compras.reviver
		this.atualizar_hud_melhorias()
		this.atualizar_hud()
	}

	// ------------------------------------------------------------------ HUD

	criar_hud() {
		this.hud_coracoes = []
		for (let i = 0; i < R.VIDAS_NO_MAXIMO + R.VIDAS_EXTRAS_MAXIMO + 2; i++) { // +2 da loja
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
		// barra da fúria élfica (acima do nome da arma)
		this.hud_furia_fundo = this.add.rectangle(8, ALTURA - 32, 50, 3, 0x000000, 0.6).setOrigin(0).setDepth(10)
		this.hud_furia = this.add.rectangle(8, ALTURA - 32, 0, 3, 0xff9aff).setOrigin(0).setDepth(10)
		this.hud_furia_texto = texto(this, 62, ALTURA - 35, '', 8, '#ff9aff').setDepth(10)
		this.hud_poderes = texto(this, 0, ALTURA - 12, '', 8, '#9fd8ff').setOrigin(1, 0).setDepth(10)

		// barra de vida do chefão
		this.barra_fundo = this.add.rectangle(0, 40, 10, 6, 0x000000, 0.7).setOrigin(0.5, 0).setDepth(10).setVisible(false)
		this.barra_rastro = this.add.rectangle(0, 41, 10, 4, 0xffe080).setOrigin(0, 0).setDepth(10).setVisible(false)
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
		this.neblina.setSize(this.largura, ALTURA)
		this.escuro.resize(Math.ceil(this.largura), ALTURA)
		this.tom_vermelho.setSize(this.largura, ALTURA)
		this.lua.x = this.lua_brilho.x = Math.round(this.largura * 0.72)
		this.aviso.x = meio
		this.mensagem.x = meio
		this.barra_fundo.x = meio
		this.barra_nome.x = meio
		const largura_barra = Math.min(200, this.largura - 40)
		this.barra_fundo.setSize(largura_barra + 2, 6)
		this.barra_vida.x = meio - largura_barra / 2
		this.barra_rastro.x = meio - largura_barra / 2
		this.largura_barra = largura_barra
		this.heroi_x = Phaser.Math.Clamp(this.heroi_x, 0, this.largura - 25)
		if (this.botao_bomba) {
			this.posicionar_botoes()
		}
	}

	atualizar_hud() {
		// mostra pelo menos 3 espaços de coração; o 4º e o 5º só aparecem quando você ganha vida extra
		this.hud_coracoes.forEach((coracao, i) => {
			coracao.setVisible(i < Math.max(this.dificuldade.vidas, this.vidas))
			coracao.setFrame(i < this.vidas ? 0 : 1)
		})
		this.hud_pontos.setText('PONTOS ' + String(this.pontos).padStart(6, '0'))
		this.hud_nivel.setText('FASE ' + this.nivel)
		const em_chefe = this.chefe != null || this.chefe_em > 0
		this.hud_progresso.setSize(em_chefe ? 50 : (50 * this.mortes_no_nivel) / R.MORTES_POR_NIVEL(this.nivel), 2)
		this.hud_progresso.setFillStyle(em_chefe ? 0xd02828 : 0x9ff07a)
		const arma = R.ARMAS[this.arma]
		this.hud_arma.setText(this.municao == Infinity ? arma.nome : arma.nome + ' ' + this.municao)
		this.hud_bombas.setText('BOMBAS ' + this.bombas + (this.moedas_extras ? '   MOEDAS ' + this.moedas_extras : ''))
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
		if (this.estado == 'fim') {
			return // a mesma explosão que matou o elfo pode ter fechado a fase
		}
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
		// .on e não .once: apertar antes da hora não pode gastar a tecla (escolher() tira os ouvintes)
		this.input.keyboard.on('keydown-ONE', () => this.escolher(0))
		this.input.keyboard.on('keydown-TWO', () => this.escolher(1))
		this.input.keyboard.on('keydown-THREE', () => this.escolher(2))
		efeito(this, 'poder', { volume: 0.5, rate: 0.7 })
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
		efeito(this, 'item', { volume: 0.6, rate: 0.8 })
		this.flutuar(this.heroi_x + 12, this.heroi_y - 8, mel.nome + '!', '#c08aff')
		this.anunciar(this.texto_da_fase || 'FASE ' + this.nivel, 250, this.lua_de_sangue ? '#ff5a5a' : '#ffd34d')
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

	// eclipse: tela escura com um buraco de luz em volta de cada elfo e das explosões
	desenhar_eclipse() {
		const alvo = this.eclipse ? R.ECLIPSE.escuridao : 0
		this.escuro_forca += (alvo - this.escuro_forca) * 0.02
		if (this.escuro_forca < 0.01) {
			this.escuro.setVisible(false)
			return
		}
		const rt = this.escuro.setVisible(true)
		rt.clear()
		rt.fill(0x000000, this.escuro_forca)
		const tremula = 1 + Math.sin(this.quadro_atual / 7) * 0.03
		for (const h of this.herois()) {
			this.luz.setScale(2.2 * tremula)
			rt.erase(this.luz, h.x + 12, h.y + 12)
		}
		for (const e of this.explosoes) {
			this.luz.setScale(1.4)
			rt.erase(this.luz, e.sprite.x, e.sprite.y)
		}
		for (const t of this.torretas) {
			this.luz.setScale(0.9)
			rt.erase(this.luz, t.x, t.y)
		}
		if (rt.render) rt.render()
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
		if (!this.chefe && this.chefe_em == 0) {
			tocar_musica(this, cenario.musica)
		}
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
			this.sound.pauseAll()
			// o aviso de fase e a dica ficam escondidos atrás do menu
			this.aviso.setAlpha(0)
			this.dica_texto.setAlpha(0)
			this.mostrar_menu_pausa()
		}
		else if (this.estado == 'pausado') {
			this.estado = 'jogando'
			this.escurecer.setVisible(false)
			this.sound.resumeAll()
			this.aviso.setAlpha(1)
			this.dica_texto.setAlpha(1)
			for (const objeto of this.menu_pausa) {
				objeto.destroy()
			}
			this.menu_pausa = []
		}
	}

	// da pausa, volta para a tela de título (a partida é abandonada)
	sair_para_menu() {
		if (this.estado == 'pausado') {
			this.sound.resumeAll()
			this.scene.start('Titulo')
		}
	}

	// da pausa, começa uma partida nova do zero
	reiniciar_da_pausa() {
		if (this.estado == 'pausado') {
			this.sound.resumeAll()
			this.scene.restart()
		}
	}

	// a tela só treme se o jogador não desligou isso nas opções
	tremer(duracao, intensidade) {
		if (opcoes.tremor) {
			this.cameras.main.shake(duracao, intensidade)
		}
	}

	// vibra o controle de videogame (se tiver um e se o tremor estiver ligado); forca de 0 a 1
	vibrar(forca, duracao) {
		const pad = this.input.gamepad && this.input.gamepad.pad1
		const motor = pad && pad.vibration
		if (!opcoes.tremor || !motor || !motor.playEffect) {
			return
		}
		motor.playEffect('dual-rumble', { duration: duracao, strongMagnitude: forca, weakMagnitude: Math.min(1, forca * 1.3) }).catch(() => {})
	}

	// menu da pausa: volume da música e dos efeitos (setas, mouse, toque ou controle)
	mostrar_menu_pausa() {
		const meio = this.largura / 2
		const objetos = []
		objetos.push(texto(this, meio, ALTURA / 2 - 70, 'PAUSADO', 16, '#ffd34d').setOrigin(0.5).setDepth(11))
		const faltam = R.CHEFE_FINAL.fase - this.nivel
		const caminho = faltam > 0 ? 'FASE ' + this.nivel + '   •   CHEFÃO FINAL EM ' + faltam + (faltam == 1 ? ' FASE' : ' FASES') : 'FASE ' + this.nivel + '   •   MODO INFINITO'
		objetos.push(texto(this, meio, ALTURA / 2 - 50, caminho, 8, '#9fbf8a').setOrigin(0.5).setDepth(11))
		// as melhorias pegas nesta partida, com o nome e quantas vezes
		const pegas = R.MELHORIAS.filter((mel) => this.m(mel.id) > 0)
		if (pegas.length) {
			const largura_item = Math.min(60, (this.largura - 10) / pegas.length)
			const x0 = meio - (largura_item * (pegas.length - 1)) / 2
			pegas.forEach((mel, i) => {
				const x = x0 + i * largura_item
				objetos.push(this.add.sprite(x, 66, 'melhorias', mel.quadro).setDepth(11))
				const n = this.m(mel.id)
				objetos.push(texto(this, x, 80, mel.nome + (n > 1 ? ' ' + n : ''), 8, '#c08aff').setOrigin(0.5, 0).setDepth(11)
					.setScale(Math.min(0.75, (largura_item - 2) / 60)).setWordWrapWidth(70).setLineSpacing(1))
			})
		}
		this.linhas_menu = []
		const linhas = [
			{ rotulo: 'MÚSICA', chave: 'musica' },
			{ rotulo: 'EFEITOS', chave: 'efeitos' },
			{ rotulo: 'TREMOR', chave: 'tremor', liga: true }, // liga e desliga a tela tremendo
		]
		linhas.forEach((linha, i) => {
			const y = ALTURA / 2 - 30 + i * 22
			const rotulo = texto(this, meio - 50, y, linha.rotulo, 8).setOrigin(1, 0.5).setDepth(11)
			const menos = texto(this, meio - 38, y, '<', 8).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true })
			const mais = texto(this, meio + 62, y, '>', 8).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true })
			const barras = []
			for (let b = 0; b < (linha.liga ? 0 : 10); b++) {
				barras.push(this.add.rectangle(meio - 28 + b * 9, y, 7, 6, 0xffffff).setDepth(11))
			}
			const valor = linha.liga ? texto(this, meio + 12, y, '', 8).setOrigin(0.5).setDepth(11) : null
			if (valor) objetos.push(valor)
			// stopPropagation: o toque na seta não conta como "toque para continuar"
			menos.on('pointerdown', (p, x, y2, ev) => { ev.stopPropagation(); this.mudar_volume(i, -0.1) })
			mais.on('pointerdown', (p, x, y2, ev) => { ev.stopPropagation(); this.mudar_volume(i, 0.1) })
			objetos.push(rotulo, menos, mais, ...barras)
			this.linhas_menu.push({ ...linha, rotulo, barras, valor })
		})
		const ajuda = this.modo_toque
			? 'TOQUE FORA PARA CONTINUAR'
			: 'SETAS: AJUSTAR\nP OU ESC: CONTINUAR   R: RECOMEÇAR   T: SAIR PARA O MENU'
		objetos.push(texto(this, meio, ALTURA / 2 + 50, ajuda, 8, '#cfcfcf').setOrigin(0.5, 0).setDepth(11))
		// no celular não tem tecla T: um botão para sair
		if (this.modo_toque) {
			const sair = texto(this, meio, ALTURA / 2 + 80, '[ SAIR PARA O MENU ]', 8, '#ff9a9a').setOrigin(0.5).setDepth(11)
				.setInteractive({ useHandCursor: true })
			sair.on('pointerdown', (p, x, y, ev) => { ev.stopPropagation(); this.sair_para_menu() })
			const recomecar = texto(this, meio, ALTURA / 2 + 100, '[ RECOMEÇAR ]', 8, '#ffd34d').setOrigin(0.5).setDepth(11)
				.setInteractive({ useHandCursor: true })
			recomecar.on('pointerdown', (p, x, y, ev) => { ev.stopPropagation(); this.reiniciar_da_pausa() })
			objetos.push(sair, recomecar)
		}
		this.menu_pausa = objetos
		this.linha_escolhida = 0
		this.desenhar_menu_pausa()
	}

	desenhar_menu_pausa() {
		this.linhas_menu.forEach((linha, i) => {
			const valor = Math.round(opcoes[linha.chave] * 10)
			linha.rotulo.setColor(i == this.linha_escolhida ? '#ffd34d' : '#ffffff')
			if (linha.liga) {
				linha.valor.setText(opcoes[linha.chave] ? 'LIGADO' : 'DESLIGADO').setColor(opcoes[linha.chave] ? '#9ff07a' : '#ff6a6a')
			}
			linha.barras.forEach((barra, b) => barra.setFillStyle(b < valor ? 0x9ff07a : 0x3a3a44))
		})
	}

	mudar_volume(i, quanto) {
		const linha = this.linhas_menu[i]
		this.linha_escolhida = i
		if (linha.liga) {
			opcoes[linha.chave] = !opcoes[linha.chave]
			gravar_opcoes()
			efeito(this, 'combo', { volume: 0.6 })
			this.desenhar_menu_pausa()
			return
		}
		opcoes[linha.chave] = Math.round(Phaser.Math.Clamp(opcoes[linha.chave] + quanto, 0, 1) * 10) / 10
		gravar_opcoes()
		if (linha.chave == 'musica') {
			atualizar_volume_musica()
		}
		else {
			// a pausa congela os sons; este "plim" é tocado de propósito para ouvir o volume novo
			efeito(this, 'combo', { volume: 0.6 })
		}
		this.desenhar_menu_pausa()
	}

	// setas do teclado (ou do controle) no menu da pausa
	tecla_no_menu(direcao) {
		if (this.estado != 'pausado' || !this.linhas_menu) {
			return
		}
		if (direcao == 'cima' || direcao == 'baixo') {
			this.linha_escolhida = (this.linha_escolhida + (direcao == 'baixo' ? 1 : this.linhas_menu.length - 1)) % this.linhas_menu.length
			this.desenhar_menu_pausa()
		}
		else {
			this.mudar_volume(this.linha_escolhida, direcao == 'direita' ? 0.1 : -0.1)
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
			// parada de impacto: o jogo congela por alguns ticks num golpe forte
			if (this.parada > 0) {
				this.parada--
				continue
			}
			this.entrada()
			this.processamento()
			this.saida()
		}
	}

	entrada() {
		const t = this.teclas
		const mouse = this.input.activePointer
		const controle_ligado = this.input.gamepad && this.input.gamepad.total > 0
		const setas = !this.p2 || controle_ligado // com o P2 no teclado, as setas são dele
		this.esq_on = (setas && t.esquerda.isDown) || t.a.isDown
		this.dir_on = (setas && t.direita.isDown) || t.d.isDown
		this.cima_on = (setas && t.acima.isDown) || t.w.isDown
		this.baixo_on = (setas && t.abaixo.isDown) || t.s.isDown
		// com o tiro automático das opções, atira sozinho sempre que tem zumbi na tela (a mira continua no mouse)
		this.atirar_on = t.espaco.isDown || (mouse.leftButtonDown() && !mouse.wasTouch) ||
			(opcoes.tiro_auto && this.inimigo_mais_perto() != null)
		this.bomba_on = t.q.isDown || (mouse.rightButtonDown() && !mouse.wasTouch)
		this.esquiva_on = t.shift.isDown
		this.furia_on = t.e.isDown || mouse.middleButtonDown()
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
		if (controle && !this.p2) {
			this.ler_controle(controle)
		}
		if (this.p2) {
			this.entrada_p2()
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
		if (pad.Y) this.furia_on = true
	}

	// índices padrão: 0 = A, 9 = Start, 14 = esquerda, 15 = direita no direcional
	botao_do_controle(indice) {
		if (indice == 9 && (this.estado == 'jogando' || this.estado == 'pausado')) {
			this.pausar()
		}
		else if (this.estado == 'pausado' && indice == 0) {
			this.pausar()
		}
		else if (this.estado == 'pausado' && indice == 8) {
			this.sair_para_menu() // Select / Back
		}
		else if (this.estado == 'pausado' && indice >= 12 && indice <= 15) {
			this.tecla_no_menu(['cima', 'baixo', 'esquerda', 'direita'][indice - 12])
		}
		else if (this.estado == 'escolhendo') {
			if (indice == 14 || indice == 15) {
				this.destacar_carta((this.carta_destacada + (indice == 15 ? 1 : this.opcoes.length - 1)) % this.opcoes.length)
			}
			else if (indice == 0) {
				this.escolher(this.carta_destacada)
			}
		}
		else if (this.estado == 'final' && this.botoes_do_final && (indice == 0 || indice == 1)) {
			this.botoes_do_final.sair(indice == 0)
		}
		else if (this.estado == 'fim' && this.pode_reiniciar && (indice == 0 || indice == 9)) {
			this.scene.restart()
		}
		else if (this.estado == 'fim' && this.pode_reiniciar && indice == 8) {
			this.scene.start('Titulo')
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
		usou_toque = true
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

		for (const zumbi of this.zumbis) {
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

			for (const zumbi of this.zumbis) {
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

	// ------------------------------------------------------------------ zumbis

	criar_zumbis() {
		// enquanto o chefão está na tela (ou chegando), só ele manda zumbis; na horda, só ela
		if (this.chefe || this.chefe_em > 0 || (this.horda && this.horda.ha < R.HORDA.duracao)) {
			return
		}
		this.proximo_zumbi--
		if (this.proximo_zumbi > 0) {
			return
		}

		// quanto maior o nível, mais zumbis e mais rápidos
		const n = this.nivel - 1
		this.proximo_zumbi = (Math.max(35, 140 - n * 8) + Phaser.Math.Between(0, 60)) / this.dificuldade.frequencia

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
		if (R.ZUMBIS[tipo].cava) {
			this.criar_escavador()
			return
		}
		const zumbi = this.criar_zumbi(tipo, Phaser.Math.Between(0, Math.max(0, Math.floor(this.largura - tamanho))), -tamanho)
		if (this.nivel >= R.ELITE.a_partir_da_fase && Math.random() < R.ELITE.chance) {
			this.tornar_elite(zumbi)
		}
	}

	// escombros (ruínas) e meteoros (inferno): a sombra cresce no chão e depois a coisa cai
	mover_perigos() {
		this.mover_lodo()
		const regra = R.PERIGOS[this.cenario().perigo]
		if (regra && !this.chefe && this.chefe_em == 0) {
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
			return
		}
		this.faixas = (this.faixas || 0) + 1
		const y = 70 + (this.faixas - 1) * 40
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
			},
		})
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
		zumbi.sprite = this.add.sprite(x, y, 'zumbi', zumbi.xi).setOrigin(0).setScale(regra.escala).setDepth(2)
		// os zumbis sem cor própria pegam o tom do cenário (azulados no gelo, avermelhados no inferno...)
		zumbi.cor = regra.cor || this.cenario().cor_zumbi || null
		if (zumbi.cor) {
			zumbi.sprite.setTint(zumbi.cor)
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
		if (Math.random() < R.CHANCE_DE_CORACAO * sorte) {
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
		if (this.estado == 'fim') {
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
		if (this.nivel >= 10) desbloquear(this, 'fase10')
		if (this.nivel >= 20) desbloquear(this, 'fase20')
		this.mortes_no_nivel = 0
		const fase_de_chefao = this.nivel % R.NIVEIS_ENTRE_CHEFOES == 0
		if (fase_de_chefao) {
			this.chefe_em = 300 // antes de trocar o cenário, para não tocar a música dele por 3 segundos
		}
		const cenario = this.cenario()
		if (this.chao.texture.key != cenario.textura) {
			this.trocar_cenario(cenario)
		}
		this.pintar_noite()
		if (this.m('anjo')) {
			this.poderes.escudo = Math.max(this.poderes.escudo, 500)
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
			this.anunciar((cenario != cenario_antes ? cenario.nome + '\n' : '') + 'CHEFÃO A CAMINHO!', 300, '#ff5a5a')
			// no modo chefões, cada vitória dá uma melhoria antes do próximo
			if (this.modo_chefes && venceu_chefe) {
				this.texto_da_fase = 'CHEFÃO A CAMINHO!'
				this.oferecer_melhorias()
			}
		}
		else {
			this.texto_da_fase = cenario != cenario_antes ? cenario.nome + '\nFASE ' + this.nivel : 'FASE ' + this.nivel
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
		this.atualizar_hud()
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
				if (zumbi.lapide) zumbi.lapide.destroy()
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
		const quantos = Phaser.Math.Between(R.CORVOS.quantos[0], R.CORVOS.quantos[1])
		for (let i = 0; i < quantos; i++) {
			const x = da_esquerda ? -20 - i * 18 : this.largura + 4 + i * 18
			const corvo = this.criar_zumbi('corvo', x, 10 + i * 12 + Math.random() * 30)
			corvo.vx = (da_esquerda ? 1 : -1) * R.CORVOS.velocidade * (0.9 + Math.random() * 0.2)
			corvo.vy = 0.5 + Math.random() * 0.25
			corvo.voo = Math.random() * 100
		}
		efeito(this, 'fantasma', { volume: 0.2, rate: 1.8 }) // grasnado
	}

	voar(corvo) {
		corvo.voo++
		corvo.x += corvo.vx
		corvo.y += corvo.vy + Math.sin(corvo.voo / 12) * 0.6 // voo ondulado
		const c = corpo(corvo)
		if (!this.intocavel && this.encosta_em_heroi(c.x, c.y, c.l, c.a)) {
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
		const alvo = this.heroi_mais_perto(x, y)
		const angulo = Math.atan2(alvo.y + 12 - y, alvo.x + 12 - x)
		for (let i = 0; i < quantos; i++) {
			const a = angulo + (i - (quantos - 1) / 2) * abertura
			const sprite = this.add.sprite(x, y, 'cuspe', 0).setDepth(4.5)
			const v = R.VELOCIDADE_CUSPE * this.dificuldade.velocidade
			this.cuspes.push({ sprite, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v })
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
		// na fase 50 vem o chefão final: maior, mais forte e com todos os ataques
		const final = this.nivel == R.CHEFE_FINAL.fase
		const vida = Math.round((R.CHEFE.vida_base + R.CHEFE.vida_por_chefe * (numero - 1)) * this.dificuldade.chefe * (final ? R.CHEFE_FINAL.vida : 1))
		const escala = final ? R.CHEFE_FINAL.escala : R.CHEFE.escala
		const tamanho = 64 * escala
		const tipo = final ? R.CHEFE_FINAL : R.CHEFES[(numero - 1) % R.CHEFES.length]
		marcar_visto('chefe' + (((numero - 1) % R.CHEFES.length) + 1))
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
		this.apresentar_chefe(this.chefe.nome, numero)
		efeito(this, 'rugido', { volume: 0.9 })
		tocar_musica(this, 'musica_chefe')
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
			if (!chefe.final) desbloquear(this, 'chefe' + (((chefe.numero - 1) % R.CHEFES.length) + 1))
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
				if (chefe.final) {
					this.mostrar_final()
				}
				else {
					tocar_musica(this, this.cenario().musica)
					this.subir_nivel(true)
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
			chefe.x = this.largura / 2 - tamanho / 2 + Math.sin(chefe.ha / (140 - chefe.numero * 10)) * amplitude
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
	apresentar_chefe(nome, numero) {
		const L = this.largura
		const faixa_cima = this.add.rectangle(0, 0, L, 0, 0x000000).setOrigin(0).setDepth(9.6)
		const faixa_baixo = this.add.rectangle(0, ALTURA, L, 0, 0x000000).setOrigin(0, 1).setDepth(9.6)
		const titulo = texto(this, -150, ALTURA / 2 - 10, nome, 16, '#ff5a5a').setOrigin(0.5).setDepth(9.7)
		const sub = texto(this, L + 150, ALTURA / 2 + 12, 'CHEFÃO ' + numero, 8, '#ffd34d').setOrigin(0.5).setDepth(9.7)
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
			const quem = this.herois().findIndex((h) => encostou(item.x, item.y, 16, 16, h.x, h.y, 25, 25))
			if (quem >= 0) {
				item.pegou = true
				// arma pega pelo jogador 2 fica com ele
				if (quem == 1 && R.ARMAS[item.tipo] && item.tipo != 'raio') {
					this.trocar_arma_p2(item.tipo)
					this.explicar_item(item.tipo)
					this.usou_arma(item.tipo)
					efeito(this, 'item', { volume: 0.6 })
					this.anunciar('P2: ' + R.ARMAS[item.tipo].nome + '!', 100, '#d0a0ff')
				}
				else {
					this.pegar(item.tipo)
				}
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

	// na primeira vez que pega cada tipo de caixa, explica o que ela faz
	explicar_item(tipo) {
		const item = R.ITENS.find((i) => i.tipo == tipo)
		if (!item || !item.texto) {
			return
		}
		let vistos = []
		try {
			vistos = JSON.parse(localStorage.getItem('elf-kill-zombie-itens') || '[]')
		} catch {
			// sem localStorage: explica toda vez
		}
		if (vistos.includes(tipo)) {
			return
		}
		try {
			localStorage.setItem('elf-kill-zombie-itens', JSON.stringify(vistos.concat(tipo)))
		} catch {
			// sem localStorage: não guarda
		}
		const explicacao = texto(this, this.largura / 2, ALTURA / 2 - 28, item.texto, 8, '#ffffff').setOrigin(0.5).setDepth(10)
		this.tweens.add({ targets: explicacao, alpha: 0, delay: 2600, duration: 500, onComplete: () => explicacao.destroy() })
	}

	pegar(tipo) {
		this.explicar_item(tipo)
		efeito(this, R.PODERES[tipo] ? 'poder' : 'item', { volume: 0.6 })
		if (tipo == 'torreta') {
			this.montar_torreta()
		}
		else if (tipo == 'bomba') {
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

	// monta a torreta onde o elfo está (com 2 montadas, a mais velha desmonta)
	montar_torreta() {
		if (this.torretas.length >= R.TORRETA.maximo) {
			this.desmontar_torreta(this.torretas.shift())
		}
		const x = Phaser.Math.Clamp(this.heroi_x + 12, 10, this.largura - 10)
		const y = this.heroi_y + 14
		const base = this.add.sprite(x, y, 'torreta').setDepth(2.5).setScale(1.3)
		const cano = this.add.rectangle(x, y - 4, 10, 3, 0x9aaab6).setOrigin(0, 0.5).setStrokeStyle(1, 0x141418).setDepth(2.6)
		const barra = this.add.rectangle(x - 8, y + 12, 16, 2, 0x5fbf3a).setOrigin(0, 0.5).setDepth(2.6)
		this.torretas.push({ x, y, base, cano, barra, ha: 0, espera: 0 })
		this.anunciar('TORRETA!', 100, '#9ff07a')
		efeito(this, 'torreta', { volume: 0.6 })
	}

	mover_torretas() {
		for (const t of this.torretas) {
			t.ha++
			t.espera--
			const alvo = this.inimigo_mais_perto(t.x, t.y - 4)
			if (alvo && alvo.distancia < R.TORRETA.alcance) {
				const angulo = Math.atan2(alvo.y - (t.y - 4), alvo.x - t.x)
				t.cano.setRotation(angulo)
				if (t.espera <= 0) {
					t.espera = R.TORRETA.espera
					const arma = { projetil: 'tiro', dano: R.TORRETA.dano + this.m('dano'), empurra: 1, sem_pontaria: true }
					const x = t.x + Math.cos(angulo) * 11
					const y = t.y - 4 + Math.sin(angulo) * 11
					const sprite = this.add.sprite(x, y, 'tiro', 0).setRotation(angulo).setScale(0.8).setTint(0x9ff07a).setDepth(4)
					this.tiros.push({
						sprite, x, y, arma, ha: 0,
						vx: Math.cos(angulo) * R.TORRETA.velocidade, vy: Math.sin(angulo) * R.TORRETA.velocidade,
						dano: arma.dano, perfura: 0, acertou: new Set(),
					})
					efeito(this, 'tiro', { volume: 0.2, rate: 1.6 })
				}
			}
			const resta = 1 - t.ha / R.TORRETA.duracao
			t.barra.width = 16 * Math.max(0, resta)
			// pisca quando está acabando
			const piscando = resta < 0.2 && Math.floor(t.ha / 8) % 2 == 0
			t.base.setAlpha(piscando ? 0.4 : 1)
			t.cano.setAlpha(piscando ? 0.4 : 1)
			if (t.ha >= R.TORRETA.duracao) {
				this.desmontar_torreta(t)
			}
		}
		this.torretas = this.torretas.filter((t) => t.ha < R.TORRETA.duracao)
	}

	desmontar_torreta(t) {
		t.ha = R.TORRETA.duracao
		t.base.destroy()
		t.cano.destroy()
		t.barra.destroy()
		this.flutuar(t.x, t.y - 10, 'PUF', '#cfcfcf')
	}

	mover_moedas() {
		for (const moeda of this.moedas) {
			moeda.y += 0.6
			this.puxar(moeda, 6)
			// gira (fica fina e larga de novo)
			moeda.sprite.setPosition(Math.round(moeda.x + 6), Math.round(moeda.y + 6))
			moeda.sprite.scaleX = 1.5 * Math.abs(Math.cos((this.quadro_atual + moeda.x) / 12))
			if (this.herois().some((h) => encostou(moeda.x, moeda.y, 12, 12, h.x, h.y, 25, 25))) {
				moeda.pegou = true
				this.moedas_extras++
				efeito(this, 'moeda', { volume: 0.45 })
				this.flutuar(moeda.x + 6, moeda.y, '+1', '#ffd34d')
				this.atualizar_hud()
			}
			if (moeda.pegou || moeda.y > ALTURA) {
				moeda.sprite.destroy()
			}
		}
		this.moedas = this.moedas.filter((moeda) => !moeda.pegou && moeda.y <= ALTURA)
	}

	mover_coracoes() {
		for (const coracao of this.coracoes) {
			coracao.y += 0.6
			this.puxar(coracao, 7)
			if (this.herois().some((h) => encostou(coracao.x, coracao.y, 14, 12, h.x, h.y, 25, 25))) {
				coracao.pegou = true
				efeito(this, 'item', { volume: 0.6, rate: 1.25 })
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

	// venceu o chefão final: a história termina (e dá para continuar jogando no modo infinito)
	mostrar_final() {
		this.estado = 'final'
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
				this.subir_nivel(true)
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

	// ------------------------------------------------------------------ fim de jogo

	fim_de_jogo() {
		this.estado = 'fim'
		parar_musica(300)
		efeito(this, 'fim', { volume: 0.7 })

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
		this.tremer(400, 0.012)
		this.tweens.add({ targets: this.heroi, angle: 90, duration: 500, ease: 'Bounce.Out' })
		if (this.chapeu) {
			// o chapéu voa longe
			this.chapeu.setVisible(true)
			this.tweens.add({ targets: this.chapeu, x: this.chapeu.x + 30, y: this.chapeu.y - 30, angle: 200, duration: 450, ease: 'Quad.Out' })
			this.tweens.add({ targets: this.chapeu, y: this.heroi_y + 24, delay: 450, duration: 350, ease: 'Bounce.Out' })
		}
		this.tweens.add({ targets: this.heroi, alpha: 0.35, delay: 400, duration: 600 })
		if (this.p2) {
			// o segundo elfo cai junto
			const p2 = this.p2
			p2.arma.setVisible(false)
			p2.rotulo.setVisible(false)
			p2.sprite.setVisible(true).setTint(0xff3030).setTintMode(Phaser.TintModes.FILL)
			p2.sprite.setOrigin(0.5, 1).setPosition(p2.x + 12, p2.y + 25)
			this.tweens.add({ targets: p2.sprite, angle: -90, duration: 500, ease: 'Bounce.Out' })
			this.tweens.add({ targets: p2.sprite, alpha: 0.35, delay: 400, duration: 600 })
		}
		this.time.delayedCall(1100, () => this.mostrar_fim())
	}

	mostrar_fim() {
		const novo_recorde = this.pontos > this.recorde
		if (novo_recorde) {
			this.recorde = this.pontos
			gravar_recorde(this.pontos)
		}
		const { posicao, id } = gravar_placar(this.pontos, this.nivel, opcoes.dificuldade, opcoes.modo)
		somar_estatisticas({ zumbis: this.stats.mortos, chefes: this.stats.chefes, segundos: Math.floor(this.stats.ticks / 100), fase: this.nivel })
		const segundos = Math.floor(this.stats.ticks / 100)
		const tempo = Math.floor(segundos / 60) + ':' + String(segundos % 60).padStart(2, '0')
		const pontaria = this.stats.disparos ? Math.round((100 * this.stats.acertos) / this.stats.disparos) : 0
		if (pontaria >= 70 && this.stats.disparos >= 200) desbloquear(this, 'mira')
		// desafios do dia cumpridos nesta partida
		const cumpridos = conferir_desafios(this.dia, { ...this.stats, fase: this.nivel, pontos: this.pontos, lapides: this.lapides_quebradas })
		const moedas = moedas_da_partida(this.pontos, this.stats.chefes) + this.moedas_extras + cumpridos.length * PREMIO
		const carteira = ganhar_moedas(moedas)

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
			'PONTARIA ' + pontaria + '%   MAIOR COMBO ' + this.stats.melhor_combo + '\n' +
			'+' + moedas + ' MOEDAS  (' + carteira + ' NA CARTEIRA)' +
			cumpridos.map((m) => '\nDESAFIO CUMPRIDO: ' + m.texto).join(''),
		)
		this.instrucao = texto(this, this.largura / 2, ALTURA - 50, '', 8, '#cfcfcf').setOrigin(0.5).setDepth(10)
		if (novo_recorde && this.pontos > 0) {
			this.soltar_confete()
		}

		// entrou no placar e tem teclado: pede as 3 letras do nome, como nos fliperamas
		const usa_controle = this.input.gamepad && this.input.gamepad.total > 0
		if (posicao && !this.modo_toque && !usa_controle) {
			this.pedir_nome(id)
		}
		else {
			this.liberar_reinicio()
		}
	}

	// novo recorde: chuva de papel picado colorido
	soltar_confete() {
		const cores = [0xffd34d, 0x9ff07a, 0xff6a6a, 0x9fd8ff, 0xc08aff]
		for (let i = 0; i < 70; i++) {
			const x = Math.random() * this.largura
			const papel = this.add.rectangle(x, -10 - Math.random() * 120, 3, 5, cores[i % cores.length]).setDepth(9.5)
			this.tweens.add({
				targets: papel,
				y: ALTURA + 10,
				x: x + Phaser.Math.Between(-40, 40),
				angle: Phaser.Math.Between(-540, 540),
				duration: Phaser.Math.Between(1800, 3200),
				delay: Math.random() * 600,
				onComplete: () => papel.destroy(),
			})
		}
		efeito(this, 'fase', { volume: 0.6 })
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
				efeito(this, 'item', { volume: 0.6 })
				this.liberar_reinicio()
				return
			}
			if (evento.key == 'Backspace') {
				nome = nome.slice(0, -1)
			}
			else if (/^[a-zA-Z0-9]$/.test(evento.key) && nome.length < 3) {
				nome += evento.key.toUpperCase()
				efeito(this, 'combo', { volume: 0.4 })
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
