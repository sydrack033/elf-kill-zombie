// cenário de teste: uma revoada de corvos atravessando a tela
const s = await teste.comecar()
s.nivel = 3
s.proximo_zumbi = 999999
s.proxima_revoada = 1
teste.ticks(2)
const corvos = s.zumbis.filter((z) => z.tipo == 'corvo')
const r = { corvos: corvos.length, inicio: corvos.map((c) => [Math.round(c.x), Math.round(c.y)]) }
teste.ticks(120)
r.depois = corvos.map((c) => [Math.round(c.x), Math.round(c.y), c.morrendo])
// mata um com tiro direto
s.ferir_zumbi(corvos[0], 1)
teste.ticks(2)
r.ficaram = s.zumbis.filter((z) => z.tipo == 'corvo').length
r.vidas = s.vidas
return r
