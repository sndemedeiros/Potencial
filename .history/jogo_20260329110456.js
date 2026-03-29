/* VoltLab — jogo único
   Potencial elétrico, trabalho do campo e conservação de energia */

'use strict';

// Configuração do experimento
const NUM_POINTS = 6;
const V_MAX = 100;   // V na placa positiva
const V_MIN = 0;     // V na placa negativa
const K0 = 0;     // solta da placa positiva em repouso
const ANIM_DUR = 2400;  // ms — duração animação ponto 1→6

// Partículas
const CHARS = {
    proton: { label: 'Próton', charge: +1, mass: 1.67e-27, emoji: '🔴', chargeLabel: '+1e' },
    electron: { label: 'Elétron', charge: -1, mass: 9.11e-31, emoji: '🔵', chargeLabel: '−1e' },
    alpha: { label: 'Partícula α', charge: +2, mass: 6.64e-27, emoji: '🟡', chargeLabel: '+2e' }
};

// Pontuação
const PTS = {
    visitPoint: 10, bonusAllPoints: 30, bonusAllChars: 50,
    correctFirst: 50, correctRetry: 20, wrongAnswer: -10,
    synthCorrect: 100, synthWrong: -20
};

// Estado global
let selectedChar = null;
let currentIndex = 0;
let score = 0;
let notifTimer = null;
let modalCallback = null;
let quizAnswered = false;
let wrongThisQ = false;
let correctCount = 0;
let totalQuestions = 0;

// Animação
let animating = false;
let animStartT = 0;
let animPosFloat = 0;

// Para cada partícula: pontos visitados, quiz concluído
function newState() {
    return { visited: new Array(NUM_POINTS).fill(false), explored: false, quizDone: false };
}
const charState = {
    proton: newState(),
    electron: newState(),
    alpha: newState()
};

// Canvas
const canvas = document.getElementById('lab-canvas');
const ctx = canvas.getContext('2d');

function el(id) { return document.getElementById(id); }
function fmtEV(v) { return (v >= 0 ? '+' : '') + v.toFixed(0) + ' eV'; }
function fmtEVf(v) { return (v >= 0 ? '+' : '') + v.toFixed(1) + ' eV'; }

// Potencial e energias
function computeV(i) {
    return V_MAX - (V_MAX - V_MIN) * i / (NUM_POINTS - 1);
}
function computeVcont(s) { // s ∈ [0,1]
    return V_MAX - (V_MAX - V_MIN) * s;
}
function computeU(q, V) { return q * V; }
function computeEM(q) { return K0 + computeU(q, computeV(0)); }
function computeK(q, i) { return computeEM(q) - computeU(q, computeV(i)); }
function computeKcont(q, s) { return computeEM(q) - computeU(q, computeVcont(s)); }

// Pontuação / nível
function addScore(pts) {
    score = Math.max(0, score + pts);
    el('top-score').textContent = score;
    updateTopLevel();
}
function getLevel() {
    if (score >= 650) return { label: 'Ouro', icon: '🥇', cls: 'ouro', desc: 'Excelente domínio dos conceitos de U, W e K+U.' };
    if (score >= 300) return { label: 'Prata', icon: '🥈', cls: 'prata', desc: 'Boa compreensão. Revisar detalhes do elétron e da α.' };
    return { label: 'Bronze', icon: '🥉', cls: 'bronze', desc: 'Explorar mais pontos e ler as explicações com calma.' };
}
function updateTopLevel() {
    const lv = getLevel(), e = el('top-level');
    e.textContent = lv.icon + ' ' + lv.label;
    e.className = 'top-val ' + lv.cls;
}

// Notificação
function showNotif(msg) {
    const n = el('notif'); n.textContent = msg; n.classList.add('show');
    clearTimeout(notifTimer);
    notifTimer = setTimeout(() => n.classList.remove('show'), 3200);
}

// Seleção inicial
function selectChar(cardEl) {
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    cardEl.classList.add('selected');
    selectedChar = cardEl.dataset.char;
}

// Iniciar experimento
function startLab() {
    if (!selectedChar) { showNotif('⚠️ Escolha uma partícula.'); return; }
    if (charState[selectedChar].quizDone) {
        showNotif('✅ ' + CHARS[selectedChar].label + ' já foi concluída. Escolha outra.');
        return;
    }
    el('screen-start').style.display = 'none';
    el('screen-lab').style.display = 'flex';
    currentIndex = 0; animating = false; animPosFloat = 0;
    resizeCanvas(); updateAll();
}

