let candidates = [];
let stage1Completed = false;
let orderedCandidatesForStage2 = [];
let currentDrawerIndex = 0;
let availableNumbers = [];
let counterInterval = null;
let isSpinning = false;
let currentDisplayedNum = null;
let audioCtx = null;

function playBeep(freq = 600, duration = 0.05, type = 'sine') {
    try {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
        if (audioCtx) {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        }
    } catch (err) {}
}

function playWinSound() {
    playBeep(523.25, 0.15, 'triangle');
    setTimeout(() => playBeep(659.25, 0.15, 'triangle'), 120);
    setTimeout(() => playBeep(783.99, 0.3, 'triangle'), 240);
}

// 2 Versi Pengacakan Angka
function getRandomInt(max) {
    const rngEl = document.getElementById('rngVersion');
    const version = rngEl ? rngEl.value : 'crypto';
    
    if (version === 'crypto' && window.crypto && window.crypto.getRandomValues) {
        const array = new Uint32Array(1);
        const maxUint32 = 0xFFFFFFFF;
        const limit = maxUint32 - (maxUint32 % max);
        let randomValue;
        do {
            window.crypto.getRandomValues(array);
            randomValue = array[0];
        } while (randomValue >= limit);
        return randomValue % max;
    } else {
        return Math.floor(Math.random() * max);
    }
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = getRandomInt(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function goToPage(pageNum) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(`page-${pageNum}`).classList.add('active');

    for (let i = 1; i <= 3; i++) {
        const ind = document.getElementById(`step-ind-${i}`);
        if (!ind) continue;
        if (i === pageNum) ind.className = 'flex items-center gap-2 text-cyan-400 font-bold';
        else if (i < pageNum) ind.className = 'flex items-center gap-2 text-emerald-400';
        else ind.className = 'flex items-center gap-2 text-slate-500';
    }

    if (pageNum === 2) renderStage1Page();
    if (pageNum === 3) initStage2Page();
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    }
}

// Halaman 1: Kehadiran Calon
function addCandidate(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('candidateNameInput');
    const name = input.value.trim();
    if (!name) return;

    candidates.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: name,
        attendanceOrder: candidates.length + 1,
        drawTurnOrder: null,
        officialNumber: null
    });

    input.value = '';
    input.focus();
    stage1Completed = false;
    playBeep(700, 0.06);
    renderAttendanceList();
}

function removeCandidate(id) {
    candidates = candidates.filter(c => c.id !== id);
    candidates.forEach((c, idx) => c.attendanceOrder = idx + 1);
    stage1Completed = false;
    renderAttendanceList();
}

function renderAttendanceList() {
    const listEl = document.getElementById('attendanceList');
    const countEl = document.getElementById('candidateCount');
    const btnNext = document.getElementById('btnToPage2');

    countEl.textContent = candidates.length;

    if (candidates.length === 0) {
        listEl.innerHTML = `<div style="text-align:center; padding:2rem; color:#64748b;">Belum ada calon yang dientri. Minimal 2 calon untuk memulai undian.</div>`;
    } else {
        listEl.innerHTML = candidates.map(c => `
            <div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="background:rgba(6,182,212,0.2); color:#22d3ee; padding:4px 10px; border-radius:6px; font-weight:bold;">#${c.attendanceOrder}</span>
                    <div>
                        <p style="font-weight:bold; color:#fff; margin:0;">${escapeHtml(c.name)}</p>
                        <p style="font-size:11px; color:#94a3b8; margin:0;">Hadir ke-${c.attendanceOrder}</p>
                    </div>
                </div>
                <button type="button" onclick="removeCandidate(${c.id})" style="background:transparent; color:#f43f5e; padding:4px 8px;">✕</button>
            </div>
        `).join('');
    }
    btnNext.disabled = candidates.length < 2;
}

