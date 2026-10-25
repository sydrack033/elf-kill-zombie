// cenário de teste: ganha algumas conquistas jogando e abre a tela de conquistas
localStorage.removeItem('elf-kill-zombie-conquistas')
const s = await teste.comecar()
const r = {}
// primeiro sangue + bombardeio: 6 zumbis juntos e uma bomba no meio
s.proximo_zumbi = 999999
for (let i = 0; i < 6; i++) {
	const z = s.criar_zumbi('comum', 100 + (i % 3) * 14, 150 + Math.floor(i / 3) * 14)
	z.vy = 0
	z.vida = 1
}
s.explodir(130, 175, 60, 5)
teste.ticks(5)
r.depois_da_bomba = [...JSON.parse(localStorage.getItem('elf-kill-zombie-conquistas'))]
// arsenal
for (const arma of ['triplo', 'metralhadora', 'laser', 'bazuca']) s.trocar_arma(arma)
r.depois_das_armas = [...JSON.parse(localStorage.getItem('elf-kill-zombie-conquistas'))]
teste.ticks(30)
teste.soltar()
await new Promise((ok) => setTimeout(ok, 400))
return r
