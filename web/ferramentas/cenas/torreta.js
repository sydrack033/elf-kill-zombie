// Torreta: atira sozinha e desmonta depois de um tempo
const r = []
const s = await teste.comecar()
s.proximo_zumbi = 999999
s.proxima_revoada = 999999
s.vidas = 99
s.pegar('torreta')
r.push('torretas=' + s.torretas.length)
const zs = [0, 1, 2].map((i) => { const z = s.criar_zumbi('comum', 60 + i * 80, 140); z.vy = 0; z.vx = 0; return z })
teste.ticks(200)
r.push('mortos pela torreta=' + zs.filter((z) => z.morrendo).length + ' acertos contados=' + s.stats.acertos)
s.pegar('torreta'); s.pegar('torreta')
r.push('máximo 2: ' + s.torretas.length)
teste.ticks(1300)
r.push('depois do tempo: ' + s.torretas.length)
teste.soltar()
return r.join('\n')