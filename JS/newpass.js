// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, verifyPasswordResetCode, confirmPasswordReset } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

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

function showNotification(message) {
    const notificationMessage = document.getElementById('notificationMessage');
    notificationMessage.textContent = message;
    $('#notificationModal').modal('show'); // Use jQuery to show the modal
}

// Get the oobCode from the URL
const urlParams = new URLSearchParams(window.location.search);
const oobCode = urlParams.get('oobCode'); // Extract the reset code from the URL

// DOM elements
const passwordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const confirmPasswordIcon = document.getElementById('confirmPasswordIcon').querySelector('i');

// Validation elements
const minLengthRequirement = document.getElementById('minLength');
const lettersRequirement = document.getElementById('letters');
const numbersSymbolsRequirement = document.getElementById('numbersSymbols');

// Toggle password visibility elements
const toggleNewPassword = document.getElementById('toggleNewPassword');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

// Function to toggle password visibility
function togglePasswordVisibility(inputField, icon) {
    const type = inputField.getAttribute('type') === 'password' ? 'text' : 'password';
    inputField.setAttribute('type', type);
    icon.classList.toggle('fa-eye-slash');
    icon.classList.toggle('fa-eye');
}

// Add event listeners for password visibility toggle
toggleNewPassword.addEventListener('click', () => {
    togglePasswordVisibility(passwordInput, toggleNewPassword.querySelector('i'));
});

toggleConfirmPassword.addEventListener('click', () => {
    togglePasswordVisibility(confirmPasswordInput, toggleConfirmPassword.querySelector('i'));
});

// Function to check password requirements
function checkPasswordRequirements() {
    const password = passwordInput.value;

    // Check minimum length (8 characters)
    if (password.length >= 8) {
        minLengthRequirement.classList.remove('invalid');
        minLengthRequirement.classList.add('valid');
        minLengthRequirement.querySelector('i').classList.remove('fa-times');
        minLengthRequirement.querySelector('i').classList.add('fa-check');
    } else {
        minLengthRequirement.classList.remove('valid');
        minLengthRequirement.classList.add('invalid');
        minLengthRequirement.querySelector('i').classList.add('fa-times');
        minLengthRequirement.querySelector('i').classList.remove('fa-check');
    }

    // Check for both uppercase and lowercase letters
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    if (hasUppercase && hasLowercase) {
        lettersRequirement.classList.remove('invalid');
        lettersRequirement.classList.add('valid');
        lettersRequirement.querySelector('i').classList.remove('fa-times');
        lettersRequirement.querySelector('i').classList.add('fa-check');
    } else {
        lettersRequirement.classList.remove('valid');
        lettersRequirement.classList.add('invalid');
        lettersRequirement.querySelector('i').classList.add('fa-times');
        lettersRequirement.querySelector('i').classList.remove('fa-check');
    }

    // Check for numbers and symbols
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (hasNumber && hasSymbol) {
        numbersSymbolsRequirement.classList.remove('invalid');
        numbersSymbolsRequirement.classList.add('valid');
        numbersSymbolsRequirement.querySelector('i').classList.remove('fa-times');
        numbersSymbolsRequirement.querySelector('i').classList.add('fa-check');
    } else {
        numbersSymbolsRequirement.classList.remove('valid');
        numbersSymbolsRequirement.classList.add('invalid');
        numbersSymbolsRequirement.querySelector('i').classList.add('fa-times');
        numbersSymbolsRequirement.querySelector('i').classList.remove('fa-check');
    }
}

// Function to check if passwords match
function checkPasswordsMatch() {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password === confirmPassword && confirmPassword.length > 0) {
        confirmPasswordIcon.classList.remove('fa-times', 'text-danger');
        confirmPasswordIcon.classList.add('fa-check', 'text-success');
    } else {
        confirmPasswordIcon.classList.remove('fa-check', 'text-success');
        confirmPasswordIcon.classList.add('fa-times', 'text-danger');
    }
}

// Event listeners for password input fields
passwordInput.addEventListener('input', () => {
    checkPasswordRequirements();
    checkPasswordsMatch();
});

confirmPasswordInput.addEventListener('input', checkPasswordsMatch);

// Function to handle password reset
async function handlePasswordReset() {
    const newPassword = passwordInput.value;

    try {
        // Directly confirm the password reset without checking the email
        await confirmPasswordReset(auth, oobCode, newPassword);
        showNotification('Password has been reset successfully!');

    } catch (error) {
        showNotification('Failed to reset password. Please try again or the link may have expired.');
    }
}

const resetButton = document.getElementById('cnfrmButton');
resetButton.addEventListener('click', (event) => {
    event.preventDefault();
    
    // Check if all password validation passes
    const allValid = minLengthRequirement.classList.contains('valid') &&
                     lettersRequirement.classList.contains('valid') &&
                     numbersSymbolsRequirement.classList.contains('valid') &&
                     passwordInput.value === confirmPasswordInput.value;

    if (allValid) {
        handlePasswordReset();
    } else {
        showNotification('Please make sure your password meets all the requirements and both passwords match.');
    }
});