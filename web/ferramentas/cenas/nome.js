// cenário de teste: entra no placar, digita o nome (com F, M e N) e confere que salvou
localStorage.removeItem('elf-kill-zombie-placar')
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const s = await teste.comecar()
teste.soltar()
s.pontos = 12345
s.vidas = 1
s.invencivel = 0
s.perder_vida()
await espera(1800) // a animação do elfo caindo vem antes do placar
const tecla = (key, keyCode) => {
	for (const tipo of ['keydown', 'keyup']) {
		const ev = new KeyboardEvent(tipo, { key, bubbles: true })
		Object.defineProperty(ev, 'keyCode', { get: () => keyCode })
		window.dispatchEvent(ev)
	}
}
const mudo_antes = jogo.sound.mute
tecla('f', 70)
await espera(80)
tecla('m', 77)
await espera(80)
tecla('n', 78)
await espera(80)
const digitado = s.instrucao.text
tecla('Enter', 13)
await espera(300)
return { digitado, placar: JSON.parse(localStorage.getItem('elf-kill-zombie-placar')), mudo_antes, mudo_depois: jogo.sound.mute, instrucao: s.instrucao.text, tela_cheia: jogo.scale.isFullscreen }