function resetAllData() {
    if (confirm('Hapus semua data calon dan ulangi dari awal?')) {
        candidates = [];
        stage1Completed = false;
        renderAttendanceList();
    }
}
// Halaman 2: Undian 1 (Urutan Pengambilan)
function renderStage1Page() {
    const inputList = document.getElementById('stage1InputList');
    inputList.innerHTML = candidates.map(c => `
        <div>
            <span style="color:#94a3b8; font-size:12px;">Hadir #${c.attendanceOrder}</span>
            <span style="font-weight:bold; color:#fff;">${escapeHtml(c.name)}</span>
        </div>
    `).join('');

    if (stage1Completed) {
        renderStage1Results();
    } else {
        document.getElementById('stage1ResultList').innerHTML = `<div style="text-align:center; padding:2rem; color:#64748b;">Klik tombol "ACAK URUTAN" untuk menentukan giliran.</div>`;
        document.getElementById('btnToPage3').disabled = true;
    }
}

function runStage1Draw() {
    const btn = document.getElementById('btnShuffleStage1');
    const resultBox = document.getElementById('stage1ResultList');
    const algoVersion = document.getElementById('rngVersion').value;
    
    btn.disabled = true;
    let ticks = 0;

    const anim = setInterval(() => {
        ticks++;
        playBeep(400 + ticks * 25, 0.04);
        const tempShuffled = shuffleArray(candidates);
        resultBox.innerHTML = tempShuffled.map(c => `
            <div style="opacity:0.7;">
                <span style="color:#fbbf24; font-weight:bold;">?</span>
                <span style="color:#cbd5e1;">${escapeHtml(c.name)}</span>
            </div>
        `).join('');

        if (ticks >= 18) {
            clearInterval(anim);
            const finalOrder = shuffleArray(candidates);
            finalOrder.forEach((item, index) => {
                const target = candidates.find(c => c.id === item.id);
                target.drawTurnOrder = index + 1;
                target.officialNumber = null;
            });

            stage1Completed = true;
            btn.disabled = false;
            document.getElementById('stage1AlgoBadge').textContent = algoVersion === 'crypto' ? 'Metode: Crypto CSPRNG' : 'Metode: Standard PRNG';
            playWinSound();
            renderStage1Results();
            document.getElementById('btnToPage3').disabled = false;
        }
    }, 70);
}

function renderStage1Results() {
    const sorted = [...candidates].sort((a, b) => a.drawTurnOrder - b.drawTurnOrder);
    document.getElementById('stage1ResultList').innerHTML = sorted.map(c => `
        <div style="border-color:rgba(245,158,11,0.5);">
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="background:#f59e0b; color:#020617; padding:4px 10px; border-radius:6px; font-weight:900;">${c.drawTurnOrder}</span>
                <div>
                    <p style="font-weight:bold; color:#fff; margin:0;">${escapeHtml(c.name)}</p>
                    <p style="font-size:11px; color:#fbbf24; margin:0;">Giliran Mengundi Ke-${c.drawTurnOrder} (Hadir #${c.attendanceOrder})</p>
                </div>
            </div>
        </div>
    `).join('');
    document.getElementById('btnToPage3').disabled = false;
}

// Halaman 3: Undian 2 (Konter Nomor Urut)
function initStage2Page() {
    orderedCandidatesForStage2 = [...candidates].sort((a, b) => a.drawTurnOrder - b.drawTurnOrder);
    const usedNumbers = orderedCandidatesForStage2.filter(c => c.officialNumber !== null).map(c => c.officialNumber);

    availableNumbers = [];
    for (let i = 1; i <= orderedCandidatesForStage2.length; i++) {
        if (!usedNumbers.includes(i)) availableNumbers.push(i);
    }

    currentDrawerIndex = orderedCandidatesForStage2.findIndex(c => c.officialNumber === null);
    updateStage2UI();
}

