// Bateria de verificações das regras do jogo. Cada item imprime OK ou FALHOU.
//   node ferramentas/testar.mjs --arquivo ferramentas/cenas/verificar.js
const resultados = []
function confere(nome, condicao, detalhe = '') {
	resultados.push((condicao ? 'OK      ' : 'FALHOU  ') + nome + (detalhe && !condicao ? '  (' + detalhe + ')' : ''))
}

// começa uma partida limpa (sem zumbis aparecendo sozinhos)
async function nova_partida() {
	const s = await teste.comecar()
	s.proximo_zumbi = 999999
	s.proxima_revoada = 999999
	s.proximo_item = 999999
	s.invencivel = 0
	return s
}

// meta de mortes de uma fase (igual a R.MORTES_POR_NIVEL)
const R_MORTES = (nivel) => 10 + 2 * nivel

// tira todos os zumbis da tela (para um teste não atrapalhar o outro)
function limpar() {
	s.zumbis.forEach((zz) => zz.sprite.destroy())
	s.zumbis = []
	s.invencivel = 0
}

let s = await nova_partida()

// ---- elfo
const x0 = s.heroi_x
s.teclas.d.isDown = true
teste.ticks(50)
s.teclas.d.isDown = false
confere('elfo anda para a direita com D', s.heroi_x > x0 + 50, 'andou ' + (s.heroi_x - x0))
s.heroi_y = 0
teste.ticks(1)
confere('elfo não sobe além da parte de baixo da tela', s.heroi_y >= 400 * 0.55)

// ---- tiro e dano
let z = s.criar_zumbi('comum', s.heroi_x - 10, s.heroi_y - 120)
z.vy = 0
z.vida = 1
teste.controle = (j) => { j.mira_x = z.x + 22; j.mira_y = z.y + 22; j.atirar_on = true }
teste.ticks(60)
teste.controle = null
confere('tiro mata zumbi de 1 de vida', z.morrendo)
confere('matar dá pontos', s.pontos > 0, 'pontos ' + s.pontos)
confere('matar conta para a fase', s.mortes_no_nivel == 1)

// ---- mordida e vidas
limpar()
const vidas = s.vidas
z = s.criar_zumbi('comum', s.heroi_x - 10, s.heroi_y - 20)
z.vy = 0
teste.ticks(2)
confere('mordida tira uma vida', s.vidas == vidas - 1)
confere('depois de apanhar fica invencível', s.invencivel > 0)
const vidas2 = s.vidas
z = s.criar_zumbi('comum', s.heroi_x - 10, s.heroi_y - 20)
z.vy = 0
teste.ticks(2)
confere('invencível não perde vida', s.vidas == vidas2)

// ---- escudo
limpar()
s.pegar('escudo')
const vidas3 = s.vidas
z = s.criar_zumbi('comum', s.heroi_x - 10, s.heroi_y - 20)
z.vy = 0
teste.ticks(2)
confere('escudo segura a mordida', s.vidas == vidas3 && s.poderes.escudo == 0)

// ---- zumbi que passa custa vida
limpar()
const vidas4 = s.vidas
z = s.criar_zumbi('comum', 0, 399)
z.vy = 3
teste.ticks(3)
confere('zumbi que foge por baixo custa vida', s.vidas == vidas4 - 1)

// ---- armas e munição
s.pegar('triplo')
confere('pegar triplo troca a arma', s.arma == 'triplo' && s.municao == 40)
s.municao = 1
s.espera_tiro = 0
teste.controle = (j) => { j.atirar_on = true }
teste.ticks(1)
teste.controle = null
confere('munição acaba e volta para a pistola', s.arma == 'pistola')

// ---- bomba
limpar()
const grupo = [0, 1, 2].map((i) => {
	const zz = s.criar_zumbi('comum', 100 + i * 15, 150)
	zz.vy = 0
	zz.vida = 2
	return zz
})
const bombas = s.bombas
s.espera_bomba = 0
teste.controle = (j) => { j.mira_x = 137; j.mira_y = 172; j.bomba_on = true }
teste.ticks(1)
teste.controle = null
confere('bomba gasta uma do estoque', s.bombas == bombas - 1)
teste.ticks(120)
confere('explosão da bomba mata o grupo', grupo.every((zz) => zz.morrendo))

// ---- melhoria
s.melhorias = {}
s.nivel = 1
s.subir_nivel()
confere('fase par oferece melhoria', s.estado == 'escolhendo' && s.opcoes.length == 3)
s.pode_escolher = true
const escolhida = s.opcoes[0].id
s.escolher(0)
confere('escolher aplica a melhoria', s.m(escolhida) == 1 && s.estado == 'jogando')

// ---- combo
s.combo = 0
s.combo_ha = 0
for (let i = 0; i < 5; i++) {
	const zz = s.criar_zumbi('comum', 20 + i * 30, 100)
	s.matar_zumbi(zz)
}
confere('5 mortes seguidas dão combo x2', s.multiplicador == 2, 'x' + s.multiplicador)

