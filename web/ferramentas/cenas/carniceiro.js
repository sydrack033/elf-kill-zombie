// cenário de teste: o Carniceiro descendo na investida
const s = await teste.comecar()
s.vidas = 99
s.nivel = 9
s.subir_nivel()
teste.ticks(320 + 360)
s.chefe.espera_investida = 1
s.chefe.espera_cuspe = 9999
teste.ticks(70 + 25)
return { nome: s.chefe.nome, etapa: s.chefe.investida && s.chefe.investida.etapa, y: Math.round(s.chefe.y) }
