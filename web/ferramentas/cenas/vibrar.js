// Vibração: o controle de mentira registra os pedidos de vibrar
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const pedidos = []
const motor = { playEffect: (tipo, p) => { pedidos.push(tipo + ' ' + p.duration); return Promise.resolve('complete') } }
const falso = () => ({
	id: 'Controle de teste (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard',
	timestamp: performance.now(), axes: [0, 0, 0, 0],
	buttons: Array(17).fill(0).map(() => ({ pressed: false, value: 0, touched: false })),
	vibrationActuator: motor,
})
navigator.getGamepads = () => [falso(), null, null, null]
window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: falso() }))
const s = await teste.comecar()
teste.soltar()
await espera(300)
s.vidas = 5
s.invencivel = 0
s.perder_vida()
s.explodir(100, 100, 46, 3)
return { tem_motor: !!(s.input.gamepad.pad1 && s.input.gamepad.pad1.vibration), pedidos }