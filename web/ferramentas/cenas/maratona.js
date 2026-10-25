// Maratona: passa por todas as fases (1 a 58, passando pelo final e pelo modo infinito) com o piloto, alguns segundos em cada, e mata os chefões;
// serve para pegar erros em cenários, chefões e perigos que o piloto normal não alcança.
// (com o teste controlando os ticks as animações ficam paradas, então partículas se acumulam: é normal aqui)
const s = await teste.comecar()
const r = { erros: [], fases: [] }
for (let fase = 1; fase <= 58; fase++) {
	s.nivel = fase - 1
	s.vidas_max = 999 // (o Coração Extra cortaria as vidas de teste para o máximo normal)
	s.vidas = 99
	s.subir_nivel()
	const res = teste.piloto(fase % 5 == 0 ? 900 : 500)
	if (res.erro) r.erros.push('fase ' + fase + ': ' + res.erro)
	if (s.chefe) s.ferir_chefe(99999, s.chefe.x + 60, s.chefe.y + 60)
	teste.ticks(150)
	if (s.estado == 'final') {
		// final do jogo: escolhe continuar (sem esperar a máquina de escrever)
		s.opcoes_do_final(s.objetos_final)
		s.botoes_do_final.sair(true)
		teste.ticks(5)
	}
	r.fases.push(fase + ':' + s.cenario().nome + (s.estado != 'jogando' ? ' (' + s.estado + ')' : ''))
	if (s.estado == 'fim') {
		r.erros.push('morreu na fase ' + fase)
		break
	}
}
teste.soltar()
return r