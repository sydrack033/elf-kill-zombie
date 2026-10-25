// Parte da cena Jogo: melhorias, anúncios, cenários, pausa e opções da pausa.
// Os métodos desta classe são copiados para a cena em Jogo.js (por isso usam this como se fossem dela).
import Phaser from 'phaser'
import { ALTURA, texto } from '../tela.js'
import * as R from '../regras.js'
import { tocar_musica, atualizar_volume_musica } from '../musica.js'
import { desbloquear } from '../conquistas.js'
import { efeito, opcoes, gravar_opcoes } from '../opcoes.js'

export default class Melhorias {
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
		this.mostrar_capitulo()
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
			this.poderes.escudo = Math.max(this.poderes.escudo, 500 * (this.m('segunda_pele') ? 2 : 1))
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
	// depois da fase 50 (modo infinito) os cenários recomeçam do cemitério: 51 é como 1, 60 como 10...
	fase_no_ciclo() {
		return ((this.nivel - 1) % R.CHEFE_FINAL.fase) + 1
	}

	pintar_noite() {
		const cenario = this.cenario()
		const t = Math.min(1, (this.fase_no_ciclo() - cenario.a_partir_da_fase) / 9)
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
			if (this.fase_no_ciclo() >= c.a_partir_da_fase) atual = c
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
			this.tweens.pauseAll() // faixas, avisos e efeitos esperam a pausa acabar
			this.time.paused = true // e os eventos marcados (como o fim da abertura do chefão) também
			// o aviso de fase e a dica ficam escondidos atrás do menu
			this.aviso.setAlpha(0)
			this.dica_texto.setAlpha(0)
			this.mostrar_menu_pausa()
		}
		else if (this.estado == 'pausado') {
			this.estado = 'jogando'
			this.escurecer.setVisible(false)
			this.sound.resumeAll()
			this.tweens.resumeAll()
			this.time.paused = false
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
			this.tweens.resumeAll()
			this.time.paused = false
			this.scene.start('Titulo')
		}
	}

	// da pausa, começa uma partida nova do zero
	reiniciar_da_pausa() {
		if (this.estado == 'pausado') {
			this.sound.resumeAll()
			this.tweens.resumeAll()
			this.time.paused = false
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
		const chefoes = Math.ceil(faltam / R.NIVEIS_ENTRE_CHEFOES)
		const caminho = faltam > 0 && this.modo_chefes ? 'FASE ' + this.nivel + '   •   CHEFÃO FINAL EM ' + chefoes + (chefoes == 1 ? ' CHEFÃO' : ' CHEFÕES')
			: faltam > 0 ? 'FASE ' + this.nivel + '   •   CHEFÃO FINAL EM ' + faltam + (faltam == 1 ? ' FASE' : ' FASES') : 'FASE ' + this.nivel + '   •   MODO INFINITO'
		const linha_caminho = texto(this, meio, ALTURA / 2 - 50, caminho, 8, '#9fbf8a').setOrigin(0.5).setDepth(11)
		linha_caminho.setScale(Math.min(1, (this.largura - 10) / linha_caminho.width))
		objetos.push(linha_caminho)
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
}
