// cenário de teste no celular: joystick, tiro automático, mira com o dedo e botão de bomba
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const s = await teste.comecar()
teste.soltar() // aqui o jogo roda sozinho, de verdade
const canvas = document.querySelector('canvas')
const cam = s.cameras.main

// converte um ponto do mundo do jogo para a tela
const na_tela = (x, y) => ({ x: (x - cam.worldView.x) * cam.zoom + cam.x, y: (y - cam.worldView.y) * cam.zoom + cam.y })

const dedos = {}
function tocar(tipo, id, x, y) {
	if (tipo == 'touchend') delete dedos[id]
	else dedos[id] = new Touch({ identifier: id, target: canvas, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y })
	const toque = new Touch({ identifier: id, target: canvas, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y })
	const lista = Object.values(dedos)
	canvas.dispatchEvent(new TouchEvent(tipo, { touches: lista, targetTouches: lista, changedTouches: [toque], bubbles: true, cancelable: true }))
}

const r = {}
r.camera = { zoom: cam.zoom, x: cam.x, y: cam.y, w: cam.width, h: cam.height, largura: s.largura }

// primeiro toque liga o modo de toque
tocar('touchstart', 1, 60, 700)
await espera(100)
tocar('touchend', 1, 60, 700)
await espera(100)
r.modo_toque = s.modo_toque

// joystick: dedo na esquerda arrastado para a direita
const x0 = s.heroi_x
tocar('touchstart', 2, 80, 650)
await espera(50)
tocar('touchmove', 2, 120, 650)
await espera(1000)
r.andou = s.heroi_x - x0
r.joystick_visivel = s.joystick_base.visible
tocar('touchend', 2, 120, 650)
await espera(100)
r.joystick_some = !s.joystick_base.visible

// tiro automático: coloca um zumbi parado na frente e espera
s.zumbis.forEach((z) => z.sprite.destroy())
s.zumbis = []
s.proximo_zumbi = 999999
const z = s.criar_zumbi('comum', s.heroi_x - 10, 150)
z.vy = 0
const disparos = s.stats.disparos
await espera(1500)
r.tiro_automatico = { disparos: s.stats.disparos - disparos, vida_do_zumbi: z.vida, morreu: z.morrendo }

// mira com o dedo direito: atira para o canto de cima à direita
const alvo = na_tela(s.largura - 10, 10)
tocar('touchstart', 3, alvo.x, alvo.y)
await espera(300)
r.mira_manual = { mira_x: Math.round(s.mira_x), mira_y: Math.round(s.mira_y), atirando: s.atirar_on }
tocar('touchend', 3, alvo.x, alvo.y)

// botão de bomba
const bombas = s.bombas
const b = na_tela(s.botao_bomba.x, s.botao_bomba.y)
tocar('touchstart', 4, b.x, b.y)
await espera(150)
tocar('touchend', 4, b.x, b.y)
await espera(100)
r.bomba = { antes: bombas, depois: s.bombas }

// botão de pausa e tocar para continuar
const p = na_tela(s.botao_pausa.x, s.botao_pausa.y)
tocar('touchstart', 5, p.x, p.y)
tocar('touchend', 5, p.x, p.y)
await espera(200)
r.pausou = s.estado
r.mensagem = s.mensagem.text
tocar('touchstart', 6, 200, 400)
tocar('touchend', 6, 200, 400)
await espera(200)
r.voltou = s.estado
return r
