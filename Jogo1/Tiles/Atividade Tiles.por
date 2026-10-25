programa
{
	//códigos necessários para usar o teclado e gráficos
	inclua biblioteca Graficos
	inclua biblioteca Teclado

	inteiro heroi_x = 10 //o índice da coluna onde o herói está
	inteiro heroi_y = 10 //o índice da linha onde o herói está

	inteiro mapa[15][15] = 
	{
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0},
		{0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0},
		{0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0},
		{0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0},
		{0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0},
		{0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0},
		{0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}
	}

	funcao inicio()
	{
		carrega_imagens()
		cria_tela() //nessa linha a tela é criada com um tamanho de 800 x 600

		faca {
			desenha()
			
			//movimenta o heroi quando uma seta é pressionada
			inteiro tecla = Teclado.ler_tecla()
			se (tecla == Teclado.TECLA_SETA_ESQUERDA){
				heroi_x--
			} 
			senao se (tecla == Teclado.TECLA_SETA_DIREITA){
				heroi_x++
			}
			senao se (tecla == Teclado.TECLA_SETA_ACIMA){
				heroi_y--
			}
			senao se(tecla == Teclado.TECLA_SETA_ABAIXO){
				heroi_y++
			}
		}
		enquanto( nao Teclado.tecla_pressionada(Teclado.TECLA_ESC))

	}

	funcao desenha_mapa()
	{
		para(inteiro linha=0; linha < 15; linha++){
			para(inteiro coluna=0; coluna < 15; coluna++){
				se (mapa[linha][coluna] == 0)
					Graficos.desenhar_imagem(coluna * 32, linha * 32, imagem_chao)
				senao					
					Graficos.desenhar_imagem(coluna * 32, linha * 32, imagem_pedra)
			}
		}
		
	}
	

	funcao cria_tela()
	{
		Graficos.iniciar_modo_grafico(verdadeiro)
		Graficos.definir_dimensoes_janela(TAMANHO, TAMANHO)
	}

	funcao carrega_imagens(){
		imagem_chao = Graficos.carregar_imagem("chao.png")
		imagem_heroi = Graficos.carregar_imagem("heroi.png")
		imagem_pedra = Graficos.carregar_imagem("pedra.png")
	}

	funcao desenha()
	{
		//pinta o fundo de branco
		Graficos.definir_cor(Graficos.COR_PRETO)
		Graficos.desenhar_retangulo(0, 0, TAMANHO, TAMANHO, falso, verdadeiro)

		desenha_mapa()

		//desenha o herói
		Graficos.desenhar_imagem(heroi_x * 32, heroi_y * 32, imagem_heroi)

		Graficos.renderizar()
	}

	inteiro TAMANHO = 32 * 15

	inteiro imagem_chao = 0
	inteiro imagem_heroi = 0
	inteiro imagem_pedra = 0
}
/* $$$ Portugol Studio $$$ 
 * 
 * Esta seção do arquivo guarda informações do Portugol Studio.
 * Você pode apagá-la se estiver utilizando outro editor.
 * 
 * @POSICAO-CURSOR = 270; 
 * @PONTOS-DE-PARADA = ;
 * @SIMBOLOS-INSPECIONADOS = ;
 * @FILTRO-ARVORE-TIPOS-DE-DADO = inteiro, real, logico, cadeia, caracter, vazio;
 * @FILTRO-ARVORE-TIPOS-DE-SIMBOLO = variavel, vetor, matriz, funcao;
 */