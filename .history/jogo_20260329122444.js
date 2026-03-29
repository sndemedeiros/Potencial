'use strict';

// ═══════════════════════════════════════════════════════════
//  CONSTANTES E DADOS
// ═══════════════════════════════════════════════════════════
const NUM_POINTS = 6;
const V_MAX = 100;
const V_MIN = 0;
const K0 = 0;
const ANIM_DUR = 2800;

const CHARS = {
    proton: { label: 'Próton', charge: +1, emoji: '🔴', chargeLabel: '+1e' },
    electron: { label: 'Elétron', charge: -1, emoji: '🔵', chargeLabel: '−1e' },
    alpha: { label: 'Partícula α', charge: +2, emoji: '🟡', chargeLabel: '+2e' }
};

const PTS = {
    visitPoint: 10,
    bonusAllPoints: 30,
    bonusAllChars: 50,
    correctFirst: 50,
    correctRetry: 20,
    wrongAnswer: -10,
    synthCorrect: 100,
    synthWrong: -20
};

// ═══════════════════════════════════════════════════════════
//  ESTADO GLOBAL
// ═══════════════════════════════════════════════════════════
let selectedChar = null;
let currentIndex = 0;
let score = 0;
let modalCallback = null;
let quizAnswered = false;
let wrongThisQ = false;
let notifTimer = null;
let correctCount = 0;
let totalQuestions = 0;
let animating = false;
let animStartT = 0;
let animPosFloat = 0;

function freshState() {
    return { explored: false, visited: new Array(NUM_POINTS).fill(false), quizDone: false };
}
const charState = {
    proton: freshState(),
    electron: freshState(),
    alpha: freshState()
};

// ═══════════════════════════════════════════════════════════
//  CANVAS
// ═══════════════════════════════════════════════════════════
const canvas = document.getElementById('lab-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const wrap = document.getElementById('canvas-wrap');
    const r = wrap.getBoundingClientRect();
    canvas.width = Math.max(200, Math.floor(r.width - 24));
    canvas.height = Math.max(160, Math.floor(r.height - 24));
    if (!animating) drawField();
}
window.addEventListener('resize', () => {
    if (el('screen-lab').style.display !== 'none') resizeCanvas();
});

// ═══════════════════════════════════════════════════════════
//  FÍSICA
// ═══════════════════════════════════════════════════════════
function computeV(i) {
    return Math.round(V_MAX - (V_MAX - V_MIN) * i / (NUM_POINTS - 1));
}
function computeVcont(s) {
    return V_MAX - (V_MAX - V_MIN) * s;
}
function computeU(charge, V) {
    return charge * V;
}
function computeEM(charge) {
    return K0 + computeU(charge, computeV(0));
}
function computeK(charge, i) {
    return computeEM(charge) - computeU(charge, computeV(i));
}
function computeKcont(charge, s) {
    return computeEM(charge) - computeU(charge, computeVcont(s));
}

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════
function el(id) { return document.getElementById(id); }

function fmtEV(val) {
    return (val >= 0 ? '+' : '') + Math.round(val) + ' eV';
}
function fmtEVf(val) {
    return (val >= 0 ? '+' : '') + val.toFixed(1) + ' eV';
}

// Embaralha um array in-place (Fisher–Yates)
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ═══════════════════════════════════════════════════════════
//  PONTUAÇÃO E NÍVEL
// ═══════════════════════════════════════════════════════════
function addScore(pts) {
    score += pts;
    if (score < 0) score = 0;
    const e = el('top-score');
    if (e) e.textContent = score;
    updateTopLevel();
}

function getLevel() {
    if (score >= 600) return {
        label: 'Ouro', icon: '🥇', cls: 'ouro',
        desc: 'Excelente domínio de potencial e conservação de energia!'
    };
    if (score >= 300) return {
        label: 'Prata', icon: '🥈', cls: 'prata',
        desc: 'Boa compreensão. Revise os casos do elétron e da partícula α.'
    };
    return {
        label: 'Bronze', icon: '🥉', cls: 'bronze',
        desc: 'Explore todos os pontos e releia as explicações.'
    };
}

