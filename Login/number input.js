document.addEventListener('DOMContentLoaded', function () {
    const phoneInput = document.querySelector('input[name="phoneNumber"]');
    const phoneForm = document.getElementById('phoneForm');
    
    // Function to validate phone number length
    function validatePhoneNumber() {
        const phoneNumber = phoneInput.value.replace(/\D/g, ''); // Remove non-digit characters
        if (phoneNumber.length !== 11) {
            phoneInput.setCustomValidity('Phone number must be exactly 11 digits.');
        } else {
            phoneInput.setCustomValidity(''); // Clear the error message if valid
        }
    }

    // Event listener for input changes
    phoneInput.addEventListener('input', function () {
        validatePhoneNumber();
    });

    // Prevent form submission if phone number is invalid
    phoneForm.addEventListener('submit', function (event) {
        const phoneNumber = phoneInput.value.replace(/\D/g, ''); // Remove non-digit characters
        if (phoneNumber.length !== 11) {
            event.preventDefault(); // Prevent form submission
            alert('Please enter exactly 11 digits for your phone number.');
        }
    });
});
