window.addEventListener('DOMContentLoaded', () => {

    let FOCUS_MIN = 25; 
    let BREAK_MIN = 5;
    const GROW_STAGES = 4; 

    const focusGifUrl = "../imgs/200w.webp";
    const breakGifUrl = "../imgs/200w-1.webp";

    /* ==== عناصر الـ DOM ==== */
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

    const motivationalMessages = {
        focus: [
            { ar: " رائع! أكملت جلسة تركيز كاملة. أنت تقترب من هدفك!", en: "Amazing! You completed a full focus session. You're getting closer to your goal!" },
            { ar: " إنجاز عظيم! كل دقيقة من تركيزك تبني مستقبلك.", en: "Great achievement! Every minute of focus builds your future." },
            { ar: " مذهل! أنت تثبت أن الإرادة أقوى من أي شيء.", en: "Incredible! You're proving that willpower conquers all." },
            { ar: " ممتاز! استمر في هذا الزخم، النجاح قريب جداً.", en: "Excellent! Keep this momentum, success is very close." },
            { ar: " فخور بك! أنت تحول أحلامك إلى واقع خطوة بخطوة.", en: "Proud of you! You're turning dreams into reality step by step." },
            { ar: " رائع! كل جلسة تركيز هي بذرة تزرعها لمستقبلك.", en: "Wonderful! Each focus session is a seed you plant for your future." },
            { ar: " إنجاز مميز! أنت تبني عادات الفائزين.", en: "Outstanding achievement! You're building winner's habits." },
            { ar: " ممتاز! العقول العظيمة تبنى بالصبر والتركيز.", en: "Excellent! Great minds are built with patience and focus." },
            { ar: " أحسنت! أنت تستثمر في أعظم مشروع... نفسك!", en: "Well done! You're investing in the greatest project... yourself!" },
            { ar: " مبدع! المعرفة التي تكتسبها اليوم ستغير غدك.", en: "Creative! The knowledge you gain today will change your tomorrow." }
        ],
        break: [
            { ar: " وقت الاستراحة! اشرب ماء، تمدد قليلاً، وعد بطاقة أكبر.", en: "Break time! Drink water, stretch a bit, and come back stronger." },
            { ar: " خذ نفساً عميقاً... أنت تستحق هذا الراحة.", en: "Take a deep breath... you deserve this rest." },
            { ar: " استرخ الآن! العقل يحتاج راحة ليبدع أكثر.", en: "Relax now! The mind needs rest to be more creative." },
            { ar: " استراحة جميلة! حرك جسمك قليلاً واشحن طاقتك.", en: "Nice break! Move your body a bit and recharge." },
            { ar: " تنفس وارتاح... القوة تأتي من التوازن.", en: "Breathe and relax... strength comes from balance." },
            { ar: " اشرب ماء! عقلك يحتاج ترطيب مثل جسمك.", en: "Drink water! Your brain needs hydration like your body." },
            { ar: " لحظة هدوء... الإنتاجية تبدأ من الراحة الجيدة.", en: "A moment of calm... productivity starts with good rest." },
            { ar: " استرخ! الإبداع يولد في لحظات الراحة.", en: "Relax! Creativity is born in moments of rest." }
        ]
    };

    function createToast(message) {
        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        
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
        }, 6000);
        
        playNotificationSound();
    }

    function playNotificationSound() {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OmdUQ4NVKni7bllHgU2jdTty4IsBAA=');
            audio.volume = 0.3;
            audio.play().catch(() => {});
        } catch(e) {}
    }

    const NOTIFICATIONS_KEY = "pomodoro_notifications";
    
    function saveNotification(message, type) {
        try {
            let notifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
            
            const notification = {
                id: Date.now(),
                message: message,
                type: type,
                timestamp: new Date().toISOString(),
                date: new Date().toLocaleString('ar-EG', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })
            };
            
            notifications.unshift(notification);
            
            if (notifications.length > 50) {
                notifications = notifications.slice(0, 50);
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
        
        saveNotification(randomMessage, mode);
    }

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
        const names = ["seed", "seedling", "Young Tree", "Mature Tree", "Fully Grown Tree"];
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
    }

    function tick() {
        if (remaining > 0) {
            remaining--;
            updateUI();
        } else {
            clearInterval(timer);
            timer = null;
            localStorage.removeItem("pomodoroEndTime");
            localStorage.removeItem("pomodoroMode");

            if (mode === "focus") {
                sessionsToday++;
                stage = Math.min(stage + 1, GROW_STAGES);
                saveState({ stage, sessionsToday, lastDate: new Date().toDateString() });
                
                showMotivationalMessage();
            } else {
                showMotivationalMessage();
            }

            if (mode === "focus") {
                mode = "break";
                remaining = BREAK_MIN * 60;
            } else {
                mode = "focus";
                remaining = FOCUS_MIN * 60;
            }
            updateUI();
            startTimer();
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
        startBtn.textContent = mode === "focus" ? "Studying..." : "استراحة محارب";
        startBtn.disabled = true;
        pauseBtn.disabled = false;
    }

    function pauseTimer() {
        if (timer) {
            clearInterval(timer);
            timer = null;
            startBtn.textContent = "Resume";
            startBtn.disabled = false;
        }
    }

    function resetTimer() {
        pauseTimer();
        mode = "focus";
        remaining = FOCUS_MIN * 60;
        updateUI();
    }

    window.addEventListener("load", () => {
        const endTime = localStorage.getItem("pomodoroEndTime");
        const saveMode = localStorage.getItem("pomodoroMode");
        if (endTime && saveMode) {
            const now = Date.now();
            remaining = Math.round((endTime - now) / 1000);
            mode = saveMode;
            if (remaining > 0) {
                startTimer();
            } else {
                remaining = (mode === "focus") ? FOCUS_MIN * 60 : BREAK_MIN * 60;
                updateUI();
            }
        } else updateUI();
    });

    startBtn.addEventListener("click", () => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().catch(() => {});
        }
        startTimer();
    });

    pauseBtn.addEventListener("click", () => { pauseTimer(); });
    resetBtn.addEventListener("click", () => { resetTimer(); });

    plantReset.addEventListener("click", () => {
        if (confirm("هل تريدي زرع شجرة جديدة؟ كل التقدّم سيُعاد.")) {
            stage = 0;
            sessionsToday = 0;
            saveState({ stage, sessionsToday, lastDate: new Date().toDateString() });
            updateUI();
        }
    });

    window.addEventListener("beforeunload", () => {
        saveState({ stage, sessionsToday, lastDate: new Date().toDateString() });
    });

    updateUI();
});