const form = document.getElementById("signup-form");
const user_Name = document.getElementById("uName");
const Name=document.getElementById("name");
const email = document.getElementById("email");
const password = document.getElementById("password");

const uNameError = document.getElementById("uName-error");
const emailError = document.getElementById("email-error");
const passError = document.getElementById("password-error");
function toggleOtherField(){
    const select = document.getElementById('sfield');
    const otherField=document.getElementById("OtherField");
    if(select.value==="Other"){
        otherField.style.display="block";
    } else{
                otherField.style.display="none";

    }
}
// Regex للتحقق من البريد والباسوورد
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Reset errors
    uNameError.textContent = "";
    emailError.textContent = "";
    passError.textContent = "";

    let valid = true;

    // ✅ Frontend validation
    if (!user_Name .value.trim()) {
        uNameError.textContent = "Username is required.";
        valid = false;
    } else if (user_Name .value.trim().length < 3) {
        uNameError.textContent = "Username must be at least 3 characters.";
        valid = false;
    }

    if (!email.value.trim()) {
        emailError.textContent = "Email is required.";
        valid = false;
    } else if (!emailRegex.test(email.value.trim())) {
        emailError.textContent = "Please enter a valid email format.";
        valid = false;
    }

    if (!password.value.trim()) {
        passError.textContent = "Password is required.";
        valid = false;
    } else if (!passwordRegex.test(password.value.trim())) {
        passError.textContent = "Password must be at least 8 characters, contain uppercase, lowercase, number, and symbol.";
        valid = false;
    }

    if (!valid) return;

    // Disable submit button to prevent double submission
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing up...";

    // Send data to backend
    fetch("http://127.0.0.1:5000/signup", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            username: user_Name .value.trim(),
            email: email.value.trim(),
            password: pass.value.trim()
        })
    })
    .then(res => {
        if (!res.ok){
            throw new Error(`Server error :${res.status}`);
        }
    })
    .then(data => {
        console.log("Response data : " ,data);
        if (!data.success) {
            // Show backend errors on specific fields
            if (data.msg.includes("Email")) emailError.textContent = data.msg;
            else if (data.msg.includes("Username")) uNameError.textContent = data.msg;
            else if (data.msg.includes("All fields")) {
                if (!user_Name .value.trim()) uNameError.textContent = data.msg;
                if (!email.value.trim()) emailError.textContent = data.msg;
                if (!password.value.trim()) passError.textContent = data.msg;
            }
            submitBtn.disabled = false;
            submitBtn.textContent = "Sign Up";
        } else {
            alert("Account created! Redirecting...");
            
            // ✅ مسح البيانات من الحقول بعد النجاح
            user_Name .value = "";
            Name.value = "";
            email.value = "";
            password.value = "";

            window.location.href = "home.html";
        }
    })
    .catch(err => {
        alert("Something went wrong. Please try again.");
        submitBtn.disabled = false;
        user_Name .value = "";
        Name.value = "";
        email.value = "";
        password.value = "";
        submitBtn.textContent = "Sign Up";
    });
});