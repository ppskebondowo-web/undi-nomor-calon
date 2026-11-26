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
            randomValue = array;
        } while (randomValue >= limit);
        return randomValue % max;
    } else {
        return Math.floor(Math.random() * max);
    }
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
// =========================================
// HELPER OVERLAY LAYAR PENUH KONTER
// =========================================
function openFocusOverlay(stageLabel, candidateName, durationSec, isAmber = false) {
    const overlay = document.getElementById('focusOverlay');
    const digitBox = document.getElementById('focusDigitDisplay');
    const ring = document.getElementById('focusScannerRing');
    const bar = document.getElementById('focusCountdownBar');

    document.getElementById('focusStageLabel').textContent = stageLabel;
    document.getElementById('focusCandidateName').textContent = candidateName;
    document.getElementById('focusStatusText').textContent = 'MENGACAK';
    document.getElementById('focusCountdownText').textContent = durationSec.toFixed(1);

    digitBox.textContent = '0';
    digitBox.classList.remove('locked-final', 'amber-mode');
    bar.classList.remove('amber-fill');
    if (isAmber) {
        digitBox.classList.add('amber-mode');
        bar.classList.add('amber-fill');
    }

    ring.classList.add('spinning');
    bar.style.width = '100%';
    overlay.classList.remove('hidden');
}

function lockFocusOverlay(finalDigit) {
    const digitBox = document.getElementById('focusDigitDisplay');
    const ring = document.getElementById('focusScannerRing');

    ring.classList.remove('spinning');
    digitBox.textContent = `${finalDigit}`;
    digitBox.classList.add('locked-final');
    document.getElementById('focusStatusText').textContent = 'TERKUNCI!';
    document.getElementById('focusCountdownText').textContent = '0.0';
    document.getElementById('focusCountdownBar').style.width = '0%';
}

function closeFocusOverlay() {
    document.getElementById('focusOverlay').classList.add('hidden');
}

// =========================================
// HALAMAN 2: UNDIAN 1 (1 DIGIT 0-9 -> HASIL 1..N + TAHAN 3 DETIK)
// =========================================
let stage1AvailableTurns = [];
let stage1DrawerIdx = 0;
let stage1SpinInterval = null;
let stage1CountdownTimer = null;
let isStage1Spinning = false;

function renderStage1Page() {
    const usedTurns = candidates.filter(c => c.drawTurnOrder !== null).map(c => c.drawTurnOrder);
    stage1AvailableTurns = [];
    for (let i = 1; i <= candidates.length; i++) {
        if (!usedTurns.includes(i)) stage1AvailableTurns.push(i);
    }

    stage1DrawerIdx = candidates.findIndex(c => c.drawTurnOrder === null);
    stage1Completed = (stage1DrawerIdx === -1 && candidates.length >= 2);
    updateStage1UI();
}

