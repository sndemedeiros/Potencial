# ⚡ VoltLab – Simulador de Potencial Elétrico

**VoltLab** é um mini‑laboratório interativo sobre **potencial elétrico, energia potencial, energia cinética e trabalho do campo elétrico** em um campo uniforme entre duas placas paralelas.  
Foi desenvolvido para uso em disciplinas de **Eletromagnetismo / Física Geral**, como apoio às aulas e ao estudo dos alunos.

---

## 🎯 Objetivos didáticos

O experimento foi projetado para que o estudante:

- Visualize a relação entre **campo elétrico, potencial elétrico e energia potencial**.  
- Explore a **conservação da energia mecânica** em um campo elétrico uniforme.  
- Compare o comportamento de diferentes partículas:
  - Próton (q = +1e)  
  - Elétron (q = −1e)  
  - Partícula α (q = +2e)
- Relacione **trabalho do campo elétrico** com **variação de energia potencial e cinética**:  
  \[
  W = -\Delta U = \Delta K
  \]

Os conceitos seguem de perto o capítulo de **Potencial Elétrico** do livro‑texto (energia potencial, forças conservativas, campo uniforme, superfícies equipotenciais etc.).

---

## 🧩 Visão geral do funcionamento

### 1. Seleção de partícula
Na tela inicial, o aluno escolhe entre:

- 🔴 Próton  
- 🔵 Elétron  
- 🟡 Partícula α  

### 2. Campo entre placas paralelas
Ao iniciar o experimento:

- São exibidas **placas paralelas** com um campo elétrico uniforme.  
- Existem **6 pontos de medida** igualmente espaçados entre as placas.

### 3. Leituras em cada ponto

Para o ponto selecionado, o painel mostra:

- Potencial elétrico \(V\)  
- Energia potencial \(U = qV\)  
- Energia cinética \(K\)  
- Energia mecânica total \(K + U\) (conservada)  
- Trabalho do campo entre dois pontos consecutivos  
  \[
  W = -\Delta U \quad\text{e}\quad W \approx \Delta K
  \]

Barras gráficas indicam a distribuição entre:

- \(K\)  
- \(|U|\)  
- \(K + U\)

### 4. Exploração e pontuação

- Cada ponto visitado rende **pontuação**.  
- Explorar todos os pontos de uma partícula concede **bônus**.  
- Responder corretamente às questões conceituais aumenta a pontuação.  
- Ao final, o aluno recebe um **nível** (Bronze, Prata, Ouro).

### 5. Questionários (quizzes)

Para cada partícula há perguntas sobre:

- Sinais de \(\Delta U\), \(W\) e \(\Delta K\)  
- Sentido da força elétrica  
- Comparação entre partículas (especialmente α vs próton)

Há ainda um **quiz de síntese** com situações variadas envolvendo cargas e potenciais.

---

## 🗂 Estrutura dos arquivos

O projeto é totalmente estático:

- `index.html` — Estrutura da página  
- `style.css` — Estilos, layout e responsividade  
- `jogo.js` — Lógica física, interações, animações e sistema de pontuação/quiz  

Não há dependências externas.  
Basta abrir o `index.html` em um navegador moderno.

---

## ▶ Como executar localmente

### **Opção 1 — Abrir direto no navegador**

1. Baixe o ZIP pelo GitHub.  
2. Extraia os arquivos.  
3. Abra `index.html`.

> Alguns navegadores limitam recursos quando o arquivo é aberto via `file://`.  
> Se algo não funcionar, use a opção 2.

### **Opção 2 — Usar servidor simples (recomendado)**

Com **VS Code + Live Server**:

1. Abra a pasta do projeto no VS Code.  
2. Abra `index.html`.  
3. Clique em **Go Live**.  
4. O navegador abrirá em `http://127.0.0.1:5500/`.

---

## 🔍 Conceitos físicos trabalhados

- Energia potencial elétrica em campo uniforme  
  \[
  U = qEy
  \]

- Trabalho da força elétrica  
  \[
  W_{a\to b} = -\Delta U = U_a - U_b
  \]

- Teorema trabalho–energia  
  \[
  K_a + U_a = K_b + U_b
  \]

- Relação entre carga, potencial e energia potencial  
  \[
  U = qV
  \]

- Diferenças entre cargas positivas e negativas:
  - Carga positiva “cai” no sentido do campo (U diminui, K aumenta).  
  - Carga negativa faz o oposto.

- Interpretação de superfícies equipotenciais e variação linear do potencial em campo uniforme.

---

## 👩‍🏫 Sugestões de uso em aula

- Demonstração guiada pelo professor.  
- Atividade de fixação com roteiro.  
- Atividade avaliativa leve (print da pontuação final).  
- Conexão com o livro‑texto: identificar equações e exemplos relacionados.

---

## 📁 Licença — MIT

Este projeto é distribuído sob a **Licença MIT**, permitindo uso, modificação, redistribuição e adaptação por qualquer pessoa, inclusive para fins comerciais e educacionais.
