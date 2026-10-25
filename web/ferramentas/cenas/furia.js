// cenário de teste: escavadores saindo da terra e a fúria élfica
const s = await teste.comecar()
s.nivel = 8
s.proximo_zumbi = 999999
s.criar_escavador()
s.criar_escavador()
const escavadores = s.zumbis.filter((z) => z.tipo == 'escavador')
const r = { cavando: escavadores.map((z) => z.cavando) }
teste.ticks(60)
r.meio = escavadores.map((z) => [z.cavando, z.intangivel, z.sprite.visible])
teste.ticks(60)
r.sairam = escavadores.map((z) => [z.cavando, z.intangivel, z.sprite.visible])
// zumbis em volta e fúria cheia
for (let i = 0; i < 8; i++) {
	const a = (i / 8) * Math.PI * 2
	const z = s.criar_zumbi('comum', s.heroi_x - 10 + Math.cos(a) * 70, s.heroi_y - 20 + Math.sin(a) * 50)
	z.vy = 0
}
s.furia = 0.99
s.encher_furia(0.02)
teste.controle = (j) => { j.furia_on = true }
teste.ticks(1)
teste.controle = null
r.tiros_da_furia = s.tiros.length
r.furia_depois = s.furia
teste.ticks(12)
r.mortos = s.stats.mortos
s.cameras.main.resetFX() // o clarão da fúria ficaria parado com a cena pausada
return r
