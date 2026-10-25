programa
{
	inclua biblioteca Teclado --> t
	inclua biblioteca Graficos --> g
	inclua biblioteca Util --> u
	
	const inteiro LARGURA_DA_TELA = 800
	const inteiro ALTURA_DA_TELA = 600
	
	logico game_over = falso
	logico esq_on = falso
	logico dir_on = falso
	logico cima_on = falso
	logico baixo_on = falso
	inteiro x = 0
	inteiro y = 0
	inteiro heroi_x = 0
	inteiro heroi_y = 500
	inteiro fogo_x = heroi_x + 15
	inteiro fogo_y = heroi_y
	logico parado   
	logico andando
	inteiro and_cima
	inteiro and_baixo
	inteiro and_esquerda
	inteiro and_direita
	inteiro parado_esquerda
	inteiro parado_direita
	inteiro parado_cima
	inteiro parado_baixo
	inteiro ultima_imagem = -1
	inteiro poder
	inteiro xi = 0
	inteiro yi = 0
	inteiro quadro_atual = 0
	inteiro ult_tecla
	inteiro ler_tecla
	inteiro imagem_fundo
	inteiro bateu_esquerda = 0
	inteiro bateu_direita = 800
	inteiro bateu_cima 
	inteiro bateu_baixo = 600
	logico atirou = falso
	inteiro atirou_dir 
	inteiro atirou_esq
	inteiro atirou_cima
	inteiro atirou_baixo
	inteiro zombie
	inteiro zombie_xi = 0
	inteiro zombie_yi = 0
	inteiro zom_x = 550
	inteiro zom_y = 470
	inteiro lado 
	inteiro direcao_tiro
	
	
	funcao inicio(){
		
		inicializa()	
		enquanto(nao game_over){
			entrada()
			processamento()
			saida()
			u.aguarde(10)
		}
		g.encerrar_modo_grafico()
	}

	funcao inicializa(){
		g.iniciar_modo_grafico(verdadeiro)
		g.definir_dimensoes_janela(800, 600)
		g.definir_titulo_janela("   ")

		
		and_direita = g.carregar_imagem("Imagens/direita.png")
		and_esquerda = g.carregar_imagem("Imagens/esquerda.png")
		and_cima = g.carregar_imagem("Imagens/cima.png")
		and_baixo = g.carregar_imagem("Imagens/baixo.png")
		parado_direita = g.carregar_imagem("Imagens/pdireita.png")
		parado_esquerda = g.carregar_imagem("Imagens/pesquerda.png")
		parado_cima = g.carregar_imagem("Imagens/pcima.png")
		parado_baixo = g.carregar_imagem("Imagens/pbaixo.png")
		poder = g.carregar_imagem("Imagens/dfogo.png")
		imagem_fundo = g.carregar_imagem("Imagens/fundo.png")
		atirou_dir = g.carregar_imagem("Imagens/dfogo.png")
		atirou_esq = g.carregar_imagem("Imagens/efogo.png")
		atirou_cima = g.carregar_imagem("Imagens/cfogo.png")
		atirou_baixo = g.carregar_imagem("Imagens/bfogo.png")
		zombie = g.carregar_imagem("Imagens/zombie1.png")
		
	}

	funcao entrada(){
		
		logico esc_on = t.tecla_pressionada(t.TECLA_ESC)
		se( esc_on ){
			game_over = verdadeiro
		}

		//verifica teclas
		esq_on = (t.tecla_pressionada(t.TECLA_SETA_ESQUERDA))
		dir_on = (t.tecla_pressionada(t.TECLA_SETA_DIREITA))
		baixo_on = (t.tecla_pressionada(t.TECLA_SETA_ABAIXO))
		cima_on = (t.tecla_pressionada(t.TECLA_SETA_ACIMA))
		se(nao atirou){
		atirou = (t.tecla_pressionada(t.TECLA_ESPACO))
		direcao_tiro = ultima_imagem
		}
		
	}

	funcao processamento(){
		se(esq_on){	
			se(heroi_x > 0)	
				heroi_x--
			
		}
		se(dir_on){
			se(heroi_x <= 775)
			heroi_x++
		}
		se(baixo_on){
			se(heroi_y < 575)
			heroi_y++
			
		}
		se(cima_on){
			se(heroi_y > 470)		
			heroi_y--
			
		}

		
	}

	funcao saida(){
		
		g.limpar()	
		g.desenhar_imagem(0, 0, imagem_fundo)
		g.desenhar_porcao_imagem(zom_x, zom_y, zombie_xi, zombie_yi, 39, 63, zombie)
		se(quadro_atual % 20 == 0)
		 	zombie_xi = zombie_xi + 39	
			se(zombie_xi == 3 * 39){
		 		zombie_xi = 0		 			
			}
		
		
		
		andando = esq_on ou dir_on ou cima_on ou baixo_on == verdadeiro
		parado = esq_on ou dir_on ou cima_on ou baixo_on == falso
		
		
		
		//MOVE O BONECO COM SPRITE			
		se(dir_on){			
			g.desenhar_porcao_imagem(heroi_x, heroi_y, xi, yi, 25, 25, and_direita)
			se(quadro_atual % 5 == 0)
		 		xi = xi + 25	
			se(xi == 10 * 25){
		 			xi = 0		 			
			}	
			
			ultima_imagem = and_direita
			
		}			
		senao se(esq_on){
						
	 		g.desenhar_porcao_imagem(heroi_x, heroi_y, xi, yi, 25, 25, and_esquerda)
	 		se(quadro_atual % 5 == 0)
	 			xi = xi + 25
	 		
	 		se(xi == 10 * 25){
	 			xi = 0
	 			
	 		}
	 		ultima_imagem = and_esquerda
		}		
		senao se(cima_on){
					
	 		g.desenhar_porcao_imagem(heroi_x, heroi_y, xi, yi, 25, 25, and_cima)
	 		se(quadro_atual % 5 == 0)
	 			xi = xi + 25
	 		
	 		se(xi == 10 * 25){
	 			xi = 0
	 			
	 		}
	 		ultima_imagem = and_cima
		}
		senao se(baixo_on){
						
	 		g.desenhar_porcao_imagem(heroi_x, heroi_y, xi, yi, 25, 25, and_baixo)
	 		se(quadro_atual % 5 == 0)
	 			xi = xi + 25
	 		
	 		se(xi == 10 * 25){
	 			xi = 0
	 			
	 		}
	 		ultima_imagem = and_baixo
		}
		senao{
			se(ultima_imagem == 127){
				g.desenhar_imagem(heroi_x, heroi_y, parado_direita)
			}
			se(ultima_imagem == 126){
				g.desenhar_imagem(heroi_x, heroi_y, parado_esquerda)
			}
			se(ultima_imagem == 125){
				g.desenhar_imagem(heroi_x, heroi_y, parado_cima)
			}
			se(ultima_imagem == 124){
				g.desenhar_imagem(heroi_x, heroi_y, parado_baixo)
			}
		
		}
		
		
		se(atirou){
			
			escolha(direcao_tiro){
			
				caso 127:
					g.desenhar_imagem(fogo_x, fogo_y, atirou_dir)
					fogo_x += 20
					
				pare
				
				caso 126:
					g.desenhar_imagem(fogo_x, fogo_y, atirou_esq)
					fogo_x -= 20
				pare
				
				caso 125:				
					g.desenhar_imagem(fogo_x, fogo_y, atirou_cima)
					fogo_y -= 20
				pare
				
				caso 124:
					g.desenhar_imagem(fogo_x, fogo_y, atirou_baixo)
					fogo_y += 20
				pare
			}
		
		}	
				
				
			
			
		
		
		
		

			
		
		g.renderizar()
		quadro_atual++
		
		
	}
}
/* $$$ Portugol Studio $$$ 
 * 
 * Esta seção do arquivo guarda informações do Portugol Studio.
 * Você pode apagá-la se estiver utilizando outro editor.
 * 
 * @POSICAO-CURSOR = 2753; 
 * @DOBRAMENTO-CODIGO = [165, 177, 189, 201];
 */