const BACKEND_BASE = "https://edu-sync-back-end-production.up.railway.app";

const STUDY_FIELD_KEYWORDS = {
    "architecture": ["architecture tutorial", "architectural design", "building design", "urban planning", "interior design"],
    "ai": ["artificial intelligence", "machine learning", "deep learning", "neural networks", "AI tutorial"],
    "biology": ["biology lecture", "molecular biology", "genetics", "cell biology", "microbiology"],
    "business administration": ["business management", "MBA", "entrepreneurship", "leadership", "business strategy"],
    "chemistry": ["chemistry lecture", "organic chemistry", "inorganic chemistry", "chemical reactions"],
    "computer science": ["python tutorial", "programming tutorial", "data structures", "algorithms", "coding course"],
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

function safeText(s) {
    return (s === undefined || s === null) ? "" : String(s);
}

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
        border: 1px solid ${colors[type]}40;
        border-left: 4px solid ${colors[type]};
        padding: 15px 20px;
        margin: 15px 0;
        border-radius: 8px;
        font-size: 15px;
        color: #333;
        font-family: Arial, sans-serif;
    `;
    messageDiv.innerHTML = `${icons[type]} ${message}`;
    
    if (container.firstChild) {
        container.insertBefore(messageDiv, container.firstChild);
    } else {
        container.appendChild(messageDiv);
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Page loaded, starting...");
    
    const token = localStorage.getItem("authToken");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!token) {
        alert("Please login first!");
        window.location.href = "../pages/login.html";
        return;
    }

    currentUser = user;
    console.log(" Current user:", currentUser);

    const welcomeMsg = document.getElementById("welcome-message");
    const studyFieldMsg = document.getElementById("study-field-message");
    
    if (welcomeMsg && user.username) {
        welcomeMsg.textContent = `Welcome back, ${user.username}!`;
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

    console.log("📚 Loading recommended content...");
    await loadRecommendedContent();

    setupSearch();
});

async function loadRecommendedContent() {
    const container = document.getElementById("recommended-playlists");
    if (!container) {
        console.error(" Container not found!");
        return;
    }

    const rawStudy = (currentUser && currentUser.study_field) ? currentUser.study_field : "computer science";
    const studyField = String(rawStudy).toLowerCase().trim();
    
    console.log(" Study field:", studyField);

    const keywords = STUDY_FIELD_KEYWORDS[studyField] || ["tutorial", "course", "programming"];
    console.log("🔑 Keywords:", keywords);
    
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading recommended content...</div>';

    let totalVideos = 0;
    let sectionsCreated = 0;

    for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i];
        console.log(` [${i+1}/${keywords.length}] Searching: "${keyword}"`);
        
        try {
            showMessage(` Searching for: ${keyword}`, 'info');
            
            const result = await searchYouTube(keyword, 6);
            console.log(` Found ${result.videos.length} videos for "${keyword}"`);
            
            if (result.message) {
                showMessage(result.message, result.videos.length > 0 ? 'success' : 'warning');
            }
            
            if (result.videos.length > 0) {
                if (sectionsCreated === 0) {
                    container.innerHTML = '';
                }
                
                const section = createPlaylistSection(keyword, result.videos);
                container.appendChild(section);
                
                totalVideos += result.videos.length;
                sectionsCreated++;
            }
        } catch (error) {
            console.error(` Error loading "${keyword}":`, error);
            showMessage(` Error searching for: ${keyword}`, 'error');
        }
    }

    console.log(`📊 Total: ${totalVideos} videos in ${sectionsCreated} sections`);

    if (sectionsCreated === 0) {
        container.innerHTML = `
            <div class="no-results">
                <h2> No Content Found</h2>
                <p>We couldn't find educational videos for "${studyField}"</p>
                <p> Try changing your study field in settings or use manual search</p>
            </div>
        `;
    } else {
        showMessage(` Successfully loaded ${totalVideos} videos in ${sectionsCreated} sections!`, 'success');
    }
}

async function searchYouTube(query, maxResults = 12) {
    try {
        const url = `${BACKEND_BASE}/youtube-search?q=${encodeURIComponent(query)}&max=${maxResults}`;
        console.log(" Fetching:", url);

        const response = await fetch(url);
        const data = await response.json();

        console.log(" Response:", {
            status: response.status,
            ok: response.ok,
            itemsCount: data.items ? data.items.length : 0,
            message: data.display_message
        });

        let message = data.display_message || '';
        
        if (!response.ok) {
            console.error(" Backend Error:", data);
            return {
                videos: [],
                message: message || ` Search error (${response.status})`
            };
        }

        if (data.error) {
            console.error(" API Error:", data.error);
            return {
                videos: [],
                message: message || ` ${data.error}`
            };
        }

        const items = data.items || [];
        console.log(` Found ${items.length} videos`);
        
        return {
            videos: items,
            message: message || ` Found ${items.length} videos`
        };
        
    } catch (error) {
        console.error(" Search error:", error);
        return {
            videos: [],
            message: ` Connection error: ${error.message}`
        };
    }
}

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
    
    console.log(` Created section "${title}" with ${videos.length} videos`);
    
    return section;
}

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
            if (videoId) {
                window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
            } else {
                alert("Video ID not available.");
            }
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            saveVideo(videoId, title, thumbnail, channel);
        });
    }

    return card;
}

function saveVideo(videoId, title, thumbnail, channel) {
    if (!videoId) {
        alert("Cannot save this video (no id).");
        return;
    }

    let savedVideos = JSON.parse(localStorage.getItem("savedVideos") || "[]");
    
    if (savedVideos.find(v => v.videoId === videoId)) {
        alert("Video already saved! ⭐");
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
        alert(" Video saved successfully!");
    } catch (e) {
        console.error("Failed to save:", e);
        alert(" Save failed (storage issue).");
    }
}

function setupSearch() {
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");
    const searchResults = document.getElementById("search-results");
    const searchVideos = document.getElementById("search-videos");

    if (!searchInput || !searchBtn) {
        console.warn(" Search inputs not found");
        return;
    }

    searchBtn.addEventListener("click", performSearch);
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") performSearch();
    });

    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            alert(" Please write a word to search");
            return;
        }

        const prevText = searchBtn.innerHTML;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
        searchBtn.disabled = true;

        if (searchVideos) {
            searchVideos.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i> Searching for "${query}"...
                </div>
            `;
        }

        try {
            console.log(` Searching for: "${query}"`);
            const result = await searchYouTube(query, 12);
            
            if (searchVideos) searchVideos.innerHTML = "";
            
            if (result.message) {
                const msgDiv = document.createElement('div');
                msgDiv.style.cssText = `
                    padding: 15px;
                    margin: 10px 0;
                    background: #e8f5e9;
                    border-left: 4px solid #72c5f5ff;
                    border-radius: 8px;
                    color: #2dafcfff;
                    font-weight: 600;
                `;
                msgDiv.textContent = result.message;
                if (searchVideos) searchVideos.appendChild(msgDiv);
            }
            
            if (result.videos.length === 0) {
                if (searchVideos) {
                    searchVideos.innerHTML += `
                        <div class="no-results">
                            <h3> No Results Found</h3>
                            <p>We couldn't find any content for "${query}"</p>
                            <p> Try:</p>
                            <ul style="text-align: left; list-style: none; padding: 0;">
                                <li>• Use different search words</li>
                                <li>• Add "tutorial" or "course"</li>
                                <li>• Make sure words are spelled correctly</li>
                            </ul>
                        </div>
                    `;
                }
            } else {
                console.log(` Found ${result.videos.length} videos`);
                
                result.videos.forEach(video => {
                    const card = createVideoCard(video);
                    if (searchVideos) searchVideos.appendChild(card);
                });
            }

            if (searchResults) {
                searchResults.style.display = "block";
                try { searchResults.scrollIntoView({ behavior: "smooth" }); } catch (e) {}
            }
        } catch (error) {
            console.error(" Search error:", error);
            if (searchVideos) {
                searchVideos.innerHTML = `
                    <div class="no-results">
                        <h3> Error occurred while searching</h3>
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

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        
        if (!confirm("Are you sure you want to log out?")) return;

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