function updateStage1UI() {
    const btnStart = document.getElementById('btnStartStage1');
    const slotDisplay = document.getElementById('stage1SlotDisplay');
    const remainingText = document.getElementById('stage1RemainingText');
    const btnToPage3 = document.getElementById('btnToPage3');

    slotDisplay.classList.remove('locked-slot');
    document.getElementById('stage1CountdownText').textContent = '5.0';
    document.getElementById('stage1CountdownBar').style.width = '100%';
    document.getElementById('stage1StatusText').textContent = 'SIAP';

    remainingText.textContent = stage1AvailableTurns.length > 0
        ? `Urutan giliran tersedia: [ ${stage1AvailableTurns.join(', ')} ]`
        : 'Semua calon telah mendapatkan urutan giliran';

    if (stage1DrawerIdx !== -1 && stage1DrawerIdx < candidates.length) {
        const activeCand = candidates[stage1DrawerIdx];
        document.getElementById('stage1ActiveOrder').textContent = `HADIR #${activeCand.attendanceOrder}`;
        document.getElementById('stage1ActiveName').textContent = activeCand.name;

        if (!isStage1Spinning) {
            slotDisplay.textContent = '0';
            btnStart.disabled = false;
            btnStart.innerHTML = `PUTAR URUTAN AMBIL <span class="key-badge">ENTER ↵</span>`;
        }
        btnToPage3.disabled = true;
    } else {
        stage1Completed = true;
        document.getElementById('stage1ActiveOrder').textContent = 'UNDIAN TAHAP 1 SELESAI';
        document.getElementById('stage1ActiveName').textContent = 'Semua Calon Siap ke Tahap 2';
        slotDisplay.textContent = '✓';
        document.getElementById('stage1StatusText').textContent = 'SELESAI';
        btnStart.disabled = true;
        btnStart.textContent = 'TAHAP 1 SELESAI';
        btnToPage3.disabled = false;
    }

    renderStage1ResultsList();
}
function startStage1Spin() {
    if (isStage1Spinning || stage1AvailableTurns.length === 0) return;
    isStage1Spinning = true;

    const activeCand = candidates[stage1DrawerIdx];
    const btnStart = document.getElementById('btnStartStage1');
    const slotDisplay = document.getElementById('stage1SlotDisplay');
    const focusDigit = document.getElementById('focusDigitDisplay');
    const focusCountdown = document.getElementById('focusCountdownText');
    const focusBar = document.getElementById('focusCountdownBar');

    btnStart.disabled = true;
    openFocusOverlay(`UNDIAN TAHAP 1 • HADIR #${activeCand.attendanceOrder}`, activeCand.name, 5.0, true);

    const duration = 5000;
    const startTime = Date.now();

    stage1CountdownTimer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - elapsed);
        focusCountdown.textContent = (remaining / 1000).toFixed(1);
        focusBar.style.width = `${(remaining / duration) * 100}%`;
        if (remaining <= 0) clearInterval(stage1CountdownTimer);
    }, 80);

    stage1SpinInterval = setInterval(() => {
        const randDigit = getRandomInt(10);
        focusDigit.textContent = `${randDigit}`;
        slotDisplay.textContent = `${randDigit}`;
        playBeep(680, 0.03, 'square');
    }, 45);

    setTimeout(() => {
        clearInterval(stage1SpinInterval);
        clearInterval(stage1CountdownTimer);

        const finalIdx = getRandomInt(stage1AvailableTurns.length);
        const chosenTurn = stage1AvailableTurns[finalIdx];

        lockFocusOverlay(chosenTurn);
        slotDisplay.textContent = `${chosenTurn}`;
        slotDisplay.classList.add('locked-slot');
        playWinSound();

        candidates[stage1DrawerIdx].drawTurnOrder = chosenTurn;
        candidates[stage1DrawerIdx].officialNumber = null;
        stage1AvailableTurns.splice(finalIdx, 1);

        setTimeout(() => {
            isStage1Spinning = false;
            closeFocusOverlay();
            stage1DrawerIdx = candidates.findIndex(c => c.drawTurnOrder === null);
            updateStage1UI();
        }, 3000);
    }, duration);
}

function renderStage1ResultsList() {
    document.getElementById('stage1ResultList').innerHTML = candidates.map(c => {
        const hasTurn = c.drawTurnOrder !== null;
        return `
            <div style="${hasTurn ? 'border-color:rgba(245,158,11,0.6);' : ''}">
                <div>
                    <span style="font-size:11px; color:#94a3b8;">Urutan Hadir #${c.attendanceOrder}</span>
                    <p style="font-weight:bold; font-size:16px; color:${hasTurn ? '#fff' : '#94a3b8'}; margin:2px 0 0 0;">${escapeHtml(c.name)}</p>
                </div>
                <div style="background:${hasTurn ? '#f59e0b' : '#1e293b'}; color:${hasTurn ? '#020617' : '#64748b'}; width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:22px;">
                    ${hasTurn ? c.drawTurnOrder : '-'}
                </div>
            </div>
        `;
    }).join('');
}

function resetStage1Only() {
    clearInterval(stage1SpinInterval);
    clearInterval(stage1CountdownTimer);
    isStage1Spinning = false;
    stage1Completed = false;
    closeFocusOverlay();
    candidates.forEach(c => {
        c.drawTurnOrder = null;
        c.officialNumber = null;
    });
    renderStage1Page();
}

// =========================================
// HALAMAN 3: UNDIAN 2 (1 DIGIT 0-9 -> HASIL 1..N + TAHAN 3 DETIK)
// =========================================
let countdownTimer = null;

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
    const counterDisplay = document.getElementById('counterDisplay');
    const remainingText = document.getElementById('remainingNumbersText');
    const completionBox = document.getElementById('completionActions');
    //const scannerRing = document.getElementById('scannerRing');

    counterDisplay.classList.remove('locked-win');
    //scannerRing.classList.remove('spinning');
    document.getElementById('countdownText').textContent = '15.0';
    document.getElementById('countdownBar').style.width = '100%';
    document.getElementById('counterStatusText').textContent = 'SIAP';

    remainingText.textContent = availableNumbers.length > 0 
        ? `Nomor tersedia: [ ${availableNumbers.join(', ')} ]`
        : 'Semua nomor telah terdistribusi';

    if (currentDrawerIndex !== -1 && currentDrawerIndex < orderedCandidatesForStage2.length) {
        const activeCand = orderedCandidatesForStage2[currentDrawerIndex];
        document.getElementById('activeDrawerOrder').textContent = `GILIRAN UNDI #${activeCand.drawTurnOrder}`;
        document.getElementById('activeDrawerName').textContent = activeCand.name;

        if (!isSpinning) {
            counterDisplay.textContent = '0';
            btnStart.disabled = false;
            btnStart.innerHTML = `MULAI PUTAR KONTER <span class="key-badge">ENTER ↵</span>`;
        }
        completionBox.classList.add('hidden');
    } else {
        document.getElementById('activeDrawerOrder').textContent = 'PENGUNDIAN SELESAI';
        document.getElementById('activeDrawerName').textContent = 'Semua Calon Telah Mendapat Nomor';
        counterDisplay.textContent = '✓';
        document.getElementById('counterStatusText').textContent = 'SELESAI';
        btnStart.disabled = true;
        btnStart.textContent = 'UNDIAN SELESAI';
        completionBox.classList.remove('hidden');
    }
    renderFinalResultsTable();
}

