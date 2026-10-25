import Phaser from 'phaser'
import '@fontsource/press-start-2p'
import Carregar from './Carregar.js'
import Titulo from './Titulo.js'
import Jogo from './Jogo.js'

// espera a fonte carregar antes de criar o jogo, senão os textos saem com a fonte padrão
document.fonts.load('8px "Press Start 2P"').finally(() => {
	const jogo = new Phaser.Game({
		type: Phaser.AUTO,
		parent: 'jogo',
		pixelArt: true,
		roundPixels: true,
		backgroundColor: '#000000',
		// o jogo ocupa a janela inteira do navegador e acompanha quando ela muda de tamanho
		scale: {
			mode: Phaser.Scale.RESIZE,
			width: window.innerWidth,
			height: window.innerHeight,
		},
		scene: [Carregar, Titulo, Jogo],
	})

	// só no modo de desenvolvimento (npm run dev): deixa o jogo acessível no console do navegador
	if (import.meta.env.DEV) {
		window.jogo = jogo
		import('./teste.js').then((modulo) => modulo.instalar_teste(jogo))
	}
})