// Voltar à seleção
function returnToSelection() {
    if (animating) return;
    el('screen-lab').style.display = 'none';
    el('screen-start').style.display = 'flex';

    Object.keys(charState).forEach(key => {
        const done = charState[key].quizDone;
        const card = document.querySelector('.char-card[data-char="' + key + '"]');
        const chk = el('check-' + key);
        if (card) card.classList.toggle('completed', done);
        if (chk) chk.style.display = done ? 'block' : 'none';
    });

    selectedChar = null;
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
}

// Navegação
function moveRight() { if (animating || currentIndex >= NUM_POINTS - 1) return; currentIndex++; updateAll(); }
function moveLeft() { if (animating || currentIndex <= 0) return; currentIndex--; updateAll(); }
function resetChar() { if (animating) return; currentIndex = 0; updateAll(); }

// Habilitar/desabilitar controles
function setControlsEnabled(on) {
    ['btn-left', 'btn-right', 'btn-run', 'btn-quiz'].forEach(id => {
        const b = el(id); if (b) b.disabled = !on;
    });
    const br = document.querySelector('.btn-reset'), bt = document.querySelector('.btn-sec');
    if (br) br.disabled = !on;
    if (bt) bt.disabled = !on;
}

// Canvas responsivo
function resizeCanvas() {
    const wrap = document.getElementById('canvas-wrap');
    const rect = wrap.getBoundingClientRect();
    canvas.width = Math.max(220, Math.floor(rect.width - 32));
    canvas.height = Math.max(160, Math.floor(rect.height - 32));
    if (!animating) drawField();
}
window.addEventListener('resize', () => {
    if (el('screen-lab').style.display !== 'none') resizeCanvas();
});

// Atualizar tudo
function updateAll() {
    if (!selectedChar) return;
    const ch = CHARS[selectedChar];
    const st = charState[selectedChar];
    const V = computeV(currentIndex);
    const U = computeU(ch.charge, V);
    const EM = computeEM(ch.charge);
    const K = computeK(ch.charge, currentIndex);

    // visitar ponto
    if (!st.visited[currentIndex]) {
        st.visited[currentIndex] = true;
        addScore(PTS.visitPoint);
        showNotif('+' + PTS.visitPoint + ' pts — ponto novo explorado!');
    }

    const allVisited = st.visited.every(v => v);
    if (allVisited && !st.explored) {
        st.explored = true;
        addScore(PTS.bonusAllPoints);
        showNotif('+' + PTS.bonusAllPoints + ' pts — todos os pontos explorados!');
    }

    // topo
    el('top-char-name').textContent =
        ch.emoji + '  ' + ch.label + '  (q = ' + ch.chargeLabel + ')';
    el('top-score').textContent = score;
    el('top-visited').textContent = st.visited.filter(v => v).length + ' / ' + NUM_POINTS;
    updateDots(st); updateTopLevel();

    // painel
    updatePanel(V, U, K, EM, ch, currentIndex);

    // botões
    el('btn-left').disabled = currentIndex === 0;
    el('btn-right').disabled = currentIndex === NUM_POINTS - 1;

    const btnRun = el('btn-run');
    if (btnRun) btnRun.style.display = (currentIndex === 0 ? 'block' : 'none');

    const btnQ = el('btn-quiz');
    if (btnQ) btnQ.style.display = (allVisited && !st.quizDone ? 'block' : 'none');

    // dica
    updateHint(ch, V, U, K, EM);

    // canvas
    animPosFloat = currentIndex;
    drawField();
}

