// O jogo tem sempre 400 de altura e a largura acompanha o formato da janela.
// A câmera dá zoom para essa área de 400 de altura ocupar a janela inteira.
// Numa tela em pé (celular) a largura não fica menor que LARGURA_MINIMA: sobra uma faixa
// preta em cima e embaixo, em vez de o jogo ficar estreito demais.
export const ALTURA = 400
export const LARGURA_MINIMA = 300

export const PASTA = 'assets/imagens/'
export const FONTE = 'Silkscreen, monospace'

// liga o ajuste da tela numa cena; chama scene.ao_redimensionar() sempre que a janela muda
export function ajustar_tela(scene) {
	const aplicar = () => {
		const { width, height } = scene.scale
		const zoom = Math.min(height / ALTURA, width / LARGURA_MINIMA)
		scene.zoom = zoom
		scene.largura = width / zoom

		// a câmera só desenha a faixa do jogo, centralizada na altura
		const altura_na_tela = Math.ceil(ALTURA * zoom)
		const camera = scene.cameras.main
		camera.setViewport(0, Math.floor((height - altura_na_tela) / 2), width, altura_na_tela)
		camera.setZoom(zoom)
		camera.centerOn(scene.largura / 2, ALTURA / 2)

		// texto desenhado na resolução da tela, para a fonte ficar nítida com o zoom
		for (const objeto of scene.children.list) {
			if (objeto.type == 'Text') {
				objeto.setResolution(Math.ceil(zoom))
			}
		}

		if (scene.ao_redimensionar) {
			scene.ao_redimensionar()
		}
	}

	aplicar()
	scene.scale.on('resize', aplicar)
	scene.events.once('shutdown', () => scene.scale.off('resize', aplicar))
}

export function texto(scene, x, y, mensagem, tamanho = 8, cor = '#ffffff') {
	return scene.add
		.text(x, y, mensagem, {
			fontFamily: FONTE,
			fontSize: tamanho + 'px',
			fontStyle: tamanho >= 16 ? 'bold' : '',
			color: cor,
			stroke: '#000000',
			strokeThickness: Math.max(2, tamanho / 4),
			align: 'center',
			lineSpacing: 6,
		})
		.setResolution(Math.ceil(scene.zoom || 1))
}

// F liga e desliga a tela cheia de verdade (sem a barra do navegador)
export function tecla_tela_cheia(scene) {
	scene.input.keyboard.on('keydown-F', () => {
		if (!scene.digitando_nome) scene.scale.toggleFullscreen()
	})
}

// M liga e desliga o som (vale para o jogo todo). O estado fica guardado aqui porque o
// sound.mute do Phaser só muda de verdade um instante depois, e ler ele de volta pode enganar.
let mudo = false
export function tecla_som(scene) {
	scene.input.keyboard.on('keydown-M', () => {
		if (scene.digitando_nome) return
		mudo = !mudo
		scene.sound.setMute(mudo)
	})
}

export function ler_recorde() {
	try {
		return Number(localStorage.getItem('elf-kill-zombie-recorde')) || 0
	} catch {
		return 0
	}
}

export function gravar_recorde(pontos) {
	try {
		localStorage.setItem('elf-kill-zombie-recorde', String(pontos))
	} catch {
		// sem localStorage (aba anônima, por exemplo): o recorde só vale até fechar a página
	}
}

// placar com as 5 melhores partidas: [{ id, nome, pontos, fase, dificuldade }]
export function ler_placar() {
	try {
		const placar = JSON.parse(localStorage.getItem('elf-kill-zombie-placar') || '[]')
		return Array.isArray(placar) ? placar.slice(0, 5) : []
	} catch {
		return []
	}
}

function salvar_placar(placar) {
	try {
		localStorage.setItem('elf-kill-zombie-placar', JSON.stringify(placar.slice(0, 5)))
	} catch {
		// sem localStorage: o placar só vale até fechar a página
	}
}

// coloca a partida no placar (com o nome provisório "ELF") e devolve { posicao, id };
// posicao é de 1 a 5, ou 0 se não entrou
export function gravar_placar(pontos, fase, dificuldade = 'normal', modo = 'aventura') {
	if (pontos <= 0) {
		return { posicao: 0, id: null }
	}
	const id = Date.now()
	const placar = ler_placar()
	placar.push({ id, nome: 'ELF', pontos, fase, dificuldade, modo })
	placar.sort((a, b) => b.pontos - a.pontos)
	const posicao = placar.findIndex((p) => p.id == id) + 1
	salvar_placar(placar)
	return posicao <= 5 ? { posicao, id } : { posicao: 0, id: null }
}

// estatísticas de todas as partidas somadas
export function ler_estatisticas() {
	const vazio = { partidas: 0, zumbis: 0, chefes: 0, melhor_fase: 0, segundos: 0, por_tipo: {}, melhor_combo: 0, mais_pontos: 0 }
	try {
		return { ...vazio, ...JSON.parse(localStorage.getItem('elf-kill-zombie-estatisticas') || '{}') }
	} catch {
		return vazio
	}
}

export function somar_estatisticas(partida) {
	const total = ler_estatisticas()
	total.partidas++
	total.zumbis += partida.zumbis
	total.chefes += partida.chefes
	total.segundos += partida.segundos
	total.melhor_fase = Math.max(total.melhor_fase, partida.fase)
	total.melhor_combo = Math.max(total.melhor_combo || 0, partida.combo || 0)
	total.mais_pontos = Math.max(total.mais_pontos || 0, partida.pontos || 0)
	// abatidos de cada tipo (para o bestiário)
	total.por_tipo = { ...total.por_tipo }
	for (const [tipo, n] of Object.entries(partida.por_tipo || {})) {
		total.por_tipo[tipo] = (total.por_tipo[tipo] || 0) + n
	}
	try {
		localStorage.setItem('elf-kill-zombie-estatisticas', JSON.stringify(total))
	} catch {
		// sem localStorage: não soma
	}
}

// histórico das últimas 10 partidas: [{ data, fase, pontos, dificuldade, modo }] (a mais nova primeiro)
export function ler_historico() {
	try {
		const lista = JSON.parse(localStorage.getItem('elf-kill-zombie-historico') || '[]')
		return Array.isArray(lista) ? lista : []
	} catch {
		return []
	}
}

export function gravar_historico(partida) {
	const lista = [{ data: Date.now(), ...partida }].concat(ler_historico()).slice(0, 10)
	try {
		localStorage.setItem('elf-kill-zombie-historico', JSON.stringify(lista))
	} catch {
		// sem localStorage: não guarda
	}
}

// recorde da Partida do Dia (só vale o do dia de hoje)
export function ler_recorde_do_dia(dia) {
	try {
		const d = JSON.parse(localStorage.getItem('elf-kill-zombie-diario') || '{}')
		return d.dia == dia ? d.pontos : 0
	} catch {
		return 0
	}
}

export function gravar_recorde_do_dia(dia, pontos) {
	if (pontos > ler_recorde_do_dia(dia)) {
		try {
			localStorage.setItem('elf-kill-zombie-diario', JSON.stringify({ dia, pontos }))
		} catch {
			// sem localStorage: não guarda
		}
	}
}

// troca o nome provisório depois que o jogador digita as 3 letras
export function renomear_no_placar(id, nome) {
	const placar = ler_placar()
	const linha = placar.find((p) => p.id == id)
	if (linha) {
		linha.nome = nome
		salvar_placar(placar)
	}
}
