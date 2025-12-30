  function handleSubmit(event) {
            event.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value;

            // In a real application, this would send the data to a server
            console.log('Form submitted:', { name, email, subject, message });

            // Show success message
            const successMsg = document.getElementById('successMessage');
            successMsg.style.display = 'block';
            
            setTimeout(() => {
                successMsg.style.display = 'none';
            }, 4000);

            // Reset form
            event.target.reset();
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