// Atualizar painel
function updatePanel(V, U, K, EM, ch, idx) {
    el('rd-pos-num').textContent = idx + 1;
    el('rd-v').textContent = V.toFixed(1) + ' V';

    const qs = ch.charge > 0 ? '+' : '';
    el('rd-u').textContent = fmtEVf(U);
    el('rd-u-formula').textContent =
        'U = (' + qs + ch.charge + 'e) × ' + V.toFixed(1) + ' V = ' + fmtEVf(U);

    el('rd-k').textContent = fmtEVf(K);
    el('rd-k').className = 'card-val ' + (K >= 0 ? 'green' : 'red');

    if (idx === 0) {
        el('rd-k-sub').textContent = 'K₀ = 0 — partícula em repouso na placa positiva.';
    } else {
        const U0 = computeU(ch.charge, computeV(0));
        el('rd-k-sub').textContent = 'K = 0 + ' + fmtEV(U0) + ' − (' + fmtEVf(U) + ')';
    }

    el('rd-em').textContent = fmtEVf(EM);

    if (idx === 0) {
        el('rd-work').textContent = '—';
        el('rd-work-sub').textContent = 'Avance para o próximo ponto.';
        el('rd-work-hint').textContent = '';
    } else {
        const Vprev = computeV(idx - 1), Uprev = computeU(ch.charge, Vprev);
        const W = -(U - Uprev);
        el('rd-work').textContent = fmtEVf(W);
        el('rd-work-sub').textContent =
            'W = −ΔU = −(' + fmtEVf(U) + ' − ' + fmtEVf(Uprev) + ') = ' + fmtEVf(W);
        el('rd-work-hint').textContent = W > 0
            ? 'W > 0: campo faz trabalho positivo → K aumentou.'
            : W < 0
                ? 'W < 0: campo faz trabalho negativo → K diminuiu.'
                : 'W = 0 neste passo.';
    }

    updateEnergyBars(K, U, EM);
}

// Barras
function updateEnergyBars(K, U, EM) {
    const ref = Math.abs(EM) || 1;
    const pctK = Math.max(0, Math.min(100, (Math.abs(K) / ref) * 100));
    const pctU = Math.max(0, Math.min(100, (Math.abs(U) / ref) * 100));

    el('bar-k').style.width = '' + pctK + '%';
    el('bar-u').style.width = '' + pctU + '%';
    el('bar-em').style.width = '100%';

    el('bar-k-val').textContent = fmtEVf(K);
    el('bar-u-val').textContent = fmtEVf(U);
    el('bar-em-val').textContent = fmtEVf(EM);
}

// Bolinhas
function updateDots(st) {
    const wrap = el('top-dots'); wrap.innerHTML = '';
    st.visited.forEach((v, i) => {
        const d = document.createElement('span');
        d.className = 'dot' + (i === currentIndex ? ' active' : v ? ' visited' : '');
        wrap.appendChild(d);
    });
}

// Dica
function updateHint(ch, V, U, K, EM) {
    const h = el('ctx-hint');
    if (!h) return;
    const U0 = computeU(ch.charge, computeV(0));
    let txt = '';
    if (currentIndex === 0) {
        txt = 'Ponto inicial: V=100 V, U₀=' + fmtEV(U0) + ', K₀=0. A partir daqui, K+U fica constante.';
    } else if (ch.charge < 0) {
        txt = K < 0
            ? 'K < 0 aqui — o elétron não consegue alcançar este ponto partindo do repouso.'
            : 'Elétron: U aumentou, logo K diminuiu para manter K+U = ' + fmtEV(EM) + '.';
    } else if (ch.charge === 2) {
        txt = 'Partícula α: ΔU = ' + fmtEV(U - U0) + ' (2× o próton). K+U=' + fmtEV(EM) + ' em todos os pontos.';
    } else {
        txt = 'Próton: ao descer o potencial, U cai e K cresce, mantendo K+U = ' + fmtEV(EM) + '.';
    }
    h.style.display = 'block';
    h.textContent = txt;
}