function updateTopLevel() {
    const lv = getLevel();
    const e = el('top-level');
    if (!e) return;
    e.textContent = lv.icon + ' ' + lv.label;
    e.className = 'top-val ' + lv.cls;
}

// ═══════════════════════════════════════════════════════════
//  NOTIFICAÇÃO
// ═══════════════════════════════════════════════════════════
function showNotif(msg) {
    const e = el('notif');
    if (!e) return;
    e.textContent = msg;
    e.classList.add('show');
    clearTimeout(notifTimer);
    notifTimer = setTimeout(() => e.classList.remove('show'), 3000);
}

// ═══════════════════════════════════════════════════════════
//  SELEÇÃO DE PARTÍCULA (tela inicial)
// ═══════════════════════════════════════════════════════════
function selectChar(cardEl) {
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    cardEl.classList.add('selected');
    selectedChar = cardEl.dataset.char;
}

// ═══════════════════════════════════════════════════════════
//  INICIAR LABORATÓRIO
// ═══════════════════════════════════════════════════════════
function startLab() {
    if (!selectedChar) {
        showNotif('⚠️ Escolha uma partícula antes de iniciar.');
        return;
    }
    const ch = CHARS[selectedChar];
    const state = charState[selectedChar];

    currentIndex = 0;
    animating = false;
    animPosFloat = 0;

    el('screen-start').style.display = 'none';
    el('screen-lab').style.display = 'flex';

    el('top-char-name').textContent =
        ch.emoji + ' ' + ch.label + ' (' + ch.chargeLabel + ')';

    updateTopLevel();
    resizeCanvas();
    updateAll();

    el('btn-run').style.display = state.explored ? 'none' : 'inline-block';
    el('btn-quiz').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════
//  NAVEGAÇÃO
// ═══════════════════════════════════════════════════════════
function moveRight() {
    if (animating || currentIndex >= NUM_POINTS - 1) return;
    currentIndex++;
    updateAll();
    checkQuizReady();
}

function moveLeft() {
    if (animating || currentIndex <= 0) return;
    currentIndex--;
    updateAll();
}

function resetChar() {
    if (animating) return;
    currentIndex = 0;
    updateAll();
    el('btn-quiz').style.display = 'none';
    el('btn-run').style.display =
        charState[selectedChar].explored ? 'none' : 'inline-block';
}

function returnToSelection() {
    if (animating) return;
    el('screen-lab').style.display = 'none';
    el('screen-start').style.display = 'flex';
    Object.keys(charState).forEach(key => {
        const chk = el('check-' + key);
        const card = document.querySelector('[data-char="' + key + '"]');
        if (chk) chk.style.display = charState[key].explored ? 'block' : 'none';
        if (card && charState[key].explored) card.classList.add('completed');
    });
}

function setControlsEnabled(on) {
    ['btn-left', 'btn-right', 'btn-reset', 'btn-run', 'btn-quiz'].forEach(id => {
        const b = el(id);
        if (b) b.disabled = !on;
    });
}

function checkQuizReady() {
    const state = charState[selectedChar];
    if (state.visited.every(v => v) && !state.quizDone) {
        el('btn-quiz').style.display = 'inline-block';
    }
}

// ═══════════════════════════════════════════════════════════
//  ATUALIZA PAINEL
// ═══════════════════════════════════════════════════════════
function updateAll() {
    if (!selectedChar) return;
    const ch = CHARS[selectedChar];
    const state = charState[selectedChar];
    const i = currentIndex;
    const V = computeV(i);
    const U = computeU(ch.charge, V);
    const K = computeK(ch.charge, i);
    const EM = computeEM(ch.charge);

    // marca visitado
    if (!state.visited[i]) {
        state.visited[i] = true;
        addScore(PTS.visitPoint);
        showNotif('+' + PTS.visitPoint + ' pts — ponto ' + (i + 1) + ' visitado!');
    }

    // bônus todos os pontos
    if (state.visited.every(v => v) && !state.explored) {
        state.explored = true;
        addScore(PTS.bonusAllPoints);
        showNotif('+' + PTS.bonusAllPoints + ' pts — todos os pontos explorados!');
        el('btn-run').style.display = 'none';
        checkQuizReady();
    }

    // visitados
    const visitCount = state.visited.filter(v => v).length;
    el('top-visited').textContent = visitCount + ' / ' + NUM_POINTS;

    // dots
    const dots = el('top-dots');
    dots.innerHTML = '';
    state.visited.forEach(v => {
        const d = document.createElement('div');
        d.className = 'dot' + (v ? ' on' : '');
        dots.appendChild(d);
    });

    // painel de leituras
    el('rd-pos-num').textContent = i + 1;
    el('rd-v').textContent = V + ' V';

    const qs = ch.charge > 0 ? '+' : '';
    el('rd-u').textContent = fmtEV(U);
    el('rd-u-formula').textContent =
        'U = (' + qs + ch.charge + 'e) × ' + V + ' V = ' + fmtEV(U);

    el('rd-k').textContent = fmtEV(K);
    el('rd-k').className = 'card-val ' + (K >= 0 ? 'green' : 'red');
    el('rd-k-sub').textContent =
        'K = ' + fmtEV(EM) + ' − (' + fmtEV(U) + ') = ' + fmtEV(K);

    el('rd-em').textContent = fmtEV(EM);

    // trabalho
    if (i === 0) {
        el('rd-work').textContent = '—';
        el('rd-work-sub').textContent = 'Ponto inicial — nenhum passo anterior.';
        el('rd-work-hint').textContent = '';
    } else {
        const Vprev = computeV(i - 1);
        const Uprev = computeU(ch.charge, Vprev);
        const W = -(U - Uprev);
        const deltaK = K - computeK(ch.charge, i - 1);
        el('rd-work').textContent = fmtEV(W);
        el('rd-work').className = 'card-val ' + (W >= 0 ? 'green' : 'red');
        el('rd-work-sub').textContent =
            'W = −ΔU = −(' + fmtEV(U) + ' − ' + fmtEV(Uprev) + ') = ' + fmtEV(W);
        el('rd-work-hint').textContent =
            'Verificação: ΔK = ' + fmtEV(deltaK) + (Math.abs(W - deltaK) < 0.5 ? ' ✓' : '');
    }

    // barras de energia
    const absEM = Math.abs(EM) || 1;
    const kPct = Math.min(100, Math.max(0, (Math.abs(K) / absEM) * 100));
    const uPct = Math.min(100, Math.max(0, (Math.abs(U) / absEM) * 100));
    const emPct = 100;

    el('bar-k').style.width = kPct + '%';
    el('bar-u').style.width = uPct + '%';
    el('bar-em').style.width = emPct + '%';
    el('bar-k-val').textContent = fmtEV(K);
    el('bar-u-val').textContent = fmtEV(U);
    el('bar-em-val').textContent = fmtEV(EM);

    // hint contextual
    const hint = el('ctx-hint');
    if (hint) {
        hint.style.display = 'block';
        if (ch.charge > 0) {
            hint.textContent = i === 0
                ? 'Partícula na placa positiva (V máximo). U máxima, K = 0.'
                : 'V caiu ' + (computeV(0) - V) + ' V → K aumentou ' + fmtEV(K) + '. K+U conservada.';
        } else {
            hint.textContent = i === 0
                ? 'Elétron na placa positiva (V máximo). U mais negativa, K = 0.'
                : 'Elétron avançou ' + i + ' passo(s). U aumentou, K diminuiu. K+U conservada.';
        }
    }

    drawField();
}

// ═══════════════════════════════════════════════════════════
//  ANIMAÇÃO
// ═══════════════════════════════════════════════════════════
function runAnimation() {
    if (!selectedChar || animating) return;
    if (currentIndex !== 0) {
        currentIndex = 0;
        updateAll();
        setTimeout(runAnimation, 150);
        return;
    }
    if (CHARS[selectedChar].charge < 0) {
        showNotif('⚠️ Elétron não acelera neste sentido partindo do repouso.');
    }
    animating = true;
    animStartT = performance.now();
    setControlsEnabled(false);
    requestAnimationFrame(stepAnimation);
}

function stepAnimation(t) {
    if (!animating) return;
    const ch = CHARS[selectedChar];
    const elapsed = t - animStartT;
    let s = Math.min(elapsed / ANIM_DUR, 1);
    const sEased = ch.charge >= 0 ? s * s : 1 - Math.pow(1 - s, 2);
    animPosFloat = sEased * (NUM_POINTS - 1);

    const Vt = computeVcont(sEased);
    const Ut = computeU(ch.charge, Vt);
    const Kt = computeKcont(ch.charge, sEased);
    const EM = computeEM(ch.charge);

    el('rd-pos-num').textContent = (animPosFloat + 1).toFixed(1);
    el('rd-v').textContent = Vt.toFixed(1) + ' V';
    el('rd-u').textContent = fmtEVf(Ut);
    el('rd-k').textContent = fmtEVf(Kt);
    el('rd-k').className = 'card-val ' + (Kt >= 0 ? 'green' : 'red');
    el('rd-em').textContent = fmtEVf(EM);
    el('rd-work').textContent = '—';
    el('rd-work-sub').textContent = '(durante animação)';

    const absEM = Math.abs(EM) || 1;
    el('bar-k').style.width = Math.min(100, (Math.abs(Kt) / absEM) * 100) + '%';
    el('bar-u').style.width = Math.min(100, (Math.abs(Ut) / absEM) * 100) + '%';
    el('bar-em').style.width = '100%';
    el('bar-k-val').textContent = fmtEVf(Kt);
    el('bar-u-val').textContent = fmtEVf(Ut);
    el('bar-em-val').textContent = fmtEVf(EM);

    drawFieldAnimated(animPosFloat, Vt, Ut, Kt);

    if (s < 1) {
        requestAnimationFrame(stepAnimation);
    } else {
        animating = false;
        currentIndex = NUM_POINTS - 1;
        animPosFloat = currentIndex;
        const state = charState[selectedChar];
        state.visited.fill(true);
        if (!state.explored) {
            state.explored = true;
            addScore(PTS.bonusAllPoints);
        }
        setControlsEnabled(true);
        updateAll();
        showNotif('Animação concluída! Toda ΔU convertida em ΔK.');
        checkQuizReady();
    }
}

// ═══════════════════════════════════════════════════════════
//  CANVAS — DESENHO
// ═══════════════════════════════════════════════════════════
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
    const ch = CHARS[selectedChar];
    const state = charState[selectedChar];

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    const plateH = H * 0.60;
    const plateY = (H - plateH) / 2;
    const pX0 = 32, pX1 = W - 32;
    const step = (pX1 - pX0) / (NUM_POINTS - 1);
    const pY = H * 0.50;

    // placa positiva
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(0, plateY, 22, plateH);
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', 11, H / 2);
    ctx.fillStyle = '#fecaca';
    ctx.font = '9px monospace';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('100 V', 11, plateY - 5);

    // placa negativa
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(W - 22, plateY, 22, plateH);
    ctx.fillStyle = '#bfdbfe';
    ctx.font = 'bold 15px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('−', W - 11, H / 2);
    ctx.fillStyle = '#bfdbfe';
    ctx.font = '9px monospace';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('0 V', W - 11, plateY - 5);

    // linhas de campo
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([]);
    ctx.lineCap = 'round';
    [0.25, 0.42, 0.58, 0.75].forEach(fy => {
        const ry = plateY + plateH * fy;
        ctx.beginPath();
        ctx.moveTo(pX0, ry);
        ctx.lineTo(pX1, ry);
        ctx.stroke();
        [0.28, 0.52, 0.76].forEach(fx => {
            const ax = pX0 + (pX1 - pX0) * fx, as = 5;
            ctx.beginPath();
            ctx.moveTo(ax, ry); ctx.lineTo(ax - as, ry - as * 0.5);
            ctx.moveTo(ax, ry); ctx.lineTo(ax - as, ry + as * 0.5);
            ctx.stroke();
        });
    });
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#475569';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('→ E', pX0 + 4, plateY + plateH + 13);

    // equipotenciais
    [80, 60, 40, 20].forEach(Veq => {
        const xEq = pX0 + (pX1 - pX0) * (1 - Veq / V_MAX);
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#164e63';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xEq, plateY - 4);
        ctx.lineTo(xEq, plateY + plateH + 4);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#22d3ee';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(Veq + ' V', xEq, plateY - 7);
    });

    // pontos discretos
    for (let i = 0; i < NUM_POINTS; i++) {
        const px = pX0 + i * step;
        const isActive = !animating && i === currentIndex;
        const visited = state.visited[i];

        if (isActive) {
            const Vi = computeV(i);
            const Ui = computeU(ch.charge, Vi);
            const Ki = computeK(ch.charge, i);

            const tagW = 172, tagH = 50;
            const tagX = Math.min(Math.max(px - tagW / 2, pX0), pX1 - tagW);
            const tagY = pY - 115;

            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.roundRect(tagX, tagY, tagW, tagH, 6);
            ctx.fill();
            ctx.stroke();

            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('V = ' + Vi + ' V', px, tagY + 10);
            ctx.fillStyle = '#f97316';
            ctx.fillText('U = ' + fmtEV(Ui), px, tagY + 24);
            ctx.fillStyle = Ki >= 0 ? '#22c55e' : '#f43f5e';
            ctx.fillText('K = ' + fmtEV(Ki), px, tagY + 38);

            ctx.font = '26px sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillText(ch.emoji, px, pY);

            ctx.fillStyle = '#f1f5f9';
            ctx.font = 'bold 10px monospace';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(i + 1, px, pY + 22);

        } else {
            const ms = 4;
            ctx.strokeStyle = visited ? '#475569' : '#1e293b';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(px - ms, pY - ms); ctx.lineTo(px + ms, pY + ms);
            ctx.moveTo(px + ms, pY - ms); ctx.lineTo(px - ms, pY + ms);
            ctx.stroke();
            ctx.fillStyle = visited ? '#475569' : '#334155';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(i + 1, px, pY + 16);
        }
    }

    // partícula animada
    if (animating) {
        const px = pX0 + idxFloat * step;

        const tagW = 172, tagH = 50;
        const tagX = Math.min(Math.max(px - tagW / 2, pX0), pX1 - tagW);
        const tagY = pY - 115;

        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.roundRect(tagX, tagY, tagW, tagH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('V = ' + Vcurr.toFixed(1) + ' V', px, tagY + 10);
        ctx.fillStyle = '#f97316';
        ctx.fillText('U = ' + fmtEVf(Ucurr), px, tagY + 24);
        ctx.fillStyle = Kcurr >= 0 ? '#22c55e' : '#f43f5e';
        ctx.fillText('K = ' + fmtEVf(Kcurr), px, tagY + 38);

        ctx.font = '28px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(ch.emoji, px, pY);
    }

    // seta de força
    const pxF = animating ? pX0 + idxFloat * step : pX0 + currentIndex * step;
    const Kcheck = animating ? Kcurr : computeK(ch.charge, currentIndex);
    if (Kcheck >= 0 || !animating) {
        const dir = ch.charge > 0 ? 1 : -1;
        const ax0 = pxF + dir * 24, ax1 = pxF + dir * 62, ay = pY - 30;
        ctx.strokeStyle = ch.charge > 0 ? '#f97316' : '#f43f5e';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(ax0, ay);
        ctx.lineTo(ax1, ay);
        ctx.stroke();
        const tip = 7;
        ctx.beginPath();
        ctx.moveTo(ax1, ay); ctx.lineTo(ax1 - dir * tip, ay - tip * 0.5);
        ctx.moveTo(ax1, ay); ctx.lineTo(ax1 - dir * tip, ay + tip * 0.5);
        ctx.stroke();
        ctx.lineCap = 'butt';
    }

    ctx.setLineDash([]);
    ctx.fillStyle = '#334155';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('linhas de campo  |  ciano: equipotenciais', pX0, H - 8);
}

// ═══════════════════════════════════════════════════════════
//  QUIZ POR PARTÍCULA
// ═══════════════════════════════════════════════════════════
function startCharQuiz() {
    const btnQ = el('btn-quiz');
    if (btnQ) btnQ.style.display = 'none';
    const key = selectedChar;
    let questions = [];

    if (key === 'proton') {
        questions = [
            {
                emoji: '⚡', title: 'Próton — ΔU e W',
                text: `O 🔴 <b>Próton</b> (q = +1e) vai de V = 100 V até V = 60 V.<br><br>
               Qual é ΔU e qual é o trabalho W do campo?`,
                options: [
                    { text: 'ΔU = −40 eV e W = +40 eV — U cai, campo faz trabalho positivo.', correct: true },
                    { text: 'ΔU = +40 eV e W = −40 eV — o próton ganha energia potencial.', correct: false },
                    { text: 'ΔU = 0 — energia mecânica conservada, logo nada varia.', correct: false }
                ],
                feedback: `ΔU = q·ΔV = (+1e)(60 − 100) = <b>−40 eV</b>.<br>
                   W = −ΔU = <b>+40 eV</b>. A queda de U converte-se em aumento de K.`,
                isSynth: false
            },
            {
                emoji: '🔋', title: 'Próton — energia final',
                text: `O 🔴 <b>Próton</b> é solto com K₀ = 0 em V = 100 V e chega em V = 0 V.<br><br>
               Qual é K_final?`,
                options: [
                    { text: 'K_final = +100 eV — toda U inicial se converte em K.', correct: true },
                    { text: 'K_final = 0 — a energia mecânica é constante.', correct: false },
                    { text: 'K_final = −100 eV — o próton perde energia cinética.', correct: false }
                ],
                feedback: `U₀ = +100 eV; U_f = 0.<br>
                   K_final = 0 + 100 − 0 = <b>+100 eV</b>.<br>
                   Toda a energia potencial inicial foi convertida em cinética.`,
                isSynth: false
            }
        ];

    } else if (key === 'electron') {
        questions = [
            {
                emoji: '🔵', title: 'Elétron — U e K',
                text: `O 🔵 <b>Elétron</b> (q = −1e) avança de V = 100 V para V = 60 V.<br><br>
               O que acontece com U e K?`,
                options: [
                    { text: 'U aumenta e K diminui — campo faz trabalho negativo sobre o elétron.', correct: true },
                    { text: 'U diminui e K aumenta — como acontece com o próton.', correct: false },
                    { text: 'U e K não mudam — apenas K + U precisa ser constante.', correct: false }
                ],
                feedback: `U = (−1e)·V. Quando V cai de 100 a 60, U vai de −100 a −60 eV: <b>U aumenta</b>.<br>
                   Para K + U constante, K <b>diminui</b>.`,
                isSynth: false
            },
            {
                emoji: '↩️', title: 'Elétron — sentido da força',
                text: `Um 🔵 <b>Elétron</b> em repouso em V = 100 V.<br><br>
               Para onde a força elétrica o empurra?`,
                options: [
                    { text: 'Para a placa positiva — sentido oposto ao campo E.', correct: true },
                    { text: 'Para a placa negativa — mesmo sentido do campo E.', correct: false },
                    { text: 'Nenhuma força — está em repouso.', correct: false }
                ],
                feedback: `F = q·E. Para q < 0, F aponta em sentido <b>oposto</b> a E.<br>
                   O campo aponta da placa (+) para a (−), logo F empurra o elétron
                   de volta à placa <b>positiva</b>.`,
                isSynth: false
            }
        ];

    } else if (key === 'alpha') {
        questions = [
            {
                emoji: '🟡', title: 'Partícula α — comparação',
                text: `Compare |ΔU| da 🟡 <b>Partícula α</b> (q = +2e) e do 🔴 <b>Próton</b> (q = +1e)
               no mesmo percurso V = 100 → 60 V.`,
                options: [
                    { text: '|ΔU_α| = 2 × |ΔU_p| — carga dupla, variação de U dupla.', correct: true },
                    { text: '|ΔU_α| = |ΔU_p| — ΔU depende apenas de ΔV.', correct: false },
                    { text: '|ΔU_α| = |ΔU_p| / 2 — carga maior, menor variação.', correct: false }
                ],
                feedback: `ΔU = q·ΔV. Próton: (+1)(−40) = −40 eV.<br>
                   Partícula α: (+2)(−40) = <b>−80 eV</b>.<br>
                   Carga dobrada → |ΔU| e W dobrados no mesmo percurso.`,
                isSynth: false
            },
            {
                emoji: '📐', title: 'Partícula α — energia final',
                text: `A 🟡 <b>Partícula α</b> (q = +2e) é solta com K₀ = 0 em V = 100 V
               e chega em V = 0 V.<br><br>Qual é K_final?`,
                options: [
                    { text: 'K_final = +200 eV — U₀ = +200 eV e U_f = 0.', correct: true },
                    { text: 'K_final = +100 eV — igual ao próton, mesmo percurso.', correct: false },
                    { text: 'K_final = +400 eV — carga dobrada eleva K ao quadrado.', correct: false }
                ],
                feedback: `U₀ = (+2)(100) = +200 eV; U_f = 0.<br>
                   K_final = 0 + 200 − 0 = <b>+200 eV</b>.<br>
                   O dobro do próton porque a carga é duas vezes maior.`,
                isSynth: false
            }
        ];
    }

    totalQuestions += questions.length;
    runQuizSequence(questions, () => finishCharQuiz());
}

function finishCharQuiz() {
    const key = selectedChar;
    charState[key].quizDone = true;

    const todas = Object.values(charState).every(s => s.quizDone);
    const resumo = Object.entries(charState)
        .map(([k, s]) => (s.quizDone ? '✅' : '⬜') + ' ' + CHARS[k].label)
        .join('<br>');

    if (todas) {
        addScore(PTS.bonusAllChars);
        showNotif('+' + PTS.bonusAllChars + ' pts — todas as partículas concluídas!');
        setTimeout(startSynthesisQuiz, 700);
    } else {
        showModal(
            '✅',
            CHARS[key].label + ' concluída!',
            'Ótimo! Explore as outras partículas para ver como U, K e W mudam.<br><br>' + resumo,
            [], '', () => {
                el('screen-lab').style.display = 'none';
                el('screen-start').style.display = 'flex';
                returnToSelection();
            }
        );
    }
}

// ═══════════════════════════════════════════════════════════
//  QUIZ DE SÍNTESE
// ═══════════════════════════════════════════════════════════
function startSynthesisQuiz() {
    el('screen-lab').style.display = 'none';
    el('screen-start').style.display = 'none';

    const qs = [
        {
            emoji: '⚡', title: 'Síntese — W e ΔU',
            text: `Uma carga +2e vai de V = 80 V até V = 20 V.<br><br>
             Qual é ΔU e o trabalho W do campo?`,
            options: [
                { text: 'ΔU = −120 eV e W = +120 eV.', correct: true },
                { text: 'ΔU = +120 eV e W = −120 eV.', correct: false },
                { text: 'ΔU = −60 eV e W = +60 eV — depende só de ΔV.', correct: false }
            ],
            feedback: `ΔU = q·ΔV = (+2e)(20 − 80) = <b>−120 eV</b>.<br>
                 W = −ΔU = <b>+120 eV</b>.`,
            isSynth: true
        },
        {
            emoji: '🔋', title: 'Síntese — K a partir de ΔV',
            text: `Um próton parte do repouso em V = 100 V e chega em V = 40 V.<br><br>
             Qual é sua energia cinética nesse ponto?`,
            options: [
                { text: 'K = +60 eV — U₀ = 100 eV, U = 40 eV, K = 100 − 40.', correct: true },
                { text: 'K = +40 eV — igual ao valor de V no ponto final.', correct: false },
                { text: 'K = +100 eV — mesma energia que teria ao chegar em V=0.', correct: false }
            ],
            feedback: `K = 0 + 100 − 40 = <b>+60 eV</b>.<br>
                 A cada volt que V cai, o próton ganha 1 eV de energia cinética.`,
            isSynth: true
        },
        {
            emoji: '🔵', title: 'Síntese — elétron e potencial crescente',
            text: `Um elétron (q = −1e) parte do repouso em V = 0 V
             e se desloca para V = 100 V.<br><br>
             O que acontece com U e K?`,
            options: [
                { text: 'U diminui (fica mais negativa) e K aumenta — o campo acelera o elétron.', correct: true },
                { text: 'U aumenta e K diminui — o campo freia o elétron.', correct: false },
                { text: 'Nada muda — K + U é constante, logo K e U separados também são.', correct: false }
            ],
            feedback: `U = (−1e)·V. De V = 0 a V = 100, U vai de 0 a −100 eV: <b>U diminui</b>.<br>
                 Para K + U constante, K <b>aumenta</b>.<br>
                 O elétron move-se para potenciais mais altos, mas é acelerado — oposto ao próton.`,
            isSynth: true
        }
    ];

    totalQuestions += qs.length;
    runQuizSequence(qs, () => endGame());
}

// ═══════════════════════════════════════════════════════════
//  SEQUÊNCIA DE PERGUNTAS
// ═══════════════════════════════════════════════════════════
function runQuizSequence(questions, onComplete) {
    let idx = 0;
    function next() {
        if (idx >= questions.length) { onComplete(); return; }
        const q = questions[idx];
        showModal(q.emoji, q.title, q.text, q.options, q.feedback,
            () => { idx++; next(); }, q.isSynth);
    }
    next();
}

// ═══════════════════════════════════════════════════════════
//  MODAL
// ═══════════════════════════════════════════════════════════
function showModal(emoji, title, text, options, feedback, callback, isSynth) {
    modalCallback = callback;
    quizAnswered = false;
    wrongThisQ = false;

    el('modal-emoji').textContent = emoji;
    el('modal-title').textContent = title;
    el('modal-text').innerHTML = text;
    el('modal-opts').innerHTML = '';

    const fb = el('modal-fb');
    const btn = el('modal-btn');
    fb.innerHTML = '';
    fb.style.display = 'none';
    btn.style.display = 'none';

    if (!options || options.length === 0) {
        quizAnswered = true;
        btn.style.display = 'inline-block';
    } else {
        // Cria uma cópia e embaralha para não estragar o array original da questão
        const shuffled = shuffleArray(options.map(o => ({ ...o })));

        shuffled.forEach((opt, i) => {
            const b = document.createElement('button');
            b.className = 'opt-btn';
            b.innerHTML = opt.text;
            b.onclick = () => answerQuiz(opt.correct, i, shuffled, feedback, isSynth);
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
        // Percorre as opções originais para encontrar a correta e marcá-la
        options.forEach((o, i) => { if (o.correct) btns[i].classList.add('correct'); });
        btns.forEach(b => b.disabled = true);

        const pts = isSynth
            ? PTS.synthCorrect
            : wrongThisQ ? PTS.correctRetry : PTS.correctFirst;

        addScore(pts);
        correctCount++;
        showNotif('+' + pts + ' pts — resposta correta!');

        const fb = el('modal-fb');
        if (fb && feedback) { fb.style.display = 'block'; fb.innerHTML = feedback; }
        el('modal-btn').style.display = 'inline-block';

    } else {
        wrongThisQ = true;
        const pts = isSynth ? PTS.synthWrong : PTS.wrongAnswer;
        addScore(pts);
        btns[idx].classList.add('wrong');
        showNotif(pts + ' pts — tente novamente.');
        setTimeout(() => {
            btns[idx].classList.remove('wrong');
            btns[idx].disabled = true;
        }, 800);
    }
}

function closeModal() {
    el('modal').classList.remove('active');
    if (typeof modalCallback === 'function') {
        const cb = modalCallback;
        modalCallback = null;
        cb();
    }
}

// ═══════════════════════════════════════════════════════════
//  FIM DE JOGO
// ═══════════════════════════════════════════════════════════
function endGame() {
    el('screen-lab').style.display = 'none';
    el('screen-start').style.display = 'none';
    el('screen-end').style.display = 'flex';

    el('final-score').textContent = score;
    el('final-correct').textContent = correctCount + ' de ' + totalQuestions;

    const lv = getLevel();
    const box = el('end-level-box');
    if (box) box.className = 'end-level ' + lv.cls;
    el('end-level-icon').textContent = lv.icon;
    el('end-level-text').textContent = lv.label + ' — ' + lv.desc;
}

// ═══════════════════════════════════════════════════════════
//  ATALHOS DE TECLADO
// ═══════════════════════════════════════════════════════════
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