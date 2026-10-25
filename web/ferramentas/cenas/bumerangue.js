// Bumerangue: vai, faz a curva e volta para a mão, acertando na ida e na volta
const r = []
const s = await teste.comecar()
s.proximo_zumbi = 999999
s.proxima_revoada = 999999
s.vidas = 99
s.pegar('bumerangue')
r.push('arma=' + s.arma + ' municao=' + s.municao)
const z = s.criar_zumbi('brutamontes', s.heroi_x - 20, s.heroi_y - 150)
z.vy = 0; z.vx = 0; z.vida = 50
const vida0 = z.vida
teste.controle = (j) => { j.mira_x = z.x + 33; j.mira_y = z.y + 33; j.atirar_on = true }
teste.ticks(1)
teste.controle = null
const b = s.tiros[0]
let max_dist = 0, voltou = false
for (let i = 0; i < 300 && s.tiros.includes(b); i++) {
	teste.ticks(1)
	max_dist = Math.max(max_dist, Math.hypot(b.x - s.heroi_x, b.y - s.heroi_y))
	if (b.voltando) voltou = true
}
r.push('distância máxima=' + Math.round(max_dist) + ' voltou=' + voltou + ' pegou de volta=' + !s.tiros.includes(b))
r.push('acertos no brutamontes (dano 2 cada)=' + (vida0 - z.vida) / 2)
teste.soltar()
return r.join('\n')