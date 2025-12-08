window.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("authToken");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!token) {
        alert("Please login first!");
        window.location.href = "../pages/login.html";
        return;
    }

    const welcomeMsg = document.getElementById("welcome-message");
    if (welcomeMsg && user.username) {
        welcomeMsg.textContent = `Welcome back, ${user.username}! 🎉`;
    }

    fetch("https://edu-sync-back-end-production.up.railway.app/verify-session", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                alert("Your session has expired. Please login again.");
                localStorage.removeItem("authToken");
                localStorage.removeItem("user");
                window.location.href = "../pages/login.html";
            }
        })
        .catch(err => {
            console.error("Session verification error:", err);
        });
});

const logoutBtn = document.getElementById("logout-btn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();

        const confirmLogout = confirm("Are you sure you want to log out?");
        if (!confirmLogout) return;

        const token = localStorage.getItem("authToken");

        fetch("https://edu-sync-back-end-production.up.railway.app/logout", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        })
            .then(res => res.json())
            .then(data => {
                localStorage.removeItem("authToken");
                localStorage.removeItem("user");

                alert("Logged out successfully!");
                window.location.href = "../index.html";
            })
            .catch(err => {
                console.error("Logout error:", err);
                localStorage.removeItem("authToken");
                localStorage.removeItem("user");
                window.location.href = "../index.html";
            });
    });
}