// Animação 1→6
function runAnimation() {
    if (!selectedChar || animating) return;
    if (currentIndex !== 0) { currentIndex = 0; updateAll(); setTimeout(runAnimation, 150); return; }

    const ch = CHARS[selectedChar];
    if (ch.charge < 0) showNotif('⚠️ O elétron não alcança a placa negativa partindo do repouso.');

    animating = true; animStartT = performance.now();
    setControlsEnabled(false);
    requestAnimationFrame(stepAnimation);
}
function stepAnimation(t) {
    if (!animating) return;
    const ch = CHARS[selectedChar];
    const elapsed = t - animStartT;
    let s = Math.min(elapsed / ANIM_DUR, 1);           // 0→1
    const sEased = ch.charge >= 0 ? s * s : 1 - (1 - s) * (1 - s); // ease-in / ease-out
    const sPos = Math.min(sEased, 1);

    animPosFloat = sPos * (NUM_POINTS - 1);
    const Vt = computeVcont(sPos);
    const Ut = computeU(ch.charge, Vt);
    const Kt = computeKcont(ch.charge, sPos);
    const EM = computeEM(ch.charge);

    // painel em modo contínuo
    el('rd-pos-num').textContent = (animPosFloat + 1).toFixed(1);
    el('rd-v').textContent = Vt.toFixed(1) + ' V';
    const qs = ch.charge > 0 ? '+' : '';
    el('rd-u').textContent = fmtEVf(Ut);
    el('rd-u-formula').textContent = 'U = (' + qs + ch.charge + 'e) × ' + Vt.toFixed(1) + ' V = ' + fmtEVf(Ut);
    el('rd-k').textContent = fmtEVf(Kt);
    el('rd-k').className = 'card-val ' + (Kt >= 0 ? 'green' : 'red');
    el('rd-k-sub').textContent = 'K = EM − U = ' + fmtEVf(EM) + ' − (' + fmtEVf(Ut) + ')';
    el('rd-em').textContent = fmtEVf(EM);
    el('rd-work').textContent = '—';
    el('rd-work-sub').textContent = 'Trabalho calculado entre pontos discretos.';
    el('rd-work-hint').textContent = '';
    updateEnergyBars(Kt, Ut, EM);

    drawFieldAnimated(animPosFloat, Vt, Ut, Kt);

    if (s < 1) {
        requestAnimationFrame(stepAnimation);
    } else {
        animating = false;
        currentIndex = NUM_POINTS - 1;
        animPosFloat = currentIndex;
        const st = charState[selectedChar];
        st.visited.fill(true);
        if (!st.explored) { st.explored = true; addScore(PTS.bonusAllPoints); }
        setControlsEnabled(true);
        updateAll();
        showNotif('Animação concluída — ΔU virou ΔK.');
    }
}

// Desenho do campo
function drawField() {
    if (!selectedChar) return;
    const ch = CHARS[selectedChar];
    const V = computeV(currentIndex);
    const U = computeU(ch.charge, V);
    const K = computeK(ch.charge, currentIndex);
    drawFieldAnimated(currentIndex, V, U, K);
}

