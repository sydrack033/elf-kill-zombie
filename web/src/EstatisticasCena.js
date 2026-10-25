import Phaser from 'phaser'
import { ALTURA, ajustar_tela, texto, ler_estatisticas, ler_historico } from './tela.js'

// nomes dos inimigos para a lista dos mais abatidos
const NOMES = {
	comum: 'ZUMBI', corredor: 'CORREDOR', brutamontes: 'BRUTAMONTES', cuspidor: 'CUSPIDOR', bombado: 'BOMBADO',
	fantasma: 'FANTASMA', escavador: 'ESCAVADOR', coveiro: 'COVEIRO', gosma: 'GOSMA', tamborzeiro: 'TAMBORZEIRO', corvo: 'CORVO',
}

// Estatísticas (aberta pela tela de conquistas): números de todas as partidas e as últimas 10.
export default class EstatisticasCena extends Phaser.Scene {
	constructor() {
		super('Estatisticas')
	}

	create() {
		this.chao = this.add.tileSprite(0, 0, 10, ALTURA, 'chao').setOrigin(0).setTint(0x506878)
		const e = ler_estatisticas()
		const horas = Math.floor(e.segundos / 3600)
		const minutos = Math.floor((e.segundos % 3600) / 60)
		const mais_abatidos = Object.entries(e.por_tipo || {})
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([tipo, n]) => (NOMES[tipo] || tipo.toUpperCase()) + ' ' + n.toLocaleString('pt-BR'))
		const letra = { facil: 'FÁCIL', normal: 'NORMAL', dificil: 'DIFÍCIL' }
		const historico = ler_historico().map((p) => {
			const d = new Date(p.data)
			const data = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + ' ' +
				String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
			return data + '   FASE ' + String(p.fase).padStart(2, ' ') + '   ' + String(p.pontos).padStart(7, ' ') + ' PTS   ' +
				(letra[p.dificuldade] || '') + (p.modo == 'chefes' ? ' (CHEFÕES)' : '')
		})

		this.titulo = texto(this, 0, 18, 'ESTATÍSTICAS', 16, '#ffd34d').setOrigin(0.5, 0)
		this.blocos = [
			texto(this, 0, 50, 'PARTIDAS ' + e.partidas + '   ZUMBIS ' + e.zumbis.toLocaleString('pt-BR') + '   CHEFÕES ' + e.chefes, 8, '#9fd8ff'),
			texto(this, 0, 64, 'MELHOR FASE ' + e.melhor_fase + '   TEMPO JOGADO ' + (horas ? horas + 'H ' : '') + minutos + 'MIN', 8, '#9fd8ff'),
			texto(this, 0, 90, 'MAIS ABATIDOS', 8, '#ffd34d'),
			texto(this, 0, 104, mais_abatidos.length ? mais_abatidos.join('   ') : 'NENHUM AINDA', 8, '#ffffff'),
			texto(this, 0, 132, 'ÚLTIMAS PARTIDAS', 8, '#ffd34d'),
			texto(this, 0, 146, historico.length ? historico.join('\n') : 'NENHUMA AINDA', 8, '#ffffff').setLineSpacing(4),
		].map((t) => t.setOrigin(0.5, 0))
		this.voltar = texto(this, 0, ALTURA - 14, 'QUALQUER TECLA OU CLIQUE: VOLTAR', 8, '#cfcfcf').setOrigin(0.5)
		ajustar_tela(this)
		this.cameras.main.fadeIn(250, 0, 0, 0)

		const voltar = () => this.scene.start('Conquistas')
		this.time.delayedCall(200, () => {
			this.input.keyboard.once('keydown', voltar)
			this.input.once('pointerdown', voltar)
			if (this.input.gamepad) this.input.gamepad.once('down', voltar)
		})
	}

	ao_redimensionar() {
		const meio = this.largura / 2
		this.chao.setSize(this.largura, ALTURA)
		for (const t of [this.titulo, this.voltar, ...this.blocos]) {
			t.x = meio
		}
		// em tela estreita as linhas encolhem para caber
		for (const t of this.blocos) {
			t.setScale(Math.min(1, (this.largura - 10) / t.width))
		}
	}

	update() {
		this.chao.tilePositionY -= 0.2
	}
}
