const passwordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const confirmPasswordIcon = document.getElementById('confirmPasswordIcon').querySelector('i');

const minLengthRequirement = document.getElementById('minLength');
const lettersRequirement = document.getElementById('letters');
const numbersSymbolsRequirement = document.getElementById('numbersSymbols');
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

// Function to check the password requirements
function checkPasswordRequirements() {
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

// Add event listener for input on the password fields
passwordInput.addEventListener('input', () => {
    checkPasswordRequirements();
    checkPasswordsMatch();
});

confirmPasswordInput.addEventListener('input', checkPasswordsMatch);