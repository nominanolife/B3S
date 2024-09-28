document.addEventListener("DOMContentLoaded", function () {
    const totalQuestions = 10; // Total number of questions
    let currentQuestion = 1; // Start at the first question

    const progressBarFill = document.querySelector(".progress-bar-fill");
    const progressText = document.querySelector(".quiz-progress span");
    const nextButton = document.querySelector(".next-btn");
    const backButton = document.querySelector(".back-btn");

    // Function to update progress bar and text
    function updateProgress() {
        const progressPercentage = (currentQuestion / totalQuestions) * 100;
        progressBarFill.style.width = progressPercentage + "%";
        progressText.textContent = `${currentQuestion} out of ${totalQuestions}`;
    }

    // Initial progress bar update
    updateProgress();

    // Event listener for next button
    nextButton.addEventListener("click", function () {
        if (currentQuestion < totalQuestions) {
            currentQuestion++;
            updateProgress();
        }
    });

    // Event listener for back button
    backButton.addEventListener("click", function () {
        if (currentQuestion > 1) {
            currentQuestion--;
            updateProgress();
        }
    });
});

// Function to manage the visibility of buttons
function manageButtons(currentQuestion, totalQuestions) {
    const backBtn = document.querySelector('.back-btn');
    const nextBtn = document.querySelector('.next-btn');
    const saveBtn = document.querySelector('.save-btn');

    // Hide the back button if it's the first question
    if (currentQuestion === 1) {
        backBtn.style.display = 'none';
        nextBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
    } 
    // Show the back and next buttons if it's a middle question
    else if (currentQuestion > 1 && currentQuestion < totalQuestions) {
        backBtn.style.display = 'inline-block';
        nextBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
    } 
    // Show the submit button if it's the last question
    else if (currentQuestion === totalQuestions) {
        backBtn.style.display = 'inline-block';
        nextBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
    }
}

// Example usage of the function
let currentQuestion = 1;
const totalQuestions = 10; // Example total number of questions

// Call this function whenever you navigate between questions
document.querySelector('.next-btn').addEventListener('click', () => {
    if (currentQuestion < totalQuestions) {
        currentQuestion++;
        manageButtons(currentQuestion, totalQuestions);
    }
});

document.querySelector('.back-btn').addEventListener('click', () => {
    if (currentQuestion > 1) {
        currentQuestion--;
        manageButtons(currentQuestion, totalQuestions);
    }
});

// Initial call to set up the buttons based on the first question
manageButtons(currentQuestion, totalQuestions);