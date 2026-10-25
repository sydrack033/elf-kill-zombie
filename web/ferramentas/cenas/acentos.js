// compara como algumas fontes pixeladas desenham as letras acentuadas
const fontes = {
	'Press Start 2P': null,
	Silkscreen: '/node_modules/@fontsource/silkscreen/files/silkscreen-latin-400-normal.woff2',
	Tiny5: '/node_modules/@fontsource/tiny5/files/tiny5-latin-400-normal.woff2',
	'Pixelify Sans': '/node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-400-normal.woff2',
}
const estilo = document.createElement('style')
estilo.textContent = Object.entries(fontes)
	.filter(([, url]) => url)
	.map(([nome, url]) => `@font-face { font-family: "${nome}"; src: url(${url}); }`)
	.join('\n')
document.head.appendChild(estilo)
const div = document.createElement('div')
div.style.cssText = 'position:fixed;inset:0;background:#222;color:#fff;padding:16px;z-index:9'
for (const nome of Object.keys(fontes)) {
	const linha = document.createElement('div')
	linha.style.cssText = `font: 28px "${nome}"; margin-bottom: 14px; white-space: nowrap`
	linha.textContent = nome + ': FASE NÍVEL MÚSICA CEMITÉRIO NÃO ESPAÇO 0123'
	div.appendChild(linha)
	await document.fonts.load(`28px "${nome}"`)
}
document.body.appendChild(div)
await document.fonts.ready
return 'ok'
