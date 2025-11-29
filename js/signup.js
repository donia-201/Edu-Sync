const form = document.getElementById("signup-form");
const user_Name = document.getElementById("uName");
const Name = document.getElementById("name");
const email = document.getElementById("email");
const password = document.getElementById("password");

const uNameError = document.getElementById("uName-error");
const emailError = document.getElementById("email-error");
const passError = document.getElementById("password-error");

function setupToggle(inputId, toggleId) {
  const input = document.getElementById(inputId);
  const toggle = document.getElementById(toggleId);

  if (!toggle) return;

  const icon = toggle.querySelector("i");

  toggle.addEventListener("click", () => {
    const type = input.type === "password" ? "text" : "password";
    input.type = type;

    if (type === "password") {
      icon.classList.remove("fa-eye-slash");
      icon.classList.add("fa-eye");
    } else {
      icon.classList.remove("fa-eye");
      icon.classList.add("fa-eye-slash");
    }
  });
}
//toggle  other field
function toggleOtherField(){
    const select =document.getElementById('sfield');
    const otherField=document.getElementById("OtherField");
    if(select.value=== 'Other'){
        otherField.style.display='block';
    }
}

// FIXED IDs
setupToggle("password", "togglePassword");
setupToggle("pass2", "togglePassword2");

// Regex
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\W]{8,}$/;

form.addEventListener("submit", function (e) {
  e.preventDefault();

  uNameError.textContent = "";
  emailError.textContent = "";
  passError.textContent = "";

  let valid = true;

  if (!user_Name.value.trim()) {
    uNameError.textContent = "Username is required.";
    valid = false;
  } else if (user_Name.value.trim().length < 3) {
    uNameError.textContent = "Username must be at least 3 characters.";
    valid = false;
  }

  if (!email.value.trim()) {
    emailError.textContent = "Email is required.";
    valid = false;
  } else if (!emailRegex.test(email.value.trim())) {
    emailError.textContent = "Enter a valid email.";
    valid = false;
  }

  if (!password.value.trim()) {
    passError.textContent = "Password is required.";
    valid = false;
  } else if (!passwordRegex.test(password.value.trim())) {
    passError.textContent =
      "Password must be 8+ chars and contain upper, lower, number, symbol.";
    valid = false;
  }

  if (!valid) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing up...";

  fetch("http://127.0.0.1:5000/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: user_Name.value.trim(),
      email: email.value.trim(),
      password: password.value.trim(),
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (!data.success) {
        if (data.msg.includes("Email")) emailError.textContent = data.msg;
        else if (data.msg.includes("Username")) uNameError.textContent = data.msg;

        submitBtn.disabled = false;
        submitBtn.textContent = "Sign Up";
      } else {
        alert("Account created! Redirecting...");
        form.reset();
        window.location.href = "home.html";
      }
    })
    .catch(() => {
      alert("Something went wrong. Please try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign Up";
    });
});

// sign up with google
function handleCredentialResponse(response) {
    console.log("Encoded JWT ID token: " + response.credential);
}