function drawFieldAnimated(idxFloat, Vcurr, Ucurr, Kcurr) {
    if (!selectedChar) return;
    const W = canvas.width, H = canvas.height;
    const ch = CHARS[selectedChar], st = charState[selectedChar];

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, W, H);

    const plateH = H * 0.62, plateY = (H - plateH) / 2;
    const pX0 = 28, pX1 = W - 28, step = (pX1 - pX0) / (NUM_POINTS - 1);
    const pY = H * 0.50;

    // Placas
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, plateY, 22, plateH);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('+', 11, H / 2);
    ctx.fillStyle = '#fecaca'; ctx.font = '10px monospace'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('100 V', 11, plateY - 6);

    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(W - 22, plateY, 22, plateH);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textBaseline = 'middle';
    ctx.fillText('−', W - 11, H / 2);
    ctx.fillStyle = '#bfdbfe'; ctx.font = '10px monospace';
    ctx.fillText('0 V', W - 11, plateY - 6);

    // Linhas de campo
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.2; ctx.setLineDash([]); ctx.lineCap = 'round';
    [0.2, 0.38, 0.56, 0.74, 0.9].forEach(fy => {
        const ry = plateY + plateH * fy;
        ctx.beginPath(); ctx.moveTo(pX0, ry); ctx.lineTo(pX1, ry); ctx.stroke();
        [0.25, 0.5, 0.75].forEach(fx => {
            const ax = pX0 + (pX1 - pX0) * fx, a = 6;
            ctx.beginPath();
            ctx.moveTo(ax, ry); ctx.lineTo(ax - a, ry - a * 0.5);
            ctx.moveTo(ax, ry); ctx.lineTo(ax - a, ry + a * 0.5);
            ctx.stroke();
        });
    });
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#64748b'; ctx.font = '10px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('→ E (campo uniforme)', pX0 + 4, plateY + plateH + 16);

    // Equipotenciais
    [80, 60, 40, 20].forEach(Veq => {
        const xEq = pX0 + (pX1 - pX0) * (1 - Veq / V_MAX);
        ctx.save();
        ctx.setLineDash([4, 4]); ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(xEq, plateY - 4); ctx.lineTo(xEq, plateY + plateH + 4); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#7dd3fc'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(Veq + ' V', xEq, plateY - 8);
    });

    // Curva U(x)
    const refU = Math.abs(computeU(ch.charge, V_MAX)) || 1;
    ctx.save(); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 4]);
    ctx.beginPath();
    for (let i = 0; i < NUM_POINTS; i++) {
        const px = pX0 + i * step;
        const Ui = computeU(ch.charge, computeV(i));
        const frac = Math.max(0, Math.abs(Ui) / refU);
        const uy = pY + frac * (plateY + plateH - 10 - pY);
        if (i === 0) ctx.moveTo(px, uy); else ctx.lineTo(px, uy);
    }
    ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#fed7aa'; ctx.font = '10px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('U(x)', pX1 - 4, plateY + plateH - 6);

    // Curva K(x)
    const EM = computeEM(ch.charge);
    const refK = Math.abs(EM) || 1;
    ctx.save(); ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.setLineDash([3, 5]);
    ctx.beginPath();
    for (let i = 0; i < NUM_POINTS; i++) {
        const px = pX0 + i * step;
        const Ki = computeK(ch.charge, i);
        const frac = Math.max(0, Ki / refK);
        const ky = pY - frac * (pY - plateY - 16);
        if (i === 0) ctx.moveTo(px, ky); else ctx.lineTo(px, ky);
    }
    ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#86efac'; ctx.font = '10px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('K(x)', pX1 - 4, plateY + 14);

    // Pontos discretos
    for (let i = 0; i < NUM_POINTS; i++) {
        const px = pX0 + i * step;
        const isActive = !animating && i === currentIndex;
        const visited = st.visited[i];

        ctx.save();
        ctx.setLineDash([2, 5]); ctx.strokeStyle = 'rgba(148,163,184,0.12)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, plateY); ctx.lineTo(px, plateY + plateH); ctx.stroke();
        ctx.restore(); ctx.setLineDash([]);

        if (isActive) {
            const Vi = computeV(i), Ui = computeU(ch.charge, Vi), Ki = computeK(ch.charge, i);

            const tagW = 174, tagH = 46;
            const tagX = Math.min(Math.max(px - tagW / 2, 28), W - 28 - tagW);
            const tagY = pY - 106;

            ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#475569'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.roundRect(tagX, tagY, tagW, tagH, 6); ctx.fill(); ctx.stroke();
            ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#38bdf8'; ctx.fillText('V = ' + Vi + ' V', px, tagY + 9);
            ctx.fillStyle = '#f97316'; ctx.fillText('U = ' + fmtEV(Ui), px, tagY + 21);
            ctx.fillStyle = Ki >= 0 ? '#22c55e' : '#f43f5e';
            ctx.fillText('K = ' + fmtEV(Ki), px, tagY + 33);

            ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(ch.emoji, px, pY);

            ctx.fillStyle = '#f1f5f9'; ctx.font = 'bold 10px monospace'; ctx.textBaseline = 'alphabetic';
            ctx.fillText(i + 1, px, pY + 22);

        } else {
            const ms = 4;
            ctx.strokeStyle = visited ? '#64748b' : '#334155'; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(px - ms, pY - ms); ctx.lineTo(px + ms, pY + ms);
            ctx.moveTo(px + ms, pY - ms); ctx.lineTo(px - ms, pY + ms);
            ctx.stroke();
            ctx.fillStyle = visited ? '#64748b' : '#334155'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.fillText(i + 1, px, pY + 16);
        }
    }

    // Partícula animada
    if (animating) {
        const px = pX0 + idxFloat * step;

        const tagW = 174, tagH = 46;
        const tagX = Math.min(Math.max(px - tagW / 2, 28), W - 28 - tagW);
        const tagY = pY - 106;

        ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(tagX, tagY, tagW, tagH, 6); ctx.fill(); ctx.stroke();

        ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#38bdf8'; ctx.fillText('V = ' + Vcurr.toFixed(1) + ' V', px, tagY + 9);
        ctx.fillStyle = '#f97316'; ctx.fillText('U = ' + fmtEVf(Ucurr), px, tagY + 21);
        ctx.fillStyle = Kcurr >= 0 ? '#22c55e' : '#f43f5e';
        ctx.fillText('K = ' + fmtEVf(Kcurr), px, tagY + 33);

        ctx.font = '28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(ch.emoji, px, pY);
    }

    // Seta de força
    const pxF = animating ? pX0 + idxFloat * step : pX0 + currentIndex * step;
    const Kcheck = animating ? Kcurr : computeK(ch.charge, currentIndex);
    if (Kcheck >= 0 || !animating) { // em repouso sempre mostra
        const dir = ch.charge > 0 ? 1 : -1;
        const ax0 = pxF + dir * 22, ax1 = pxF + dir * 64, ay = pY - 24;
        ctx.strokeStyle = ch.charge > 0 ? '#f97316' : '#f43f5e';
        ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(ax0, ay); ctx.lineTo(ax1, ay); ctx.stroke();
        const tip = 7;
        ctx.beginPath();
        ctx.moveTo(ax1, ay); ctx.lineTo(ax1 - dir * tip, ay - tip * 0.5);
        ctx.moveTo(ax1, ay); ctx.lineTo(ax1 - dir * tip, ay + tip * 0.5);
        ctx.stroke(); ctx.lineCap = 'butt';
    } else if (Kcurr < 0) {
        ctx.fillStyle = '#f43f5e'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('⚠ K < 0: ponto inalcançável partindo do repouso',
            pX0 + (pX1 - pX0) / 2, pY - 28);
    }

    // Legenda
    ctx.fillStyle = '#475569'; ctx.font = '9px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('cinza: E  |  ciano: equipotenciais  |  laranja: U(x)  |  verde: K(x)', pX0, H - 10);
}

