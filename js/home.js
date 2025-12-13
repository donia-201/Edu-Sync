// home.js (frontend) - Updated Version
// ==================== إعدادات عامة ====================
const BACKEND_BASE = "https://edu-sync-back-end-production.up.railway.app";

// Study Field Keywords - موسعة بكلمات أكتر
const STUDY_FIELD_KEYWORDS = {
    "architecture": ["architecture tutorial", "architectural design", "building design", "urban planning", "interior design"],
    "ai": ["artificial intelligence", "machine learning", "deep learning", "neural networks", "AI tutorial"],
    "biology": ["biology lecture", "molecular biology", "genetics", "cell biology", "microbiology"],
    "business administration": ["business management", "MBA", "entrepreneurship", "leadership", "business strategy"],
    "chemistry": ["chemistry lecture", "organic chemistry", "inorganic chemistry", "chemical reactions"],
    "computer science": ["computer science", "programming", "data structures", "algorithms", "coding tutorial"],
    "cyber security": ["cybersecurity", "ethical hacking", "network security", "penetration testing", "security tutorial"],
    "data science": ["data science", "python data analysis", "statistics", "data visualization", "machine learning"],
    "education": ["teaching methods", "educational psychology", "pedagogy", "learning strategies"],
    "engineering": ["engineering", "mechanical engineering", "civil engineering", "electrical engineering"],
    "graphic design": ["graphic design", "photoshop tutorial", "design principles", "typography", "branding"],
    "law": ["law lecture", "legal studies", "constitutional law", "criminal law", "civil law"],
    "marketing": ["digital marketing", "marketing strategy", "social media marketing", "SEO", "content marketing"],
    "mathematics": ["mathematics", "calculus", "algebra", "geometry", "trigonometry", "math tutorial"],
    "medicine": ["medical lecture", "anatomy", "physiology", "pathology", "medical education"],
    "pharmacy": ["pharmacy", "pharmacology", "pharmaceutical sciences", "drug chemistry"],
    "physics": ["physics lecture", "quantum physics", "mechanics", "thermodynamics", "electromagnetism"],
    "psychology": ["psychology", "cognitive psychology", "behavioral psychology", "mental health"],
    "statistics": ["statistics", "statistical analysis", "probability", "data analysis"],
    "frontend": ["frontend development", "html css", "javascript", "react", "vue", "web design"],
    "backend": ["backend development", "node.js", "express", "databases", "API development", "python django"]
};

let currentUser = null;

// helper: safe text
function safeText(s) {
    return (s === undefined || s === null) ? "" : String(s);
}

// ==================== عرض الرسائل في الصفحة ====================
function showMessage(message, type = 'info') {
    const container = document.getElementById("recommended-playlists");
    if (!container) return;
    
    const colors = {
        'info': '#2196F3',
        'success': '#4CAF50',
        'warning': '#FF9800',
        'error': '#f44336'
    };
    
    const icons = {
        'info': 'ℹ️',
        'success': '✅',
        'warning': '⚠️',
        'error': '❌'
    };
    
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        background: ${colors[type]}15;
        border-left: 4px solid ${colors[type]};
        padding: 15px 20px;
        margin: 20px 0;
        border-radius: 8px;
        font-size: 16px;
        color: #333;
    `;
    messageDiv.innerHTML = `<strong>${icons[type]} ${message}</strong>`;
    
    container.insertBefore(messageDiv, container.firstChild);
}

// ==================== التحقق من تسجيل الدخول ====================
window.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("authToken");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!token) {
        alert("Please login first!");
        window.location.href = "../pages/login.html";
        return;
    }

    currentUser = user;

    // عرض رسالة ترحيب
    const welcomeMsg = document.getElementById("welcome-message");
    const studyFieldMsg = document.getElementById("study-field-message");
    
    if (welcomeMsg && user.username) {
        welcomeMsg.textContent = `Welcome back, ${user.username}! `;
    }

    if (studyFieldMsg && user.study_field) {
        studyFieldMsg.textContent = `Let's study ${user.study_field} together`;
    }

    // التحقق من صلاحية الـ session
    try {
        const response = await fetch(`${BACKEND_BASE}/verify-session`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            alert("Your session has expired. Please login again.");
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            window.location.href = "../pages/login.html";
            return;
        }

        const data = await response.json();
        if (!data.success) {
            alert("Your session has expired. Please login again.");
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            window.location.href = "../pages/login.html";
            return;
        }
    } catch (err) {
        console.error("Session verification error:", err);
    }

    // تحميل المحتوى الموصى به
    await loadRecommendedContent();

    // Search functionality
    setupSearch();
});