// ---- chefão
s = await nova_partida()
s.vidas = 99
s.nivel = 4
s.subir_nivel()
teste.ticks(310)
confere('fase 5 chama o chefão', !!s.chefe && s.chefe.nome == 'O REI ZUMBI')
s.ferir_chefe(9999, s.chefe.x + 60, s.chefe.y + 60)
teste.ticks(125)
if (s.estado == 'escolhendo') {
	s.pode_escolher = true
	s.escolher(0)
}
confere('vencer o chefão sobe de fase', !s.chefe && s.nivel == 6)

// ---- cenário
s.nivel = 9
s.subir_nivel()
confere('fase 10 troca para o pântano', s.chao.texture.key == 'chao_pantano')

// ---- pausa
s = await nova_partida()
s.pausar()
const quadro = s.quadro_atual
s.update(0, 500)
confere('pausado o jogo não anda', s.quadro_atual == quadro)
s.pausar()
confere('despausar volta a jogar', s.estado == 'jogando')

// ---- fim de jogo
s.vidas = 1
s.invencivel = 0
s.perder_vida()
confere('última vida acaba o jogo', s.estado == 'fim')

// ---- coveiro: tiro de frente bate na lápide
s = await nova_partida()
z = s.criar_zumbi('coveiro', s.heroi_x - 10, s.heroi_y - 150)
z.vy = 0
z.vx = 0
const escudo0 = z.escudo
const vida0 = z.vida
teste.controle = (j) => { j.mira_x = z.x + 22; j.mira_y = z.y + 22; j.atirar_on = true }
teste.ticks(40)
teste.controle = null
confere('tiro de frente gasta a lápide e não o coveiro', z.escudo < escudo0 && z.vida == vida0)

// ---- gosma se divide uma vez
limpar()
z = s.criar_zumbi('gosma', 200, 100)
s.matar_zumbi(z)
const filhos = s.zumbis.filter((q) => q.filhote && !q.morrendo)
confere('gosma vira duas gosminhas', filhos.length == 2)
s.matar_zumbi(filhos[0])
confere('gosminha não se divide de novo', s.zumbis.filter((q) => q.filhote).length == 2)

// ---- bumerangue volta para a mão
limpar()
s.pegar('bumerangue')
s.espera_tiro = 0
teste.controle = (j) => { j.mira_x = s.heroi_x + 12; j.mira_y = 40; j.atirar_on = true }
teste.ticks(1)
teste.controle = null
const bum = s.tiros.find((t) => t.arma.volta)
for (let i = 0; i < 300 && s.tiros.includes(bum); i++) teste.ticks(1)
confere('bumerangue volta e é pego', bum && bum.voltando && !s.tiros.includes(bum))

// ---- horda: começa na metade da fase 8 e dá prêmio
s = await nova_partida()
s.vidas = 99
s.nivel = 8
for (let i = 0; i < Math.floor(R_MORTES(8) / 2); i++) s.matar_zumbi(s.criar_zumbi('comum', 50, 50))
confere('horda começa na metade da fase 8', !!s.horda)
teste.ticks(410)
for (const zz of s.horda ? s.horda.zumbis : []) if (!zz.morrendo) s.matar_zumbi(zz)
const extras = s.moedas_extras
teste.ticks(2)
confere('horda vencida dá moedas', !s.horda && s.moedas_extras >= extras + 10)

// ---- segunda chance
s = await nova_partida()
s.pode_reviver = true
s.vidas = 1
s.perder_vida()
confere('segunda chance salva da morte', s.estado == 'jogando' && s.vidas == 1)
s.invencivel = 0
s.perder_vida()
confere('segunda chance só vale uma vez', s.estado == 'fim')

// ---- saqueador
s = await nova_partida()
s.criar_zumbis = () => {} // só o saqueador na tela
for (const z of s.zumbis) { z.morrendo = true; z.morto_ha = 75 }
s.proxima_revoada = 999999
s.nivel = 4
s.proximo_saqueador = 1
teste.ticks(2)
let ladrao = s.zumbis.find((z) => z.tipo == 'saqueador')
s.ferir_zumbi(ladrao, 99)
confere('saqueador morto espalha moedas', s.moedas.length >= 6)
s.proximo_saqueador = 1
teste.ticks(2)
ladrao = s.zumbis.find((z) => z.tipo == 'saqueador' && !z.morrendo)
const vidas_antes = s.vidas
teste.ticks(1500)
confere('saqueador que foge não custa vida', !s.zumbis.includes(ladrao) && s.vidas == vidas_antes)
delete s.criar_zumbis // a cena é a mesma nas próximas partidas

// ---- chefão final na fase 50
s = await nova_partida()
s.vidas = 99
s.nivel = 49
s.subir_nivel()
teste.ticks(310)
confere('fase 50 chama o chefão final', !!s.chefe && s.chefe.final)
s.ferir_chefe(999999, s.chefe.x + 60, s.chefe.y + 60)
teste.ticks(140)
confere('vencer o chefão final mostra o final', s.estado == 'final')
teste.soltar()
return resultados.join('\n')
