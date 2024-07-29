document.addEventListener('DOMContentLoaded', function () {
    const birthdayInput = document.getElementById('birthday');
    const ageInput = document.getElementById('age');
    const saveButton = document.querySelector('.save-btn');
    const form = document.querySelector('form');
    const inputs = form.querySelectorAll('input[required]');

    // Function to calculate age from birthday
    function calculateAge(birthday) {
        const birthDate = new Date(birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDifference = today.getMonth() - birthDate.getMonth();
        if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    // Event listener to update age when birthday changes
    if (birthdayInput) {
        birthdayInput.addEventListener('change', function () {
            const age = calculateAge(this.value);
            ageInput.value = age;
        });
    }

    // Function to validate the form
    function validateForm() {
        let isValid = true;

        // Check all required fields
        inputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.classList.add('is-invalid');
            } else {
                input.classList.remove('is-invalid');
            }
        });

        // Additional validation for age
        if (ageInput.value <= 0) {
            isValid = false;
            ageInput.classList.add('is-invalid');
        } else {
            ageInput.classList.remove('is-invalid');
        }

        return isValid;
    }
});
