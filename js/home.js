// ==================== إعدادات عامة ====================
let currentUser = null;

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

    // رسائل ترحيب
    const welcomeMsg = document.getElementById("welcome-message");
    const studyFieldMsg = document.getElementById("study-field-message");

    if (welcomeMsg && user.username) {
        welcomeMsg.textContent = `Welcome back, ${user.username}! 🎉`;
    }

    if (studyFieldMsg && user.study_field) {
        studyFieldMsg.textContent = `Let's explore ${user.study_field} together`;
    }

    // التحقق من صلاحية الـ session
    try {
        const response = await fetch("https://edu-sync-back-end-production.up.railway.app/verify-session", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error("Session invalid");
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error("Session expired");
        }
    } catch (err) {
        console.error("Session verification error:", err);
        alert("Your session has expired. Please login again.");
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        window.location.href = "../pages/login.html";
        return;
    }

    // تحميل المحتوى
    await loadRecommendedContent();

    // الإعداد للبحث
    setupSearch();
});

// ==================== البحث في YouTube عبر الـ Backend ====================
async function searchYouTube(query, maxResults = 12) {
    try {
        console.log("Searching backend for:", query);

        const url = `https://edu-sync-back-end-production.up.railway.app/youtube-search?q=${encodeURIComponent(query)}&max=${maxResults}`;

        const response = await fetch(url);

        if (!response.ok) {
            console.error("Backend HTTP Error:", response.status);
            return [];
        }

        const data = await response.json();
        console.log("Backend YouTube response:", data);

        return data.items || [];
    } catch (error) {
        console.error("Search error:", error);
        return [];
    }
}

// ==================== Study Field Keywords ====================
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

// ==================== تحميل المحتوى الموصى به ====================
async function loadRecommendedContent() {
    const studyField = (currentUser.study_field || "computer science").toLowerCase();
    const keywords = STUDY_FIELD_KEYWORDS[studyField] || ["tutorial", "course", "lecture"];

    const container = document.getElementById("recommended-playlists");
    if (!container) return;

    container.innerHTML = "";

    for (let keyword of keywords) {
        const videos = await searchYouTube(keyword, 6);

        if (videos.length > 0) {
            container.appendChild(createPlaylistSection(keyword, videos));
        }
    }

    if (container.children.length === 0) {
        container.innerHTML = `<div class="no-results">No recommended content found.</div>`;
    }
}

// ==================== إنشاء Playlist Section ====================
function createPlaylistSection(title, videos) {
    const section = document.createElement("section");
    section.className = "playlist-section";

    const titleEl = document.createElement("h2");
    titleEl.className = "playlist-title";
    titleEl.textContent = title;

    const grid = document.createElement("div");
    grid.className = "video-grid";

    videos.forEach(video => {
        grid.appendChild(createVideoCard(video));
    });

    section.appendChild(titleEl);
    section.appendChild(grid);

    return section;
}

// ==================== إنشاء Video Card ====================
function createVideoCard(video) {
    const videoId = video.id;
    const snippet = video.snippet;
    const thumbnail = snippet.thumbnails?.high?.url;

    const card = document.createElement("div");
    card.className = "video-card";

    card.innerHTML = `
        <img src="${thumbnail}" class="video-thumbnail">
        <div class="video-info">
            <div class="video-title">${snippet.title}</div>
            <div class="video-channel">${snippet.channelTitle}</div>
            <div class="video-actions">
                <button class="btn-watch">Watch</button>
                <button class="btn-save">Save</button>
            </div>
        </div>
    `;

    // watch
    card.querySelector(".btn-watch").addEventListener("click", () => {
        window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank");
    });

    // save
    card.querySelector(".btn-save").addEventListener("click", () => {
        saveVideo(videoId, snippet.title, thumbnail, snippet.channelTitle);
    });

    return card;
}

// ==================== Save Video ====================
function saveVideo(videoId, title, thumbnail, channel) {
    let savedVideos = JSON.parse(localStorage.getItem("savedVideos") || "[]");

    if (savedVideos.some(v => v.videoId === videoId)) {
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

    localStorage.setItem("savedVideos", JSON.stringify(savedVideos));

    alert("Video saved successfully!");
}

// ==================== Search Setup ====================
function setupSearch() {
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");
    const searchResults = document.getElementById("search-results");
    const searchVideos = document.getElementById("search-videos");

    if (!searchInput || !searchBtn) return;

    searchBtn.addEventListener("click", doSearch);
    searchInput.addEventListener("keypress", e => {
        if (e.key === "Enter") doSearch();
    });

    async function doSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        searchVideos.innerHTML = `<div class="loading">Searching...</div>`;
        searchResults.style.display = "block";

        const videos = await searchYouTube(query, 12);

        searchVideos.innerHTML = "";

        if (videos.length === 0) {
            searchVideos.innerHTML = `<div class="no-results">No results found</div>`;
            return;
        }

        videos.forEach(v => {
            searchVideos.appendChild(createVideoCard(v));
        });
    }
}

// ==================== Logout ====================
const logoutBtn = document.getElementById("logout-btn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", async e => {
        e.preventDefault();

        const confirmLogout = confirm("Are you sure you want to log out?");
        if (!confirmLogout) return;

        const token = localStorage.getItem("authToken");

        try {
            await fetch("https://edu-sync-back-end-production.up.railway.app/logout", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
        } catch (err) {
            console.error("Logout error:", err);
        }

        localStorage.clear();
        alert("Logged out successfully!");
        window.location.href = "../index.html";
    });
}
