// Horda: na metade da fase 8 vem uma enxurrada de zumbis e, vencida, um prêmio
const r = []
const s = await teste.comecar()
s.vidas = 99
s.nivel = 8
s.mortes_no_nivel = 0
const meta = Math.floor((10 + 2 * 8) / 2)
for (let i = 0; i < meta; i++) s.matar_zumbi(s.criar_zumbi('comum', 50, 50))
r.push('horda começou=' + !!s.horda)
teste.ticks(460)
r.push('zumbis da horda=' + s.horda.zumbis.length)
for (const z of s.horda.zumbis) if (!z.morrendo) s.matar_zumbi(z)
const moedas0 = s.moedas_extras
const itens0 = s.itens.length
teste.ticks(2)
r.push('horda acabou=' + !s.horda + ' moedas=' + (s.moedas_extras - moedas0) + ' caixas=' + (s.itens.length - itens0))
teste.soltar()
return r.join('\n')