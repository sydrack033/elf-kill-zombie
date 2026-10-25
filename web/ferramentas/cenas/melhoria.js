// cenário de teste: tela de escolher melhoria (já com algumas melhorias pegas)
const s = await teste.comecar()
s.melhorias = { cadencia: 2, dano: 1, ima: 1, anjo: 1 }
s.atualizar_hud_melhorias()
s.nivel = 1
s.subir_nivel()
return { estado: s.estado, opcoes: s.opcoes.map((o) => o.id) }
