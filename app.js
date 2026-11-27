let candidates = [];
let stage1Completed = false;
let orderedCandidatesForStage2 = [];
let currentDrawerIndex = 0;
let availableNumbers = [];
let counterInterval = null;
let countdownTimer = null;
let isSpinning = false;
let audioCtx = null;

// =========================================
// MUSIK MP3 LOKAL & FANFARE KEMENANGAN
// =========================================
function playTone(freq, duration, type = 'triangle', vol = 0.09, delay = 0) {
    try {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
        if (!audioCtx) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const start = audioCtx.currentTime + delay;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + duration);
    } catch (e) {}
}

function playVictoryFanfare() {
    const chord = [
        { f: 523.25, d: 0.14, t: 0.00 },
        { f: 659.25, d: 0.14, t: 0.12 },
        { f: 783.99, d: 0.14, t: 0.24 },
        { f: 1046.50, d: 0.55, t: 0.36 },
        { f: 523.25, d: 0.55, t: 0.36 },
        { f: 783.99, d: 0.55, t: 0.36 }
    ];
    chord.forEach(n => playTone(n.f, n.d, 'triangle', 0.11, n.t));
}

function startOverlayMusic(stageType) {
    stopOverlayMusic();
    const audioId = stageType === 'D' ? 'bgMusicStage1' : 'bgMusicStage2';
    const audio = document.getElementById(audioId);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
}

function stopOverlayMusic() {
    ['bgMusicStage1', 'bgMusicStage2'].forEach(id => {
        const audio = document.getElementById(id);
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    });
}

// =========================================
// TEMA TERANG / GELAP & 2 VERSI ACAK
// =========================================
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    document.getElementById('btnThemeToggle').textContent = isLight ? '🌙 Tema Gelap' : '☀️ Tema Terang';
}

function getRandomInt(max) {
    const version = document.getElementById('rngVersion').value;
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
    }
    return Math.floor(Math.random() * max);
}

function goToPage(pageNum) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(`page-${pageNum}`).classList.add('active');

    for (let i = 1; i <= 3; i++) {
        const ind = document.getElementById(`step-ind-${i}`);
        if (i === pageNum) ind.className = 'step-active';
        else if (i < pageNum) ind.className = 'step-done';
        else ind.className = 'step-muted';
    }
    if (pageNum === 2) renderStage1Page();
    if (pageNum === 3) initStage2Page();
}

// =========================================
// HALAMAN 1: KEHADIRAN CALON
// =========================================
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
    playTone(660, 0.08, 'sine', 0.08);
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
    document.getElementById('candidateCount').textContent = candidates.length;
    document.getElementById('btnToPage2').disabled = candidates.length < 2;

    if (candidates.length === 0) {
        listEl.innerHTML = `<div class="empty-state">Belum ada calon yang dientri. Minimal 2 calon untuk memulai undian.</div>`;
    } else {
        listEl.innerHTML = candidates.map(c => `
            <div>
                <div class="row-gap">
                    <span class="accent-cyan font-bold">#${c.attendanceOrder}</span>
                    <div>
                        <p class="font-bold">${escapeHtml(c.name)}</p>
                        <p class="text-xs label-muted">Hadir ke-${c.attendanceOrder}</p>
                    </div>
                </div>
                <button type="button" onclick="removeCandidate(${c.id})" class="btn-danger-sm">✕</button>
            </div>
        `).join('');
    }
}

function resetAllData() {
    if (confirm('Hapus semua data calon dan ulangi dari awal?')) {
        candidates = [];
        stage1Completed = false;
        renderAttendanceList();
    }
}

// =========================================
// OVERLAY LAYAR PENUH (MODEL D & MODEL H)
// =========================================
function openFocusOverlay(stageLabel, candidateName, durationSec, stageType) {
    const overlay = document.getElementById('focusOverlay');
    const modD = document.getElementById('modelDContainer');
    const modH = document.getElementById('modelHContainer');
    const bar = document.getElementById('focusCountdownBar');

    modD.classList.add('hidden');
    modH.classList.add('hidden');
    bar.classList.remove('amber-fill');
    bar.style.width = '100%';

    document.getElementById('focusStageLabel').textContent = stageLabel;
    document.getElementById('focusCandidateName').textContent = candidateName;
    document.getElementById('focusStatusText').textContent = 'MENGACAK';
    document.getElementById('focusCountdownText').textContent = durationSec.toFixed(1);

    if (stageType === 'D') {
        modD.classList.remove('hidden');
        bar.classList.add('amber-fill');
        const digD = document.getElementById('digitModelD');
        digD.textContent = '0';
        digD.classList.remove('locked-final');
        document.getElementById('diamondOuter').classList.add('spinning');
    } else if (stageType === 'H') {
        modH.classList.remove('hidden');
        const digH = document.getElementById('digitModelH');
        digH.textContent = '0';
        digH.classList.remove('locked-final');
        ['ripple1', 'ripple2', 'ripple3'].forEach(id => document.getElementById(id).classList.add('active-wave'));
    }

    startOverlayMusic(stageType);
    overlay.classList.remove('hidden');
}

