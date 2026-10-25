// O jogo tem sempre 400 de altura e a largura acompanha o formato da janela.
// A câmera dá zoom para essa área de 400 de altura ocupar a janela inteira.
export const ALTURA = 400

export const PASTA = 'assets/imagens/'
export const FONTE = 'Silkscreen, monospace'

// liga o ajuste da tela numa cena; chama scene.ao_redimensionar() sempre que a janela muda
export function ajustar_tela(scene) {
	const aplicar = () => {
		const zoom = scene.scale.height / ALTURA
		scene.zoom = zoom
		scene.largura = scene.scale.width / zoom

		const camera = scene.cameras.main
		camera.setSize(scene.scale.width, scene.scale.height)
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
	scene.input.keyboard.on('keydown-F', () => scene.scale.toggleFullscreen())
}

// M liga e desliga o som (vale para o jogo todo). O estado fica guardado aqui porque o
// sound.mute do Phaser só muda de verdade um instante depois, e ler ele de volta pode enganar.
let mudo = false
export function tecla_som(scene) {
	scene.input.keyboard.on('keydown-M', () => {
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

// placar com as 5 melhores partidas: [{ pontos, fase }]
export function ler_placar() {
	try {
		const placar = JSON.parse(localStorage.getItem('elf-kill-zombie-placar') || '[]')
		return Array.isArray(placar) ? placar.slice(0, 5) : []
	} catch {
		return []
	}
}

// coloca a partida no placar e devolve a posição dela (1 a 5), ou 0 se não entrou
export function gravar_placar(pontos, fase) {
	if (pontos <= 0) {
		return 0
	}
	const placar = ler_placar()
	placar.push({ pontos, fase })
	placar.sort((a, b) => b.pontos - a.pontos)
	const posicao = placar.findIndex((p) => p.pontos == pontos && p.fase == fase) + 1
	try {
		localStorage.setItem('elf-kill-zombie-placar', JSON.stringify(placar.slice(0, 5)))
	} catch {
		// sem localStorage: o placar só vale até fechar a página
	}
	return posicao <= 5 ? posicao : 0
}
