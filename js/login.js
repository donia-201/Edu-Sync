const form = document.getElementById("login-form");
const userField = document.getElementById("uNameOrEmail");
const passwordField = document.getElementById("pass");

const userError = document.getElementById("user-error");
const passError = document.getElementById("password-error");

form.addEventListener("submit", function (e) {
    e.preventDefault();

    // reset errors
    userError.textContent = "";
    passError.textContent = "";

    let valid = true;

    // Frontend validation
    if (!userField.value.trim()) {
        userError.textContent = "Enter email or username.";
        valid = false;
    }

    if (!passwordField.value.trim()) {
        passError.textContent = "Password required.";
        valid = false;
    }

    if (!valid) return;

    // Disable submit button to prevent double submission
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";

    // Send data to backend
    fetch("https://edu-sync-back-end-production.up.railway.app/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            user: userField.value.trim(),
            password: passwordField.value.trim()
        })
    })
    .then(async res => {
        const data = await res.json().catch(() => ({}));
        return { status: res.status, data };
    })
    .then(result => {

        if (result.status === 401) {
            userError.textContent = result.data.msg || "Invalid email/username or password.";
            submitBtn.disabled = false;
            submitBtn.textContent = "Login";
            return;
        }

        if (!result.data.success) {
            userError.textContent = result.data.msg || "Login failed.";
            submitBtn.disabled = false;
            submitBtn.textContent = "Login";
        } else {
            alert("Welcome!");
            window.location.href = "../pages/home.html";
        }
    })
    .catch(err => {
        console.error("Error:", err);
        alert("Something went wrong. Please try again.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Login";
    });
});


// GOOGLE LOGIN — NEW REDIRECT FLOW
function googleRedirectLogin() {
    window.location.href =
      "https://accounts.google.com/o/oauth2/v2/auth?" +
      new URLSearchParams({
        client_id: "YOUR_GOOGLE_CLIENT_ID_HERE",
        redirect_uri:
          "https://edu-sync-back-end-production.up.railway.app/google-callback",
        response_type: "code",
        scope: "email profile",
        access_type: "online"
      });
}
