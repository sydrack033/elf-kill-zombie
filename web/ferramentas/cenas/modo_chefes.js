// Modo chefões: começa já esperando o primeiro chefão, cada vitória pula para o próximo
const r = []
const s = await teste.comecar()
r.push('modo_chefes=' + s.modo_chefes + ' nivel=' + s.nivel + ' estado=' + s.estado)
if (s.estado == 'escolhendo') { s.pode_escolher = true; s.escolher(0) }
s.vidas = 99
teste.ticks(320)
r.push('chefe1=' + (s.chefe && s.chefe.nome) + ' nivel=' + s.nivel)
s.ferir_chefe(99999, s.chefe.x + 60, s.chefe.y + 60)
teste.ticks(130)
r.push('depois estado=' + s.estado + ' nivel=' + s.nivel)
if (s.estado == 'escolhendo') { s.pode_escolher = true; s.escolher(0) }
teste.ticks(320)
r.push('chefe2=' + (s.chefe && s.chefe.nome) + ' nivel=' + s.nivel)
teste.soltar()
return r.join('\n')