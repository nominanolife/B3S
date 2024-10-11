$(document).ready(function() {
    $('#cnfrmButton').on('click', function() {
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
            valid = false;
        }

        // Uppercase and lowercase letters
        if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) {
            $('#letters').removeClass('invalid').addClass('valid').find('i').removeClass('fas fa-times').addClass('fas fa-check');
        } else {
            valid = false;
        }

        // Numbers and symbols
        if (/\d/.test(newPassword) && /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
            $('#numbersSymbols').removeClass('invalid').addClass('valid').find('i').removeClass('fas fa-times').addClass('fas fa-check');
        } else {
            valid = false;
        }

        // Check if passwords are empty and if they match
        if (newPassword === '') {
            $('#newPasswordError').text('Password is required.');
            valid = false; // Set valid to false if password is empty
        }

        if (confirmPassword === '') {
            $('#confirmPasswordError').text('Please confirm your password.');
            valid = false; // Set valid to false if confirm password is empty
        }

        // Check if the new password matches the confirm password
        if (newPassword !== confirmPassword) {
            $('#confirmPasswordError').text('Passwords do not match.');
            valid = false; // Set valid to false if passwords do not match
        }

        // If any validation failed, prevent showing the modal
        if (!valid) {
            return; 
        }

        // If validation passes, set the message and show the modal
        $('#notificationMessage').text('Password has been reset successfully.'); // Update the notification message
        $('#notificationModal').modal('show'); // Show the modal
    });
});
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

