// cenário de teste: modo 2 jogadores (P1 no WASD, P2 nas setas atirando sozinho)
// rode com:  --local '{"elf-kill-zombie-opcoes": {"jogadores": 2}}'
const s = await teste.comecar()
const r = { tem_p2: !!s.p2 }
s.proximo_zumbi = 999999
const k = s.teclas
// P1 para a esquerda (A) e P2 para a direita (seta) ao mesmo tempo
const p1_antes = s.heroi_x
const p2_antes = s.p2.x
k.a.isDown = true
k.direita.isDown = true
teste.ticks(60)
k.a.isDown = false
k.direita.isDown = false
r.p1_andou = Math.round(s.heroi_x - p1_antes)
r.p2_andou = Math.round(s.p2.x - p2_antes)
// zumbi em cima do P2: ele mira e atira sozinho
const z = s.criar_zumbi('comum', s.p2.x - 10, s.p2.y - 140)
z.vy = 0
z.vida = 4
teste.ticks(200)
r.p2_matou = z.morrendo
// zumbi perseguidor vai atrás do elfo mais perto
const z2 = s.criar_zumbi('comum', s.p2.x - 10, 100)
z2.vx = 0.5
r.alvo_do_zumbi = s.heroi_mais_perto(z2.x + 22, z2.y).x == s.p2.x ? 'P2' : 'P1'
// mordida no P2 tira vida do time
const vidas = s.vidas
s.invencivel = 0
const z3 = s.criar_zumbi('comum', s.p2.x - 10, s.p2.y - 20)
z3.vy = 0
teste.ticks(2)
r.vidas = [vidas, s.vidas]
return r
