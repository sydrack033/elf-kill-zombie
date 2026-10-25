// cenário de teste: um controle de videogame de mentira (analógicos e botões controlados daqui)
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const estado = { eixos: [0, 0, 0, 0], botoes: Array(17).fill(0), tempo: 0 }
const falso = () => ({
	id: 'Controle de teste (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard',
	timestamp: performance.now(), // o Phaser ignora leituras mais antigas que a conexão do controle
	axes: estado.eixos.slice(),
	buttons: estado.botoes.map((v) => ({ pressed: v > 0.5, value: v, touched: v > 0 })),
})
navigator.getGamepads = () => [falso(), null, null, null]
window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: falso() }))

const s = await teste.comecar()
teste.soltar()
s.proximo_zumbi = 999999
await espera(300)
const r = { conectado: s.input.gamepad.total }

// analógico esquerdo para a esquerda
const x0 = s.heroi_x
estado.eixos = [-1, 0, 0, 0]
await espera(600)
r.andou_para_esquerda = Math.round(x0 - s.heroi_x)
estado.eixos = [0, 0, 0, 0]

// analógico direito para cima e para a direita: mira e atira
const disparos = s.stats.disparos
estado.eixos = [0, 0, 0.7, -0.7]
await espera(600)
r.disparos = s.stats.disparos - disparos
r.angulo = Number(s.angulo.toFixed(2))
estado.eixos = [0, 0, 0, 0]

// B: esquiva
estado.botoes[1] = 1
await espera(80)
r.esquivou = s.esquiva_ha > 0 || s.esquiva_espera > 0
estado.botoes[1] = 0

// Start: pausa e despausa
estado.botoes[9] = 1
await espera(100)
estado.botoes[9] = 0
await espera(100)
r.pausou = s.estado
estado.botoes[9] = 1
await espera(100)
estado.botoes[9] = 0
await espera(100)
r.voltou = s.estado
return r
