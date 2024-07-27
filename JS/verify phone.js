document.addEventListener('DOMContentLoaded', function () {
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
            if (event.target.value.length === 0 && prevInputId) {
                const prevInput = document.getElementById(prevInputId);
                if (prevInput) {
                    prevInput.focus();
                }
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
