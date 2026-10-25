// Opções do jogador (volume da música e dos efeitos), guardadas no navegador.

const CHAVE = 'elf-kill-zombie-opcoes'
export const opcoes = { musica: 0.8, efeitos: 0.8 }

try {
	Object.assign(opcoes, JSON.parse(localStorage.getItem(CHAVE) || '{}'))
} catch {
	// sem localStorage ou valor estragado: fica o padrão
}

export function gravar_opcoes() {
	try {
		localStorage.setItem(CHAVE, JSON.stringify(opcoes))
	} catch {
		// sem localStorage: vale só até fechar a página
	}
}

// toca um efeito sonoro respeitando o volume dos efeitos escolhido nas opções
export function efeito(scene, chave, config = {}) {
	return scene.sound.play(chave, { ...config, volume: (config.volume ?? 1) * opcoes.efeitos })
}
