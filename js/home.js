// YouTube API Key - سيتم جلبه من الـ Backend
let YOUTUBE_API_KEY = "";

// Study Field Keywords للبحث
const STUDY_FIELD_KEYWORDS = {
    "Architecture": ["architecture tutorial", "architectural design", "building design"],
    "AI": ["artificial intelligence course", "machine learning tutorial", "deep learning"],
    "Biology": ["biology lecture", "molecular biology", "genetics tutorial"],
    "Business Administration": ["business management", "MBA course", "entrepreneurship"],
    "Chemistry": ["chemistry lecture", "organic chemistry", "chemistry tutorial"],
    "Computer science": ["computer science course", "programming tutorial", "data structures"],
    "Cyber security": ["cybersecurity tutorial", "ethical hacking", "network security"],
    "Data science": ["data science course", "python data analysis", "statistics tutorial"],
    "Education": ["teaching methods", "educational psychology", "pedagogy"],
    "Engineering": ["engineering tutorial", "mechanical engineering", "civil engineering"],
    "Graphic Design": ["graphic design tutorial", "adobe photoshop", "design principles"],
    "Law": ["law lecture", "legal studies", "constitutional law"],
    "Marketing": ["digital marketing", "marketing strategy", "social media marketing"],
    "Mathematics": ["mathematics course", "calculus tutorial", "algebra"],
    "Medicine": ["medical lecture", "anatomy tutorial", "physiology course"],
    "Pharmacy": ["pharmacy course", "pharmacology", "pharmaceutical sciences"],
    "Physics": ["physics lecture", "quantum physics", "physics tutorial"],
    "Psychology": ["psychology course", "cognitive psychology", "behavioral psychology"],
    "Statistic": ["statistics course", "statistical analysis", "probability theory"],
    "frontend": ["frontend development", "html css javascript", "react tutorial", "web design"],
    "backend": ["backend development", "node.js tutorial", "express js course", "databases mysql mongodb"]
};

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

    // جلب YouTube API Key من Backend
    try {
        const keyResponse = await fetch("https://edu-sync-back-end-production.up.railway.app/api/API-KEY");
        const keyData = await keyResponse.json();
        if (keyData.success) {
            YOUTUBE_API_KEY = keyData.key;
        } else {
            console.error("Failed to get YouTube API Key");
        }
    } catch (err) {
        console.error("Error fetching YouTube API Key:", err);
    }

    // عرض رسالة ترحيب
    const welcomeMsg = document.getElementById("welcome-message");
    const studyFieldMsg = document.getElementById("study-field-message");
    
    if (welcomeMsg && user.username) {
        welcomeMsg.textContent = `Welcome back, ${user.username}! `;
    }

    if (studyFieldMsg && user.study_field) {
        studyFieldMsg.textContent = `Let's explore ${user.study_field} together`;
    }

    // التحقق من صلاحية الـ session
    try {
        const response = await fetch("https://edu-sync-back-end-production.up.railway.app/verify-session", {
            headers: { "Authorization": `Bearer ${token}` }
        });
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
    const studyField = currentUser.study_field || "Computer science";
    const keywords = STUDY_FIELD_KEYWORDS[studyField] || ["tutorial", "course", "lecture"];
    
    const container = document.getElementById("recommended-playlists");
    container.innerHTML = "";

    // جلب videos لكل keyword
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

// ==================== البحث في YouTube ====================
async function searchYouTube(query, maxResults = 12) {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
            console.error("YouTube API Error:", data.error);
            return [];
        }

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
    titleEl.textContent = title.charAt(0).toUpperCase() + title.slice(1);

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
    const videoId = video.id.videoId;
    const snippet = video.snippet;
    
    const card = document.createElement("div");
    card.className = "video-card";

    const thumbnail = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url;
    
    card.innerHTML = `
        <img src="${thumbnail}" alt="${snippet.title}" class="video-thumbnail">
        <div class="video-info">
            <div class="video-title">${snippet.title}</div>
            <div class="video-channel">${snippet.channelTitle}</div>
            <div class="video-actions">
                <button class="btn-watch" onclick="watchVideo('${videoId}')">
                    <i class="fas fa-play"></i> Watch
                </button>
                <button class="btn-save" onclick="saveVideo('${videoId}', '${snippet.title.replace(/'/g, "\\'")}', '${thumbnail}', '${snippet.channelTitle}')">
                    <i class="fas fa-bookmark"></i> Save
                </button>
            </div>
        </div>
    `;

    return card;
}

// ==================== Watch Video ====================
function watchVideo(videoId) {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
}

// ==================== Save Video ====================
function saveVideo(videoId, title, thumbnail, channel) {
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

    localStorage.setItem("savedVideos", JSON.stringify(savedVideos));
    alert("Video saved successfully! ✓");
}

// ==================== Setup Search ====================
function setupSearch() {
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");
    const searchResults = document.getElementById("search-results");
    const searchVideos = document.getElementById("search-videos");

    searchBtn.addEventListener("click", performSearch);
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") performSearch();
    });

    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
        searchBtn.disabled = true;

        try {
            const videos = await searchYouTube(query, 12);
            
            searchVideos.innerHTML = "";
            
            if (videos.length === 0) {
                searchVideos.innerHTML = '<div class="no-results">No results found. Try different keywords.</div>';
            } else {
                videos.forEach(video => {
                    const card = createVideoCard(video);
                    searchVideos.appendChild(card);
                });
            }

            searchResults.style.display = "block";
            searchResults.scrollIntoView({ behavior: "smooth" });
        } catch (error) {
            console.error("Search error:", error);
            alert("Search failed. Please try again.");
        } finally {
            searchBtn.innerHTML = '<i class="fas fa-search"></i> Search';
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

        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        alert("Logged out successfully!");
        window.location.href = "../index.html";
    });
}