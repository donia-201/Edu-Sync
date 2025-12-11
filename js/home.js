// home.js (frontend) — improved version (preserves existing UI & logic)
const BACKEND_BASE = "https://edu-sync-back-end-production.up.railway.app"; 

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

// ====== Educational filtering configuration ======
const ALLOWED_SEARCH_TERMS = ["tutorial", "course", "learn", "learning", "lecture", "how to", "guide", "lesson", "introduction", "explain", "explanation"];
const ALLOWED_TITLE_KEYWORDS = ["tutorial", "course", "lecture", "learn", "how to", "guide", "introduction", "lesson", "explain", "basics", "fundamentals"];
const BLOCKED_KEYWORDS = ["game", "gaming", "gameplay", "walkthrough", "let's play", "trailer", "music video", "mv", "concert", "live", "fm", "stream", "sports"];
const EDUCATION_CATEGORY_ID = "27"; // YouTube category id for Education (string or number depending on API return)

// map to store nextPageToken per query for infinite loading (if backend returns it)
const nextPageTokens = {};
const loadingStates = {}; // keep per-query loading flag for search infinite loading

function safeText(s) {
    return (s === undefined || s === null) ? "" : String(s);
}

window.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("authToken");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!token) {
        alert("Please login first!");
        window.location.href = "../pages/login.html";
        return;
    }

    currentUser = user;

    const welcomeMsg = document.getElementById("welcome-message");
    const studyFieldMsg = document.getElementById("study-field-message");
    
    if (welcomeMsg && user.username) {
        welcomeMsg.textContent = `Welcome back, ${user.username}! `;
    }

    if (studyFieldMsg && user.study_field) {
        studyFieldMsg.textContent = `Let's study ${user.study_field} together`;
    }

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

    await loadRecommendedContent();

    setupSearch();
});

// ---------------------- helper: determine if a video is educational ----------------------
function isEducationalVideo(video) {
    // video may contain snippet with title/description/channelTitle and possibly categoryId
    const snippet = video.snippet || {};
    const title = safeText(snippet.title).toLowerCase();
    const description = safeText(snippet.description).toLowerCase();
    const channel = safeText(snippet.channelTitle).toLowerCase();

    // 1) If categoryId is provided and equals education id -> accept
    const catId = snippet.categoryId || (snippet.category_id || null);
    if (catId) {
        if (String(catId) === String(EDUCATION_CATEGORY_ID)) {
            return true;
        }
    }

    // 2) If title/description/channel contain blocked keywords -> reject
    for (const b of BLOCKED_KEYWORDS) {
        if ((title && title.includes(b)) || (description && description.includes(b)) || (channel && channel.includes(b))) {
            return false;
        }
    }

    // 3) If title/description contain allowed educational keywords -> accept
    for (const k of ALLOWED_TITLE_KEYWORDS) {
        if ((title && title.includes(k)) || (description && description.includes(k))) {
            return true;
        }
    }

    // 4) Fallback: look for common educational patterns (e.g., "how to", "course", "lecture")
    for (const t of ALLOWED_SEARCH_TERMS) {
        if ((title && title.includes(t)) || (description && description.includes(t))) {
            return true;
        }
    }

    // 5) Default: not confidently educational -> reject
    return false;
}

// ---------------------- helper: determine if user's search query is "educational" ----------------------
function isSearchTermEducational(query) {
    const q = safeText(query).toLowerCase();

    if (!q) return false;

    // If the query explicitly contains one of the allowed terms or any study-field keyword -> accept
    for (const t of ALLOWED_SEARCH_TERMS) {
        if (q.includes(t)) return true;
    }

    // check against study fields keywords (allow searching by field name alone like "physics" or "data science")
    for (const field of Object.keys(STUDY_FIELD_KEYWORDS)) {
        if (q.includes(field)) return true;
        // also check the field's specific keywords
        const kws = STUDY_FIELD_KEYWORDS[field] || [];
        for (const kw of kws) {
            if (q.includes(kw)) return true;
        }
    }

    // If user typed a suspicious term (blocked) -> reject
    for (const b of BLOCKED_KEYWORDS) {
        if (q.includes(b)) return false;
    }

    // Not obviously educational -> reject (to enforce your rule: no non-educational results)
    return false;
}

