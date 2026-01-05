// ===== POMODORO TIMER - AUTO-RUN VERSION =====
window.addEventListener('DOMContentLoaded', () => {
    
    // ===== Load Settings Dynamically =====
    function getSettings() {
        const saved = localStorage.getItem('eduSyncSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                return {
                    pomodoroDuration: parseInt(settings.pomodoroDuration) || 25,
                    breakDuration: parseInt(settings.breakDuration) || 5,
                    longBreakDuration: parseInt(settings.longBreakDuration) || 30,
                    soundEffects: settings.soundEffects !== false,
                    desktopNotifications: settings.desktopNotifications === true
                };
            } catch (e) {
                console.error('Error loading settings:', e);
            }
        }
        return {
            pomodoroDuration: 25,
            breakDuration: 5,
            longBreakDuration: 30,
            soundEffects: true,
            desktopNotifications: false
        };
    }

    const SESSIONS_BEFORE_LONG_BREAK = 4;
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
    let remaining = 0;
    let timer = null;
    let sessionsCompleted = 0;
    let sessionsToday = 0;

    const API_BASE_URL = 'https://edu-sync-back-end-production.up.railway.app';

    const motivationalMessages = {
        focus: [
            { ar: " رائع! أكملت جلسة تركيز كاملة. أنت تقترب من هدفك!", en: "Amazing! You completed a full focus session!" },
            { ar: " إنجاز عظيم! كل دقيقة من تركيزك تبني مستقبلك.", en: "Great achievement! Every minute builds your future." },
            { ar: " مذهل! أنت تثبت أن الإرادة أقوى من أي شيء.", en: "Incredible! You're proving willpower conquers all." },
            { ar: " ممتاز! استمر في هذا الزخم، النجاح قريب جداً.", en: "Excellent! Keep this momentum, success is close." },
            { ar: " فخور بك! أنت تحول أحلامك إلى واقع خطوة بخطوة.", en: "Proud of you! You're turning dreams into reality." }
        ],
        break: [
            { ar: " وقت الاستراحة! اشرب ماء، تمدد قليلاً، وعد بطاقة أكبر.", en: "Break time! Drink water, stretch, come back stronger." },
            { ar: " خذ نفساً عميقاً... أنت تستحق هذه الراحة.", en: "Take a deep breath... you deserve this rest." },
            { ar: " استرخ الآن! العقل يحتاج راحة ليبدع أكثر.", en: "Relax now! The mind needs rest to be creative." },
            { ar: " استراحة جميلة! حرك جسمك قليلاً واشحن طاقتك.", en: "Nice break! Move your body and recharge." }
        ]
    };

    // ===== Request Notification Permission =====
    async function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return Notification.permission === 'granted';
    }

    // ===== Show Browser Notification =====
    function showBrowserNotification(message, type) {
        const settings = getSettings();
        
        if (!settings.desktopNotifications) {
            console.log('Desktop notifications disabled');
            return;
        }
        
        if ('Notification' in window && Notification.permission === 'granted') {
            const title = type === 'focus' ? '🎉 Focus Session Complete!' : '☕ Break Complete!';
            const icon = type === 'focus' ? focusGifUrl : breakGifUrl;
            
            const notification = new Notification(title, {
                body: message.ar + '\n' + message.en,
                icon: icon,
                badge: '../imgs/education.png',
                tag: `pomodoro-${Date.now()}`,
                requireInteraction: false,
                silent: false,
                vibrate: [200, 100, 200]
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            setTimeout(() => notification.close(), 5000);
        }
    }

    // ===== Save Notification to Backend =====
    async function saveNotificationToBackend(message, type) {
        try {
            const token = localStorage.getItem('session_token');
            if (!token) return;

            const notificationData = {
                title: type === 'focus' ? 'Focus Session Complete! 🎉' : 'Break Complete! ☕',
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
            console.error('Error saving notification to backend:', e);
        }
    }

    // ===== Save Notification to LocalStorage =====
    function saveNotificationToLocal(message, type) {
        try {
            const NOTIFICATIONS_KEY = "pomodoro_notifications";
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

    // ===== Play Notification Sound =====
    function playNotificationSound() {
        const settings = getSettings();
        
        if (!settings.soundEffects) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch(e) {
            console.error('Audio not supported:', e);
        }
    }

    // ===== Show Motivational Message =====
    function showMotivationalMessage(sessionType) {
        const messages = motivationalMessages[sessionType];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        console.log(` Showing ${sessionType} notification`);
        
        showBrowserNotification(randomMessage, sessionType);
        saveNotificationToBackend(randomMessage, sessionType);
        saveNotificationToLocal(randomMessage, sessionType);
        playNotificationSound();
    }

    // ===== Load State from LocalStorage =====
    const STATE_KEY = "pomodoro_forest_state_v2";
    
    function loadState() {
        try {
            const raw = localStorage.getItem(STATE_KEY);
            if (!raw) return { 
                stage: 0, 
                sessionsToday: 0, 
                sessionsCompleted: 0,
                lastDate: new Date().toDateString() 
            };
            
            const s = JSON.parse(raw);
            
            if (s.lastDate !== new Date().toDateString()) {
                s.sessionsToday = 0;
                s.sessionsCompleted = 0;
                s.lastDate = new Date().toDateString();
            }
            
            return s;
        } catch (e) {
            return { 
                stage: 0, 
                sessionsToday: 0, 
                sessionsCompleted: 0,
                lastDate: new Date().toDateString() 
            };
        }
    }
    
    function saveState(state) {
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
    }

    const state = loadState();
    let stage = state.stage || 0;
    sessionsToday = state.sessionsToday || 0;
    sessionsCompleted = state.sessionsCompleted || 0;

    // ===== Get Current Duration =====
    function getCurrentDuration() {
        const settings = getSettings();
        
        if (mode === "focus") {
            return settings.pomodoroDuration * 60;
        } else if (mode === "shortBreak") {
            return settings.breakDuration * 60;
        } else {
            return settings.longBreakDuration * 60;
        }
    }

    // ===== Format Time =====
    function formatTime(s) {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    }

    // ===== Update UI =====
    function updateUI() {
        const settings = getSettings();
        
        timeDisplay.textContent = formatTime(remaining);
        
        let modeLabel = '';
        if (mode === "focus") {
            modeLabel = `Mode: Focus (${settings.pomodoroDuration}m)`;
        } else if (mode === "shortBreak") {
            modeLabel = `Mode: Short Break (${settings.breakDuration}m)`;
        } else {
            modeLabel = `Mode: Long Break (${settings.longBreakDuration}m)`;
        }
        modeText.textContent = modeLabel;
        
        sessionsTodayEl.textContent = `Today's Pomodoros: ${sessionsToday} | Cycle: ${sessionsCompleted % SESSIONS_BEFORE_LONG_BREAK}/${SESSIONS_BEFORE_LONG_BREAK}`;
        
        focusGif.src = mode === "focus" ? focusGifUrl : breakGifUrl;
        focusGif.alt = mode === "focus" ? "Focus Mode" : "Break Mode";

        // ✅ Update tree stage
        if (treeContainer) {
            treeContainer.className = "tree stage-" + Math.min(stage, GROW_STAGES);
        }
        
        const names = ["Seed", "Seedling", "Young Tree", "Mature Tree", "Fully Grown Tree"];
        if (stageText) {
            stageText.textContent = `Level: ${names[Math.min(stage, GROW_STAGES)]}`;
        }

        // ✅ Animate trunk
        const trunk = document.querySelector('.trunk');
        if (trunk) {
            trunk.style.transition = "none";
            trunk.style.strokeDashoffset = "300";
            setTimeout(() => {
                trunk.style.transition = "stroke-dashoffset 900ms ease";
                trunk.style.strokeDashoffset = "0";
            }, 10);
        }

        document.title = `${formatTime(remaining)} - EduSync ${mode === 'focus' ? '🎯' : '☕'}`;
    }

    // ===== Timer Tick =====
    function tick() {
        if (remaining > 0) {
            remaining--;
            updateUI();
            
            if (remaining % 10 === 0) {
                localStorage.setItem("pomodoroRemaining", remaining);
                localStorage.setItem("pomodoroTimestamp", Date.now());
            }
        } else {
            clearInterval(timer);
            timer = null;


            // Determine notification type based on CURRENT mode
            const notificationType = mode === 'focus' ? 'focus' : 'break';
            showMotivationalMessage(notificationType);

            // Update counts ONLY for focus sessions
            if (mode === "focus") {
                sessionsToday++;
                sessionsCompleted++;
                stage = Math.min(stage + 1, GROW_STAGES);
                saveState({ 
                    stage, 
                    sessionsToday, 
                    sessionsCompleted,
                    lastDate: new Date().toDateString() 
                });
            }

            // ✅ Switch to next mode
            if (mode === "focus") {
                if (sessionsCompleted % SESSIONS_BEFORE_LONG_BREAK === 0) {
                    mode = "longBreak";
                } else {
                    mode = "shortBreak";
                }
            } else {
                mode = "focus";
            }
            
            remaining = getCurrentDuration();
            updateUI();
            
            //  Auto-start next session immediately (no delay)
            setTimeout(() => {
                startTimer();
            }, 2000); // 2 seconds to show notification
        }
    }

    // ===== Start Timer =====
    function startTimer() {
        if (timer) return;
        
        console.log(` Starting ${mode}: ${formatTime(remaining)}`);
        
        timer = setInterval(tick, 1000);
        
        startBtn.textContent = mode === "focus" ? "🎯 Studying..." : "☕ Relaxing...";
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        
        localStorage.setItem("pomodoroRunning", "true");
        localStorage.setItem("pomodoroMode", mode);
        localStorage.setItem("pomodoroRemaining", remaining);
        localStorage.setItem("pomodoroTimestamp", Date.now());
        localStorage.setItem("pomodoroSessionsCompleted", sessionsCompleted);
    }

    // ===== Pause Timer =====
    function pauseTimer() {
        if (timer) {
            clearInterval(timer);
            timer = null;
                        
            startBtn.textContent = " Resume";
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            
            localStorage.setItem("pomodoroPaused", "true");
            localStorage.removeItem("pomodoroRunning");
        }
    }

    // ===== Reset Timer =====
    function resetTimer() {
        pauseTimer();
        mode = "focus";
        remaining = getCurrentDuration();
        
        console.log(' Timer reset');
        
        localStorage.removeItem("pomodoroRunning");
        localStorage.removeItem("pomodoroPaused");
        localStorage.removeItem("pomodoroMode");
        localStorage.removeItem("pomodoroRemaining");
        localStorage.removeItem("pomodoroTimestamp");
        localStorage.removeItem("pomodoroSessionsCompleted");
        
        startBtn.textContent = " Start";
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        
        updateUI();
    }

    // ===== Initialize Timer =====
    function initializeTimer() {
        const wasRunning = localStorage.getItem("pomodoroRunning");
        const wasPaused = localStorage.getItem("pomodoroPaused");
        const savedMode = localStorage.getItem("pomodoroMode");
        const savedRemaining = parseInt(localStorage.getItem("pomodoroRemaining"));
        const savedTimestamp = parseInt(localStorage.getItem("pomodoroTimestamp"));
        const savedSessions = parseInt(localStorage.getItem("pomodoroSessionsCompleted") || '0');
        
        if (savedMode) {
            mode = savedMode;
            sessionsCompleted = savedSessions;
        }
        
        if (wasRunning && savedRemaining && savedTimestamp) {
            const elapsed = Math.floor((Date.now() - savedTimestamp) / 1000);
            const newRemaining = savedRemaining - elapsed;
            
            if (newRemaining > 0) {
                remaining = newRemaining;
                console.log(` Resuming: ${formatTime(remaining)}`);
                updateUI();
                startTimer();
                return;
            }
        } else if (wasPaused && savedRemaining) {
            remaining = savedRemaining;
            console.log(` Paused: ${formatTime(remaining)}`);
            updateUI();
            return;
        }
        
        remaining = getCurrentDuration();
        updateUI();
        requestNotificationPermission();
    }

    // ===== Event Listeners =====
    startBtn.addEventListener("click", () => {
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

    if (plantReset) {
        plantReset.addEventListener("click", () => {
            if (confirm("Reset progress and start a new tree?")) {
                stage = 0;
                sessionsToday = 0;
                sessionsCompleted = 0;
                saveState({ 
                    stage, 
                    sessionsToday, 
                    sessionsCompleted,
                    lastDate: new Date().toDateString() 
                });
                resetTimer();
            }
        });
    }

    // ===== Handle Page Visibility =====
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && timer) {
            const savedRemaining = parseInt(localStorage.getItem("pomodoroRemaining"));
            const savedTimestamp = parseInt(localStorage.getItem("pomodoroTimestamp"));
            
            if (savedRemaining && savedTimestamp) {
                const elapsed = Math.floor((Date.now() - savedTimestamp) / 1000);
                const newRemaining = savedRemaining - elapsed;
                
                if (newRemaining > 0) {
                    remaining = newRemaining;
                    updateUI();
                }
            }
        }
        
        if (!document.hidden && timer) {
            localStorage.setItem("pomodoroRemaining", remaining);
            localStorage.setItem("pomodoroTimestamp", Date.now());
        }
    });

    // ===== Save Before Unload =====
    window.addEventListener("beforeunload", () => {
        if (timer) {
            localStorage.setItem("pomodoroRemaining", remaining);
            localStorage.setItem("pomodoroTimestamp", Date.now());
        }
        saveState({ 
            stage, 
            sessionsToday, 
            sessionsCompleted,
            lastDate: new Date().toDateString() 
        });
    });

    // ===== Listen for Settings Changes =====
    window.addEventListener('storage', (e) => {
        if (e.key === 'eduSyncSettings') {
            updateUI();
        }
    });

    // ===== Initialize =====
    initializeTimer();
});