import Phaser from 'phaser'
import { ALTURA, ajustar_tela, tecla_tela_cheia, tecla_som, ler_recorde, ler_estatisticas } from './tela.js'
import * as R from './regras.js'
import { tocar_musica, tecla_musica } from './musica.js'
import { opcoes, efeito } from './opcoes.js'
import { ler_loja } from './moedas.js'
import { dia_de_hoje } from './desafios.js'
import { ler_conquistas } from './conquistas.js'
import { memoria, sorteador } from './jogo/comum.js'
import Hud from './jogo/hud.js'
import Melhorias from './jogo/melhorias.js'
import Controles from './jogo/controles.js'
import Clima from './jogo/clima.js'
import Elfo from './jogo/elfo.js'
import Explosoes from './jogo/explosoes.js'
import Tiros from './jogo/tiros.js'
import Zumbis from './jogo/zumbis.js'
import Chefes from './jogo/chefes.js'
import Itens from './jogo/itens.js'
import Fim from './jogo/fim.js'
import Desenho from './jogo/desenho.js'

// A cena do jogo. O laço (entrada → processamento → saída) e o começo da partida ficam aqui;
// o resto está dividido por assunto na pasta jogo/ e é copiado para esta classe lá embaixo.
export default class Jogo extends Phaser.Scene {
	constructor() {
		super('Jogo')
	}

	create() {
		// a cena é reaproveitada quando o jogo recomeça: esquece os objetos da partida anterior
		this.treino = (this.scene.settings.data && this.scene.settings.data.treino) || 0 // treino de chefão (bestiário)
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

		this.dificuldade = { ...(R.DIFICULDADES[opcoes.dificuldade] || R.DIFICULDADES.normal) }
		// modificadores das Opções: mudam a dificuldade desta partida e multiplicam os pontos
		// Partida do Dia: sem loja, classe, modificadores nem começo adiantado, e o sorteio dos zumbis e
		// caixas com a data como semente (a mesma sequência para todo mundo naquele dia)
		this.diario = opcoes.modo == 'diario'
		this.rng = this.diario ? sorteador(dia_de_hoje()) : Math.random
		if (this.diario) {
			this.dificuldade = { ...R.DIFICULDADES.normal }
		}
		this.mod = this.diario ? {} : { ...opcoes.modificadores }
		this.multiplicador_mod = 1 // as moedas da loja não ganham com os modificadores
		for (const [id, m] of Object.entries(R.MODIFICADORES)) {
			if (!this.mod[id]) continue
			this.dificuldade.pontos *= m.pontos
			this.multiplicador_mod = (this.multiplicador_mod || 1) * m.pontos
			if (m.velocidade) {
				this.dificuldade.velocidade *= m.velocidade
				this.dificuldade.frequencia *= m.velocidade
			}
		}
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
		this.nivel_arma = 1 // sobe pegando a mesma arma de novo
		this.carga = 0 // carga do arco élfico, de 0 a 1
		this.barra_carga = this.add.rectangle(0, 0, 20, 2, 0x9ff07a).setOrigin(0, 0.5).setDepth(6).setVisible(false)
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
		this.explicacao = null
		this.capitulo_pendente = null
		this.desafios_avisados = new Set()
		this.desafios_pagos = []
		this.polvora_da_classe = 0
		this.causa_do_golpe = null
		this.avisou_recorde = false
		this.covas_quebradas = 0
		this.forja = false // (a loja liga, se comprada)
		this.proxima_cova = undefined // a primeira cova vem depois de um tempo
		this.ja_trocou = false // troca de cartas de melhoria (uma por partida)
		this.tecla_trocar = null
		// setinhas vermelhas no pé da tela marcando zumbis perto de passar (passar custa vida)
		this.alertas = this.add.graphics().setDepth(8.5)
		this.cartao_ate = 0 // até quando o cartão de cinema atual fica na tela
		this.tweens.resumeAll() // se a partida anterior acabou pausada
		this.time.paused = false
		this.objetos_final = null
		this.fila_faixas = [] // inimigos novos esperando a vez de ser apresentados
		this.moedas_extras = 0 // moedas dos zumbis de elite e das hordas, somadas no fim
		this.horda = null // { ha, zumbis } enquanto a horda está vindo
		this.chuva_de_moedas = 0 // ticks que faltam da fase bônus
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
		this.events.once('shutdown', () => this.luz.destroy()) // fora da tela, a cena não apaga sozinha
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
		if (memoria.usou_toque) {
			this.ligar_toque()
		}

		if (!this.diario) {
			this.aplicar_loja()
		}

		// (definido antes do começo adiantado: a cena é reaproveitada e guardaria o valor da partida anterior)
		this.modo_chefes = opcoes.modo == 'chefes' && !(this.scene.settings.data && this.scene.settings.data.treino)
		// começar num capítulo adiantado (escolhido no título)
		const treino = this.scene.settings.data && this.scene.settings.data.treino
		const inicio = opcoes.modo == 'chefes' || this.diario || treino ? 1 : opcoes.inicio
		this.comecou_adiantado = inicio > 1 && ler_estatisticas().melhor_fase >= inicio
		if (this.comecou_adiantado) {
			this.comecar_no_capitulo(inicio)
		}

		// treino (pelo bestiário): direto no chefão escolhido, com melhorias, sem valer nada
		this.treino = (this.scene.settings.data && this.scene.settings.data.treino) || 0
		if (this.treino) {
			this.ganhar_melhorias(Math.min(14, this.treino * 2))
			this.vidas = this.vidas_max
			this.nivel = this.treino * 5 - 1
			this.apanhou_na_fase = true // o salto não ganha bônus
			this.subir_nivel()
			this.anunciar('TREINO!', 200, '#9fd8ff')
		}
		this.modo_chefes = opcoes.modo == 'chefes' && !this.treino
		if (this.modo_chefes) {
			this.ganhar_melhorias(2) // no modo chefões começa já com duas, além da escolha
			this.texto_da_fase = 'CHEFÃO A CAMINHO!'
			this.subir_nivel()
			this.oferecer_melhorias()
		}
		else if (!this.comecou_adiantado && !this.treino) {
			// abre a partida como um capítulo: CEMITÉRIO, ONDE TUDO COMEÇOU
			const cenario = this.cenario()
			this.time.delayedCall(500, () => {
				this.apresentar_chefe(cenario.nome, cenario.lema, '#9ff07a')
				efeito(this, 'sino', { volume: 0.6 })
			})
		}

		// modo 2 jogadores (só no computador)
		this.p2 = null
		if (opcoes.jogadores == 2 && this.sys.game.device.os.desktop) {
			this.criar_p2()
		}

		this.tempo_acumulado = 0
		this.cameras.main.fadeIn(300, 0, 0, 0)
	}

