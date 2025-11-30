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
    icon.classList.toggle("fa-eye");
    icon.classList.toggle("fa-eye-slash");
  });
}

// Toggle Other Field
function toggleOtherField() {
  const select = document.getElementById("sfield");
  const otherField = document.getElementById("OtherField");
  otherField.style.display = select.value === "Other" ? "block" : "none";
}
document.getElementById("OtherField").style.display = "none";

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
    .then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = body.msg || Server `error: ${res.status}`;
        if (msg.includes("Email")) emailError.textContent = msg;
        else if (msg.includes("Username")) uNameError.textContent = msg;
        else alert(msg);

        submitBtn.disabled = false;
        submitBtn.textContent = "Sign Up";
        throw new Error(msg);
      }
      return body;
    })
    .then((data) => {
      if (data.success) {
        alert("Account created! Redirecting...");
        form.reset();
        window.location.href = "home.html";
      }
    })
    .catch((err) => {
      console.error(err);
      if (!emailError.textContent && !uNameError.textContent && !passError.textContent) {
        alert("Something went wrong. Please try again.");
      }
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign Up";
    });
});

// Google Sign-In
function handleCredentialResponse(response) {
  console.log("Encoded JWT ID token: " + response.credential);
}
 