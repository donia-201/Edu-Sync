window.addEventListener('DOMContentLoaded', () => {

    let FOCUS_MIN = 25; 
    let BREAK_MIN = 5;
    const GROW_STAGES = 4; 

    const focusGifUrl = "../imgs/200w.webp";
    const breakGifUrl = "../imgs/200w-1.webp";

    const startBtn = document.getElementById("startBtn");
    const pauseBtn = document.getElementById("pauseBtn");
    const resetBtn = document.getElementById("resetBtn");
    const timeDisplay = document.getElementById("timeDisplay");
    const modeText = document.getElementById("modeText");
    const sessionsTodayEl = document.getElementById("sessionsToday");
    const focusGif = document.getElementById("focusGif");
    const treeContainer = document.getElementById("treeContainer");
    const stageText = document.getElementById("stageText");
    const plantReset = document.getElementById("plantReset");

    let mode = "focus"; 
    let remaining = FOCUS_MIN * 60;
    let timer = null;
    let sessionsToday = 0;

    const API_BASE_URL = 'https://edu-sync-back-end-production.up.railway.app';

    const motivationalMessages = {
        focus: [
            { ar: "🌟 رائع! أكملت جلسة تركيز كاملة. أنت تقترب من هدفك!", en: "Amazing! You completed a full focus session!" },
            { ar: "💪 إنجاز عظيم! كل دقيقة من تركيزك تبني مستقبلك.", en: "Great achievement! Every minute builds your future." },
            { ar: "🎯 مذهل! أنت تثبت أن الإرادة أقوى من أي شيء.", en: "Incredible! You're proving willpower conquers all." },
            { ar: "🚀 ممتاز! استمر في هذا الزخم، النجاح قريب جداً.", en: "Excellent! Keep this momentum, success is close." },
            { ar: "✨ فخور بك! أنت تحول أحلامك إلى واقع خطوة بخطوة.", en: "Proud of you! You're turning dreams into reality." },
            { ar: "🌱 رائع! كل جلسة تركيز هي بذرة تزرعها لمستقبلك.", en: "Wonderful! Each session is a seed for your future." },
            { ar: "🏆 إنجاز مميز! أنت تبني عادات الفائزين.", en: "Outstanding! You're building winner's habits." },
            { ar: "💎 ممتاز! العقول العظيمة تُبنى بالصبر والتركيز.", en: "Excellent! Great minds are built with patience." },
            { ar: "🌟 أحسنت! أنت تستثمر في أعظم مشروع... نفسك!", en: "Well done! You're investing in yourself!" },
            { ar: "🎓 مبدع! المعرفة التي تكتسبها اليوم ستغير غدك.", en: "Creative! Today's knowledge changes tomorrow." }
        ],
        break: [
            { ar: "☕ وقت الاستراحة! اشرب ماء، تمدد قليلاً، وعد بطاقة أكبر.", en: "Break time! Drink water, stretch, come back stronger." },
            { ar: "🌸 خذ نفساً عميقاً... أنت تستحق هذه الراحة.", en: "Take a deep breath... you deserve this rest." },
            { ar: "🎵 استرخ الآن! العقل يحتاج راحة ليبدع أكثر.", en: "Relax now! The mind needs rest to be creative." },
            { ar: "🌈 استراحة جميلة! حرك جسمك قليلاً واشحن طاقتك.", en: "Nice break! Move your body and recharge." },
            { ar: "🧘 تنفس وارتاح... القوة تأتي من التوازن.", en: "Breathe and relax... strength comes from balance." },
            { ar: "💧 اشرب ماء! عقلك يحتاج ترطيب مثل جسمك.", en: "Drink water! Your brain needs hydration." },
            { ar: "🌺 لحظة هدوء... الإنتاجية تبدأ من الراحة الجيدة.", en: "Moment of calm... productivity starts with rest." },
            { ar: "🎨 استرخ! الإبداع يولد في لحظات الراحة.", en: "Relax! Creativity is born in moments of rest." }
        ]
    };

    function createToast(message) {
        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        toast.setAttribute('data-type', mode);
        
        const icon = mode === 'focus' ? '🎉' : '☕';
        
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-message-ar">${message.ar}</div>
                <div class="toast-message-en">${message.en}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 8000);
        
        playNotificationSound();
    }

    function playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = mode === 'focus' ? 800 : 600;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch(e) {
            console.log('Audio not supported');
        }
    }

    function showBrowserNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('EduSync Pomodoro', {
                body: message.ar + '\n' + message.en,
                icon: '../imgs/education.png',
                badge: '../imgs/education.png',
                tag: 'pomodoro-timer',
                requireInteraction: false,
                silent: false
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            setTimeout(() => notification.close(), 5000);
        }
    }

    async function saveNotificationToBackend(message, type) {
        try {
            const token = localStorage.getItem('session_token');
            if (!token) return;

            const notificationData = {
                title: type === 'focus' ? 'Focus Session Complete! 🎉' : 'Break Time! ☕',
                message: message.ar + ' | ' + message.en,
                type: 'pomodoro',
                category: type,
                created_at: new Date().toISOString()
            };

            await fetch(`${API_BASE_URL}/api/notifications`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(notificationData)
            });
        } catch (e) {
            console.log('Failed to save to backend:', e);
        }
    }

    /* ==== Save to LocalStorage (Backup) ==== */
    const NOTIFICATIONS_KEY = "pomodoro_notifications";
    
    function saveNotificationToLocal(message, type) {
        try {
            let notifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
            
            const notification = {
                id: Date.now(),
                message: message,
                type: type,
                category: 'pomodoro',
                timestamp: new Date().toISOString(),
                date: new Date().toLocaleString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })
            };
            
            notifications.unshift(notification);
            
            if (notifications.length > 100) {
                notifications = notifications.slice(0, 100);
            }
            
            localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
        } catch(e) {
            console.error('Error saving notification:', e);
        }
    }

    function showMotivationalMessage() {
        const messages = motivationalMessages[mode];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        createToast(randomMessage);
        
        showBrowserNotification(randomMessage);
        
        saveNotificationToBackend(randomMessage, mode);
        
        saveNotificationToLocal(randomMessage, mode);
        
        playNotificationSound();
    }

    /* ==== Focus Time Options ==== */
    document.querySelectorAll(".focus-option").forEach(btn => {
        btn.addEventListener("click", () => {
            FOCUS_MIN = Number(btn.dataset.time);
            BREAK_MIN = (FOCUS_MIN === 50) ? 10 : 5;
            if (mode === "focus") { remaining = FOCUS_MIN * 60 }
            updateUI();
        });
    });

    const STATE_KEY = "pomodoro_forest_state_v1";
    
    function loadState() {
        try {
            const raw = localStorage.getItem(STATE_KEY);
            if (!raw) return { stage: 0, sessionsToday: 0, lastDate: new Date().toDateString() };
            const s = JSON.parse(raw);
            if (s.lastDate !== new Date().toDateString()) {
                s.sessionsToday = 0;
                s.lastDate = new Date().toDateString();
            }
            return s;
        } catch (e) {
            return { stage: 0, sessionsToday: 0, lastDate: new Date().toDateString() };
        }
    }
    
    function saveState(state) {
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
    }

    const state = loadState();
    let stage = state.stage || 0;
    sessionsToday = state.sessionsToday || 0;
    updateUI();

    const preload = (url) => {
        const img = new Image();
        img.src = url;
    };
    preload(focusGifUrl);
    preload(breakGifUrl);

    function formatTime(s) {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    }

    function updateUI() {
        timeDisplay.textContent = formatTime(remaining);
        modeText.textContent = mode === "focus" ? `Mode: Focus (${FOCUS_MIN}m)` : `Mode: Break (${BREAK_MIN}m)`;
        sessionsTodayEl.textContent = `Today's Pomodoros: ${sessionsToday}`;
        focusGif.src = mode === "focus" ? focusGifUrl : breakGifUrl;
        focusGif.alt = mode === "focus" ? "GIF: يذاكر" : "GIF: بريك";

        treeContainer.className = "tree stage-" + Math.min(stage, GROW_STAGES);
        const names = ["Seed", "Seedling", "Young Tree", "Mature Tree", "Fully Grown Tree"];
        stageText.textContent = `Level: ${names[Math.min(stage, GROW_STAGES)]}`;

        const trunk = document.querySelector('.trunk');
        if (trunk) {
            trunk.style.transition = "none";
            trunk.style.strokeDashoffset = "300";
            requestAnimationFrame(() => {
                trunk.style.transition = "stroke-dashoffset 900ms ease";
                trunk.style.strokeDashoffset = "0";
            });
        }

        document.title = `${formatTime(remaining)} - EduSync ${mode === 'focus' ? '🎯' : '☕'}`;
    }

    function tick() {
        if (remaining > 0) {
            remaining--;
            updateUI();
            
            if (remaining % 60 === 0) {
                localStorage.setItem("pomodoroEndTime", Date.now() + (remaining * 1000));
                localStorage.setItem("pomodoroMode", mode);
            }
        } else {
            clearInterval(timer);
            timer = null;
            localStorage.removeItem("pomodoroEndTime");
            localStorage.removeItem("pomodoroMode");

            if (mode === "focus") {
                sessionsToday++;
                stage = Math.min(stage + 1, GROW_STAGES);
                saveState({ stage, sessionsToday, lastDate: new Date().toDateString() });
            }

            showMotivationalMessage();

            if (mode === "focus") {
                mode = "break";
                remaining = BREAK_MIN * 60;
            } else {
                mode = "focus";
                remaining = FOCUS_MIN * 60;
            }
            
            updateUI();
            
            setTimeout(() => startTimer(), 2000);
        }
    }

    function startTimer() {
        if (timer) return;

        const now = Date.now();
        const duration = remaining * 1000;
        const endTime = now + duration;
        localStorage.setItem("pomodoroEndTime", endTime);
        localStorage.setItem("pomodoroMode", mode);

        timer = setInterval(tick, 1000);
        startBtn.textContent = mode === "focus" ? "Studying..." : "Break Time";
        startBtn.disabled = true;
        pauseBtn.disabled = false;
    }

    function pauseTimer() {
        if (timer) {
            clearInterval(timer);
            timer = null;
            startBtn.textContent = "Resume";
            startBtn.disabled = false;
            pauseBtn.disabled = true;
        }
    }

    function resetTimer() {
        pauseTimer();
        mode = "focus";
        remaining = FOCUS_MIN * 60;
        localStorage.removeItem("pomodoroEndTime");
        localStorage.removeItem("pomodoroMode");
        updateUI();
    }

    window.addEventListener("load", () => {
        const endTime = localStorage.getItem("pomodoroEndTime");
        const savedMode = localStorage.getItem("pomodoroMode");
        
        if (endTime && savedMode) {
            const now = Date.now();
            const timeLeft = Math.round((endTime - now) / 1000);
            mode = savedMode;
            
            if (timeLeft > 0) {
                remaining = timeLeft;
                startTimer();
            } else {
                const timePassed = Math.abs(timeLeft);
                console.log(`Timer expired ${timePassed} seconds ago`);
                remaining = (mode === "focus") ? FOCUS_MIN * 60 : BREAK_MIN * 60;
                updateUI();
            }
        } else {
            updateUI();
        }
    });

    startBtn.addEventListener("click", () => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        startTimer();
    });

    pauseBtn.addEventListener("click", () => { 
        pauseTimer(); 
    });

    resetBtn.addEventListener("click", () => { 
        if (confirm('Are you sure you want to reset the timer?')) {
            resetTimer();
        }
    });

    plantReset.addEventListener("click", () => {
        if (confirm("هل تريد زرع شجرة جديدة؟ كل التقدّم سيُعاد.")) {
            stage = 0;
            sessionsToday = 0;
            saveState({ stage, sessionsToday, lastDate: new Date().toDateString() });
            updateUI();
        }
    });

    window.addEventListener("beforeunload", () => {
        saveState({ stage, sessionsToday, lastDate: new Date().toDateString() });
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && timer) {
            const endTime = localStorage.getItem("pomodoroEndTime");
            if (endTime) {
                const timeLeft = Math.round((endTime - Date.now()) / 1000);
                if (timeLeft > 0) {
                    remaining = timeLeft;
                    updateUI();
                }
            }
        }
    });

    updateUI();
});