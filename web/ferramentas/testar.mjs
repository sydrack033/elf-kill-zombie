// Abre o jogo num Chrome invisível, roda um trecho de JavaScript na página e tira fotos.
// Precisa do servidor de desenvolvimento rodando (npm run dev).
//
//   node ferramentas/testar.mjs --js "await teste.comecar(); return teste.piloto(3000)"
//   node ferramentas/testar.mjs --tamanho 1280x720 --foto titulo.png
//   node ferramentas/testar.mjs --arquivo cenario.js --foto fim.png
//
// O trecho roda dentro de uma função async, então pode usar await e return.

import puppeteer from 'puppeteer-core'
import { readFileSync, existsSync } from 'node:fs'

const args = process.argv.slice(2)
function opcao(nome, padrao) {
	const i = args.indexOf('--' + nome)
	return i >= 0 ? args[i + 1] : padrao
}

const CHROMES = [
	'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
	'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
]
const executavel = CHROMES.find((c) => existsSync(c))
const [largura, altura] = opcao('tamanho', '1280x720').split('x').map(Number)
const endereco = opcao('url', 'http://localhost:5173')
const arquivo = opcao('arquivo', null)
const js = arquivo ? readFileSync(arquivo, 'utf8') : opcao('js', null)
const foto = opcao('foto', null)
const esperar = Number(opcao('esperar', '0'))

// --celular simula um telefone com tela de toque
const celular = args.includes('--celular')
const navegador = await puppeteer.launch({
	executablePath: executavel,
	headless: true,
	args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
	defaultViewport: celular
		? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }
		: { width: largura, height: altura },
})
const erros = []
try {
	const pagina = await navegador.newPage()
	pagina.on('pageerror', (e) => erros.push('pageerror: ' + e.message))
	pagina.on('console', (m) => {
		if (m.type() == 'error') erros.push('console: ' + m.text())
	})
	await pagina.goto(endereco, { waitUntil: 'load' })
	if (args.includes('--offline')) {
		// versão publicada: espera o service worker guardar tudo, corta a internet e recarrega
		await pagina.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, { timeout: 30000 }).catch(() => {})
		await pagina.reload({ waitUntil: 'load' })
		await new Promise((r) => setTimeout(r, 3000))
		await pagina.setOfflineMode(true)
		await pagina.reload({ waitUntil: 'load' })
		await new Promise((r) => setTimeout(r, 4000))
		console.log('offline: ' + JSON.stringify(await pagina.evaluate(() => ({ canvas: !!document.querySelector('canvas'), controlado: !!(navigator.serviceWorker && navigator.serviceWorker.controller) }))))
	}
	else if (!args.includes('--sem-teste')) {
		await pagina.waitForFunction(() => window.teste && window.jogo, { timeout: 30000 })
	}

	if (js) {
		const resultado = await pagina.evaluate(`(async () => { ${js} })()`)
		console.log(JSON.stringify(resultado, null, 1))
	}
	if (esperar) {
		await new Promise((r) => setTimeout(r, esperar))
	}
	if (foto) {
		// dá um tempinho para o próximo quadro ser desenhado
		await new Promise((r) => setTimeout(r, 150))
		await pagina.screenshot({ path: foto })
		console.log('foto: ' + foto)
	}
}
finally {
	if (erros.length) {
		console.log('ERROS:\n' + erros.join('\n'))
	}
	await navegador.close()
}
