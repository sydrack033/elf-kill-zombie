import Phaser from 'phaser'
import { ALTURA, ajustar_tela, texto, tecla_tela_cheia, tecla_som, ler_recorde, ler_placar } from './tela.js'
import { tocar_musica, tecla_musica } from './musica.js'
import { opcoes, gravar_opcoes, efeito } from './opcoes.js'
import { ler_conquistas } from './conquistas.js'
import { ler_loja } from './moedas.js'
import { desafios_de_hoje } from './desafios.js'
import * as R from './regras.js'

// Tela de título: enquanto espera, roda uma demonstração no fundo (o elfo atirando nos zumbis).
export default class Titulo extends Phaser.Scene {
	constructor() {
		super('Titulo')
	}

	create() {
		this.chao = this.add.tileSprite(0, 0, 10, ALTURA, 'chao').setOrigin(0)

		// demonstração
		this.demo_zumbis = [] // { sprite, x, y, vida, morto_ha }
		this.demo_tiros = [] // { sprite, x, y }
		this.demo_sangues = []
		this.demo_heroi = this.add.sprite(0, ALTURA - 45, 'heroi_parado_cima').setOrigin(0.5, 0).setDepth(2)
		this.demo_arma = this.add.sprite(0, 0, 'armas', 0).setOrigin(3 / 16, 4 / 8).setRotation(-Math.PI / 2).setDepth(2)
		this.demo_x = 0
		this.demo_proximo = 0
		this.demo_espera_tiro = 0

		// véu escuro para o texto aparecer bem por cima da demonstração
		this.veu = this.add.rectangle(0, 0, 10, ALTURA, 0x000000, 0.45).setOrigin(0).setDepth(5)

		this.nome = texto(this, 0, 64, 'ELF KILL\nZOMBIE', 24, '#e8f5c8').setOrigin(0.5).setDepth(6)
		this.subtitulo = texto(this, 0, 112, 'O CEMITÉRIO NÃO DORME', 8, '#9fbf8a').setOrigin(0.5).setDepth(6)

		// escolhas: dificuldade e cor do elfo (setas na tela, teclado ou controle)
		this.conquistas_feitas = ler_conquistas().size
		this.seletores = [
			this.criar_seletor(134, 'DIFICULDADE', () => this.mudar_dificuldade(-1), () => this.mudar_dificuldade(1)),
			this.criar_seletor(149, 'ELFO', () => this.mudar_elfo(-1), () => this.mudar_elfo(1)),
			this.criar_seletor(164, 'MODO', () => this.mudar_modo(), () => this.mudar_modo()),
		]
		// 2 jogadores só no computador (o segundo usa as setas ou um controle)
		this.computador = this.sys.game.device.os.desktop
		if (this.computador) {
			this.seletores.push(this.criar_seletor(179, 'JOGADORES', () => this.mudar_jogadores(), () => this.mudar_jogadores()))
		}
		this.atualizar_seletores()

		this.comecar = texto(this, 0, 206, 'CLIQUE OU\nAPERTE ESPAÇO', 10, '#ffd34d').setOrigin(0.5).setDepth(6)

		// placar dos 5 melhores
		const placar = ler_placar()
		const letra = { facil: '  F', normal: '', dificil: '  D' } // F = fácil, D = difícil, C = modo chefões
		const linhas = placar.length
			? ['MELHORES'].concat(placar.map((p, i) => i + 1 + '. ' + (p.nome || 'ELF').padEnd(3, ' ') + '  ' + String(p.pontos).padStart(6, ' ') + '  FASE ' + p.fase + (letra[p.dificuldade] || '') + (p.modo == 'chefes' ? '  C' : '')))
			: ['RECORDE: ' + ler_recorde()]
		this.placar = texto(this, 0, 264, placar.length || ler_recorde() ? linhas.join('\n') : '', 8, '#ffffff').setOrigin(0.5).setDepth(6)

		// no celular/tablet as instruções são de toque
		const celular = !this.sys.game.device.os.desktop
		this.controles = texto(
			this, 0, 346,
			celular
				? 'ARRASTE NA ESQUERDA: ANDAR\nO ELFO ATIRA SOZINHO\nTOQUE NA DIREITA: MIRAR\nBOTÕES NA TELA: BOMBA, ESQUIVA E PAUSA'
				: 'WASD/SETAS: ANDAR   MOUSE: MIRAR   SHIFT: ESQUIVA\nCLIQUE: ATIRAR   CLIQUE DIREITO: BOMBA\nP: PAUSA  F: TELA CHEIA  M: SOM  N: MÚSICA\nX: MODO  L: LOJA  D: DESAFIOS  C: CONQUISTAS  B: BESTIÁRIO  H: HISTÓRIA',
			8, '#cfcfcf',
		).setOrigin(0.5).setDepth(6)

		this.quadro = 0
		ajustar_tela(this)
		tecla_tela_cheia(this)
		tecla_som(this)
		tecla_musica(this)
		tocar_musica(this, 'musica_titulo')

		// cuidado para não começar duas vezes (tecla e clique juntos, por exemplo)
		let saiu = false
		const ir = (cena, dados) => {
			if (!saiu) {
				saiu = true
				this.cameras.main.fadeOut(250, 0, 0, 0)
				this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(cena, dados))
			}
		}
		// na primeira vez, a história aparece antes do jogo
		let viu_historia = true
		try {
			viu_historia = localStorage.getItem('elf-kill-zombie-historia') == 'vista'
		} catch {
			// sem localStorage: vai direto para o jogo
		}
		const comecar = () => (viu_historia ? ir('Jogo') : ir('Historia', { depois: 'Jogo' }))
		this.input.keyboard.on('keydown-SPACE', comecar)
		this.input.keyboard.on('keydown-ENTER', comecar)
		this.input.keyboard.on('keydown-C', () => ir('Conquistas'))
		this.input.keyboard.on('keydown-H', () => ir('Historia', { depois: 'Titulo' }))
		this.input.keyboard.on('keydown-B', () => ir('Bestiario'))
		this.input.keyboard.on('keydown-L', () => ir('Loja'))
		this.input.keyboard.on('keydown-D', () => ir('Desafios'))
		this.input.keyboard.on('keydown-LEFT', () => this.mudar_dificuldade(-1))
		this.input.keyboard.on('keydown-RIGHT', () => this.mudar_dificuldade(1))
		this.input.keyboard.on('keydown-UP', () => this.mudar_elfo(-1))
		this.input.keyboard.on('keydown-DOWN', () => this.mudar_elfo(1))
		this.input.keyboard.on('keydown-TWO', () => this.mudar_jogadores())
		this.input.keyboard.on('keydown-ONE', () => this.mudar_jogadores())
		this.input.keyboard.on('keydown-X', () => this.mudar_modo())
		// controle: direcional escolhe, X troca o modo, Y abre as conquistas, os outros botões começam
		if (this.input.gamepad) {
			this.input.gamepad.on('down', (pad, botao) => {
				const acoes = {
					12: () => this.mudar_elfo(-1), 13: () => this.mudar_elfo(1),
					14: () => this.mudar_dificuldade(-1), 15: () => this.mudar_dificuldade(1),
					3: () => ir('Conquistas'), 2: () => this.mudar_modo(), 8: () => ir('Loja'),
				}
				;(acoes[botao.index] || comecar)()
			})
		}
		this.input.on('pointerdown', (p, alvos) => {
			if (alvos.length) {
				return // clicou numa seta de escolha
			}
			// no celular, tocar no troféu abre as conquistas
			if (this.botao_trofeu && this.botao_trofeu.getBounds().contains(p.worldX, p.worldY)) {
				ir('Conquistas')
			}
			else if (this.botao_loja && this.botao_loja.getBounds().contains(p.worldX, p.worldY)) {
				ir('Loja')
			}
			else if (this.botao_desafios && this.botao_desafios.getBounds().contains(p.worldX, p.worldY)) {
				ir('Desafios')
			}
			else {
				comecar()
			}
		})
		// troféu no canto (para quem joga no celular e não tem a tecla C)
		this.botao_trofeu = this.add.sprite(0, 14, 'trofeu', 0).setScale(1.5).setDepth(6)
		// moedas no canto esquerdo: tocar (ou L) abre a loja
		this.moeda = this.add.sprite(12, 14, 'moeda').setScale(1.5).setDepth(6)
		this.botao_loja = texto(this, 21, 14, ler_loja().moedas + '  LOJA', 8, '#ffd34d').setOrigin(0, 0.5).setDepth(6)
		// desafios do dia: quantos já foram feitos hoje (tocar ou D abre a lista)
		const desafios = desafios_de_hoje()
		const feitos = desafios.filter((d) => d.feita).length
		this.botao_desafios = texto(this, 6, 30, 'DESAFIOS ' + feitos + '/' + desafios.length, 8, feitos == desafios.length ? '#9ff07a' : '#9fd8ff').setOrigin(0, 0.5).setDepth(6)
		this.cameras.main.fadeIn(300, 0, 0, 0)
		this.ao_redimensionar()
	}

	// uma linha "RÓTULO  < VALOR >" com setas clicáveis
	criar_seletor(y, rotulo, menos, mais) {
		const seletor = {
			rotulo: texto(this, 0, y, rotulo, 8, '#9fbf8a').setOrigin(1, 0.5).setDepth(6),
			menos: texto(this, 0, y, '<', 8, '#ffffff').setOrigin(0.5).setDepth(6).setInteractive({ useHandCursor: true }),
			valor: texto(this, 0, y, '', 8, '#ffffff').setOrigin(0.5).setDepth(6),
			mais: texto(this, 0, y, '>', 8, '#ffffff').setOrigin(0.5).setDepth(6).setInteractive({ useHandCursor: true }),
		}
		seletor.menos.on('pointerdown', menos)
		seletor.mais.on('pointerdown', mais)
		return seletor
	}

	mudar_dificuldade(passo) {
		const ids = Object.keys(R.DIFICULDADES)
		const i = Math.max(0, ids.indexOf(opcoes.dificuldade))
		opcoes.dificuldade = ids[(i + passo + ids.length) % ids.length]
		gravar_opcoes()
		efeito(this, 'combo', { volume: 0.4 })
		this.atualizar_seletores()
	}

	// pula as cores que ainda estão bloqueadas
	mudar_elfo(passo) {
		const liberados = R.ELFOS.filter((e) => this.conquistas_feitas >= e.conquistas)
		const i = Math.max(0, liberados.findIndex((e) => e.id == opcoes.elfo))
		opcoes.elfo = liberados[(i + passo + liberados.length) % liberados.length].id
		gravar_opcoes()
		efeito(this, 'combo', { volume: 0.4, rate: 1.2 })
		this.atualizar_seletores()
	}

	mudar_modo() {
		opcoes.modo = opcoes.modo == 'chefes' ? 'aventura' : 'chefes'
		gravar_opcoes()
		efeito(this, 'combo', { volume: 0.4, rate: 0.8 })
		this.atualizar_seletores()
	}

	mudar_jogadores() {
		if (!this.computador) {
			return
		}
		opcoes.jogadores = opcoes.jogadores == 2 ? 1 : 2
		gravar_opcoes()
		efeito(this, 'combo', { volume: 0.4, rate: 0.9 })
		this.atualizar_seletores()
	}

	atualizar_seletores() {
		const dificuldade = R.DIFICULDADES[opcoes.dificuldade] || R.DIFICULDADES.normal
		const cores = { facil: '#9ff07a', normal: '#ffffff', dificil: '#ff6a6a' }
		this.seletores[0].valor.setText(dificuldade.nome).setColor(cores[opcoes.dificuldade] || '#ffffff')
		const elfo = R.ELFOS.find((e) => e.id == opcoes.elfo) || R.ELFOS[0]
		// mostra quantas cores já foram liberadas
		const liberados = R.ELFOS.filter((e) => this.conquistas_feitas >= e.conquistas).length
		this.seletores[1].valor.setText(elfo.nome + '  ' + liberados + '/' + R.ELFOS.length)
		this.seletores[2].valor.setText(opcoes.modo == 'chefes' ? 'SÓ CHEFÕES' : 'AVENTURA').setColor(opcoes.modo == 'chefes' ? '#ff9a3c' : '#ffffff')
		if (this.seletores[3]) {
			const controle = this.input.gamepad && this.input.gamepad.total > 0
			this.seletores[3].valor.setText(opcoes.jogadores == 2 ? '2  (P2: ' + (controle ? 'CONTROLE' : 'SETAS') + ')' : '1')
		}
		if (elfo.cor) {
			this.demo_heroi.setTint(elfo.cor)
		}
		else {
			this.demo_heroi.clearTint()
		}
		if (this.largura) {
			this.ao_redimensionar()
		}
	}

	ao_redimensionar() {
		const meio = this.largura / 2
		this.chao.setSize(this.largura, ALTURA)
		this.veu.setSize(this.largura, ALTURA)
		for (const objeto of [this.nome, this.subtitulo, this.comecar, this.placar, this.controles]) {
			objeto.x = meio
		}
		// seletores: as duas linhas com as setas alinhadas, "RÓTULO  <    VALOR    >"
		for (const s of this.seletores) {
			s.rotulo.x = meio - 40
			s.menos.x = meio - 30
			s.valor.x = meio + 30
			s.mais.x = meio + 90
		}
		if (this.botao_trofeu) {
			this.botao_trofeu.x = this.largura - 14
		}
		// em tela estreita os controles ficam grandes demais: diminui para caber
		const escala = Math.min(1, (this.largura - 10) / this.controles.width)
		this.controles.setScale(escala)
		if (this.demo_x == 0) {
			this.demo_x = meio
		}
	}

	update(time, delta) {
		const passo = Math.min(delta, 50) / 10 // em ticks de 10 ms, como no jogo
		this.quadro += passo
		this.chao.tilePositionY -= 0.4 * passo
		this.comecar.setVisible(Math.floor(time / 500) % 2 == 0)
		this.nome.y = 64 + Math.sin(time / 600) * 2
		this.rodar_demo(passo)
	}

	rodar_demo(passo) {
		// aparece um zumbi de vez em quando
		this.demo_proximo -= passo
		if (this.demo_proximo <= 0) {
			this.demo_proximo = Phaser.Math.Between(90, 160)
			const x = Phaser.Math.Between(30, Math.max(31, Math.floor(this.largura - 30)))
			const sprite = this.add.sprite(x, -44, 'zumbi', 0).setOrigin(0.5, 0).setDepth(1)
			this.demo_zumbis.push({ sprite, x, y: -44, vida: 2, morto_ha: -1, xi: 0 })
		}

		// o elfo vai atrás do zumbi mais baixo e atira para cima
		const vivos = this.demo_zumbis.filter((z) => z.morto_ha < 0)
		const alvo = vivos.sort((a, b) => b.y - a.y)[0]
		if (alvo) {
			const d = alvo.x - this.demo_x
			this.demo_x += Math.sign(d) * Math.min(Math.abs(d), 1.2 * passo)
		}
		this.demo_heroi.setPosition(Math.round(this.demo_x), ALTURA - 45)
		this.demo_heroi.setTexture(alvo && Math.abs(alvo.x - this.demo_x) > 2 ? 'heroi_cima' : 'heroi_parado_cima', Math.floor(this.quadro / 5) % 10)
		this.demo_arma.setPosition(Math.round(this.demo_x), ALTURA - 30)

		this.demo_espera_tiro -= passo
		if (alvo && this.demo_espera_tiro <= 0 && Math.abs(alvo.x - this.demo_x) < 8) {
			this.demo_espera_tiro = 30
			const sprite = this.add.image(this.demo_x, ALTURA - 50, 'tiro').setRotation(-Math.PI / 2).setDepth(1.5)
			this.demo_tiros.push({ sprite, x: this.demo_x, y: ALTURA - 50 })
		}

		for (const tiro of this.demo_tiros) {
			tiro.y -= 6 * passo
			for (const z of this.demo_zumbis) {
				if (z.morto_ha < 0 && Math.abs(tiro.x - z.x) < 12 && tiro.y > z.y && tiro.y < z.y + 40) {
					tiro.acertou = true
					z.vida--
					const sangue = this.add.sprite(tiro.x, tiro.y, 'sangue', 0).setDepth(1.6)
					this.demo_sangues.push({ sprite: sangue, ha: 0 })
					if (z.vida == 0) z.morto_ha = 0
					break
				}
			}
			if (tiro.acertou || tiro.y < -20) tiro.sprite.destroy()
		}
		this.demo_tiros = this.demo_tiros.filter((t) => !t.acertou && t.y >= -20)

		for (const z of this.demo_zumbis) {
			if (z.morto_ha < 0) {
				z.y += 0.45 * passo
				z.sprite.setTexture('zumbi', Math.floor(this.quadro / 12) % 7)
			}
			else {
				z.morto_ha += passo
				z.sprite.setTexture('zumbi_morre', Math.min(4, Math.floor(z.morto_ha / 15)))
			}
			z.sprite.setPosition(Math.round(z.x), Math.round(z.morto_ha < 0 ? z.y : z.y - 27))
			if (z.morto_ha > 75 || z.y > ALTURA) z.sprite.destroy()
		}
		this.demo_zumbis = this.demo_zumbis.filter((z) => z.morto_ha <= 75 && z.y <= ALTURA)

		for (const s of this.demo_sangues) {
			s.ha += passo
			if (s.ha >= 36) s.sprite.destroy()
			else s.sprite.setFrame(Math.floor(s.ha / 6))
		}
		this.demo_sangues = this.demo_sangues.filter((s) => s.ha < 36)
	}
}
