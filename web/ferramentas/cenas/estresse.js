// cenário de teste: tela lotada (80 zumbis, chuva forte, metralhadora) e mede os quadros por segundo
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const s = await teste.comecar()
s.vidas = 999
s.nivel = 15
s.pintar_noite()
s.trocar_arma('metralhadora')
s.municao = 99999
s.proximo_zumbi = 999999
for (let i = 0; i < 80; i++) {
	const z = s.criar_zumbi(['comum', 'corredor', 'bombado', 'fantasma', 'cuspidor'][i % 5], (i * 37) % (s.largura - 44), 20 + (i % 8) * 25)
	z.vy = 0.05
	z.vida = 999
}
for (let i = 0; i < 30; i++) s.deixar_mancha(Math.random() * s.largura, Math.random() * 400)
teste.soltar()
// "segura" o tiro o tempo todo
s.input.activePointer.leftButtonDown = () => true
s.mouse_mexeu = true
await espera(1500)
const quadros_antes = jogo.loop.frame
const t0 = performance.now()
await espera(4000)
const fps = ((jogo.loop.frame - quadros_antes) * 1000) / (performance.now() - t0)
return { fps: Math.round(fps), zumbis: s.zumbis.length, tiros: s.tiros.length, gotas: s.gotas.length, objetos: s.children.list.length, ticks: s.stats.ticks }
