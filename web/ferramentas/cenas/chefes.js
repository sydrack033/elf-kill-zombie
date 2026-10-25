// cenário de teste: chama cada um dos chefões, deixa ele atacar um pouco e mata
const s = await teste.comecar()
s.vidas = 99 // não queremos morrer no teste
const r = []
for (const numero of [1, 2, 3, 4, 5]) {
	s.nivel = numero * 5 - 1
	s.mortes_no_nivel = 0
	s.zumbis.forEach((z) => z.sprite.destroy())
	s.zumbis = []
	s.subir_nivel()
	teste.ticks(320) // chegada
	const visto = { numero, nome: s.chefe && s.chefe.nome, ataques: s.chefe && s.chefe.ataques.join(','), investidas: 0, chuvas: 0, chamados: 0, teleportes: 0 }
	let cuspes_antes = 0
	for (let i = 0; i < 1500; i++) {
		const tinha = s.chefe.investida
		const zumbis = s.zumbis.length
		cuspes_antes = s.cuspes.length
		teste.ticks(1)
		if (!tinha && s.chefe.investida) visto.investidas++
		if (s.chefe.teleporte && s.chefe.teleporte.ha == 1) visto.teleportes++
		if (s.zumbis.length > zumbis) visto.chamados++
		if (s.cuspes.length - cuspes_antes >= 5 && s.cuspes.some((c) => c.vx == 0)) visto.chuvas++
		s.vidas = 99
	}
	s.ferir_chefe(9999, s.chefe.x + 60, s.chefe.y + 60)
	teste.ticks(130)
	if (s.estado == 'escolhendo') {
		s.pode_escolher = true
		s.escolher(0)
	}
	visto.depois = { chefe: !!s.chefe, nivel: s.nivel }
	r.push(visto)
}
return r
