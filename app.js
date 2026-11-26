let candidates = [];
let stage1Completed = false;
let orderedCandidatesForStage2 = [];
let currentDrawerIndex = 0;
let availableNumbers = [];
let counterInterval = null;
let isSpinning = false;
let currentDisplayedNum = null;

// Efek Suara Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep(freq = 600, duration = 0.05, type = 'sine') {
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

function playWinSound() {
    playBeep(523.25, 0.15, 'triangle');
    setTimeout(() => playBeep(659.25, 0.15, 'triangle'), 120);
    setTimeout(() => playBeep(783.99, 0.3, 'triangle'), 240);
}

// 2 Versi Algoritma Pengacakan Angka
function getRandomInt(max) {
    const version = document.getElementById('rngVersion').value;
    if (version === 'crypto' && window.crypto && window.crypto.getRandomValues) {
        // Versi 1: Crypto CSPRNG
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
        // Versi 2: Standard Math.random() PRNG
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

// Navigasi Halaman
function goToPage(pageNum) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(`page-${pageNum}`).classList.add('active');

    for (let i = 1; i <= 3; i++) {
        const ind = document.getElementById(`step-ind-${i}`);
        const circle = ind.querySelector('span');
        if (i === pageNum) {
            ind.className = 'flex items-center gap-2 text-cyan-400 font-bold';
            circle.className = 'w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center';
        } else if (i < pageNum) {
            ind.className = 'flex items-center gap-2 text-emerald-400';
            circle.className = 'w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center';
        } else {
            ind.className = 'flex items-center gap-2 text-slate-500';
            circle.className = 'w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center';
        }
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
    e.preventDefault();
    const input = document.getElementById('candidateNameInput');
    const name = input.value.trim();
    if (!name) return;

    candidates.push({
        id: Date.now() + Math.random(),
        name: name,
        attendanceOrder: candidates.length + 1,
        drawTurnOrder: null,
        officialNumber: null
    });

    input.value = '';
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
        listEl.innerHTML = `<div class="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">Belum ada calon yang dientri. Minimal 2 calon untuk memulai undian.</div>`;
    } else {
        listEl.innerHTML = candidates.map(c => `
            <div class="flex items-center justify-between bg-slate-900/90 border border-slate-800 px-4 py-3 rounded-xl">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-futuristic font-bold flex items-center justify-center text-sm">${c.attendanceOrder}</span>
                    <div>
                        <p class="font-semibold text-white">${escapeHtml(c.name)}</p>
                        <p class="text-[11px] text-slate-400">Hadir ke-${c.attendanceOrder}</p>
                    </div>
                </div>
                <button onclick="removeCandidate(${c.id})" class="text-slate-500 hover:text-rose-400 p-1 transition" title="Hapus">✕</button>
            </div>
        `).join('');
    }

    if (candidates.length >= 2) {
        btnNext.disabled = false;
        btnNext.className = 'px-6 py-3 rounded-xl font-futuristic font-bold text-sm tracking-wider bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20 cursor-pointer transition flex items-center gap-2';
    } else {
        btnNext.disabled = true;
        btnNext.className = 'px-6 py-3 rounded-xl font-futuristic font-bold text-sm tracking-wider bg-slate-800 text-slate-500 cursor-not-allowed transition flex items-center gap-2';
    }
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
        <div class="flex items-center gap-3 bg-slate-900/80 border border-slate-800 px-4 py-3 rounded-xl">
            <span class="text-xs font-futuristic text-slate-400 w-16">Hadir #${c.attendanceOrder}</span>
            <span class="font-semibold text-white">${escapeHtml(c.name)}</span>
        </div>
    `).join('');

    if (stage1Completed) {
        renderStage1Results();
    } else {
        document.getElementById('stage1ResultList').innerHTML = `<div class="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl text-sm">Klik tombol "ACAK URUTAN" untuk menentukan giliran.</div>`;
        setBtnToPage3State(false);
    }
}

function runStage1Draw() {
    const btn = document.getElementById('btnShuffleStage1');
    const resultBox = document.getElementById('stage1ResultList');
    const algoVersion = document.getElementById('rngVersion').value;
    
    btn.disabled = true;
    let ticks = 0;
    const maxTicks = 18;

    const anim = setInterval(() => {
        ticks++;
        playBeep(400 + ticks * 25, 0.04);
        const tempShuffled = shuffleArray(candidates);
        resultBox.innerHTML = tempShuffled.map(c => `
            <div class="flex items-center justify-between bg-slate-900/60 border border-amber-500/20 px-4 py-3 rounded-xl opacity-80">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 font-futuristic font-bold flex items-center justify-center text-sm">?</span>
                    <span class="font-semibold text-slate-300">${escapeHtml(c.name)}</span>
                </div>
            </div>
        `).join('');

        if (ticks >= maxTicks) {
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
            setBtnToPage3State(true);
        }
    }, 70);
}

function renderStage1Results() {
    const sorted = [...candidates].sort((a, b) => a.drawTurnOrder - b.drawTurnOrder);
    const resultBox = document.getElementById('stage1ResultList');
    resultBox.innerHTML = sorted.map(c => `
        <div class="flex items-center justify-between bg-slate-900 border border-amber-500/40 px-4 py-3 rounded-xl shadow-md">
            <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-futuristic font-black flex items-center justify-center text-sm">${c.drawTurnOrder}</span>
                <div>
                    <p class="font-bold text-white">${escapeHtml(c.name)}</p>
                    <p class="text-[11px] text-amber-400">Giliran Mengundi Ke-${c.drawTurnOrder} (Hadir #${c.attendanceOrder})</p>
                </div>
            </div>
        </div>
    `).join('');
    setBtnToPage3State(true);
}

function setBtnToPage3State(enabled) {
    const btn = document.getElementById('btnToPage3');
    if (enabled) {
        btn.disabled = false;