	// começa na fase escolhida, já com as melhorias que teria pego no caminho (uma a cada 2 fases)
	comecar_no_capitulo(inicio) {
		this.ganhar_melhorias(Math.floor((inicio - 1) / 2))
		this.nivel = inicio - 1
		this.apanhou_na_fase = true // o salto não ganha bônus de fase perfeita
		this.subir_nivel()
	}

	// melhorias sorteadas de presente (começo adiantado e modo chefões)
	ganhar_melhorias(quantas) {
		for (let i = 0; i < quantas; i++) {
			const inuteis = this.mod.vidro ? ['vida_max', 'vampiro'] : []
			const possiveis = R.MELHORIAS.filter((mel) => this.m(mel.id) < mel.maximo && !inuteis.includes(mel.id))
			if (!possiveis.length) break
			const mel = Phaser.Utils.Array.GetRandom(possiveis)
			this.melhorias[mel.id] = this.m(mel.id) + 1
			this.aplicar_melhoria(mel.id)
		}
		this.atualizar_hud_melhorias()
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
			this.ganhar_melhorias(1)
		}
		if (compras.arma && !this.mod.pistola) {
			this.trocar_arma('triplo')
		}
		this.pode_reviver = !!compras.reviver
		this.forja = !!compras.forja
		// fada da loja: nível 1 atira devagar, nível 2 mais rápido e mais forte
		this.fada = compras.fada ? { nivel: compras.fada, angulo: 0, espera: 60, x: 0, y: 0 } : null
		if (this.fada) {
			this.fada.sprite = this.add.circle(0, 0, 3, 0xfff0a0).setDepth(6.2)
			this.fada.brilho = this.add.circle(0, 0, 7, 0xffe080, 0.3).setDepth(6.1)
		}
		// classe do elfo
		const classe = opcoes.classe
		const feitas_classe = ler_conquistas()
		const liberada = R.CLASSES.find((c) => c.id == classe && R.classe_liberada(c, feitas_classe, ler_estatisticas().melhor_fase))
		if (liberada && classe == 'arqueiro' && !this.mod.pistola) {
			this.trocar_arma('arco')
			this.trocar_arma('arco') // nível II
		}
		if (liberada && classe == 'bombardeiro') {
			this.polvora_da_classe = 1 // fora das melhorias (não conta para a conquista Colecionador)
			this.bombas = Math.min(this.bombas_max() + 4, this.bombas + 4)
			this.vidas = Math.max(1, this.vidas - 1)
			this.atualizar_hud_melhorias()
		}
		if (this.mod.vidro) {
			this.vidas = this.vidas_max = 1 // Elfo de Vidro: um golpe e acabou
		}
		this.atualizar_hud_melhorias()
		this.atualizar_hud()
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
			else if (indice == 3) {
				this.trocar_cartas() // Y troca as cartas
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
}

// copia os métodos de cada parte para a cena (como se tivessem sido escritos aqui dentro)
for (const parte of [Hud, Melhorias, Controles, Clima, Elfo, Explosoes, Tiros, Zumbis, Chefes, Itens, Fim, Desenho]) {
	for (const nome of Object.getOwnPropertyNames(parte.prototype)) {
		if (nome != 'constructor') {
			Object.defineProperty(Jogo.prototype, nome, Object.getOwnPropertyDescriptor(parte.prototype, nome))
		}
	}
}
