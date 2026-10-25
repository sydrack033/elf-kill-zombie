// Correções da revisão: nada de subir de fase depois do fim, toque continua depois de reiniciar
const r = []
let s = await teste.comecar()
s.vidas = 1
s.invencivel = 0
s.perder_vida()
s.nivel = 1
s.subir_nivel()
r.push('fim continua fim: ' + (s.estado == 'fim') + ' nivel=' + s.nivel)
s.ligar_toque()
s = await teste.comecar()
r.push('toque depois de reiniciar: ' + s.modo_toque)
// fúria não conta na pontaria
s.proximo_zumbi = 999999
s.furia = 1
s.furia_on = true
const acertos = s.stats.acertos
for (let i = 0; i < 8; i++) { const z = s.criar_zumbi('comum', s.heroi_x - 40 + i * 12, s.heroi_y - 60); z.vy = 0; z.vida = 99 }
s.soltar_furia()
teste.ticks(40)
r.push('acertos da fúria contados: ' + (s.stats.acertos - acertos))
teste.soltar()
return r.join('\n')