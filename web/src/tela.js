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
export function gravar_placar(pontos, fase, dificuldade = 'normal') {
	if (pontos <= 0) {
		return { posicao: 0, id: null }
	}
	const id = Date.now()
	const placar = ler_placar()
	placar.push({ id, nome: 'ELF', pontos, fase, dificuldade })
	placar.sort((a, b) => b.pontos - a.pontos)
	const posicao = placar.findIndex((p) => p.id == id) + 1
	salvar_placar(placar)
	return posicao <= 5 ? { posicao, id } : { posicao: 0, id: null }
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
