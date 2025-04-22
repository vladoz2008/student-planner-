let subjects = JSON.parse(localStorage.getItem('subjects')) || [];
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let achievements = JSON.parse(localStorage.getItem('achievements')) || {
    newbie: false, timeMaster: false, planner: false, executor: false,
    marathoner: false, organizer: false, superhuman: false
};
let dailyStats = JSON.parse(localStorage.getItem('dailyStats')) || {};
let shownAchievements = JSON.parse(localStorage.getItem('shownAchievements')) || [];
let timer = null;
let activeIndex = -1;
let currentFilter = 'all';
let activeTaskIndex = -1;

const quotes = [
    "Делай сегодня то, что другие не хотят.",
    "Успех — это сумма маленьких усилий.",
    "Время — твой самый ценный ресурс.",
    "Каждый шаг приближает к цели.",
    "Порядок в делах — порядок в голове."
];

const categoryIcons = {
    study: 'fa-book',
    project: 'fa-laptop-code',
    personal: 'fa-user'
};

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours} ч ${minutes} мин ${secs} сек`;
}

function parseTime(timeStr) {
    const parts = timeStr.split(' ').map(Number);
    if (parts.length === 3) {
        return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    }
    return 0;
}

function getTimeLeft(deadline) {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end - now;
    if (diff < 0) return "Просрочено";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days} д ${hours} ч`;
}

function addSubject() {
    const input = document.getElementById('subjectInput');
    const goal = document.getElementById('subjectGoal');
    const category = document.getElementById('subjectCategory').value;
    const color = document.getElementById('categoryColor').value;
    const name = input.value.trim();
    if (name) {
        subjects.push({ name, timeSpent: 0, goal: parseInt(goal.value || 0) * 3600, category, color, notes: '', isRunning: false });
        input.value = '';
        goal.value = '';
        saveAndRender();
    }
}

function deleteSubject(index) {
    if (subjects[index].isRunning && timer) {
        clearInterval(timer);
        timer = null;
    }
    subjects.splice(index, 1);
    saveAndRender();
}

function toggleTimer(index = activeIndex) {
    const sound = document.getElementById('timerSound');
    if (index === -1) return;

    if (subjects[index].isRunning && timer) {
        clearInterval(timer);
        timer = null;
        subjects[index].isRunning = false;
        if (document.getElementById('timerToggle') && activeIndex === index) {
            document.getElementById('timerToggle').textContent = '▶';
        }
    } else {
        if (timer) clearInterval(timer);
        timer = setInterval(() => {
            subjects[index].timeSpent++;
            updateDailyStats();
            if (document.getElementById('timerDisplay') && activeIndex === index) {
                document.getElementById('timerDisplay').textContent = formatTime(subjects[index].timeSpent);
                document.getElementById('goalFill').style.width = `${(subjects[index].timeSpent / subjects[index].goal) * 100 || 0}%`;
            }
            saveAndRender();
            if (sound) sound.play();
        }, 1000);
        subjects[index].isRunning = true;
        if (document.getElementById('timerToggle') && activeIndex === index) {
            document.getElementById('timerToggle').textContent = '◼';
        }
    }
    saveAndRender();
}

function openTimerModal(index) {
    activeIndex = index;
    const modal = document.getElementById('timerModal');
    const subjectSpan = document.getElementById('timerSubject');
    const timerDisplay = document.getElementById('timerDisplay');
    const toggleBtn = document.getElementById('timerToggle');
    const goalDisplay = document.getElementById('goalDisplay');
    const goalFill = document.getElementById('goalFill');
    const notes = document.getElementById('subjectNotes');

    subjectSpan.textContent = subjects[index].name;
    timerDisplay.textContent = formatTime(subjects[index].timeSpent);
    toggleBtn.textContent = subjects[index].isRunning ? '◼' : '▶';
    goalDisplay.textContent = `${Math.floor(subjects[index].goal / 3600)} ч`;
    goalFill.style.width = `${(subjects[index].timeSpent / subjects[index].goal) * 100 || 0}%`;
    notes.value = subjects[index].notes;
    modal.style.display = 'block';
}

function pauseTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
        subjects[activeIndex].isRunning = false;
        document.getElementById('timerToggle').textContent = '▶';
        saveAndRender();
    }
}