// ---------------------- YouTube search wrapper (optionally supports pageToken) ----------------------
async function searchYouTube(query, maxResults = 12, pageToken = "") {
    try {
        // append pageToken only if provided
        const pageTokenParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
        const url = `${BACKEND_BASE}/youtube-search?q=${encodeURIComponent(query)}&max=${maxResults}${pageTokenParam}`;
        console.log("🔍 Searching via backend:", url);

        const response = await fetch(url);
        
        if (!response.ok) {
            let errorDetails;
            try {
                errorDetails = await response.json();
                console.error(" Backend Error:", errorDetails);
                
                if (response.status === 403) {
                    console.error("YouTube API quota exceeded or invalid key");
                } else if (response.status === 500) {
                    console.error("API key not configured on server");
                }
            } catch (e) {
                errorDetails = { 
                    status: response.status, 
                    text: await response.text() 
                };
                console.error(" HTTP Error:", errorDetails);
            }
            return [];
        }

        const data = await response.json();

        if (data.error) {
            console.error(" YouTube API Error:", data.error);
            if (data.hint) console.log("💡 Hint:", data.hint);
            return [];
        }

        // store nextPageToken if backend returned it (for infinite scroll)
        if (data.nextPageToken) {
            nextPageTokens[query] = data.nextPageToken;
        } else {
            // if no token returned, remove existing token
            delete nextPageTokens[query];
        }

        const items = data.items || [];
        console.log(`✅ Found ${items.length} videos for "${query}"`);
        return items;
        
    } catch (error) {
        console.error("💥 Search error:", error);
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

    // Use DocumentFragment to minimize reflows
    const frag = document.createDocumentFragment();
    videos.forEach(video => {
        const card = createVideoCard(video);
        frag.appendChild(card);
    });
    grid.appendChild(frag);

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
    } else if (video.id && video.id.playlistId) {
        // skip playlists for now; keep compatibility
        videoId = "";
    }

    const snippet = video.snippet || {};
    const thumbnail = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || "";
    const title = safeText(snippet.title);
    const channel = safeText(snippet.channelTitle);

    const card = document.createElement("div");
    card.className = "video-card";

    // Use loading="lazy" to avoid loading all thumbnails immediately
    card.innerHTML = `
        <img data-src="${thumbnail}" src="${thumbnail}" alt="${title}" class="video-thumbnail" loading="lazy">
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

    // sentinel element for infinite loading in search results
    let sentinel = null;
    let sentinelObserver = null;

    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        // enforce educational-only searches
        if (!isSearchTermEducational(query)) {
            if (searchVideos) searchVideos.innerHTML = `<div class="no-results">Only educational topics are allowed. Try adding "tutorial", "course", or "how to" to your query.</div>`;
            return;
        }

        const prevText = searchBtn.innerHTML;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
        searchBtn.disabled = true;

        if (searchVideos) searchVideos.innerHTML = `<div class="loading">Searching...</div>`;

        try {
            // reset any stored token for this query
            delete nextPageTokens[query];
            loadingStates[query] = false;

            const videos = await searchYouTube(query, 12, "");

            // filter to educational only
            const filtered = videos.filter(isEducationalVideo);

            if (searchVideos) searchVideos.innerHTML = "";

            if (!filtered || filtered.length === 0) {
                if (searchVideos) searchVideos.innerHTML = '<div class="no-results">No educational results found. Try a different query.</div>';
            } else {
                // append using fragment
                const frag = document.createDocumentFragment();
                filtered.forEach(video => {
                    const card = createVideoCard(video);
                    frag.appendChild(card);
                });
                if (searchVideos) searchVideos.appendChild(frag);
            }

            // show results area
            if (searchResults && typeof searchResults.style !== "undefined") {
                searchResults.style.display = "block";
                try { searchResults.scrollIntoView({ behavior: "smooth" }); } catch (e) { /* ignore */ }
            }


            if (sentinelObserver) {
                sentinelObserver.disconnect();
                sentinelObserver = null;
            }
            if (sentinel && sentinel.parentNode) sentinel.parentNode.removeChild(sentinel);

            // create sentinel only if there is a nextPageToken for this query
            if (nextPageTokens[query]) {
                sentinel = document.createElement("div");
                sentinel.className = "search-sentinel";
                sentinel.style.padding = "20px";
                sentinel.textContent = "Loading more...";
                if (searchVideos) searchVideos.appendChild(sentinel);

                sentinelObserver = new IntersectionObserver(async (entries) => {
                    for (const entry of entries) {
                        if (entry.isIntersecting) {
                            // prevent concurrent loads
                            if (loadingStates[query]) return;
                            loadingStates[query] = true;

                            const token = nextPageTokens[query];
                            const moreVideos = await searchYouTube(query, 12, token);
                            // filter educational videos
                            const moreFiltered = moreVideos.filter(isEducationalVideo);
                            if (moreFiltered.length > 0 && searchVideos) {
                                const fragMore = document.createDocumentFragment();
                                moreFiltered.forEach(v => fragMore.appendChild(createVideoCard(v)));
                                searchVideos.insertBefore(fragMore, sentinel); // insert before sentinel
                            }

                            // stop observing if no more tokens
                            if (!nextPageTokens[query]) {
                                if (sentinelObserver) { sentinelObserver.disconnect(); sentinelObserver = null; }
                                if (sentinel && sentinel.parentNode) sentinel.parentNode.removeChild(sentinel);
                            }
                            loadingStates[query] = false;
                        }
                    }
                }, { rootMargin: "300px" });

                sentinelObserver.observe(sentinel);
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

// ==================== loadRecommendedContent with educational filtering and batching ====================
async function loadRecommendedContent() {
    const rawStudy = (currentUser && currentUser.study_field) ? currentUser.study_field : "computer science";
    const studyField = String(rawStudy).toLowerCase();

    const keywords = STUDY_FIELD_KEYWORDS[studyField] || ["tutorial", "course", "lecture"];
    
    const container = document.getElementById("recommended-playlists");
    if (!container) {
        console.warn("recommended-playlists  not found");
        return;
    }
    container.innerHTML = "";

    // We'll fetch each keyword but only show educational videos
    for (const keyword of keywords) {
        try {
            const videos = await searchYouTube(keyword, 6);
            if (!videos || videos.length === 0) continue;

            const filtered = videos.filter(isEducationalVideo);
            if (filtered.length > 0) {
                const section = createPlaylistSection(keyword, filtered);
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