// Quiz por partícula
function startCharQuiz() {
    const btnQ = el('btn-quiz'); if (btnQ) btnQ.style.display = 'none';
    const key = selectedChar;
    let questions = [];

    if (key === 'proton') {
        questions = [
            {
                emoji: '⚡',
                title: 'Próton — ΔU e W',
                text: `O 🔴 <b>Próton</b> (q=+1e) vai de V=100 V até V=60 V.<br><br>
              Qual é a variação de energia potencial ΔU e o trabalho do campo W?`,
                options: [
                    { text: 'ΔU = −40 eV e W = +40 eV — U cai e o campo faz trabalho positivo.', correct: true },
                    { text: 'ΔU = +40 eV e W = −40 eV — o próton ganha energia potencial.', correct: false },
                    { text: 'ΔU = 0 e W = 0 — energia mecânica é conservada.', correct: false }
                ],
                feedback: `ΔU = q·ΔV = (+1e)(60−100 V) = −40 eV.<br>
                  W = −ΔU = +40 eV. A queda de U vira aumento de K.`,
                isSynth: false
            },
            {
                emoji: '🔋',
                title: 'Próton — energia em V=0',
                text: `O 🔴 <b>Próton</b> é solto com K₀=0 em V=100 V e chega em V=0 V.<br><br>
              Qual é K_final?`,
                options: [
                    { text: 'K_final = +100 eV — toda U inicial vira K.', correct: true },
                    { text: 'K_final = 0 — energia mecânica é constante.', correct: false },
                    { text: 'K_final = −100 eV — o próton perde energia cinética.', correct: false }
                ],
                feedback: `U₀=+100 eV; U_f=0; ΔU=−100 eV; W=+100 eV.<br>
                  K_final = 0 + 100 eV = <b>+100 eV</b>.`,
                isSynth: false
            }
        ];
    } else if (key === 'electron') {
        questions = [
            {
                emoji: '🔵',
                title: 'Elétron — sinal de U e tendência de K',
                text: `O 🔵 <b>Elétron</b> (q=−1e) se desloca para regiões de V menor (100→60 V).<br><br>
              O que acontece com U e com K?`,
                options: [
                    { text: 'U aumenta e K diminui — o campo realiza trabalho negativo sobre o elétron.', correct: true },
                    { text: 'U diminui e K aumenta — como no próton.', correct: false },
                    { text: 'U e K não mudam — só K+U importa.', correct: false }
                ],
                feedback: `Para q<0, U = q·V é negativo. Quando V cai, U fica menos negativo (aumenta).<br>
                  Para manter K+U constante, K diminui.`,
                isSynth: false
            },
            {
                emoji: '↩️',
                title: 'Elétron — sentido da força',
                text: `Um 🔵 <b>Elétron</b> em V=100 V está em repouso entre as placas.<br><br>
              Para onde a força elétrica o empurra?`,
                options: [
                    { text: 'Para a placa positiva (sentido oposto ao campo).', correct: true },
                    { text: 'Para a placa negativa (mesmo sentido do campo).', correct: false },
                    { text: 'Não há força — ele está em repouso.', correct: false }
                ],
                feedback: `F = q·E. Para q<0, F aponta em sentido oposto a E.<br>
                  Campo vai da placa positiva para a negativa, logo a força empurra o elétron de volta à placa positiva.`,
                isSynth: false
            }
        ];
    } else if (key === 'alpha') {
        questions = [
            {
                emoji: '🟡',
                title: 'Partícula α — comparação com próton',
                text: `Compare ΔU para a 🟡 <b>Partícula α</b> (q=+2e) e para o 🔴 <b>Próton</b> (q=+1e)
               no percurso V=100→60 V, ambas partindo de K₀=0.`,
                options: [
                    { text: '|ΔU_α| = 2|ΔU_p| — α troca o dobro de energia com o campo.', correct: true },
                    { text: '|ΔU_α| = |ΔU_p| — depende só de ΔV.', correct: false },
                    { text: '|ΔU_α| = |ΔU_p|/2 — carga maior sofre menos efeito.', correct: false }
                ],
                feedback: `ΔU = q·ΔV. Se q dobra, |ΔU| dobra no mesmo ΔV.<br>
                  Logo, a partícula α tem |ΔU| e |W| duas vezes maiores que o próton.`,
                isSynth: false
            },
            {
                emoji: '📐',
                title: 'Partícula α — energia final',
                text: `A 🟡 <b>Partícula α</b> (q=+2e) é solta com K₀=0 em V=100 V e chega em V=0 V.<br><br>
               Qual é K_final?`,
                options: [
                    { text: 'K_final = +200 eV — U₀=+200 eV e U_f=0.', correct: true },
                    { text: 'K_final = +100 eV — igual ao próton.', correct: false },
                    { text: 'K_final = +400 eV — carga dobrada implica K quadruplicada.', correct: false }
                ],
                feedback: `U₀ = (+2)(100) = +200 eV; U_f=0; ΔU=−200 eV; W=+200 eV.<br>
                  K_final = 0 + 200 eV = <b>+200 eV</b>.`,
                isSynth: false
            }
        ];
    }

    totalQuestions += questions.length;
    runQuizSequence(questions, () => finishCharQuiz());
}