function resetTimer() {
    subjects[activeIndex].timeSpent = 0;
    if (timer) {
        clearInterval(timer);
        timer = null;
        subjects[activeIndex].isRunning = false;
    }
    document.getElementById('timerDisplay').textContent = formatTime(0);
    document.getElementById('goalFill').style.width = '0%';
    saveAndRender();
}

function setManualTime() {
    const input = document.getElementById('manualTime').value;
    if (input) {
        subjects[activeIndex].timeSpent = parseTime(input);
        document.getElementById('timerDisplay').textContent = formatTime(subjects[activeIndex].timeSpent);
        document.getElementById('goalFill').style.width = `${(subjects[activeIndex].timeSpent / subjects[activeIndex].goal) * 100 || 0}%`;
        saveAndRender();
    }
}

function saveSubjectNotes() {
    subjects[activeIndex].notes = document.getElementById('subjectNotes').value;
    saveAndRender();
}

function addTask() {
    const input = document.getElementById('taskInput');
    const deadline = document.getElementById('taskDeadline').value;
    const reminder = document.getElementById('taskReminder').value;
    const category = document.getElementById('taskCategory').value;
    const color = document.getElementById('categoryColor').value;
    const priority = document.getElementById('taskPriority').value;
    const name = input.value.trim();
    if (name && deadline) {
        tasks.push({ name, deadline, reminder, completed: false, category, color, priority, subtasks: [], notes: '' });
        if (reminder) setReminder(tasks.length - 1);
        input.value = '';
        document.getElementById('taskDeadline').value = '';
        document.getElementById('taskReminder').value = '';
        saveAndRender();
    }
}

function deleteTask(index) {
    tasks.splice(index, 1);
    saveAndRender();
}

function toggleTask(index) {
    tasks[index].completed = !tasks[index].completed;
    saveAndRender();
}