// ==================== تحميل المحتوى الموصى به ====================
async function loadRecommendedContent() {
    const rawStudy = (currentUser && currentUser.study_field) ? currentUser.study_field : "computer science";
    const studyField = String(rawStudy).toLowerCase();

    const keywords = STUDY_FIELD_KEYWORDS[studyField] || [
        "tutorial", "course", "lecture", "learn", "education"
    ];
    
    const container = document.getElementById("recommended-playlists");
    if (!container) {
        console.warn("recommended-playlists container not found");
        return;
    }
    container.innerHTML = '<div class="loading">🔄 جاري تحميل المحتوى الموصى به...</div>';

    let totalVideosFound = 0;
    let sectionsCreated = 0;

    // جلب videos لكل keyword
    for (const keyword of keywords) {
        try {
            showMessage(`🔍 البحث عن: ${keyword}`, 'info');
            
            const result = await searchYouTube(keyword, 6);
            
            if (result.message) {
                showMessage(result.message, result.videos.length > 0 ? 'success' : 'warning');
            }
            
            if (result.videos.length > 0) {
                const section = createPlaylistSection(keyword, result.videos);
                if (container.querySelector('.loading')) {
                    container.innerHTML = '';
                }
                container.appendChild(section);
                totalVideosFound += result.videos.length;
                sectionsCreated++;
            }
        } catch (error) {
            console.error(`Error loading ${keyword}:`, error);
            showMessage(`⚠️ خطأ في البحث عن: ${keyword}`, 'error');
        }
    }

    if (sectionsCreated === 0) {
        container.innerHTML = '';
        showMessage(`❌ لم يتم العثور على محتوى لـ "${studyField}". جرب تغيير مجال الدراسة من الإعدادات.`, 'error');
    } else {
        showMessage(`✅ تم تحميل ${totalVideosFound} فيديو في ${sectionsCreated} قسم`, 'success');
    }
}

// ==================== البحث في YouTube ====================
async function searchYouTube(query, maxResults = 12) {
    try {
        const url = `${BACKEND_BASE}/youtube-search?q=${encodeURIComponent(query)}&max=${maxResults}`;
        console.log("🔍 Searching:", url);

        const response = await fetch(url);
        const data = await response.json();

        // عرض الرسالة من الـ Backend
        let message = data.display_message || '';
        
        if (!response.ok) {
            console.error("Backend Error:", data);
            return {
                videos: [],
                message: message || `⚠️ خطأ في البحث (${response.status})`
            };
        }

        if (data.error) {
            console.error("YouTube API Error:", data.error);
            return {
                videos: [],
                message: message || `⚠️ ${data.error}`
            };
        }

        const items = data.items || [];
        console.log(`✅ Found ${items.length} videos`);
        
        return {
            videos: items,
            message: message || `✅ وجدنا ${items.length} فيديو`
        };
        
    } catch (error) {
        console.error("Search error:", error);
        return {
            videos: [],
            message: `⚠️ خطأ في الاتصال: ${error.message}`
        };
    }
}

// ==================== إنشاء Playlist Section ====================
function createPlaylistSection(title, videos) {
    const section = document.createElement("section");
    section.className = "playlist-section";

    const titleEl = document.createElement("h2");
    titleEl.className = "playlist-title";
    titleEl.textContent = safeText(title).charAt(0).toUpperCase() + safeText(title).slice(1);

    const grid = document.createElement("div");
    grid.className = "video-grid";

    videos.forEach(video => {
        const card = createVideoCard(video);
        grid.appendChild(card);
    });

    section.appendChild(titleEl);
    section.appendChild(grid);
    return section;
}

