// cenário de teste: pula para a primeira fase de um cenário (passe a fase em window.FASE_DO_TESTE)
const s = await teste.comecar()
s.vidas = 99
s.nivel = (window.FASE_DO_TESTE || 10) - 1
s.subir_nivel()
if (s.estado == 'escolhendo') {
	s.pode_escolher = true
	s.escolher(0)
}
// deixa a troca do chão terminar (ela usa o relógio de verdade)
teste.soltar()
await new Promise((ok) => setTimeout(ok, 2800))
s.scene.pause()
s.proximo_zumbi = 999999
s.criar_zumbi('comum', 60, 200)
s.criar_zumbi('bombado', 140, 160)
teste.ticks(30)
return { fase: s.nivel, cenario: s.cenario().nome, clima: s.clima, gotas: s.gotas.length, aviso: s.aviso.text }
