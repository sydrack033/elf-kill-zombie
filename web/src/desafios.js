// Desafios do dia: 3 missões sorteadas pela data (iguais para o dia inteiro), cumpridas numa partida só.
// Cada uma dá moedas uma vez por dia.
const CHAVE = 'elf-kill-zombie-desafios'
export const PREMIO = 25

// confere(r) recebe o resumo da partida e diz se a missão foi cumprida
const MISSOES = [
	{ id: 'corredores', texto: 'MATE 25 CORREDORES', confere: (r) => (r.por_tipo.corredor || 0) >= 25 },
	{ id: 'brutamontes', texto: 'MATE 8 BRUTAMONTES', confere: (r) => (r.por_tipo.brutamontes || 0) >= 8 },
	{ id: 'corvos', texto: 'MATE 10 CORVOS', confere: (r) => (r.por_tipo.corvo || 0) >= 10 },
	{ id: 'fase10', texto: 'CHEGUE À FASE 10', confere: (r) => r.fase >= 10 },
	{ id: 'fase15', texto: 'CHEGUE À FASE 15', confere: (r) => r.fase >= 15 },
	{ id: 'chefes2', texto: 'VENÇA 2 CHEFÕES', confere: (r) => r.chefes >= 2 },
	{ id: 'combo25', texto: 'FAÇA UM COMBO DE 25', confere: (r) => r.melhor_combo >= 25 },
	{ id: 'pontos', texto: 'FAÇA 30.000 PONTOS', confere: (r) => r.pontos >= 30000 },
	{ id: 'lapides', texto: 'QUEBRE 5 LÁPIDES', confere: (r) => r.lapides >= 5 },
	{ id: 'elites', texto: 'MATE 3 ZUMBIS DE ELITE', confere: (r) => r.elites >= 3 },
	{ id: 'horda', texto: 'SOBREVIVA A UMA HORDA', confere: (r) => r.hordas >= 1 },
	{ id: 'explosoes', texto: 'MATE 15 ZUMBIS COM EXPLOSÕES', confere: (r) => r.por_explosao >= 15 },
	{ id: 'mira', texto: 'TERMINE COM 60% DE PONTARIA (100+ TIROS)', confere: (r) => r.disparos >= 100 && r.acertos / r.disparos >= 0.6 },
	{ id: 'zumbis150', texto: 'MATE 150 ZUMBIS', confere: (r) => r.mortos >= 150 },
]

export function dia_de_hoje() {
	const d = new Date()
	return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

// sorteio com semente: a mesma data dá sempre as mesmas missões
function sortear_do_dia(dia) {
	let semente = dia
	const aleatorio = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648)
	const lista = MISSOES.slice()
	for (let i = lista.length - 1; i > 0; i--) {
		const j = Math.floor(aleatorio() * (i + 1))
		;[lista[i], lista[j]] = [lista[j], lista[i]]
	}
	return lista.slice(0, 3)
}

function ler_feitas(dia) {
	try {
		const dados = JSON.parse(localStorage.getItem(CHAVE) || '{}')
		return dados.dia == dia && Array.isArray(dados.feitas) ? dados.feitas : []
	} catch {
		return []
	}
}

// as missões de hoje: [{ id, texto, feita }]
export function desafios_de_hoje() {
	const dia = dia_de_hoje()
	const feitas = ler_feitas(dia)
	return sortear_do_dia(dia).map((m) => ({ id: m.id, texto: m.texto, feita: feitas.includes(m.id) }))
}

// confere a partida que acabou (pelo dia em que ela começou); devolve as missões cumpridas agora
export function conferir_desafios(dia, resumo) {
	const feitas = ler_feitas(dia)
	const novas = sortear_do_dia(dia).filter((m) => !feitas.includes(m.id) && m.confere(resumo))
	if (novas.length) {
		try {
			localStorage.setItem(CHAVE, JSON.stringify({ dia, feitas: feitas.concat(novas.map((m) => m.id)) }))
		} catch {
			// sem localStorage: não guarda
		}
	}
	return novas
}