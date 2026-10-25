// cenário de teste: pausa, mexe no volume com as setas e confere que gravou
localStorage.removeItem('elf-kill-zombie-opcoes')
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const tecla = (key, code, keyCode) => {
	for (const tipo of ['keydown', 'keyup']) {
		const ev = new KeyboardEvent(tipo, { key, code, bubbles: true })
		Object.defineProperty(ev, 'keyCode', { get: () => keyCode })
		window.dispatchEvent(ev)
	}
}
const s = await teste.comecar()
teste.soltar()
await espera(200)
tecla('p', 'KeyP', 80)
await espera(150)
const r = { estado: s.estado }
tecla('ArrowLeft', 'ArrowLeft', 37) // música 0.8 -> 0.7
await espera(80)
tecla('ArrowLeft', 'ArrowLeft', 37) // -> 0.6
await espera(80)
tecla('ArrowDown', 'ArrowDown', 40) // vai para efeitos
await espera(80)
tecla('ArrowRight', 'ArrowRight', 39) // efeitos 0.8 -> 0.9
await espera(150)
r.opcoes = JSON.parse(localStorage.getItem('elf-kill-zombie-opcoes'))
r.linha = s.linha_escolhida
return r
