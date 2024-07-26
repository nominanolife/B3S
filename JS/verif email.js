document.addEventListener('DOMContentLoaded', function () {
    // Function to handle the verification process
    function handleVerification() {
        // Show a notification when the button is clicked
        alert('You have been verified successfully!');
        window.location.href = 'change.html';
    }

    // Get the verify button and attach a click event listener
    const verifyButton = document.querySelector('.login-btn');
    if (verifyButton) {
        verifyButton.addEventListener('click', function () {
            // Call the handleVerification function when the button is clicked
            handleVerification();
        });
    }

    // Function to move to the next input field
    function moveToNext(currentInput, nextInputId) {
        if (currentInput.value.length === currentInput.maxLength) {
            const nextInput = document.getElementById(nextInputId);
            if (nextInput) {
                nextInput.focus();
            }
        }
    }

    // Function to move to the previous input field
    function moveToPrev(event, prevInputId) {
        if (event.key === 'Backspace') {
            const prevInput = document.getElementById(prevInputId);
            if (prevInput) {
                prevInput.focus();
            }
        }
    }

    // Attach event listeners to the verification code inputs
    document.querySelectorAll('.verification-code-input').forEach(input => {
        input.addEventListener('input', function () {
            const nextInputId = this.dataset.nextInputId;
            if (nextInputId) {
                moveToNext(this, nextInputId);
            }
        });
        input.addEventListener('keydown', function (event) {
            const prevInputId = this.dataset.prevInputId;
            if (prevInputId) {
                moveToPrev(event, prevInputId);
            }
        });
    });
});
