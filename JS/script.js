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
    const chatBubble = document.getElementById('chatBubble');
    const redIndicatorBadge = document.querySelector('.red-indicator-badge'); // Reference to the red badge

    if (chatbot && closeChatbot && sendBtn && chatInput && chatbotMessages) {
        // Toggle chatbot visibility on click
        const chatBotContainer = document.querySelector('.chat-bot-container');
        
        chatBotContainer.addEventListener('click', function() {
            // Toggle chatbot visibility
            if (chatbot.style.display === 'none' || chatbot.style.display === '') {
                chatbot.style.display = 'flex'; // Show chatbot
                
                // Hide the chat bubble when the chatbot opens
                if (chatBubble) {
                    chatBubble.style.display = 'none';
                }

                // Hide the red indicator badge
                if (redIndicatorBadge) {
                    redIndicatorBadge.style.display = 'none';
                }
            } else {
                chatbot.style.display = 'none'; // Hide chatbot
            }
        });

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

        const AI_SERVER_URL = 'https://chatbot-195867894399.asia-southeast1.run.app/chatbot'; // Updated URL for AI model

        function sendMessageToBot(userMessage) {
            fetch(AI_SERVER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: userMessage }) // Sending 'query' for the new AI
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                const aiResponse = data.response; // Assuming the response structure has 'response'
                appendMessage('bot', aiResponse);
            })
            .catch(error => {
                console.error('Error:', error);
                appendMessage('bot', 'Sorry, there was an error processing your request.');
            });
        }
    }

    // Delay showing the chat bubble and the red badge
    setTimeout(function () {
        const chatBubble = document.getElementById('chatBubble');
        if (chatBubble) {
            chatBubble.style.display = 'block';
            if (redIndicatorBadge) {
                redIndicatorBadge.style.display = 'block'; // Show red indicator badge when chat bubble is visible
            }
        }
    }, 2500); // 1 second delay

    // Close chat bubble on click
    if (chatBubble) {
        chatBubble.addEventListener('click', function () {
            chatBubble.style.display = 'none';
            
            // Hide the red indicator badge when the chat bubble is clicked
            if (redIndicatorBadge) {
                redIndicatorBadge.style.display = 'none';
            }
        });
    }
});