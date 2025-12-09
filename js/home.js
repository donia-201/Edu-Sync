// home.js (frontend)
// ==================== إعدادات عامة ====================
const BACKEND_BASE = "https://edu-sync-back-end-production.up.railway.app"; // keep as is
// Study Field Keywords (original labels kept but lookup normalized)
const STUDY_FIELD_KEYWORDS = {
    "architecture": ["architecture tutorial", "architectural design", "building design"],
    "ai": ["artificial intelligence course", "machine learning tutorial", "deep learning"],
    "biology": ["biology lecture", "molecular biology", "genetics tutorial"],
    "business administration": ["business management", "MBA course", "entrepreneurship"],
    "chemistry": ["chemistry lecture", "organic chemistry", "chemistry tutorial"],
    "computer science": ["computer science course", "programming tutorial", "data structures"],
    "cyber security": ["cybersecurity tutorial", "ethical hacking", "network security"],
    "data science": ["data science course", "python data analysis", "statistics tutorial"],
    "education": ["teaching methods", "educational psychology", "pedagogy"],
    "engineering": ["engineering tutorial", "mechanical engineering", "civil engineering"],
    "graphic design": ["graphic design tutorial", "adobe photoshop", "design principles"],
    "law": ["law lecture", "legal studies", "constitutional law"],
    "marketing": ["digital marketing", "marketing strategy", "social media marketing"],
    "mathematics": ["mathematics course", "calculus tutorial", "algebra"],
    "medicine": ["medical lecture", "anatomy tutorial", "physiology course"],
    "pharmacy": ["pharmacy course", "pharmacology", "pharmaceutical sciences"],
    "physics": ["physics lecture", "quantum physics", "physics tutorial"],
    "psychology": ["psychology course", "cognitive psychology", "behavioral psychology"],
    "statistics": ["statistics course", "statistical analysis", "probability theory"],
    "frontend": ["frontend development", "html css javascript", "react tutorial", "web design"],
    "backend": ["backend development", "node.js tutorial", "express js course", "databases mysql mongodb"]
};

let currentUser = null;

// helper: safe text
function safeText(s) {
    return (s === undefined || s === null) ? "" : String(s);
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
            // invalid session -> logout
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
        // let user continue but they may get 401s later
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

    // normalize mapping: keys are already lowercase in STUDY_FIELD_KEYWORDS
    const keywords = STUDY_FIELD_KEYWORDS[studyField] || ["tutorial", "course", "lecture"];
    
    const container = document.getElementById("recommended-playlists");
    if (!container) {
        console.warn("recommended-playlists container not found");
        return;
    }
    container.innerHTML = "";

    // جلب videos لكل keyword عبر الباك اند proxy
    for (const keyword of keywords) {
        try {
            const videos = await searchYouTube(keyword, 6);
            if (videos.length > 0) {
                const section = createPlaylistSection(keyword, videos);
                container.appendChild(section);
            }
        } catch (error) {
            console.error(`Error loading ${keyword}:`, error);
        }
    }

    if (container.children.length === 0) {
        container.innerHTML = '<div class="no-results">No recommended content found.</div>';
    }
}

// ==================== البحث في YouTube عبر الـ Backend proxy ====================
async function searchYouTube(query, maxResults = 12) {
    try {
        const url = `${BACKEND_BASE}/youtube-search?q=${encodeURIComponent(query)}&max=${maxResults}`;
        console.log("Searching via backend:", url);

        const response = await fetch(url);
        if (!response.ok) {
            // try to parse error details
            let err;
            try {
                err = await response.json();
            } catch (e) {
                err = { status: response.status, text: await response.text() };
            }
            console.error("Backend HTTP Error:", err);
            return [];
        }

        const data = await response.json();

        if (data.error) {
            console.error("YouTube API Error:", data.error);
            return [];
        }

        // data.items expected
        return data.items || [];
    } catch (error) {
        console.error("Search error:", error);
        return [];
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

// ==================== إنشاء Video Card (بدون inline onclick) ====================
function createVideoCard(video) {
    // video.id can be object {videoId: ...} or string id depending on response
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

// ==================== Watch Video (kept for compatibility) ====================
function watchVideo(videoId) {
    if (videoId) window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
}

// ==================== Save Video ====================
function saveVideo(videoId, title, thumbnail, channel) {
    if (!videoId) {
        alert("Cannot save this video (no id).");
        return;
    }

    let savedVideos = JSON.parse(localStorage.getItem("savedVideos") || "[]");
    
    // Check if already saved
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
        if (!query) return;

        const prevText = searchBtn.innerHTML;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
        searchBtn.disabled = true;

        if (searchVideos) searchVideos.innerHTML = `<div class="loading">Searching...</div>`;

        try {
            const videos = await searchYouTube(query, 12);
            
            if (searchVideos) searchVideos.innerHTML = "";
            
            if (!videos || videos.length === 0) {
                if (searchVideos) searchVideos.innerHTML = '<div class="no-results">No results found. Try different keywords.</div>';
            } else {
                videos.forEach(video => {
                    const card = createVideoCard(video);
                    if (searchVideos) searchVideos.appendChild(card);
                });
            }

            if (searchResults && typeof searchResults.style !== "undefined") {
                searchResults.style.display = "block";
                try { searchResults.scrollIntoView({ behavior: "smooth" }); } catch (e) { /* ignore */ }
            }
        } catch (error) {
            console.error("Search error:", error);
            alert("Search failed. Please try again.");
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
