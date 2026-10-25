// Ferramentas de teste: só são carregadas no modo de desenvolvimento (npm run dev).
// No console do navegador:
//   await teste.comecar()          vai do título para o jogo e pausa o laço normal
//   teste.ticks(500)               roda 500 ticks na hora (5 segundos de jogo)
//   teste.piloto(6000)             joga sozinho por 6000 ticks e devolve um resumo
//   teste.soltar()                 devolve o controle para o laço normal do jogo

import { PODERES } from './regras.js'

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

function cena(jogo, chave) {
	return jogo.scene.getScene(chave)
}

function ativa(jogo, chave) {
	return jogo.scene.getScenes(true).some((s) => s.scene.key == chave)
}

export function instalar_teste(jogo) {
	const teste = {
		get jogo() {
			return cena(jogo, 'Jogo')
		},

		async comecar() {
			for (let i = 0; i < 300 && !ativa(jogo, 'Titulo') && !ativa(jogo, 'Jogo'); i++) await espera(100)
			if (!ativa(jogo, 'Jogo')) {
				cena(jogo, 'Titulo').scene.start('Jogo')
				for (let i = 0; i < 100 && !ativa(jogo, 'Jogo'); i++) await espera(50)
			}
			const s = this.jogo
			s.scene.pause()
			for (const k in s.teclas) s.teclas[k].isDown = false
			return s
		},

		ticks(n) {
			const s = this.jogo
			for (let i = 0; i < n && s.estado == 'jogando'; i++) {
				s.entrada()
				this.controle?.(s)
				s.processamento()
				s.saida()
			}
			return s
		},

		// joga sozinho: anda até as caixas, mira no zumbi mais perto de baixo e joga bomba quando aperta
		piloto(n, { erro_de_mira = 25 } = {}) {
			const s = this.jogo
			const resumo = { niveis: [], armas: {}, poderes: {}, bombas: 0, vidas_perdidas: 0, chefes_vistos: 0, erro: null }
			let vidas = s.vidas
			let nivel = s.nivel
			let arma = s.arma
			let bombas = s.bombas
			let tinha_chefe = false
			this.controle = (j) => {
				const vivos = j.zumbis.filter((z) => !z.morrendo && z.y > -30).sort((a, b) => b.y - a.y)
				const alvo = j.chefe && j.chefe.fase != 'morrendo' ? j.chefe : vivos[0]
				const item = j.itens.find((i) => i.y > 150) || j.coracoes.find((c) => c.y > 150)
				const destino = item ? item.x : alvo ? alvo.x + 10 : j.largura / 2
				j.esq_on = j.heroi_x > destino + 3
				j.dir_on = j.heroi_x < destino - 3
				j.baixo_on = item ? j.heroi_y < item.y : j.heroi_y < 360
				j.cima_on = false
				if (alvo) {
					const tamanho = alvo == j.chefe ? 64 : 22 * alvo.escala
					j.mira_x = alvo.x + tamanho + (Math.random() * 2 - 1) * erro_de_mira
					j.mira_y = alvo.y + tamanho
					j.atirar_on = true
					j.bomba_on = vivos.length >= 5 || (alvo == j.chefe && Math.random() < 0.01)
				}
				else {
					j.atirar_on = false
					j.bomba_on = false
				}
			}
			try {
				for (let i = 0; i < n && s.estado == 'jogando'; i++) {
					this.ticks(1)
					if (s.vidas < vidas) resumo.vidas_perdidas += vidas - s.vidas
					vidas = s.vidas
					if (s.nivel != nivel) resumo.niveis.push([i, s.nivel])
					nivel = s.nivel
					if (s.arma != arma) resumo.armas[s.arma] = (resumo.armas[s.arma] || 0) + 1
					arma = s.arma
					if (s.bombas < bombas) resumo.bombas++
					bombas = s.bombas
					for (const p in s.poderes) if (s.poderes[p] == PODERES[p].duracao - 1) resumo.poderes[p] = (resumo.poderes[p] || 0) + 1
					if (s.chefe && !tinha_chefe) resumo.chefes_vistos++
					tinha_chefe = !!s.chefe
				}
			}
			catch (e) {
				resumo.erro = String(e.stack).slice(0, 600)
			}
			this.controle = null
			resumo.final = {
				estado: s.estado, pontos: s.pontos, nivel: s.nivel, vidas: s.vidas, stats: s.stats,
				objetos: s.children.list.length, zumbis: s.zumbis.length, tiros: s.tiros.length,
			}
			return resumo
		},

		soltar() {
			this.jogo.scene.resume()
		},
	}
	window.teste = teste
}