// ==================== إنشاء Video Card ====================
function createVideoCard(video) {
    let videoId = "";
    if (typeof video.id === "string") {
        videoId = video.id;
    } else if (video.id && video.id.videoId) {
        videoId = video.id.videoId;
    } else if (video.snippet && video.snippet.resourceId && video.snippet.resourceId.videoId) {
        videoId = video.snippet.resourceId.videoId;
    }

    const snippet = video.snippet || {};
    const thumbnail = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || "";
    const title = safeText(snippet.title);
    const channel = safeText(snippet.channelTitle);

    const card = document.createElement("div");
    card.className = "video-card";

    card.innerHTML = `
        <img src="${thumbnail}" alt="${title}" class="video-thumbnail">
        <div class="video-info">
            <div class="video-title">${title}</div>
            <div class="video-channel">${channel}</div>
            <div class="video-actions">
                <button class="btn-watch"><i class="fas fa-play"></i> Watch</button>
                <button class="btn-save"><i class="fas fa-bookmark"></i> Save</button>
            </div>
        </div>
    `;

    const watchBtn = card.querySelector(".btn-watch");
    const saveBtn = card.querySelector(".btn-save");

    if (watchBtn) {
        watchBtn.addEventListener("click", () => {
            if (videoId) window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
            else alert("Video ID not available.");
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            saveVideo(videoId, title, thumbnail, channel);
        });
    }

    return card;
}

// ==================== Save Video ====================
function saveVideo(videoId, title, thumbnail, channel) {
    if (!videoId) {
        alert("Cannot save this video (no id).");
        return;
    }

    let savedVideos = JSON.parse(localStorage.getItem("savedVideos") || "[]");
    
    if (savedVideos.find(v => v.videoId === videoId)) {
        alert("Video already saved!");
        return;
    }

    savedVideos.push({
        videoId,
        title,
        thumbnail,
        channel,
        savedAt: new Date().toISOString()
    });

    try {
        localStorage.setItem("savedVideos", JSON.stringify(savedVideos));
        alert("Video saved successfully! ✓");
    } catch (e) {
        console.error("Failed to save to localStorage:", e);
        alert("Save failed (storage issue).");
    }
}

// ==================== Setup Search ====================
function setupSearch() {
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");
    const searchResults = document.getElementById("search-results");
    const searchVideos = document.getElementById("search-videos");

    if (!searchInput || !searchBtn) {
        console.warn("Search inputs missing from DOM.");
        return;
    }

    searchBtn.addEventListener("click", performSearch);
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") performSearch();
    });

    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            showMessage("⚠️ من فضلك اكتب كلمة للبحث", 'warning');
            return;
        }

        const prevText = searchBtn.innerHTML;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري البحث...';
        searchBtn.disabled = true;

        if (searchVideos) searchVideos.innerHTML = `<div class="loading">🔄 جاري البحث عن "${query}"...</div>`;

        try {
            const result = await searchYouTube(query, 12);
            
            if (searchVideos) searchVideos.innerHTML = "";
            
            if (result.message) {
                const msgDiv = document.createElement('div');
                msgDiv.style.cssText = `
                    padding: 15px;
                    margin: 10px 0;
                    background: #f0f0f0;
                    border-radius: 8px;
                    text-align: center;
                `;
                msgDiv.textContent = result.message;
                if (searchVideos) searchVideos.appendChild(msgDiv);
            }
            
            if (result.videos.length === 0) {
                if (searchVideos) {
                    searchVideos.innerHTML += `
                        <div class="no-results">
                            <p>❌ لم نجد نتائج لـ "${query}"</p>
                            <p>💡 جرب:</p>
                            <ul style="text-align: right; list-style: none;">
                                <li>• استخدم كلمات بحث أخرى</li>
                                <li>• أضف كلمة "tutorial" أو "course"</li>
                                <li>• تأكد من كتابة الكلمات بشكل صحيح</li>
                            </ul>
                        </div>
                    `;
                }
            } else {
                result.videos.forEach(video => {
                    const card = createVideoCard(video);
                    if (searchVideos) searchVideos.appendChild(card);
                });
            }

            if (searchResults) {
                searchResults.style.display = "block";
                try { searchResults.scrollIntoView({ behavior: "smooth" }); } catch (e) { }
            }
        } catch (error) {
            console.error("Search error:", error);
            if (searchVideos) {
                searchVideos.innerHTML = `
                    <div class="no-results">
                        <p>⚠️ حدث خطأ أثناء البحث</p>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        } finally {
            searchBtn.innerHTML = prevText;
            searchBtn.disabled = false;
        }
    }
}

// ==================== Logout Function ====================
const logoutBtn = document.getElementById("logout-btn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        const confirmLogout = confirm("Are you sure you want to log out?");
        if (!confirmLogout) return;

        const token = localStorage.getItem("authToken");

        try {
            await fetch(`${BACKEND_BASE}/logout`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
        } catch (err) {
            console.error("Logout error:", err);
        }

        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        alert("Logged out successfully!");
        window.location.href = "../index.html";
    });
}