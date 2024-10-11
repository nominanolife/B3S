import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBflGD3TVFhlOeUBUPaX3uJTuB-KEgd0ow",
    authDomain: "authentication-d6496.firebaseapp.com",
    projectId: "authentication-d6496",
    storageBucket: "authentication-d6496.appspot.com",
    messagingSenderId: "195867894399",
    appId: "1:195867894399:web:596fb109d308aea8b6154a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Email validation function
function isValidEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
}

// Show modal with a message
function showModal(message) {
    document.getElementById('modalMessage').textContent = message;
    $('#notificationModal').modal('show');
}

// Send password reset email
async function handleEmailVerification(email) {
    try {
        if (!isValidEmail(email)) {
            showModal('Please enter a valid email address.');
            return;
        }

        // Send password reset email using Firebase
        await sendPasswordResetEmail(auth, email);

        // Inform the user that the reset email has been sent
        showModal('Password reset email sent. Please check your inbox.');

    } catch (error) {
        console.error("Error sending password reset email:", error);
        showModal('Error sending password reset email. Please try again.');
    }
}

// Handle the Verify button click
const verifyButton = document.getElementById('verifyButton');
verifyButton.addEventListener('click', (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();
    handleEmailVerification(email);
});

// Function to navigate to the login page
function navigateToLogin() {
    window.location.href = 'login.html';
}

// Event listener to handle modal close and redirect to login page if necessary
$('#notificationModal').on('hidden.bs.modal', function () {
    const modalMessage = document.getElementById('modalMessage').textContent;
    if (modalMessage === 'Redirecting to Password Page') {
        navigateToLogin();
    }
});
