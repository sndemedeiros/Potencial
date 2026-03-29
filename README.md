# VoltLab – Simulador de Potencial Elétrico

VoltLab é um mini-laboratório interativo sobre **potencial elétrico, energia potencial, energia cinética e trabalho do campo elétrico** em um campo uniforme entre duas placas paralelas.  
Foi pensado para uso em disciplinas de **Eletromagnetismo / Física Geral**, como apoio às aulas e ao estudo dos alunos.

## 🎯 Objetivos didáticos

O experimento foi projetado para que o estudante:

- Visualize a relação entre **campo elétrico, potencial elétrico e energia potencial**.
- Explore a **conservação da energia mecânica** em um campo elétrico uniforme.
- Compare o comportamento de diferentes partículas:
  - Próton (q = +1e)
  - Elétron (q = −1e)
  - Partícula α (q = +2e)
- Relacione **trabalho do campo elétrico** com **variação de energia potencial e cinética**:  
  |$ W = -\Delta U = \Delta K $|.

Os conceitos seguem de perto o tratamento do capítulo de **Potencial Elétrico** do livro-texto (energia potencial, forças conservativas, campo uniforme, superfícies equipotenciais etc.).

## 🧩 Visão geral do funcionamento

1. **Seleção de partícula**  
   Na tela inicial, o aluno escolhe entre:
   - 🔴 Próton
   - 🔵 Elétron
   - 🟡 Partícula α  

2. **Campo entre placas paralelas**  
   Ao iniciar o experimento:
   - São exibidas **placas paralelas** com um campo elétrico uniforme.
   - Existem **6 pontos de medida** igualmente espaçados entre as placas.

3. **Leituras em cada ponto**

   Para o ponto selecionado, o painel mostra:
   - Potencial elétrico |$ V $|
   - Energia potencial |$ U = qV $|
   - Energia cinética |$ K $|
   - Energia mecânica total |$ K + U $| (conservada)
   - Trabalho do campo entre dois pontos consecutivos  
     |$ W = -\Delta U $| e a verificação |$ W \approx \Delta K $|

   Barras gráficas indicam a distribuição entre:
   - |$ K $|
   - |$ |U| $|
   - |$ K + U $|

4. **Exploração e pontuação**

   - Cada ponto visitado rende **pontuação**.
   - Explorar todos os pontos de uma partícula concede **bônus**.
   - Ao responder corretamente às questões conceituais, o aluno acumula mais pontos.
   - Ao final, é exibido um “**nível**” (Bronze, Prata, Ouro) de acordo com a pontuação.

5. **Questionários (quizzes)**

   Para cada partícula há um conjunto de perguntas sobre:
   - Sinais de |$ \Delta U $|, |$ W $| e |$ \Delta K $|.
   - Sentido da força elétrica.
   - Comparação entre partículas (especialmente a partícula α vs próton).

   Há ainda um **quiz de síntese** que mistura situações com diferentes cargas e variações de potencial.

## 🗂 Estrutura dos arquivos

O projeto é totalmente estático, composto por três arquivos:

- `index.html` – Estrutura da página e elementos da interface.
- `style.css` – Estilos, layout e responsividade.
- `jogo.js` – Lógica física, interações, animações e sistema de pontuação/quiz.

Não há dependências externas (sem frameworks, sem build).  
Basta abrir o `index.html` em um navegador moderno.

## ▶ Como executar localmente

### Opção 1 – Abrir direto no navegador

1. Baixe/clique em “Code → Download ZIP” no GitHub.
2. Extraia os arquivos em uma pasta.
3. Abra `index.html` em um navegador (Chrome, Edge, Firefox).

> Alguns navegadores restringem certas funcionalidades com `file://`. Se algo não carregar corretamente, use a opção 2.

### Opção 2 – Usar servidor simples (recomendado)

Se tiver **VS Code + Live Server (GoLive)**:

1. Abrir a pasta do projeto no VS Code.
2. Abrir o arquivo `index.html`.
3. Clicar em **Go Live** (ícone no rodapé).
4. O navegador abrirá em algo como `http://127.0.0.1:5500/index.html`.

Qualquer outro servidor estático simples (Python, Node, etc.) também funciona.

## 🔍 Conceitos físicos trabalhados

- **Energia potencial elétrica em campo uniforme**  
  |$ U = qEy $| (analogia com |$ U = mgy $|)

- **Trabalho da força elétrica e variação de energia potencial**  
  |$ W_{a \to b} = -\Delta U = U_a - U_b $|

- **Teorema trabalho–energia e conservação da energia mecânica**  
  |$ K_a + U_a = K_b + U_b $|

- **Relação entre carga, potencial e energia potencial**  
  |$ U = qV $|

- **Diferenças de comportamento para cargas positivas e negativas**:
  - Carga positiva “cai” no sentido do campo (U diminui, K aumenta).
  - Carga negativa “sobe” no sentido do campo (U aumenta, K diminui), ou vice-versa.

- **Interpretação de gráficos e superfícies equipotenciais**  
  Ainda que não haja gráfico explícito de |$ U(x) $| e |$ K(x) $|, o experimento reforça que:
  - Em campo uniforme, o **potencial varia linearmente** com a posição.
  - **Superfícies equipotenciais** são perpendiculares às linhas de campo.

## 👩‍🏫 Sugestões de uso em aula

- Como **demonstração guiada** pelo professor (discutindo casos próton/elétron/α).
- Como **atividade de fixação**: os alunos usam o simulador e respondem questões em um formulário/roteiro.
- Como **atividade avaliativa leve**: entregar print da tela final com pontuação e nível alcançado.
- Para conectar com o livro-texto:
  - Introduzir o simulador após a seção de energia potencial elétrica e antes dos problemas numéricos.
  - Pedir que os alunos identifiquem, no capítulo, equações e exemplos que dialogam com as situações do jogo.
