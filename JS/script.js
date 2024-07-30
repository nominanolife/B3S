// Initialize AOS
AOS.init();

// Function to redirect to login page
function redirectToLogin(page) {
    window.location.href = page;
}

// Event listener for DOMContentLoaded to ensure all elements are loaded
document.addEventListener('DOMContentLoaded', function () {
    // Redirect to Registration page
    const registerButton = document.getElementById('registerButton');
    if (registerButton) {
        registerButton.addEventListener('click', function () {
            redirectToLogin('reg.html');
        });
    }

    // Show login modal on button click
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', function () {
            $('#loginModal').modal('show');
        });
    }

    // Toggle hover class on buttons
    const enrollNowBtn = document.getElementById('enrollNowBtn');
    if (enrollNowBtn) {
        enrollNowBtn.addEventListener('click', function () {
            this.classList.toggle('hover');
        });
    }

    const signUpBtn = document.getElementById('signUpBtn');
    if (signUpBtn) {
        signUpBtn.addEventListener('click', function () {
            this.classList.toggle('hover');
        });
    }

    // Pause and reset video on modal hide
    $('#videoModal').on('hidden.bs.modal', function () {
        const video = document.getElementById('modalVideo');
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
    });

    // Highlight active nav link
    const sections = document.querySelectorAll('#home, #about, #courses, #contact');
    const navLinks = document.querySelectorAll('.navbar-nav a');

    window.addEventListener('scroll', function () {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= sectionTop - sectionHeight / 2) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(a => {
            a.classList.remove('active');
            if (a.getAttribute('href') === '#' + current) {
                a.classList.add('active');
            }
        });
    });

    // Chatbot functionality
    const chatbot = document.getElementById('chatbot');
    const closeChatbot = document.getElementById('closeChatbot');
    const sendBtn = document.getElementById('sendBtn');
    const chatInput = document.getElementById('chatInput');
    const chatbotMessages = document.getElementById('chatbotMessages');

    if (chatbot && closeChatbot && sendBtn && chatInput && chatbotMessages) {
        closeChatbot.addEventListener('click', function () {
            chatbot.style.display = 'none';
        });

        sendBtn.addEventListener('click', function () {
            const userMessage = chatInput.value.trim();
            if (userMessage) {
                appendMessage('user', userMessage);
                chatInput.value = '';
                sendMessageToBot(userMessage);
            }
        });

        chatInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                sendBtn.click();
            }
        });

        function appendMessage(sender, message) {
            const messageElem = document.createElement('div');
            messageElem.classList.add('message', sender);
            const bubble = document.createElement('div');
            bubble.classList.add('bubble');
            bubble.textContent = message;
            messageElem.appendChild(bubble);
            chatbotMessages.appendChild(messageElem);
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }

        const RASA_SERVER_URL = 'http://localhost:5005/webhooks/rest/webhook'; // or http://0.0.0.0:5005/webhooks/rest/webhook

        function sendMessageToBot(message) {
            fetch(RASA_SERVER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sender: 'user', message: message }) // 'sender' is required for Rasa
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                const botMessage = data[0].text; // Adjust according to your Rasa response structure
                appendMessage('bot', botMessage);
            })
            .catch(error => {
                console.error('Error:', error);
                appendMessage('bot', 'Sorry, there was an error processing your request.');
            });
        }

    }
});