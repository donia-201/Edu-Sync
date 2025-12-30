function handleSubmit(event) {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const subject = document.getElementById("subject").value;
    const message = document.getElementById("message").value;

    fetch("https://edu-sync-back-end-production.up.railway.app/api/send-email", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, subject, message })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById("successMessage").style.display = "block";
            setTimeout(() => {
                document.getElementById("successMessage").style.display = "none";
            }, 4000);
            document.querySelector("form").reset();
        } else {
            alert("Failed to send message");
        }
    })
    .catch(err => {
        console.error(err);
        alert("Server error");
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