function updateStage2UI() {
    const btnStart = document.getElementById('btnStartCounter');
    const btnStop = document.getElementById('btnStopCounter');
    const counterDisplay = document.getElementById('counterDisplay');
    const remainingText = document.getElementById('remainingNumbersText');
    const completionBox = document.getElementById('completionActions');

    remainingText.textContent = availableNumbers.length > 0 
        ? `Nomor tersedia: [ ${availableNumbers.map(n => formatTwoDigit(n)).join(', ')} ]`
        : 'Semua nomor telah terdistribusi';

    if (currentDrawerIndex !== -1 && currentDrawerIndex < orderedCandidatesForStage2.length) {
        const activeCand = orderedCandidatesForStage2[currentDrawerIndex];
        document.getElementById('activeDrawerOrder').textContent = `GILIRAN UNDI #${activeCand.drawTurnOrder}`;
        document.getElementById('activeDrawerName').textContent = activeCand.name;

        if (!isSpinning) {
            counterDisplay.textContent = '00';
            btnStart.disabled = false;
            btnStop.disabled = true;
        }
        completionBox.classList.add('hidden');
    } else {
        document.getElementById('activeDrawerOrder').textContent = 'PENGUNDIAN SELESAI';
        document.getElementById('activeDrawerName').textContent = 'Semua Calon Telah Mendapat Nomor';
        counterDisplay.textContent = 'OK';
        btnStart.disabled = true;
        btnStop.disabled = true;
        completionBox.classList.remove('hidden');
    }
    renderFinalResultsTable();
}

function startCounter() {
    if (isSpinning || availableNumbers.length === 0) return;
    isSpinning = true;
    document.getElementById('btnStartCounter').disabled = true;
    document.getElementById('btnStopCounter').disabled = false;
    const counterDisplay = document.getElementById('counterDisplay');

    counterInterval = setInterval(() => {
        const randIdx = getRandomInt(availableNumbers.length);
        currentDisplayedNum = availableNumbers[randIdx];
        counterDisplay.textContent = formatTwoDigit(currentDisplayedNum);
        playBeep(850, 0.03, 'square');
    }, 55);
}

function stopCounter() {
    if (!isSpinning) return;
    clearInterval(counterInterval);
    isSpinning = false;

    const finalIdx = getRandomInt(availableNumbers.length);
    const chosenNumber = availableNumbers[finalIdx];

    document.getElementById('counterDisplay').textContent = formatTwoDigit(chosenNumber);
    playWinSound();

    const activeCand = orderedCandidatesForStage2[currentDrawerIndex];
    activeCand.officialNumber = chosenNumber;
    availableNumbers.splice(finalIdx, 1);

    setTimeout(() => {
        currentDrawerIndex = orderedCandidatesForStage2.findIndex(c => c.officialNumber === null);
        updateStage2UI();
    }, 900);
}

function renderFinalResultsTable() {
    document.getElementById('finalResultsList').innerHTML = orderedCandidatesForStage2.map(c => {
        const hasNum = c.officialNumber !== null;
        return `
            <div style="${hasNum ? 'border-color:rgba(16,185,129,0.6);' : ''}">
                <div>
                    <span style="font-size:11px; color:#94a3b8;">Giliran #${c.drawTurnOrder} • Hadir #${c.attendanceOrder}</span>
                    <p style="font-weight:bold; font-size:16px; color:${hasNum ? '#fff' : '#94a3b8'}; margin:2px 0 0 0;">${escapeHtml(c.name)}</p>
                </div>
                <div style="background:${hasNum ? '#10b981' : '#1e293b'}; color:${hasNum ? '#020617' : '#64748b'}; width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:20px;">
                    ${hasNum ? formatTwoDigit(c.officialNumber) : '--'}
                </div>
            </div>
        `;
    }).join('');
}

function resetStage2Only() {
    if (isSpinning) clearInterval(counterInterval);
    isSpinning = false;
    candidates.forEach(c => c.officialNumber = null);
    initStage2Page();
}

function formatTwoDigit(num) {
    return num < 10 ? `0${num}` : `${num}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
