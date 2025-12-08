// app.js - single-file logic shared by index.html and admin.html
'use strict';

const STORAGE_KEY = 'fridgeChoreApp_v1';
const DEFAULT_PIN = '1234';
const CHILDREN = ['Angus', 'Flynn', 'Ashton', 'Logan'];
const correctSound = new Audio("correct.wav");
const successSound = new Audio("success.wav");
let choreMode = null; // "morning" or "afternoon"

function getCurrentChoreMode() {
    if (choreMode) return choreMode; 
    const hour = new Date().getHours();
    return hour < 12 ? "morning" : "afternoon";
}

function setChoreMode(mode) {
    choreMode = mode;
    renderKids();
}

function updateHeaderTitle() {
    const h1 = document.querySelector("header h1");
    if (!h1) return;

    const mode = getCurrentChoreMode();
    h1.textContent = mode === "morning" ? "Morning Chores" : "Afternoon Chores";
}

function nowISO() { return new Date().toISOString(); }

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    try { return JSON.parse(raw); } catch (e) {
        console.error('Bad storage, resetting', e);
        return createDefaultState();
    }
}

function saveState(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function createDefaultState() {
    const state = {
        kids: {
            Angus: {
                morning: [
                    "Make bed",
                    "Tidy room",
                    "Brush teeth & hair",
                    "Dog water or Toilet rolls",
                    "Pack bag",
                    "Hug mum, tell her to have a good day"
                ],
                afternoon: [
                    "Do some homework",
                    "Empty your bag",
                    "Tell mum about your day"
                ]
            },
            Flynn: {
                morning: [
                    "Make bed",
                    "Tidy room",
                    "Brush teeth & hair",
                    "Toilet rolls or dog water",
                    "Pack bag",
                    "Hug mum, tell her to have a good day"
                ],
                afternoon: [
                    "Do some homework",
                    "Empty your bag",
                    "Tell mum about your day"
                ]
            },
            Ashton: {
                morning: [
                    "Make bed",
                    "Tidy room & feed fish",
                    "Brush teeth & hair",
                    "Feed birds",
                    "Pack dish washer",
                    "Pack bag",
                    "Hug mum, tell her to have a good day"
                ],
                afternoon: [
                    "Do some homework",
                    "Feed dogs",
                    "Tell mum about your day"
                ]
            },
            Logan: {
                morning: [
                    "Make bed",
                    "Tidy room",
                    "Brush teeth & hair",
                    "Make Mum cup of tea",
                    "Empty dish washer",
                    "Pack bag",
                    "Hug mum, tell her to have a good day"
                ],
                afternoon: [
                    "Do some homework",
                    "Empty bins",
                    "Tell mum about your day"
                ]
            }
        },

        completed: {},
        lastReset: nowISO(),
        pin: "1234"
    };

    saveState(state);
    return state;
}


const State = loadState();

function dayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function ensureToday() {
    const key = dayKey();
    if (!State.completed[key]) State.completed[key] = {};

    CHILDREN.forEach(c => {
        if (!State.completed[key][c])
            State.completed[key][c] = { morning: [], afternoon: [] };

        if (!State.completed[key][c].morning)
            State.completed[key][c].morning = [];

        if (!State.completed[key][c].afternoon)
            State.completed[key][c].afternoon = [];
    });
}

function checkAutoReset() {
    const lastDay = State.lastReset.slice(0, 10);
    const today = dayKey();
    if (lastDay !== today) {
        State.lastReset = nowISO();
        ensureToday();
        saveState(State);
    }
}

function toggleComplete(child, idx) {
    const key = dayKey();
    ensureToday();
    const mode = getCurrentChoreMode();

    if (!State.completed[key][child][mode])
        State.completed[key][child][mode] = [];

    const list = State.completed[key][child][mode];
    const wasDone = list.includes(idx);

    // Toggle
    if (!wasDone) list.push(idx);
    else list.splice(list.indexOf(idx), 1);

    saveState(State);

    // 🎉 Play success sound if ALL tasks completed (and ONLY when just finished)
    const chores = State.kids[child][mode];
    const nowDoneCount = list.length;
    const total = chores.length;

    if (!wasDone && nowDoneCount === total) {
        successSound.currentTime = 0;
        successSound.play().catch(() => {});
        launchFireworks();
    }

    renderKids();
}

// Admin: add/remove chores
function addChore(child, text) {
    if (!text) return;
    State.kids[child].push(text);
    saveState(State);
}

function removeChore(child, index) {
    State.kids[child].splice(index, 1);
    // Fix historical completion data
    Object.keys(State.completed).forEach(day => {
        const arr = State.completed[day][child] || [];
        const newArr = arr
            .filter(i => i !== index)
            .map(i => i > index ? i - 1 : i);
        State.completed[day][child] = newArr;
    });
    saveState(State);
}

function setPin(newPin) {
    State.pin = String(newPin);
    saveState(State);
}

// Export / import
function exportJSON() {
    const blob = new Blob([JSON.stringify(State, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fridgeChoreApp-data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function importJSON(file) {
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const parsed = JSON.parse(e.target.result);
            if (!parsed.kids) throw new Error('Invalid file');
            Object.assign(State, parsed);
            saveState(State);
            location.reload();
        } catch (err) {
            alert('Import failed: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// Rendering (index.html)
function renderKids() {
    updateHeaderTitle();


    const container = document.getElementById('kidsContainer');
    if (!container) return;
    container.innerHTML = '';
    ensureToday();
    const todayKey = dayKey();

    CHILDREN.forEach(child => {
        const card = document.createElement('section');
        card.className = 'kid-card';

        const header = document.createElement('div');
        header.className = 'kid-header';




        const name = document.createElement('div');
        name.className = 'kid-name';
        name.textContent = child;

        const photo = document.createElement('img');
        photo.src = child + '.jpg';
        photo.className = 'kid-photo';


        const nameWrap = document.createElement('div');
        nameWrap.className = 'kid-nameWrap';
        nameWrap.appendChild(photo);
        nameWrap.appendChild(name);

        const mode = getCurrentChoreMode();
        const chores = State.kids[child][mode] || [];
        const doneList = State.completed[todayKey][child][mode] || [];
        const doneCount = doneList.length;

        // Mark card as all done if child finished all chores
        if (chores.length > 0 && doneCount === chores.length) {
            card.classList.add("all-done");
        }

        const progress = document.createElement('div');
        progress.className = 'progress';
        progress.textContent = `${doneCount} / ${chores.length}`;



        header.appendChild(nameWrap);
        header.appendChild(progress);
        card.appendChild(header);

        const list = document.createElement('div');
        list.className = 'task-list';

        chores.forEach((t, idx) => {
            const item = document.createElement('div');
            item.className = 'task';
            const done = doneList.indexOf(idx) !== -1;
            if (done) item.classList.add('done');

            item.dataset.child = child;
            item.dataset.idx = idx;

            const check = document.createElement('div');
            check.className = 'check';
            check.textContent = done ? '✓' : '';

            const text = document.createElement('div');
            text.className = 'task-text';
            text.textContent = t;

            item.appendChild(check);
            item.appendChild(text);
            item.addEventListener('click', () => {   
                
                // pop animation on parent card
                card.classList.add("animate-pop");
                setTimeout(() => card.classList.remove("animate-pop"), 400);

                if(!item.classList.contains('done')){
                    correctSound.currentTime = 0;
                    correctSound.play().catch(() => {});
                    showStarAnimation(item);
                    setTimeout(() => { toggleComplete(child, idx); }, 600); 
                }
                else{
                    toggleComplete(child, idx);
                }
            });

            list.appendChild(item);
        });

        card.appendChild(list);
        container.appendChild(card);
    });
}

function setupIndexPage() {
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) adminBtn.addEventListener('click', () => window.location = 'admin.html');

    const dateEl = document.getElementById('date');
    if (dateEl) dateEl.textContent = (new Date()).toLocaleString();

    const toggleBtn = document.getElementById('toggleModeBtn');
    toggleBtn.addEventListener('click', () => {
        const mode = getCurrentChoreMode();
        setChoreMode(mode === "morning" ? "afternoon" : "morning");
        toggleBtn.textContent = mode === "morning" ? "Show Morning" : "Show Afternoon";
        updateHeaderTitle();
    });

    renderKids();

    setInterval(() => {
        const d = document.getElementById('date');
        if (d) d.textContent = (new Date()).toLocaleString();
    }, 60 * 1000);
}

// Admin setup
function setupAdminPage() {
    const backBtn = document.getElementById('backBtn');
    if (backBtn) backBtn.addEventListener('click', () => window.location = 'index.html');

    // New keypad / PIN handling
    const pinDisplay = document.getElementById('pinDisplay');
    const unlockBtn = document.getElementById('unlockBtn');
    const lockMsg = document.getElementById('lockMsg');
    const keypad = document.getElementById('keypad');
    const kpBack = document.getElementById('kp-back');
    const kpClear = document.getElementById('kp-clear');
    const kpClose = document.getElementById('kp-close');
    const panel = document.getElementById('adminPanel');

    // internal buffer for pin entry (string)
    let pinBuffer = '';

    function refreshPinDisplay() {
        // show dots for entered digits, up to 8
        const max = 8;
        const dots = '•'.repeat(pinBuffer.length) + '○'.repeat(Math.max(0, 4 - pinBuffer.length));
        // use minimalistic display — you can change how many empties shown
        if (pinDisplay) pinDisplay.textContent = dots;
    }

    function appendDigit(d) {
        if (pinBuffer.length >= 8) return;
        pinBuffer += String(d);
        refreshPinDisplay();
    }

    function backspacePin() {
        if (!pinBuffer) return;
        pinBuffer = pinBuffer.slice(0, -1);
        refreshPinDisplay();
    }

    function clearPin() {
        pinBuffer = '';
        refreshPinDisplay();
    }

    // Click handlers for numeric keys
    if (keypad) {
        keypad.addEventListener('click', (ev) => {
            const btn = ev.target.closest('button');
            if (!btn) return;
            const k = btn.dataset.key;
            if (k !== undefined) {
                appendDigit(k);
            }
        });
    }

    if (kpBack) kpBack.addEventListener('click', backspacePin);
    if (kpClear) kpClear.addEventListener('click', clearPin);

    // Cancel simply clears and returns to index (or hides keypad)
    if (kpClose) kpClose.addEventListener('click', () => {
        clearPin();
        // navigate back to index for convenience
        window.location = 'index.html';
    });

    // Unlock button uses the pinBuffer
    unlockBtn.addEventListener('click', () => {
        const val = String(pinBuffer || '');
        if (val === State.pin) {
            panel.hidden = false;
            document.getElementById('lockSection').hidden = true;
            populateAdmin();
            clearPin();
            lockMsg.textContent = '';
        } else {
            lockMsg.textContent = 'Incorrect PIN';
            // small shake / visual hint
            const el = document.getElementById('lockSection');
            if (el) {
                el.animate([
                    { transform: 'translateX(-6px)' },
                    { transform: 'translateX(6px)' },
                    { transform: 'translateX(0)' }
                ], { duration: 250 });
            }
            setTimeout(() => lockMsg.textContent = '', 2000);
            clearPin();
        }
    });

    // keep existing export/import/wipe handlers (they reference DOM ids already present)
    document.getElementById('exportBtn').addEventListener('click', exportJSON);
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', e => {
        const f = e.target.files[0];
        if (f) importJSON(f);
    });

    document.getElementById('setPinBtn').addEventListener('click', () => {
        const p = document.getElementById('pinSet').value.trim();
        if (!p) { alert('PIN cannot be empty'); return; }
        setPin(p);
        alert('PIN updated');
        document.getElementById('pinSet').value = '';
    });

    document.getElementById('wipeBtn').addEventListener('click', () => {
        if (confirm('Wipe all saved data? This cannot be undone.')) {
            localStorage.removeItem(STORAGE_KEY);
            location.href = "index.html";
        }
    });

    // initialise display
    refreshPinDisplay();
}

function populateAdmin() {
    const childSelect = document.getElementById('childSelect');
    const modeSelect = document.getElementById('modeSelect');

    // Populate children
    childSelect.innerHTML = '';
    CHILDREN.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        childSelect.appendChild(opt);
    });

    // Change listeners
    childSelect.addEventListener('change', renderTaskListAdmin);
    modeSelect.addEventListener('change', renderTaskListAdmin);

    // Add task button
    document.getElementById('addTaskBtn').addEventListener('click', () => {
        const child = childSelect.value;
        const mode = modeSelect.value;
        const txt = document.getElementById('newTaskInput').value.trim();
        if (!txt) return;

        State.kids[child][mode].push(txt);
        saveState(State);

        document.getElementById('newTaskInput').value = '';
        renderTaskListAdmin();
    });

    renderTaskListAdmin();
}

function renderTaskListAdmin() {
    const child = document.getElementById('childSelect').value;
    const mode = document.getElementById('modeSelect').value;
    const list = document.getElementById('taskList');

    list.innerHTML = '';

    const chores = State.kids[child][mode] || [];

    chores.forEach((t, idx) => {
        const row = document.createElement('div');
        row.className = 'task admin-row';

        const txt = document.createElement('div');
        txt.textContent = t;
        txt.style.flex = '1';

        const btn = document.createElement('button');
        btn.textContent = 'Delete';
        btn.addEventListener('click', () => {
            if (!confirm('Delete this chore?')) return;

            // Remove from kids
            State.kids[child][mode].splice(idx, 1);

            // Fix completion records for this mode
            Object.keys(State.completed).forEach(day => {
                const list = State.completed[day][child][mode] || [];
                const updated = list
                    .filter(i => i !== idx)
                    .map(i => i > idx ? i - 1 : i);

                State.completed[day][child][mode] = updated;
            });

            saveState(State);
            renderTaskListAdmin();
        });

        row.appendChild(txt);
        row.appendChild(btn);

        list.appendChild(row);
    });
}

function showStarAnimation(parentElement) {
    const star = document.createElement("div");
    star.className = "star-burst";
    star.textContent = "⭐";

    // Position the star in the center of the chore item
    const rect = parentElement.getBoundingClientRect();

    star.style.left = rect.width / 2 - 20 + "px";
    star.style.top = rect.height / 2 - 20 + "px";

    parentElement.style.position = "relative";
    parentElement.appendChild(star);

    // Remove the star after animation ends
    setTimeout(() => {
        star.remove();
    }, 600);
}

function launchFireworks() {
    const container = document.getElementById("fireworks");
    if (!container) return;

    // create 20 bursts
    for (let i = 0; i < 20; i++) {
        const f = document.createElement("div");
        f.className = "firework";

        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight * 0.7 + window.innerHeight * 0.1;

        // random travel direction
        const angle = Math.random() * Math.PI * 2;
        const distance = 120 + Math.random() * 80;

        f.style.left = `${x}px`;
        f.style.top = `${y}px`;

        f.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
        f.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);

        // random bright color
        const colors = ["#ff4d4d", "#ffcc00", "#66ff66", "#66ccff", "#ff66ff"];
        f.style.setProperty("--color", colors[Math.floor(Math.random() * colors.length)]);

        container.appendChild(f);

        // remove after animation
        setTimeout(() => f.remove(), 1000);
    }
}

(function init() {
    ensureToday();
    checkAutoReset();

    if (document.getElementById('kidsContainer')) {
        setupIndexPage();
    }

    if (document.getElementById('unlockBtn')) {
        setupAdminPage();
    }
})();
