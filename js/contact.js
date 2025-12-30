function handleSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const subject = document.getElementById("subject").value;
    const message = document.getElementById("message").value;
    
    const API_BASE_URL = 'https://edu-sync-back-end-production.up.railway.app';
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    fetch(`${API_BASE_URL}/api/send-email`, {  // ✅ Fixed: added parentheses
        method: "POST",
        headers: { 
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, subject, message })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        if (data.success) {
            document.getElementById("successMessage").style.display = "block";
            setTimeout(() => {
                document.getElementById("successMessage").style.display = "none";
            }, 4000);
            document.querySelector("form").reset();
        } else {
            alert("Failed to send message: " + data.msg);
        }
    })
    .catch(err => {
        console.error("Error details:", err);
        alert("Server error. Please try again later.\nError: " + err.message);
    })
    .finally(() => {
        // Restore button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    });
}

function toggleFAQ(element) {
    // Close all other FAQs
    document.querySelectorAll('.faq-item').forEach(item => {
        if (item !== element) {
            item.classList.remove('active');
            item.querySelector('.faq-question span').textContent = '▼';
        }
    });
    
    // Toggle current FAQ
    element.classList.toggle('active');
    const icon = element.querySelector('.faq-question span');
    icon.textContent = element.classList.contains('active') ? '▲' : '▼';
}