// Finalizar quiz da partícula
function finishCharQuiz() {
    const key = selectedChar;
    charState[key].quizDone = true;

    const todas = Object.values(charState).every(s => s.quizDone);
    const ainda = Object.entries(charState)
        .map(([k, s]) => (s.quizDone ? '✅' : '⬜') + ' ' + CHARS[k].label)
        .join('<br>');

    if (todas) {
        addScore(PTS.bonusAllChars);
        showNotif('+' + PTS.bonusAllChars + ' pts — todas as partículas concluídas!');
        setTimeout(startSynthesisQuiz, 600);
    } else {
        showModal(
            '✅',
            CHARS[key].label + ' concluída!',
            'Excelente! Explore as outras partículas para ver como U, K e W mudam.<br><br>' + ainda,
            [], '', () => {
                el('screen-lab').style.display = 'none';
                el('screen-start').style.display = 'flex';
                returnToSelection();
            }
        );
    }
}

// Quiz de síntese geral
function startSynthesisQuiz() {
    el('screen-lab').style.display = 'none';
    el('screen-start').style.display = 'none';

    const qs = [
        {
            emoji: '⚡',
            title: 'Síntese — W e ΔU',
            text: `Uma carga +2e vai de V=80 V até V=20 V.<br><br>
             Qual é a variação de energia potencial ΔU e o trabalho do campo W?`,
            options: [
                { text: 'ΔU = −120 eV e W = +120 eV.', correct: true },
                { text: 'ΔU = +120 eV e W = −120 eV.', correct: false },
                { text: 'ΔU = −60 eV e W = +60 eV.', correct: false }
            ],
            feedback: `ΔU = q·ΔV = (+2e)(20−80) = −120 eV.<br>
                W = −ΔU = +120 eV.`,
            isSynth: true
        },
        {
            emoji: '🔋',
            title: 'Síntese — K a partir de ΔV',
            text: `Um próton parte do repouso em V=100 V e chega em V=40 V.<br><br>
             Qual é sua energia cinética nesse ponto?`,
            options: [
                { text: 'K = +60 eV — U₀=100 eV, U=40 eV.', correct: true },
                { text: 'K = +40 eV — igual a V final.', correct: false },
                { text: 'K = +100 eV — mesma da queda até V=0.', correct: false }
            ],
            feedback: `K = U₀ − U = 100 − 40 = <b>+60 eV</b>.`,
            isSynth: true
        },
        {
            emoji: '🔵',
            title: 'Síntese — elétron e ΔV',
            text: `Um elétron (q=−1e) se desloca de V=0 V para V=100 V.<br><br>
             O que acontece com U e com K?`,
            options: [
                { text: 'U diminui (fica mais negativa) e K aumenta.', correct: true },
                { text: 'U aumenta e K também aumenta.', correct: false },
                { text: 'U e K não mudam.', correct: false }
            ],
            feedback: `U = q·V. De 0 a 100 V, U vai de 0 a −100 eV (diminui).<br>
                Para manter K+U constante, K aumenta.`,
            isSynth: true
        }
    ];

    totalQuestions += qs.length;
    runQuizSequence(qs, () => endGame());
}

