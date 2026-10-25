// Desafios do dia: 3 missões sorteadas pela data (iguais para o dia inteiro), cumpridas numa partida só.
// Cada uma dá moedas uma vez por dia.
const CHAVE = 'elf-kill-zombie-desafios'
export const PREMIO = 25

// valor(r) tira do resumo da partida o número que conta; cumpriu quando chega na meta
const MISSOES = [
	{ id: 'corredores', texto: 'MATE 25 CORREDORES', meta: 25, valor: (r) => r.por_tipo.corredor || 0 },
	{ id: 'brutamontes', texto: 'MATE 8 BRUTAMONTES', meta: 8, valor: (r) => r.por_tipo.brutamontes || 0 },
	{ id: 'corvos', texto: 'MATE 10 CORVOS', meta: 10, valor: (r) => r.por_tipo.corvo || 0 },
	{ id: 'fase10', texto: 'CHEGUE À FASE 10', meta: 10, valor: (r) => r.fase },
	{ id: 'fase15', texto: 'CHEGUE À FASE 15', meta: 15, valor: (r) => r.fase },
	{ id: 'chefes2', texto: 'VENÇA 2 CHEFÕES', meta: 2, valor: (r) => r.chefes },
	{ id: 'combo25', texto: 'FAÇA UM COMBO DE 25', meta: 25, valor: (r) => r.melhor_combo },
	{ id: 'pontos', texto: 'FAÇA 30.000 PONTOS', meta: 30000, valor: (r) => r.pontos },
	{ id: 'lapides', texto: 'QUEBRE 5 LÁPIDES', meta: 5, valor: (r) => r.lapides },
	{ id: 'elites', texto: 'MATE 3 ZUMBIS DE ELITE', meta: 3, valor: (r) => r.elites },
	{ id: 'horda', texto: 'SOBREVIVA A UMA HORDA', meta: 1, valor: (r) => r.hordas },
	{ id: 'explosoes', texto: 'MATE 15 ZUMBIS COM EXPLOSÕES', meta: 15, valor: (r) => r.por_explosao },
	{ id: 'mira', texto: 'TERMINE COM 60% DE PONTARIA (100+ TIROS)', meta: 100, valor: (r) => (r.acertos / Math.max(1, r.disparos) >= 0.6 ? r.disparos : 0), so_no_fim: true },
	{ id: 'zumbis150', texto: 'MATE 150 ZUMBIS', meta: 150, valor: (r) => r.mortos },
	{ id: 'saqueadores', texto: 'PEGUE 2 SAQUEADORES', meta: 2, valor: (r) => r.por_tipo.saqueador || 0 },
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
// progresso da partida em andamento em cada desafio de hoje: [{ texto, feita, atual, meta }]
export function progresso_de_hoje(dia, resumo) {
	const feitas = ler_feitas(dia)
	return sortear_do_dia(dia).map((m) => ({ id: m.id, texto: m.texto, feita: feitas.includes(m.id), atual: Math.min(m.meta, m.valor(resumo)), meta: m.meta, so_no_fim: !!m.so_no_fim }))
}

export function desafios_de_hoje() {
	const dia = dia_de_hoje()
	const feitas = ler_feitas(dia)
	return sortear_do_dia(dia).map((m) => ({ id: m.id, texto: m.texto, feita: feitas.includes(m.id) }))
}

// confere a partida que acabou (pelo dia em que ela começou); devolve as missões cumpridas agora
export function conferir_desafios(dia, resumo) {
	const feitas = ler_feitas(dia)
	const novas = sortear_do_dia(dia).filter((m) => !feitas.includes(m.id) && m.valor(resumo) >= m.meta)
	if (novas.length) {
		try {
			localStorage.setItem(CHAVE, JSON.stringify({ dia, feitas: feitas.concat(novas.map((m) => m.id)) }))
		} catch {
			// sem localStorage: não guarda
		}
	}
	return novas
}