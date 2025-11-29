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
    fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            user: userField.value.trim(),
            password: passwordField.value.trim()
        })
    })
    .then(res => {
        if (res.status === 401) return res.json(); // handle invalid login
        return res.json();
    })
    .then(data => {
        if (!data.success) {
            userError.textContent = data.msg || "Invalid email/username or password.";
            submitBtn.disabled = false;
            submitBtn.textContent = "Login";
        } else {
            alert("Welcome!");
            window.location.href = "home.html";
        }
    })
    .catch(err => {
        console.error("Error:", err);
        alert("Something went wrong. Please try again.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Login";
    });
});

// google log in
function handleCredentialResponse(response){
    const token= response.credential;
    fetch("http://127.0.0.1:5000/google-signin", {
    metho:"post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({token:token}),
    })
    .then(res=>res.json())
    .then(data=>{
        if(data.success){
            localStorage.setItem("google_token",token);
            window.location.href="/pages/home.html";
        } else{
            alert(data.msg);
        }
    });
}