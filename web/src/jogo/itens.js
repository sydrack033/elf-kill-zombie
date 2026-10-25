// Parte da cena Jogo: caixas, torretas, moedas, corações e poderes.
// Os métodos desta classe são copiados para a cena em Jogo.js (por isso usam this como se fossem dela).
import Phaser from 'phaser'
import { ALTURA, texto } from '../tela.js'
import * as R from '../regras.js'
import { efeito } from '../opcoes.js'
import { encostou, sortear } from './comum.js'

export default class Itens {
	// ------------------------------------------------------------------ itens, corações e poderes

	criar_itens() {
		this.proximo_item--
		if (this.proximo_item > 0) {
			return
		}
		const r = this.rng
		this.proximo_item = R.ITEM_A_CADA[0] + Math.floor(r() * (R.ITEM_A_CADA[1] - R.ITEM_A_CADA[0] + 1))
		this.soltar_item(8 + Math.floor(r() * (this.largura - 32)), -16, r)
	}

	soltar_item(x, y, aleatorio = Math.random) {
		// com o Só Pistola não caem armas (o resto continua)
		const possiveis = R.ITENS.filter((item) => item.nivel <= this.nivel && !(this.mod.pistola && R.ARMAS[item.tipo]))
		const item = sortear(possiveis, (i) => i.peso, aleatorio)
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
				if (quem == 1 && R.ARMAS[item.tipo] && item.tipo != 'raio' && !R.ARMAS[item.tipo].carrega) {
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
		// só uma explicação por vez: a nova troca a anterior
		if (this.explicacao && this.explicacao.active) this.explicacao.destroy()
		const explicacao = texto(this, this.largura / 2, ALTURA / 2 - 28, item.texto, 8, '#ffffff').setOrigin(0.5).setDepth(10)
		this.explicacao = explicacao
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
			// Segunda Pele: o escudo dura o dobro
			this.poderes[tipo] = R.PODERES[tipo].duracao * (tipo == 'escudo' && this.m('segunda_pele') ? 2 : 1)
			this.anunciar(R.PODERES[tipo].nome + '!', 100, '#9fd8ff')
		}
		else {
			this.trocar_arma(tipo)
			this.anunciar(R.ARMAS[tipo].nome + (this.nivel_arma > 1 ? ' NÍVEL ' + this.nivel_arma : '') + '!', 100)
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

	// fada companheira: gira em volta do elfo e atira no zumbi mais perto
	mover_fada() {
		const f = this.fada
		if (!f) {
			return
		}
		f.angulo += 0.04
		f.x = this.heroi_x + 12 + Math.cos(f.angulo) * 20
		f.y = this.heroi_y + 6 + Math.sin(f.angulo) * 10
		f.sprite.setPosition(Math.round(f.x), Math.round(f.y))
		f.brilho.setPosition(Math.round(f.x), Math.round(f.y)).setAlpha(0.2 + 0.15 * Math.sin(this.quadro_atual / 5))
		f.espera--
		const alvo = this.inimigo_mais_perto(f.x, f.y)
		if (f.espera <= 0 && alvo && alvo.distancia < 220) {
			f.espera = f.nivel >= 2 ? 35 : 60
			const ang = Math.atan2(alvo.y - f.y, alvo.x - f.x)
			const arma = { projetil: 'tiro', dano: f.nivel, empurra: 1, sem_pontaria: true }
			const sprite = this.add.sprite(f.x, f.y, 'tiro', 0).setRotation(ang).setScale(0.6).setTint(0xfff0a0).setDepth(4)
			this.tiros.push({ sprite, x: f.x, y: f.y, arma, ha: 0, vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6, dano: arma.dano, perfura: 0, acertou: new Set() })
		}
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
}
