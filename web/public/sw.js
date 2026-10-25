// Service worker: deixa o jogo funcionar sem internet depois da primeira visita.
// Responde com o que já está guardado (rápido) e, ao mesmo tempo, busca a versão nova para a próxima vez.
const CACHE = 'elf-kill-zombie-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (evento) => {
	// apaga caches de versões antigas
	evento.waitUntil(
		caches.keys()
			.then((nomes) => Promise.all(nomes.filter((n) => n != CACHE).map((n) => caches.delete(n))))
			.then(() => self.clients.claim()),
	)
})

self.addEventListener('fetch', (evento) => {
	const pedido = evento.request
	if (pedido.method != 'GET' || new URL(pedido.url).origin != self.location.origin) {
		return
	}
	evento.respondWith(
		caches.open(CACHE).then(async (cache) => {
			const guardado = await cache.match(pedido)
			const da_rede = fetch(pedido)
				.then((resposta) => {
					if (resposta.ok) {
						cache.put(pedido, resposta.clone())
					}
					return resposta
				})
				.catch(() => guardado)
			return guardado || da_rede
		}),
	)
})
