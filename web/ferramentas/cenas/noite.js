// cenário de teste: fase 7 de noite, com chuva, raio, manchas de sangue e os zumbis novos
const s = await teste.comecar()
s.nivel = 6
s.subir_nivel()
if (s.estado == 'escolhendo') {
	s.pode_escolher = true
	s.escolher(0)
}
s.proximo_zumbi = 999999
s.criar_zumbi('bombado', 60, 140)
s.criar_zumbi('bombado', 100, 150)
s.criar_zumbi('comum', 140, 150)
const fantasma = s.criar_zumbi('fantasma', s.largura - 120, 160)
const fantasma2 = s.criar_zumbi('fantasma', s.largura - 60, 160)
fantasma2.ciclo = 230
for (const z of s.zumbis) z.vy = 0
teste.ticks(60)
// mata o primeiro bombado com tiros para ver a reação em cadeia
const r = { antes: s.zumbis.map((z) => z.tipo + ':' + z.vida) }
s.ferir_zumbi(s.zumbis[0], 99)
teste.ticks(14)
r.depois = s.zumbis.map((z) => z.tipo + ':' + z.vida + (z.morrendo ? ' morto' : ''))
r.intangivel = [fantasma.intangivel, fantasma2.intangivel]
for (let i = 0; i < 8; i++) s.deixar_mancha(40 + i * 30, 300 + (i % 3) * 20)
s.proximo_trovao = 1
teste.ticks(2)
r.gotas = s.gotas.length
r.manchas = s.manchas.length
return r
