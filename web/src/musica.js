// Música de fundo: uma de cada vez, trocando com um "fade" (abaixa uma e sobe a outra).
// Fica fora das cenas para continuar tocando quando a cena muda.

const VOLUME = 0.35
let atual = null // a música tocando agora
let ligada = true

try {
	ligada = localStorage.getItem('elf-kill-zombie-musica') != 'nao'
}
catch {
	// sem localStorage: começa ligada
}

// muda o volume de um som aos poucos e chama "depois" quando termina.
// Um fade novo no mesmo som cancela o anterior.
const fades = new Map()
function fade(som, ate, ms, depois) {
	clearInterval(fades.get(som))
	const de = som.volume
	const passos = Math.max(1, Math.round(ms / 30))
	let i = 0
	const timer = setInterval(() => {
		i++
		// o som pode ter sido destruído no meio do caminho
		if (!som.manager) {
			clearInterval(timer)
			fades.delete(som)
			return
		}
		som.volume = de + ((ate - de) * i) / passos
		if (i >= passos) {
			clearInterval(timer)
			fades.delete(som)
			if (depois) depois()
		}
	}, 30)
	fades.set(som, timer)
}

export function tocar_musica(scene, chave) {
	if (atual && atual.key == chave) {
		return
	}
	parar_musica(400)
	const musica = scene.sound.add(chave, { loop: true, volume: 0 })
	atual = musica
	const comecar = () => {
		if (atual != musica) {
			return // trocaram de música antes do som destravar
		}
		musica.play()
		fade(musica, ligada ? VOLUME : 0, 600)
	}
	// o navegador só deixa tocar som depois do primeiro clique ou tecla
	if (scene.sound.locked) {
		scene.sound.once('unlocked', comecar)
	}
	else {
		comecar()
	}
}

export function parar_musica(ms = 400) {
	const antiga = atual
	atual = null
	if (antiga) {
		fade(antiga, 0, ms, () => antiga.destroy())
	}
}

// N liga e desliga só a música (os efeitos continuam)
export function tecla_musica(scene) {
	scene.input.keyboard.on('keydown-N', () => {
		if (scene.digitando_nome) return
		ligada = !ligada
		try {
			localStorage.setItem('elf-kill-zombie-musica', ligada ? 'sim' : 'nao')
		}
		catch {
			// sem localStorage: vale só até fechar a página
		}
		if (atual) {
			fade(atual, ligada ? VOLUME : 0, 300)
		}
	})
}