function startCounter() {
    if (isSpinning || availableNumbers.length === 0) return;
    isSpinning = true;

    const activeCand = orderedCandidatesForStage2[currentDrawerIndex];
    const btnStart = document.getElementById('btnStartCounter');
    const counterDisplay = document.getElementById('counterDisplay');
    const focusDigit = document.getElementById('focusDigitDisplay');
    const focusCountdown = document.getElementById('focusCountdownText');
    const focusBar = document.getElementById('focusCountdownBar');

    btnStart.disabled = true;
    openFocusOverlay(`UNDIAN NOMOR URUT • GILIRAN #${activeCand.drawTurnOrder}`, activeCand.name, 15.0, false);

    const totalDuration = 15000;
    const startTime = Date.now();

    countdownTimer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, totalDuration - elapsed);
        focusCountdown.textContent = (remaining / 1000).toFixed(1);
        focusBar.style.width = `${(remaining / totalDuration) * 100}%`;
        if (remaining <= 0) clearInterval(countdownTimer);
    }, 80);

    counterInterval = setInterval(() => {
        const randDigit = getRandomInt(10);
        focusDigit.textContent = `${randDigit}`;
        counterDisplay.textContent = `${randDigit}`;
        playBeep(880, 0.03, 'square');
    }, 45);

    setTimeout(() => {
        clearInterval(counterInterval);
        clearInterval(countdownTimer);

        const finalIdx = getRandomInt(availableNumbers.length);
        const chosenNumber = availableNumbers[finalIdx];

        lockFocusOverlay(chosenNumber);
        counterDisplay.textContent = `${chosenNumber}`;
        counterDisplay.classList.add('locked-win');
        playWinSound();

        activeCand.officialNumber = chosenNumber;
        availableNumbers.splice(finalIdx, 1);

        setTimeout(() => {
            isSpinning = false;
            closeFocusOverlay();
            currentDrawerIndex = orderedCandidatesForStage2.findIndex(c => c.officialNumber === null);
            updateStage2UI();
        }, 3000);
    }, totalDuration);
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
                <div style="background:${hasNum ? '#10b981' : '#1e293b'}; color:${hasNum ? '#020617' : '#64748b'}; width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:22px;">
                    ${hasNum ? c.officialNumber : '-'}
                </div>
            </div>
        `;
    }).join('');
}

function resetStage2Only() {
    clearInterval(counterInterval);
    clearInterval(countdownTimer);
    isSpinning = false;
    closeFocusOverlay();
    candidates.forEach(c => c.officialNumber = null);
    initStage2Page();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =========================================
// KONTROL FULL TOMBOL ENTER PC
// =========================================
document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;

    const activePage = document.querySelector('.page-section.active');
    if (!activePage) return;

    if (activePage.id === 'page-1') {
        const input = document.getElementById('candidateNameInput');
        if (document.activeElement === input && input.value.trim() !== '') {
            return;
        }
        const btnToPage2 = document.getElementById('btnToPage2');
        if (!btnToPage2.disabled) {
            e.preventDefault();
            goToPage(2);
        }
    } else if (activePage.id === 'page-2') {
        e.preventDefault();
        const btnStart1 = document.getElementById('btnStartStage1');
        const btnToPage3 = document.getElementById('btnToPage3');
        if (!btnStart1.disabled && !isStage1Spinning) {
            startStage1Spin();
        } else if (stage1Completed && !btnToPage3.disabled && !isStage1Spinning) {
            goToPage(3);
        }
    } else if (activePage.id === 'page-3') {
        e.preventDefault();
        const btnStart2 = document.getElementById('btnStartCounter');
        if (!btnStart2.disabled && !isSpinning) {
            startCounter();
        }
    }
});