function lockFocusOverlay(finalDigit, stageType) {
    stopOverlayMusic();
    document.getElementById('focusStatusText').textContent = 'TERKUNCI!';
    document.getElementById('focusCountdownText').textContent = '0.0';
    document.getElementById('focusCountdownBar').style.width = '0%';

    if (stageType === 'D') {
        document.getElementById('diamondOuter').classList.remove('spinning');
        const digD = document.getElementById('digitModelD');
        digD.textContent = `${finalDigit}`;
        digD.classList.add('locked-final');
    } else if (stageType === 'H') {
        ['ripple1', 'ripple2', 'ripple3'].forEach(id => document.getElementById(id).classList.remove('active-wave'));
        const digH = document.getElementById('digitModelH');
        digH.textContent = `${finalDigit}`;
        digH.classList.add('locked-final');
    }
}

function closeFocusOverlay() {
    stopOverlayMusic();
    document.getElementById('modelDContainer').classList.add('hidden');
    document.getElementById('modelHContainer').classList.add('hidden');
    document.getElementById('focusOverlay').classList.add('hidden');
}
// =========================================
// HALAMAN 2: UNDIAN 1 (MODEL D - 5 DETIK)
// =========================================
let stage1AvailableTurns = [];
let stage1DrawerIdx = 0;
let isStage1Spinning = false;

function renderStage1Page() {
    const usedTurns = candidates.filter(c => c.drawTurnOrder !== null).map(c => c.drawTurnOrder);
    stage1AvailableTurns = [];
    for (let i = 1; i <= candidates.length; i++) if (!usedTurns.includes(i)) stage1AvailableTurns.push(i);
    stage1DrawerIdx = candidates.findIndex(c => c.drawTurnOrder === null);
    stage1Completed = (stage1DrawerIdx === -1 && candidates.length >= 2);
    updateStage1UI();
}

function updateStage1UI() {
    const btnStart = document.getElementById('btnStartStage1');
    const slotDisplay = document.getElementById('stage1SlotDisplay');
    const btnToPage3 = document.getElementById('btnToPage3');

    document.getElementById('stage1CountdownText').textContent = '5.0';
    document.getElementById('stage1CountdownBar').style.width = '100%';
    document.getElementById('stage1StatusText').textContent = 'SIAP';
    document.getElementById('stage1RemainingText').textContent = stage1AvailableTurns.length > 0
        ? `Urutan giliran tersedia: [ ${stage1AvailableTurns.join(', ')} ]` : 'Semua calon telah mendapatkan urutan giliran';

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

    document.getElementById('stage1ResultList').innerHTML = candidates.map(c => `
        <div>
            <div>
                <span class="text-xs label-muted">Urutan Hadir #${c.attendanceOrder}</span>
                <p class="font-bold">${escapeHtml(c.name)}</p>
            </div>
            <div class="accent-amber font-futuristic font-bold" style="font-size:1.3rem;">
                ${c.drawTurnOrder !== null ? c.drawTurnOrder : '-'}
            </div>
        </div>
    `).join('');
}

