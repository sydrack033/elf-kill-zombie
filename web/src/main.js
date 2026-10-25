import Phaser from 'phaser'
import '@fontsource/silkscreen/400.css'
import '@fontsource/silkscreen/700.css'
import Carregar from './Carregar.js'
import Titulo from './Titulo.js'
import Jogo from './Jogo.js'
import ConquistasCena from './ConquistasCena.js'

// espera a fonte carregar antes de criar o jogo, senão os textos saem com a fonte padrão
Promise.all([document.fonts.load('8px Silkscreen'), document.fonts.load('bold 8px Silkscreen')]).finally(() => {
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
		input: { gamepad: true }, // controle de videogame (Xbox, PlayStation...)
		scene: [Carregar, Titulo, Jogo, ConquistasCena],
	})

	// na versão publicada (npm run build), registra o service worker para funcionar sem internet
	if (import.meta.env.PROD && 'serviceWorker' in navigator) {
		navigator.serviceWorker.register('sw.js').catch(() => {
			// sem service worker o jogo funciona igual, só não fica disponível offline
		})
	}

	// só no modo de desenvolvimento (npm run dev): deixa o jogo acessível no console do navegador
	if (import.meta.env.DEV) {
		window.jogo = jogo
		import('./teste.js').then((modulo) => modulo.instalar_teste(jogo))
	}
})
