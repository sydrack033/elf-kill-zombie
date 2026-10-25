// Necromante: 5º chefão, com escudo de ossos e mortos que levantam das manchas
const r = []
const s = await teste.comecar()
s.vidas = 99
s.proximo_zumbi = 999999
// manchas no chão perto do elfo para ele levantar
for (let i = 0; i < 6; i++) s.deixar_mancha(s.heroi_x - 60 + i * 25, s.heroi_y - 80)
s.nivel = 24
s.subir_nivel()
if (s.estado == 'escolhendo') { s.pode_escolher = true; s.escolher(0) }
teste.ticks(310)
const ch = s.chefe
r.push('chefe=' + (ch && ch.nome) + ' ataques=' + (ch && ch.ataques.join(',')))
while (ch.fase == 'entrando') teste.ticks(10)
teste.ticks(80)
r.push('ossos=' + ch.ossos.length)
const vida0 = ch.vida
teste.controle = (j) => { const c = ch.sprite; j.mira_x = ch.x + 64; j.mira_y = ch.y + 70; j.atirar_on = true }
let quebrados = 0
for (let i = 0; i < 400; i++) { const antes = ch.ossos.length; teste.ticks(1); if (ch.ossos.length < antes) quebrados += antes - ch.ossos.length }
r.push('quebrados=' + quebrados)
r.push('ossos depois dos tiros=' + ch.ossos.length + ' vida ' + vida0 + ' -> ' + ch.vida)
const zumbis = s.zumbis.filter((z) => z.tipo == 'comum').length
r.push('zumbis levantados=' + zumbis)
teste.controle = null
s.ferir_chefe(99999, ch.x + 60, ch.y + 60)
teste.ticks(140)
r.push('depois: chefe=' + !!s.chefe + ' nivel=' + s.nivel)
teste.soltar()
return r.join('\n')