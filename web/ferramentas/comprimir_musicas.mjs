// Comprime as músicas (WAV gerados por gerar_sons.mjs) em OGG e MP3 e apaga os WAV delas.
// OGG emenda o loop sem buraco (Chrome, Firefox, Android); MP3 fica de reserva para o Safari.
// Precisa do ffmpeg instalado.   node ferramentas/comprimir_musicas.mjs
import { readdirSync, unlinkSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const PASTA = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'sons')

for (const arquivo of readdirSync(PASTA)) {
	if (!arquivo.startsWith('musica_') || !arquivo.endsWith('.wav')) {
		continue
	}
	const wav = join(PASTA, arquivo)
	const base = wav.slice(0, -4)
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '4', base + '.ogg'])
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '96k', base + '.mp3'])
	const kb = (f) => Math.round(statSync(f).size / 1024)
	console.log(arquivo, kb(wav) + ' KB ->', 'ogg', kb(base + '.ogg') + ' KB,', 'mp3', kb(base + '.mp3') + ' KB')
	unlinkSync(wav)
}