function openTaskEditModal(index) {
    activeTaskIndex = index;
    const modal = document.getElementById('taskEditModal');
    const title = document.getElementById('taskModalTitle');
    const notes = document.getElementById('taskNotes');
    const subtaskList = document.getElementById('subtaskList');

    title.textContent = tasks[index].name;
    notes.value = tasks[index].notes;
    subtaskList.innerHTML = '';
    tasks[index].subtasks.forEach((sub, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<input type="checkbox" ${sub.completed ? 'checked' : ''} onchange="toggleSubtask(${index}, ${i})">${sub.name} <button class="oval-btn" onclick="deleteSubtask(${index}, ${i})">✖</button>`;
        subtaskList.appendChild(li);
    });
    modal.style.display = 'block';
}

function addSubtask() {
    const input = document.getElementById('subtaskInput');
    const name = input.value.trim();
    if (name && activeTaskIndex >= 0) {
        tasks[activeTaskIndex].subtasks.push({ name, completed: false });
        input.value = '';
        openTaskEditModal(activeTaskIndex);
        saveAndRender();
    }
}

function toggleSubtask(taskIndex, subIndex) {
    tasks[taskIndex].subtasks[subIndex].completed = !tasks[taskIndex].subtasks[subIndex].completed;
    saveAndRender();
}

function deleteSubtask(taskIndex, subIndex) {
    tasks[taskIndex].subtasks.splice(subIndex, 1);
    openTaskEditModal(taskIndex);
    saveAndRender();
}

function saveTaskNotes() {
    if (activeTaskIndex >= 0) {
        tasks[activeTaskIndex].notes = document.getElementById('taskNotes').value;
        saveAndRender();
    }
}

function setReminder(index) {
    const reminderTime = new Date(tasks[index].reminder).getTime();
    const now = Date.now();
    if (reminderTime > now) {
        setTimeout(() => {
            if (Notification.permission === 'granted') {
                new Notification(`Напоминание: ${tasks[index].name}`);
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(perm => {
                    if (perm === 'granted') new Notification(`Напоминание: ${tasks[index].name}`);
                });
            }
        }, reminderTime - now);
    }
}

function closeModal(id) {
    if (id === 'timerModal') saveSubjectNotes();
    if (id === 'taskEditModal') saveTaskNotes();
    document.getElementById(id).style.display = 'none';
}

function filterSubjects(category) {
    currentFilter = category;
    renderSubjects();
}

function filterTasks(category) {
    currentFilter = category;
    renderTasks();
}

function openAchievementsModal() {
    const modal = document.getElementById('achievementsModal');
    const list = document.getElementById('achievementsList');
    list.innerHTML = '';
    const achievementsList = [
        { id: 'newbie', name: 'Новичок', desc: 'Добавь 1 предмет', completed: achievements.newbie },
        { id: 'timeMaster', name: 'Тайм-мастер', desc: 'Проведи 1 час за таймером', completed: achievements.timeMaster },
        { id: 'planner', name: 'Планировщик', desc: 'Добавь 5 задач', completed: achievements.planner },
        { id: 'executor', name: 'Исполнитель', desc: 'Выполни 3 задачи', completed: achievements.executor },
        { id: 'marathoner', name: 'Марафонец', desc: 'Проведи 5 часов за таймером', completed: achievements.marathoner },
        { id: 'organizer', name: 'Организатор', desc: 'Добавь 3 предмета', completed: achievements.organizer },
        { id: 'superhuman', name: 'Сверхчеловек', desc: 'Проведи 10 часов за таймером', completed: achievements.superhuman }
    ];
    achievementsList.forEach(ach => {
        const li = document.createElement('li');
        li.className = ach.completed ? 'completed' : 'pending';
        li.textContent = `${ach.name}: ${ach.desc}`;
        list.appendChild(li);
    });
    modal.style.display = 'block';
}

function checkAchievements() {
    const totalTime = subjects.reduce((sum, s) => sum + s.timeSpent, 0);
    const completedTasks = tasks.filter(t => t.completed).length;

    const achievementTriggers = [
        { id: 'newbie', condition: subjects.length >= 1, name: 'Новичок' },
        { id: 'timeMaster', condition: totalTime >= 3600, name: 'Тайм-мастер' },
        { id: 'planner', condition: tasks.length >= 5, name: 'Планировщик' },
        { id: 'executor', condition: completedTasks >= 3, name: 'Исполнитель' },
        { id: 'marathoner', condition: totalTime >= 18000, name: 'Марафонец' },
        { id: 'organizer', condition: subjects.length >= 3, name: 'Организатор' },
        { id: 'superhuman', condition: totalTime >= 36000, name: 'Сверхчеловек' }
    ];

    achievementTriggers.forEach(trigger => {
        if (trigger.condition && !achievements[trigger.id]) {
            achievements[trigger.id] = true;
            if (!shownAchievements.includes(trigger.id)) {
                showAchievement(trigger.name);
                shownAchievements.push(trigger.id);
            }
        }
    });

    localStorage.setItem('achievements', JSON.stringify(achievements));
    localStorage.setItem('shownAchievements', JSON.stringify(shownAchievements));
}

function showAchievement(name) {
    const ach = document.getElementById('achievement');
    if (ach) {
        ach.innerHTML = `Достижение: ${name}! <span class="close" onclick="this.parentElement.style.display='none'">×</span>`;
        ach.style.display = 'block';
        ach.onclick = () => ach.style.display = 'none';
        setTimeout(() => ach.style.display = 'none', 5000);
    }
}

function updateDailyStats() {
    const today = new Date().toISOString().split('T')[0];
    dailyStats[today] = (dailyStats[today] || 0) + 1;
    localStorage.setItem('dailyStats', JSON.stringify(dailyStats));
}

function toggleTheme() {
    const currentTheme = document.body.className === 'nature' ? 'cosmos' : 'nature';
    document.body.className = currentTheme;
    localStorage.setItem('theme', currentTheme);
    initParticles();
}

function saveAndRender() {
    localStorage.setItem('subjects', JSON.stringify(subjects));
    localStorage.setItem('tasks', JSON.stringify(tasks));
    renderSubjects();
    renderTasks();
    renderCalendar();
    renderStats();
    renderWidgets();
    checkAchievements();
}

function renderSubjects() {
    const subjectList = document.getElementById('subjectList');
    if (subjectList) {
        subjectList.innerHTML = '';
        subjects.filter(s => currentFilter === 'all' || s.category === currentFilter).forEach((subject, index) => {
            const li = document.createElement('li');
            li.className = 'custom-color';
            li.style.borderLeftColor = subject.color;
            li.innerHTML = `
                <span onclick="openTimerModal(${index})"><i class="fas ${categoryIcons[subject.category]}"></i> ${subject.name} - <span id="time-${index}">${formatTime(subject.timeSpent)}</span></span>
                <button class="timer-btn" onclick="toggleTimer(${index})">${subject.isRunning ? '◼' : '▶'}</button>
                <button class="oval-btn" onclick="deleteSubject(${index})">✖</button>`;
            subjectList.appendChild(li);
        });
    }
}

function renderTasks() {
    const taskList = document.getElementById('taskList');
    if (taskList) {
        taskList.innerHTML = '';
        tasks.filter(t => currentFilter === 'all' || t.category === currentFilter).forEach((task, index) => {
            const li = document.createElement('li');
            li.className = `custom-color ${task.priority}`;
            li.style.borderLeftColor = task.color;
            li.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${index})">
                <span onclick="openTaskEditModal(${index})"><i class="fas ${categoryIcons[task.category]}"></i> ${task.name} - ${getTimeLeft(task.deadline)}</span>
                <button class="oval-btn" onclick="deleteTask(${index})">✖</button>`;
            taskList.appendChild(li);
        });
        const completed = tasks.filter(t => t.completed).length;
        const total = tasks.length;
        document.getElementById('progress').style.width = `${total ? (completed / total) * 100 : 0}%`;
    }
}

function renderCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (calendarEl) {
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            events: tasks.map(task => ({
                title: task.name,
                start: task.deadline,
                backgroundColor: task.completed ? '#4caf50' : task.color,
                borderColor: task.completed ? '#4caf50' : task.color
            })),
            eventClick: function(info) {
                alert(`${info.event.title} (${info.event.start.toLocaleDateString()})`);
            }
        });
        calendar.render();
    }
}

function renderStats() {
    const stats = document.getElementById('stats');
    if (stats) {
        stats.innerHTML = '';
        const sortedSubjects = [...subjects].sort((a, b) => a.timeSpent - b.timeSpent);
        const maxTime = sortedSubjects.length ? Math.max(...sortedSubjects.map(s => s.timeSpent)) : 1;
        sortedSubjects.forEach(subject => {
            const bar = document.createElement('div');
            bar.className = 'bar';
            const percentage = (subject.timeSpent / maxTime) * 100;
            bar.innerHTML = `
                <div class="bar-label">${subject.name}</div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%">${formatTime(subject.timeSpent)}</div>
                </div>`;
            stats.appendChild(bar);
        });

        const canvas = document.getElementById('dailyStats');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const days = Object.keys(dailyStats).slice(-7);
            const maxDaily = Math.max(...Object.values(dailyStats), 1);
            ctx.beginPath();
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 3;
            days.forEach((day, i) => {
                const x = (i / (days.length - 1)) * canvas.width;
                const y = canvas.height - (dailyStats[day] / maxDaily) * canvas.height;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        }
    }
}

function renderWidgets() {
    const dailyTime = document.getElementById('dailyTime');
    const nearestTask = document.getElementById('nearestTask');
    if (dailyTime && nearestTask) {
        const today = new Date().toISOString().split('T')[0];
        dailyTime.textContent = `Сегодня: ${formatTime(dailyStats[today] || 0)}`;
        const upcoming = tasks.filter(t => !t.completed).sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];
        nearestTask.textContent = upcoming ? `Ближайшая задача: ${upcoming.name} (${upcoming.deadline})` : 'Ближайшая задача: -';
    }
}

const quoteDiv = document.getElementById('quote');
if (quoteDiv) {
    quoteDiv.textContent = quotes[Math.floor(Math.random() * quotes.length)];
}

function initParticles() {
    const particleConfig = {
        particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: document.body.className === 'cosmos' ? '#dcdcdc' : '#3498db' },
            shape: { type: 'circle' },
            opacity: { value: 0.5, random: true },
            size: { value: 3, random: true },
            line_linked: { enable: true, distance: 150, color: '#3498db', opacity: 0.4, width: 1 },
            move: { enable: true, speed: 2, direction: 'none', random: false, straight: false, out_mode: 'out', bounce: false }
        },
        interactivity: {
            detect_on: 'canvas',
            events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: true, mode: 'push' }, resize: true },
            modes: { repulse: { distance: 100, duration: 0.4 }, push: { particles_nb: 4 } }
        },
        retina_detect: true
    };
    if (particlesJS) particlesJS('particles-js', particleConfig);
}

document.body.className = localStorage.getItem('theme') || 'nature';
initParticles();
saveAndRender();