function startStage1Spin() {
    if (isStage1Spinning || stage1AvailableTurns.length === 0) return;
    isStage1Spinning = true;

    const activeCand = candidates[stage1DrawerIdx];
    document.getElementById('btnStartStage1').disabled = true;
    openFocusOverlay(`UNDIAN TAHAP 1 • HADIR #${activeCand.attendanceOrder}`, activeCand.name, 5.0, 'D');

    const duration = 6000; // Ubah durasi Undian 1 di sini (dalam milidetik)
    const startTime = Date.now();

    countdownTimer = setInterval(() => {
        const remaining = Math.max(0, duration - (Date.now() - startTime));
        document.getElementById('focusCountdownText').textContent = (remaining / 1000).toFixed(1);
        document.getElementById('focusCountdownBar').style.width = `${(remaining / duration) * 100}%`;
        if (remaining <= 0) clearInterval(countdownTimer);
    }, 80);

    counterInterval = setInterval(() => {
        const randDigit = getRandomInt(10);
        document.getElementById('digitModelD').textContent = `${randDigit}`;
        document.getElementById('stage1SlotDisplay').textContent = `${randDigit}`;
    }, 45);

    setTimeout(() => {
        clearInterval(counterInterval);
        clearInterval(countdownTimer);

        const finalIdx = getRandomInt(stage1AvailableTurns.length);
        const chosenTurn = stage1AvailableTurns[finalIdx];

        lockFocusOverlay(chosenTurn, 'D');
        document.getElementById('stage1SlotDisplay').textContent = `${chosenTurn}`;
        playVictoryFanfare();

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

function resetStage1Only() {
    clearInterval(counterInterval); clearInterval(countdownTimer);
    isStage1Spinning = false; stage1Completed = false;
    closeFocusOverlay();
    candidates.forEach(c => { c.drawTurnOrder = null; c.officialNumber = null; });
    renderStage1Page();
}

// =========================================
// HALAMAN 3: UNDIAN 2 (MODEL H - 15 DETIK)
// =========================================
function initStage2Page() {
    orderedCandidatesForStage2 = [...candidates].sort((a, b) => a.drawTurnOrder - b.drawTurnOrder);
    const usedNumbers = orderedCandidatesForStage2.filter(c => c.officialNumber !== null).map(c => c.officialNumber);
    availableNumbers = [];
    for (let i = 1; i <= orderedCandidatesForStage2.length; i++) if (!usedNumbers.includes(i)) availableNumbers.push(i);
    currentDrawerIndex = orderedCandidatesForStage2.findIndex(c => c.officialNumber === null);
    updateStage2UI();
}

function updateStage2UI() {
    const btnStart = document.getElementById('btnStartCounter');
    const counterDisplay = document.getElementById('counterDisplay');
    const completionBox = document.getElementById('completionActions');

    document.getElementById('countdownText').textContent = '15.0';
    document.getElementById('countdownBar').style.width = '100%';
    document.getElementById('counterStatusText').textContent = 'SIAP';
    document.getElementById('remainingNumbersText').textContent = availableNumbers.length > 0 
        ? `Nomor tersedia: [ ${availableNumbers.join(', ')} ]` : 'Semua nomor telah terdistribusi';

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

    document.getElementById('finalResultsList').innerHTML = orderedCandidatesForStage2.map(c => `
        <div>
            <div>
                <span class="text-xs label-muted">Giliran #${c.drawTurnOrder} • Hadir #${c.attendanceOrder}</span>
                <p class="font-bold">${escapeHtml(c.name)}</p>
            </div>
            <div class="accent-emerald font-futuristic font-bold" style="font-size:1.35rem;">
                ${c.officialNumber !== null ? c.officialNumber : '-'}
            </div>
        </div>
    `).join('');
}

function startCounter() {
    if (isSpinning || availableNumbers.length === 0) return;
    isSpinning = true;

    const activeCand = orderedCandidatesForStage2[currentDrawerIndex];
    document.getElementById('btnStartCounter').disabled = true;
    openFocusOverlay(`UNDIAN NOMOR URUT • GILIRAN #${activeCand.drawTurnOrder}`, activeCand.name, 15.0, 'H');

    const totalDuration = 15000; // Ubah durasi Undian 2 di sini (dalam milidetik)
    const startTime = Date.now();

    countdownTimer = setInterval(() => {
        const remaining = Math.max(0, totalDuration - (Date.now() - startTime));
        document.getElementById('focusCountdownText').textContent = (remaining / 1000).toFixed(1);
        document.getElementById('focusCountdownBar').style.width = `${(remaining / totalDuration) * 100}%`;
        if (remaining <= 0) clearInterval(countdownTimer);
    }, 80);

    counterInterval = setInterval(() => {
        const randDigit = getRandomInt(10);
        document.getElementById('digitModelH').textContent = `${randDigit}`;
        document.getElementById('counterDisplay').textContent = `${randDigit}`;
    }, 45);

    setTimeout(() => {
        clearInterval(counterInterval);
        clearInterval(countdownTimer);

        const finalIdx = getRandomInt(availableNumbers.length);
        const chosenNumber = availableNumbers[finalIdx];

        lockFocusOverlay(chosenNumber, 'H');
        document.getElementById('counterDisplay').textContent = `${chosenNumber}`;
        playVictoryFanfare();

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

// KONTROL TOMBOL ENTER PC
document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    if (document.activeElement && document.activeElement.id === 'btnThemeToggle') return;

    const activePage = document.querySelector('.page-section.active');
    if (!activePage) return;

    if (activePage.id === 'page-1') {
        const input = document.getElementById('candidateNameInput');
        if (document.activeElement === input && input.value.trim() !== '') return;
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
