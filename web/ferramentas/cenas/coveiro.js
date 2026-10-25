// Coveiro: a lápide segura os tiros de frente até quebrar
const r = []
const s = await teste.comecar()
s.proximo_zumbi = 999999
s.proxima_revoada = 999999
s.vidas = 99
const z = s.criar_zumbi('coveiro', s.heroi_x - 10, 120)
z.vy = 0
z.vx = 0
r.push('escudo=' + z.escudo + ' vida=' + z.vida)
teste.controle = (j) => { j.mira_x = z.x + 22; j.mira_y = z.y + 22; j.atirar_on = true }
teste.ticks(40)
r.push('depois de alguns tiros: escudo=' + z.escudo + ' vida=' + z.vida + ' frame=' + (z.lapide && z.lapide.frame.name))
teste.ticks(30)
const fotografar = z.escudo
r.push('mais tiros: escudo=' + z.escudo + ' lapide=' + !!z.lapide + ' vida=' + z.vida)
teste.ticks(200)
teste.controle = null
r.push('no fim: morrendo=' + z.morrendo)
return r.join('\n')