// cenário de teste: chefão na tela, um de cada zumbi, escudo e laser
const s = await teste.comecar()
s.nivel = 4
s.subir_nivel()
teste.ticks(320)
s.criar_zumbi('comum', 40, 150)
s.criar_zumbi('corredor', 120, 180)
s.criar_zumbi('brutamontes', s.largura - 140, 150)
s.criar_zumbi('cuspidor', s.largura - 80, 210)
s.pegar('escudo')
s.pegar('laser')
s.mouse_mexeu = true
teste.controle = (j) => {
	j.mira_x = j.chefe ? j.chefe.x + 64 : j.largura / 2
	j.mira_y = j.chefe ? j.chefe.y + 64 : 0
	j.atirar_on = true
}
teste.ticks(140)
teste.controle = null
return { chefe: s.chefe && { vida: s.chefe.vida, fase: s.chefe.fase }, zumbis: s.zumbis.map((z) => z.tipo), cuspes: s.cuspes.length }