// Sequência de perguntas
function runQuizSequence(questions, onComplete) {
    let idx = 0;
    function next() {
        if (idx >= questions.length) { onComplete(); return; }
        const q = questions[idx];
        showModal(q.emoji, q.title, q.text, q.options, q.feedback, () => { idx++; next(); }, q.isSynth);
    }
    next();
}

// Modal
function showModal(emoji, title, text, options, feedback, callback, isSynth) {
    modalCallback = callback; quizAnswered = false; wrongThisQ = false;
    el('modal-emoji').textContent = emoji;
    el('modal-title').textContent = title;
    el('modal-text').innerHTML = text;
    el('modal-opts').innerHTML = '';
    const fb = el('modal-fb'), btn = el('modal-btn');
    fb.innerHTML = ''; fb.style.display = 'none'; btn.style.display = 'none';

    if (!options || options.length === 0) {
        quizAnswered = true;
        btn.style.display = 'inline-block';
    } else {
        options.forEach((opt, i) => {
            const b = document.createElement('button');
            b.className = 'opt-btn'; b.innerHTML = opt.text;
            b.onclick = () => answerQuiz(opt.correct, i, options, feedback, isSynth);
            el('modal-opts').appendChild(b);
        });
    }
    el('modal').classList.add('active');
}
function answerQuiz(correct, idx, options, feedback, isSynth) {
    if (quizAnswered) return;
    const btns = document.querySelectorAll('.opt-btn');
    if (correct) {
        quizAnswered = true;
        btns[idx].classList.add('correct');
        options.forEach((o, i) => { if (o.correct) btns[i].classList.add('correct'); });
        btns.forEach(b => b.disabled = true);
        const pts = isSynth ? PTS.synthCorrect : (wrongThisQ ? PTS.correctRetry : PTS.correctFirst);
        addScore(pts); correctCount++;
        showNotif('+' + pts + ' pts — resposta correta!');
        const fb = el('modal-fb'); if (fb && feedback) { fb.style.display = 'block'; fb.innerHTML = feedback; }
        el('modal-btn').style.display = 'inline-block';
    } else {
        wrongThisQ = true;
        const pts = isSynth ? PTS.synthWrong : PTS.wrongAnswer;
        addScore(pts);
        btns[idx].classList.add('wrong');
        showNotif(pts + ' pts — tente novamente.');
        setTimeout(() => { btns[idx].classList.remove('wrong'); btns[idx].disabled = true; }, 800);
    }
}
function closeModal() {
    el('modal').classList.remove('active');
    if (typeof modalCallback === 'function') {
        const cb = modalCallback; modalCallback = null; cb();
    }
}

// Fim de jogo
function endGame() {
    el('screen-lab').style.display = 'none';
    el('screen-start').style.display = 'none';
    el('screen-end').style.display = 'flex';
    el('final-score').textContent = score;
    el('final-correct').textContent = correctCount + ' de ' + totalQuestions;
    const lv = getLevel(), box = el('end-level-box');
    if (box) box.className = 'end-level ' + lv.cls;
    el('end-level-icon').textContent = lv.icon;
    el('end-level-text').textContent = lv.label + ' — ' + lv.desc;
}

// Atalhos de teclado
window.addEventListener('keydown', ev => {
    if (el('modal').classList.contains('active')) return;
    if (el('screen-lab').style.display === 'none') return;
    if (animating) return;
    switch (ev.key) {
        case 'ArrowRight':
        case 'd':
        case 'D':
            ev.preventDefault(); moveRight(); break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            ev.preventDefault(); moveLeft(); break;
        case 'r':
        case 'R':
            ev.preventDefault(); resetChar(); break;
        case ' ':
            ev.preventDefault();
            if (currentIndex === 0) runAnimation();
            break;
        case 'Escape':
            ev.preventDefault(); returnToSelection(); break;
    }
});