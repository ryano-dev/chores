// app.js - single-file logic shared by index.html and admin.html
'use strict';

const STORAGE_KEY = 'fridgeChoreApp_v1';
const DEFAULT_PIN = '1234';
const CHILDREN = ['Angus', 'Flynn', 'Ashton', 'Logan'];

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
    const defaultChores = [
        'Make bed',
        'Brush teeth',
        'Get dressed',
        'Tidy room',
        'Feed pet'
    ];
    const kids = {};
    CHILDREN.forEach(name => {
        kids[name] = defaultChores.slice();
    });
    const state = {
        kids,
        completed: {}, // { 'YYYY-MM-DD': {Angus:[indexes], ...}}
        lastReset: (new Date()).toISOString(),
        pin: DEFAULT_PIN
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
            State.completed[key][c] = [];
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
    const list = State.completed[key][child];
    const p = list.indexOf(idx);
    if (p === -1) list.push(idx);
    else list.splice(p, 1);
    saveState(State);
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


        const chores = State.kids[child] || [];
        const doneCount = (State.completed[todayKey] && State.completed[todayKey][child])
            ? State.completed[todayKey][child].length : 0;

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
            const done = (State.completed[todayKey][child].indexOf(idx) !== -1);
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
                if(!item.classList.contains('done')){
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

    const lastReset = document.getElementById('lastReset');
    if (lastReset) lastReset.textContent = 'Last reset: ' + (new Date(State.lastReset)).toLocaleString();

    const resetNow = document.getElementById('resetNow');
    if (resetNow) resetNow.addEventListener('click', () => {
        State.lastReset = nowISO();
        ensureToday();
        saveState(State);
        renderKids();
        alert('Reset for today');
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

    const pinInput = document.getElementById('pinInput');
    const unlockBtn = document.getElementById('unlockBtn');
    const lockMsg = document.getElementById('lockMsg');
    const panel = document.getElementById('adminPanel');

    unlockBtn.addEventListener('click', () => {
        const val = pinInput.value || '';
        if (val === State.pin) {
            panel.hidden = false;
            document.getElementById('lockSection').hidden = true;
            populateAdmin();
        } else {
            lockMsg.textContent = 'Incorrect PIN';
            setTimeout(() => lockMsg.textContent = '', 2000);
        }
    });

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
            location.reload();
        }
    });
}

function populateAdmin() {
    const sel = document.getElementById('childSelect');
    sel.innerHTML = '';
    CHILDREN.forEach(c => {
        const o = document.createElement('option');
        o.value = c;
        o.textContent = c;
        sel.appendChild(o);
    });

    sel.addEventListener('change', renderTaskListAdmin);

    document.getElementById('addTaskBtn').addEventListener('click', () => {
        const child = sel.value;
        const txt = document.getElementById('newTaskInput').value.trim();
        if (!txt) return;
        addChore(child, txt);
        document.getElementById('newTaskInput').value = '';
        renderTaskListAdmin();
    });

    renderTaskListAdmin();
}

function renderTaskListAdmin() {
    const child = document.getElementById('childSelect').value;
    const list = document.getElementById('taskList');
    list.innerHTML = '';

    const chores = State.kids[child] || [];
    chores.forEach((t, idx) => {
        const row = document.createElement('div');
        row.className = 'task admin-row';
        const txt = document.createElement('div');
        txt.textContent = t;
        txt.style.flex = '1';

        const btn = document.createElement('button');
        btn.textContent = 'Delete';
        btn.addEventListener('click', () => {
            if (confirm('Delete this chore?')) {
                removeChore(child, idx);
                renderTaskListAdmin();
            }
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
