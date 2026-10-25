// Melhorias novas: vampiro, ricochete e estilhaços
const r = []
let s = await teste.comecar()
s.proximo_zumbi = 999999
s.proxima_revoada = 999999
// vampiro
s.melhorias.vampiro = 1
s.vidas = 2
for (let i = 0; i < 30; i++) s.matar_zumbi(s.criar_zumbi('comum', 50, 50))
r.push('vampiro: vidas 2 -> ' + s.vidas)
// estilhaços
s = await teste.comecar()
s.proximo_zumbi = 999999
s.melhorias.estilhacos = 1
const vizinho = s.criar_zumbi('comum', 200, 100); vizinho.vy = 0; vizinho.vida = 1
const alvo = s.criar_zumbi('comum', 180, 100); alvo.vy = 0
s.matar_zumbi(alvo)
const pedacos = s.tiros.length
teste.ticks(30)
r.push('estilhaços: pedaços=' + pedacos + ' vizinho morreu=' + vizinho.morrendo)
// ricochete
s = await teste.comecar()
s.proximo_zumbi = 999999
s.melhorias.ricochete = 1
s.espera_tiro = 0
teste.controle = (j) => { j.mira_x = s.heroi_x - 200; j.mira_y = s.heroi_y - 100; j.atirar_on = true }
teste.ticks(1)
teste.controle = null
const t = s.tiros[0]
let quicou = false
for (let i = 0; i < 200 && s.tiros.includes(t); i++) { teste.ticks(1); if (t.quicou) quicou = true }
r.push('ricochete: quicou=' + quicou + ' vx agora=' + t.vx.toFixed(1))
teste.soltar()
return r.join('\n')