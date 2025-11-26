    window.addEventListener('DOMContentLoaded', () => {

    let FOCUS_MIN = 25; 
    let BREAK_MIN = 5;
    const GROW_STAGES = 4; 

    const focusGifUrl = "../imgs/200w.webp"; // استبدلي بالـ GIF اللي تحبيه
    const breakGifUrl = "../imgs/200w-1.webp"; // استبدلي بالـ GIF بريك

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

    document.querySelectorAll(".focus-option").forEach(btn=> {
        btn.addEventListener("click", ()=>{
            FOCUS_MIN=Number(btn.dataset.time);
            BREAK_MIN= (FOCUS_MIN=== 50)? 10 : 5;
            if(mode=== "focus"){remaining= FOCUS_MIN *60 }
            updateUI();

        });
    });
    /* ==== التخزين المحلي للحالة ==== */
    const STATE_KEY = "pomodoro_forest_state_v1";
    function loadState(){
    try{
        const raw = localStorage.getItem(STATE_KEY);
        if(!raw) return {stage:0, sessionsToday:0, lastDate: new Date().toDateString()};
        const s = JSON.parse(raw);
        // reset sessionsToday if date changed
        if(s.lastDate !== new Date().toDateString()) s.sessionsToday = 0, s.lastDate = new Date().toDateString();
        return s;
    }catch(e){ return {stage:0, sessionsToday:0, lastDate: new Date().toDateString()}; }
    }
    function saveState(state){
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    }

    /* ==== الحالة المبدئية ==== */
    const state = loadState();
    let stage = state.stage || 0;
    sessionsToday = state.sessionsToday || 0;
    updateUI();

    /* ==== preloading GIFs لتحسين الأداء ==== */
    const preload = (url)=>{
    const img = new Image();
    img.src = url;
    };
    preload(focusGifUrl);
    preload(breakGifUrl);

    /* ==== دوال مساعدة ==== */
    function formatTime(s){
    const m = Math.floor(s/60).toString().padStart(2,'0');
    const sec = (s%60).toString().padStart(2,'0');
    return `${m}:${sec}`;
    }

    function updateUI(){
    timeDisplay.textContent = formatTime(remaining);
    modeText.textContent = mode === "focus" ? `Mode: Focus (${FOCUS_MIN}m)` :` Mode: Break (${BREAK_MIN}m )`;
    sessionsTodayEl.textContent =` Today's Pomodoros: ${sessionsToday}`;
    // GIF switch
    focusGif.src = mode === "focus" ? focusGifUrl : breakGifUrl;
    focusGif.alt = mode === "focus" ? "GIF: يذاكر" : "GIF: بريك ";

    // update tree stage class
    treeContainer.className = "tree stage-" + Math.min(stage, GROW_STAGES);
    const names = ["seed","seedling ","Young Tree ","Mature Tree"," Fully Grown Tree"];
    stageText.textContent =` Level: ${names[Math.min(stage, GROW_STAGES)]} `;
    // animate trunk draw when stage changes (simple)
    const trunk = document.querySelector('.trunk');
    if(trunk){
        // reset dashoffset to animate
        trunk.style.transition = "none";
        trunk.style.strokeDashoffset = "300";
        requestAnimationFrame(()=>{ // next frame
        trunk.style.transition = "stroke-dashoffset 900ms ease";
        trunk.style.strokeDashoffset = "0";
        });
    }
    }
    /* ==== منطق المؤقت ==== */
    function tick(){
    if(remaining > 0){
        remaining--;
        updateUI();
    } else {
        // انتهى الوقت
        clearInterval(timer);
        timer = null;
        localStorage.removeItem("pomodoroEndTime");
        localStorage.removeItem("pomodoroMode");
        // إذا كان focus انتهى => عدّل الـ stage + sessions
        if(mode === "focus"){
        sessionsToday++;
        stage = Math.min(stage + 1, GROW_STAGES);
        // save state
        saveState({stage, sessionsToday, lastDate: new Date().toDateString()});
        // optional: صوت/notification
        try { new Notification("Pomodoro complete!", { body: "Time for a break 🌿" }); } catch(e){}
        } else {
        // انتهى البريك
        try { new Notification("Break ended", { body: "Back to focus!" }); } catch(e){}
        }

        // تبديل الوضع أوتوماتيك
        if(mode === "focus"){
        mode = "break";
        remaining = BREAK_MIN * 60;
        } else {
        mode = "focus";
        remaining = FOCUS_MIN * 60;
        }
        updateUI();
        // auto start next timer (لو حابة ابقيه تلقائي)
        startTimer();
    }
    }

function startTimer(){
  if(timer) return; // already running

    const now= Date.now();
    const duration= remaining*1000;
    const endTime=now+duration;
    localStorage.setItem("pomodoroEndTime", endTime);
    localStorage.setItem("pomodoroMode", mode);

    timer = setInterval(tick, 1000);
    startBtn.textContent = "studying";
    startBtn.textContent = mode === "focus" ? "studying" : "استراحة محارب ";
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    }
    function pauseTimer(){
    if(timer){ clearInterval(timer); timer = null; startBtn.textContent="Resume"; startBtn.disabled=false; }
    }
    function resetTimer(){
    pauseTimer();
    mode = "focus";
    remaining = FOCUS_MIN * 60;
    updateUI();
    }

    window.addEventListener("load",()=>{
        const endTime=localStorage.getItem("pomodoroEndTime");
        const saveMode=localStorage.getItem("pomodoroMode");
        if( endTime && saveMode){
            const now =Date.now();
            remaining=Math.round((endTime- now) /1000);
            mode=saveMode
            if(remaining> 0)
            {
                startTimer();
            } else {
                remaining=(mode==="focus")? FOCUS_MIN * 60 : BREAK_MIN * 60
                updateUI();
            }
        } else updateUI();
    });
    /* ==== أزرار ==== */
    startBtn.addEventListener("click", ()=>{
    // Ask notification permission once (optional)
    if("Notification" in window && Notification.permission === "default"){
        Notification.requestPermission().catch(()=>{});
    }
    startTimer();
    });
    pauseBtn.addEventListener("click", ()=>{ pauseTimer(); });
    resetBtn.addEventListener("click", ()=>{ resetTimer(); });

    /* زر لإعادة زراعة شجرة جديدة */
    plantReset.addEventListener("click", ()=>{
    if(confirm("هل تريدي زرع شجرة جديدة؟ كل التقدّم سيُعاد.")){
        stage = 0;
        sessionsToday = 0;
        saveState({stage, sessionsToday, lastDate: new Date().toDateString()});
        updateUI();
    }
    });

    window.addEventListener("beforeunload", ()=> {
    saveState({stage, sessionsToday, lastDate: new Date().toDateString()});
    });

    updateUI();
    });
