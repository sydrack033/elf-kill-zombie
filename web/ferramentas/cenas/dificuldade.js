// joga várias partidas com o piloto automático e resume até que fase ele chega
const resultados = []
for (let partida = 0; partida < 5; partida++) {
	const s = await teste.comecar()
	const r = teste.piloto(90000, { erro_de_mira: 30 })
	resultados.push({ fase: s.nivel, pontos: s.pontos, segundos: Math.round(s.stats.ticks / 100), chefes: s.stats.chefes, erro: r.erro })
	// recomeça como o jogador faria (clique depois do fim de jogo) e espera a cena nova
	s.scene.restart()
	for (let i = 0; i < 50 && !(s.sys.isActive() && s.estado == 'jogando' && s.stats.ticks == 0); i++) {
		await new Promise((ok) => setTimeout(ok, 100))
	}
}
const fases = resultados.map((r) => r.fase)
return { resultados, media_fase: fases.reduce((a, b) => a + b, 0) / fases.length }
