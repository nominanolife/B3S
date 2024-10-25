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
        
            if (sender === 'bot') {
                messageElem.innerHTML = `
                    <div class="bot-message-container">
                        <img src="Assets/logo.png" alt="Chatbot Logo" class="chatbot-logo">
                        <p class="bubble">${message}</p>
                    </div>`;
            } else {
                const bubble = document.createElement('div');
                bubble.classList.add('bubble');
                bubble.textContent = message;
                messageElem.appendChild(bubble);
            }
        
            chatbotMessages.appendChild(messageElem);
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }        

        const AI_SERVER_URL = 'https://chatbot-195867894399.asia-southeast1.run.app/chatbot'; // Updated URL for AI model

        // Append typing indicator (triple dot animation)
        function appendTypingIndicator() {
            const typingIndicator = document.createElement('div');
            typingIndicator.classList.add('message', 'bot', 'typing-indicator-container');
            typingIndicator.innerHTML = `
                <div class="typing-indicator">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>`;
            chatbotMessages.appendChild(typingIndicator);
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }

        // Remove typing indicator
        function removeTypingIndicator() {
            const typingIndicator = document.querySelector('.typing-indicator-container');
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }

        // Send message to bot and show typing indicator
        function sendMessageToBot(userMessage) {
            // Show typing indicator
            appendTypingIndicator();

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
                // Remove typing indicator
                removeTypingIndicator();

                const aiResponse = data.response; // Assuming the response structure has 'response'
                appendMessage('bot', aiResponse);
            })
            .catch(error => {
                removeTypingIndicator();
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
    }, 1000); // 1 second delay

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
    
    // Append initial bot message
    const initialMessage = document.createElement('div');
    initialMessage.classList.add('message', 'bot');
    initialMessage.innerHTML = `
        <div class="bot-message-container">
            <img src="Assets/logo.png" alt="Chatbot Logo" class="chatbot-logo">
            <p class="bubble">Hi! I\'m DriveHub\'s Chatbot. I can answer strictly for inquiries</p>
        </div>`;
    chatbotMessages.appendChild(initialMessage);

    // Append additional message below the initial one
    const additionalMessage = document.createElement('div');
    additionalMessage.classList.add('message', 'bot');
    additionalMessage.innerHTML = `
        <div class="bot-message-container">
            <img src="Assets/logo.png" alt="Chatbot Logo" class="chatbot-logo">
            <p class="bubble">For example, you can ask "What is your available packages?"</p>
        </div>`;
    chatbotMessages.appendChild(additionalMessage);

    chatbotMessages.scrollTop = chatbotMessages.scrollHeight; // Scroll to the bottom


});

// Toggle sidebar functionality
document.getElementById("toggleSidebarBtn").addEventListener("click", function() {
    document.querySelector("nav").classList.toggle("sidebar-open");
});
