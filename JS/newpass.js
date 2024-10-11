import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, confirmPasswordReset } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

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

// Fetch the email and oobCode (reset code) from the URL query string
const urlParams = new URLSearchParams(window.location.search);
const oobCode = urlParams.get('oobCode');  // This is the reset password code from the URL
const email = urlParams.get('email');  // Fetch the email from the URL

// Log the oobCode and email to ensure they're passed correctly
console.log('oobCode:', oobCode);
console.log('email:', email);

$(document).ready(function() {
    $('#cnfrmButton').on('click', async function() {
        const newPassword = $('#newPassword').val();
        const confirmPassword = $('#confirmPassword').val();

        // Reset any previous error messages
        $('#newPasswordError').text('');
        $('#confirmPasswordError').text('');

        // Reset requirements display
        $('.requirement').addClass('invalid').removeClass('valid');

        // Password requirements validation
        let valid = true;

        // Minimum length
        if (newPassword.length >= 8) {
            $('#minLength').removeClass('invalid').addClass('valid').find('i').removeClass('fas fa-times').addClass('fas fa-check');
        } else {
            $('#newPasswordError').text('Password must be at least 8 characters.');
            valid = false;
        }

        // Uppercase and lowercase letters
        if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) {
            $('#letters').removeClass('invalid').addClass('valid').find('i').removeClass('fas fa-times').addClass('fas fa-check');
        } else {
            $('#newPasswordError').text('Password must contain both uppercase and lowercase letters.');
            valid = false;
        }

        // Numbers and symbols
        if (/\d/.test(newPassword) && /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
            $('#numbersSymbols').removeClass('invalid').addClass('valid').find('i').removeClass('fas fa-times').addClass('fas fa-check');
        } else {
            $('#newPasswordError').text('Password must contain at least one number and one symbol.');
            valid = false;
        }

        // Check if passwords are empty and if they match
        if (newPassword === '') {
            $('#newPasswordError').text('Password is required.');
            valid = false;
        }

        if (confirmPassword === '') {
            $('#confirmPasswordError').text('Please confirm your password.');
            valid = false;
        }

        // Check if the new password matches the confirm password
        if (newPassword !== confirmPassword) {
            $('#confirmPasswordError').text('Passwords do not match.');
            valid = false;
        }

        // If any validation failed, prevent the password reset
        if (!valid) {
            return;
        }

        // If validation passes, try to reset the password using Firebase
        try {
            if (!oobCode) {
                throw new Error("Reset code is missing. Please try the process again.");
            }

            // Call Firebase's confirmPasswordReset function with the oobCode and the new password
            await confirmPasswordReset(auth, oobCode, newPassword);

            // If successful, show the success message and modal
            $('#notificationMessage').text('Password has been reset successfully.');
            $('#notificationModal').modal('show');
        } catch (error) {
            console.error('Error resetting password:', error);

            // Display appropriate error messages based on the error codes returned by Firebase
            let errorMessage = 'Failed to reset password. Please try again.';
            if (error.code === 'auth/invalid-action-code') {
                errorMessage = 'The reset code is invalid or expired. Please try the reset process again.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'The password is too weak. Please choose a stronger password.';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'No user found for the provided email.';
            }

            $('#notificationMessage').text(errorMessage);
            $('#notificationModal').modal('show');
        }
    });
});

// Add password strength validation and password visibility toggle
const passwordInput = document.getElementById('newPassword');
const minLengthRequirement = document.getElementById('minLength');
const lettersRequirement = document.getElementById('letters');
const numbersSymbolsRequirement = document.getElementById('numbersSymbols');
const confirmPasswordInput = document.getElementById('confirmPassword');
const toggleNewPassword = document.getElementById('toggleNewPassword');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

// Function to toggle password visibility
function togglePasswordVisibility(inputField, icon) {
    const type = inputField.getAttribute('type') === 'password' ? 'text' : 'password';
    inputField.setAttribute('type', type);
    icon.classList.toggle('fa-eye-slash');
    icon.classList.toggle('fa-eye');
}

// Add event listeners for the password visibility toggle
toggleNewPassword.addEventListener('click', () => {
    togglePasswordVisibility(passwordInput, toggleNewPassword.querySelector('i'));
});

toggleConfirmPassword.addEventListener('click', () => {
    togglePasswordVisibility(confirmPasswordInput, toggleConfirmPassword.querySelector('i'));
});

// Validate password strength during input
passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;

    // Check Minimum Length
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

    // Check Uppercase and Lowercase
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

    // Check for Numbers and Symbols
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
});
