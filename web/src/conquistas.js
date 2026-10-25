// Conquistas: desafios que ficam guardados no navegador para sempre.
// O jogo chama desbloquear(cena, id) quando o jogador cumpre o desafio.
import { texto } from './tela.js'
import { efeito } from './opcoes.js'

export const CONQUISTAS = [
	{ id: 'primeiro', nome: 'PRIMEIRO SANGUE', texto: 'MATE O PRIMEIRO ZUMBI' },
	{ id: 'cem', nome: 'CENTENA', texto: 'MATE 100 ZUMBIS NUMA PARTIDA' },
	{ id: 'combo20', nome: 'EMBALADO', texto: 'FAÇA UM COMBO DE 20' },
	{ id: 'chefe1', nome: 'O REI CAIU', texto: 'DERROTE O REI ZUMBI' },
	{ id: 'chefe2', nome: 'AÇOUGUE FECHADO', texto: 'DERROTE O CARNICEIRO' },
	{ id: 'chefe3', nome: 'LIMPEZA', texto: 'DERROTE O PODRE' },
	{ id: 'chefe4', nome: 'CAÇA ÀS BRUXAS', texto: 'DERROTE A BRUXA' },
	{ id: 'chefe5', nome: 'DESCANSE EM PAZ', texto: 'DERROTE O NECROMANTE' },
	{ id: 'chefe6', nome: 'EXORCISTA', texto: 'DERROTE O DEMÔNIO' },
	{ id: 'maratona', nome: 'MARATONA', texto: 'VENÇA 4 CHEFÕES NO MODO CHEFÕES' },
	{ id: 'fase10', nome: 'SOBREVIVENTE', texto: 'CHEGUE À FASE 10' },
	{ id: 'fase20', nome: 'LENDA DO CEMITÉRIO', texto: 'CHEGUE À FASE 20' },
	{ id: 'bomba5', nome: 'BOMBARDEIO', texto: 'MATE 5 ZUMBIS COM UMA EXPLOSÃO' },
	{ id: 'intocavel', nome: 'INTOCÁVEL', texto: 'PASSE UMA FASE SEM APANHAR (DA 3 EM DIANTE)' },
	{ id: 'colecao', nome: 'COLECIONADOR', texto: 'TENHA 6 MELHORIAS NUMA PARTIDA' },
	{ id: 'arsenal', nome: 'ARSENAL', texto: 'USE TODAS AS 8 ARMAS NUMA PARTIDA' },
	{ id: 'mira', nome: 'OLHO DE ÁGUIA', texto: 'TERMINE COM 70% DE PONTARIA (200+ TIROS)' },
	{ id: 'rico', nome: 'MILIONÁRIO', texto: 'FAÇA 50.000 PONTOS' },
	{ id: 'pedreiro', nome: 'QUEBRA-PEDRA', texto: 'QUEBRE 10 LÁPIDES NUMA PARTIDA' },
	{ id: 'horda', nome: 'MURALHA', texto: 'DERROTE UMA HORDA' },
	{ id: 'lua', nome: 'NOITE VERMELHA', texto: 'PASSE UMA FASE DE LUA DE SANGUE' },
	{ id: 'loja', nome: 'FREGUÊS', texto: 'COMPRE TUDO NA LOJA' },
]

const CHAVE = 'elf-kill-zombie-conquistas'

export function ler_conquistas() {
	try {
		const lista = JSON.parse(localStorage.getItem(CHAVE) || '[]')
		return new Set(Array.isArray(lista) ? lista : [])
	} catch {
		return new Set()
	}
}

// desbloqueia (se ainda não tinha) e mostra o aviso na tela; devolve true se foi novidade
export function desbloquear(scene, id) {
	const feitas = ler_conquistas()
	if (feitas.has(id)) {
		return false
	}
	feitas.add(id)
	try {
		localStorage.setItem(CHAVE, JSON.stringify([...feitas]))
	} catch {
		// sem localStorage: vale só até fechar a página
	}
	const conquista = CONQUISTAS.find((c) => c.id == id)
	if (conquista) {
		// se a cena acabar no meio de um aviso, a fila recomeça vazia na próxima
		scene.events.once('shutdown', () => {
			mostrando = false
			fila.length = 0
		})
		avisar(scene, conquista)
	}
	return true
}

// os avisos entram numa fila para não ficarem um em cima do outro
const fila = []
let mostrando = false

function avisar(scene, conquista) {
	fila.push(conquista)
	if (!mostrando) {
		proximo(scene)
	}
}

function proximo(scene) {
	const conquista = fila.shift()
	if (!conquista || !scene.sys.isActive()) {
		mostrando = false
		fila.length = 0
		return
	}
	mostrando = true
	const x = scene.largura / 2
	const y = 58
	const fundo = scene.add.rectangle(x, y, 170, 26, 0x1c1630, 0.92).setStrokeStyle(1, 0xffd34d).setDepth(13)
	const trofeu = scene.add.sprite(x - 74, y, 'trofeu', 0).setDepth(13)
	const titulo = texto(scene, x - 64, y - 9, 'CONQUISTA!', 8, '#ffd34d').setDepth(13)
	const nome = texto(scene, x - 64, y + 1, conquista.nome, 8, '#ffffff').setDepth(13)
	const objetos = [fundo, trofeu, titulo, nome]
	for (const o of objetos) o.setAlpha(0)
	efeito(scene, 'item', { volume: 0.5, rate: 1.5 })
	scene.tweens.add({ targets: objetos, alpha: 1, duration: 200 })
	scene.time.delayedCall(2600, () => {
		scene.tweens.add({
			targets: objetos,
			alpha: 0,
			duration: 300,
			onComplete: () => {
				for (const o of objetos) o.destroy()
				proximo(scene)
			},
		})
	})
}
