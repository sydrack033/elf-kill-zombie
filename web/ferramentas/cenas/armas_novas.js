// cenário de teste: lança-chamas num grupo e raio pulando entre zumbis
const s = await teste.comecar()
s.proximo_zumbi = 999999
s.mouse_mexeu = true
const r = {}
const grupo = []
for (let i = 0; i < 4; i++) {
	const z = s.criar_zumbi('comum', s.heroi_x - 30 + i * 22, s.heroi_y - 90)
	z.vy = 0
	z.vida = 6
	grupo.push(z)
}
s.pegar('lancachamas')
teste.controle = (j) => {
	j.mira_x = j.heroi_x + 12
	j.mira_y = j.heroi_y - 90
	j.atirar_on = true
}
teste.ticks(150)
r.lancachamas = { vidas: grupo.map((z) => z.vida), mortos: grupo.filter((z) => z.morrendo).length, tiros_na_tela: s.tiros.length, municao: s.municao }
teste.controle = null
// raio: 4 zumbis em fila, mira no primeiro
const fila = []
for (let i = 0; i < 4; i++) {
	const z = s.criar_zumbi('comum', 40 + i * 50, 120)
	z.vy = 0
	z.vida = 10
	fila.push(z)
}
s.heroi_x = 40
s.pegar('raio')
s.espera_tiro = 0
teste.controle = (j) => {
	j.mira_x = 62
	j.mira_y = 140
	j.atirar_on = true
}
teste.ticks(1)
teste.controle = null
r.raio = { vidas: fila.map((z) => z.vida), raios: s.raios.length, pontos: s.raios[0] && s.raios[0].pontos.length }
teste.ticks(3)
return r
