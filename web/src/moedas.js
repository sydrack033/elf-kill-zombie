// Moedas e loja: as partidas rendem moedas, que compram vantagens para o começo de todas as partidas.
// Tudo fica guardado no navegador.
const CHAVE = 'elf-kill-zombie-loja'

// chapéus: só enfeite; comprado uma vez, o jogador escolhe na loja qual usar
export const CHAPEUS = [
	{ id: 'chapeu_gorro', nome: 'GORRO DE NATAL', texto: 'HO HO HO', custo: [80] },
	{ id: 'chapeu_cartola', nome: 'CARTOLA', texto: 'ELEGÂNCIA NO CEMITÉRIO', custo: [100] },
	{ id: 'chapeu_bruxa', nome: 'CHAPÉU DE BRUXA', texto: 'ROUBADO DA BRUXA', custo: [120] },
	{ id: 'chapeu_viking', nome: 'ELMO VIKING', texto: 'PARA GUERREIROS DO NORTE', custo: [150] },
	{ id: 'chapeu_abobora', nome: 'ABÓBORA', texto: 'FELIZ HALLOWEEN', custo: [90] },
	{ id: 'chapeu_pirata', nome: 'CHAPÉU DE PIRATA', texto: 'O TESOURO É DO SAQUEADOR', custo: [180] },
	{ id: 'chapeu_coroa', nome: 'COROA', texto: 'DO REI ZUMBI', custo: [250] },
]

// custo = preço de cada nível (o tamanho da lista é o máximo de vezes que dá para comprar)
export const PRODUTOS = [
	{ id: 'bombas', nome: 'BOLSA DE BOMBAS', texto: '+1 BOMBA NO COMEÇO', custo: [30, 60, 120] },
	{ id: 'vida', nome: 'CORAÇÃO DE CARVALHO', texto: '+1 CORAÇÃO NO COMEÇO', custo: [100, 250] },
	{ id: 'arma', nome: 'HERANÇA', texto: 'COMEÇA COM O TRIPLO', custo: [60] },
	{ id: 'furia', nome: 'SANGUE QUENTE', texto: 'A FÚRIA COMEÇA PELA METADE', custo: [80] },
	{ id: 'ima', nome: 'BOLSO MAGNÉTICO', texto: 'COMEÇA COM O ÍMÃ', custo: [90] },
	{ id: 'melhoria', nome: 'TALENTO', texto: 'COMEÇA COM 1 MELHORIA SORTEADA', custo: [200] },
	{ id: 'reviver', nome: 'SEGUNDA CHANCE', texto: 'VOLTA UMA VEZ QUANDO MORRER', custo: [350] },
	{ id: 'forja', nome: 'FORJA ÉLFICA', texto: 'TODA ARMA JÁ VEM NO NÍVEL II', custo: [400] },
	{ id: 'fada', nome: 'FADA COMPANHEIRA', texto: 'VOA COM VOCÊ E ATIRA FAÍSCAS', custo: [300, 500] },
]

export function ler_loja() {
	try {
		const dados = JSON.parse(localStorage.getItem(CHAVE) || '{}')
		return { moedas: Number(dados.moedas) || 0, compras: dados.compras || {} }
	} catch {
		return { moedas: 0, compras: {} }
	}
}

function gravar_loja(loja) {
	try {
		localStorage.setItem(CHAVE, JSON.stringify(loja))
	} catch {
		// sem localStorage: as moedas valem só até fechar a página
	}
}

// moedas da partida: 1 a cada 400 pontos e 10 por chefão vencido
export function moedas_da_partida(pontos, chefes) {
	return Math.floor(pontos / 400) + chefes * 10
}

export function ganhar_moedas(quantas) {
	const loja = ler_loja()
	loja.moedas += quantas
	gravar_loja(loja)
	return loja.moedas
}

// preço do próximo nível, ou null se já comprou tudo
export function preco(loja, produto) {
	const nivel = loja.compras[produto.id] || 0
	return nivel < produto.custo.length ? produto.custo[nivel] : null
}

// devolve true se comprou
export function comprar(produto) {
	const loja = ler_loja()
	const custo = preco(loja, produto)
	if (custo == null || loja.moedas < custo) {
		return false
	}
	loja.moedas -= custo
	loja.compras[produto.id] = (loja.compras[produto.id] || 0) + 1
	gravar_loja(loja)
	return true
}