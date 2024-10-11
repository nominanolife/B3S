document.addEventListener('DOMContentLoaded', function() {
    let questionCount = 0;

    // Get all the trash icons and handle delete confirmation
    const trashIcons = document.querySelectorAll('.bi-trash3');
    trashIcons.forEach(icon => {
        icon.addEventListener('click', function(event) {
            event.stopPropagation(); // Stop event propagation to prevent triggering draft-container click
            $('#deleteConfirmationModal').modal('show');
        });
    });

    // Get all draft containers and handle opening the modal
    const draftContainers = document.querySelectorAll('.draft-container');
    draftContainers.forEach(container => {
        container.addEventListener('click', function(event) {
            // Show the upload modal
            $('#uploadModal').modal('show');
        });
    });

    // Initialize the modal and bind event listeners
    $('#uploadModal').on('shown.bs.modal', function () {
        questionCount = 0; // Reset question count when modal is shown
        currentStepIndex = 0; // Reset to Step 1
        showStep(currentStepIndex); // Ensure Step 1 is displayed

        const addQuestionBtn = document.querySelector('#uploadModal .add-question');
        addQuestionBtn.removeEventListener('click', addQuestion);  // Ensure no duplicate listeners
        addQuestionBtn.addEventListener('click', () => addQuestion()); // Add event listener to "Add Question" button
    });

    const selectElement = document.querySelector('.category');
    const selected = selectElement.querySelector('.selected');
    const optionsContainer = selectElement.querySelector('.dropdown-options');
    const optionsList = optionsContainer.querySelectorAll('.options');

    selected.addEventListener('click', () => {
        optionsContainer.style.display = optionsContainer.style.display === 'block' ? 'none' : 'block';
    });

    optionsList.forEach(option => {
        option.addEventListener('click', () => {
            selected.innerHTML = option.innerHTML;
            optionsContainer.style.display = 'none';
        });
    });

    document.addEventListener('click', (e) => {
        if (!selectElement.contains(e.target)) {
            optionsContainer.style.display = 'none';
        }
    });

    const thumbnailUpload = document.getElementById('thumbnailUpload');
    const videoUpload = document.getElementById('videoUpload');
    const thumbnailBox = document.querySelector('.video-thumbnail-box .video-thumbnail-area');
    const videoBox = document.querySelector('.video-upload-box .video-upload-area');

    if (thumbnailUpload) {
        thumbnailUpload.addEventListener('change', function () {
            if (thumbnailUpload.files.length > 0) {
                const file = thumbnailUpload.files[0];
                const imageUrl = URL.createObjectURL(file);
                thumbnailBox.innerHTML = `<img src="${imageUrl}" class="img-thumbnail">`;
            }
        });
    }

    if (videoUpload) {
        videoUpload.addEventListener('change', function () {
            if (videoUpload.files.length > 0) {
                const file = videoUpload.files[0];
                const videoUrl = URL.createObjectURL(file);
                videoBox.innerHTML = `<video controls class="vid-thumbnail">
                                        <source src="${videoUrl}" type="${file.type}">
                                        Your browser does not support the video tag.
                                    </video>`;
            }
        });
    }

    document.querySelector('.video-thumbnail-box').addEventListener('click', function () {
        if (thumbnailUpload) thumbnailUpload.click();
    });
    
    document.querySelector('.video-upload-box .video-upload-area').addEventListener('click', function (event) {
        event.preventDefault(); // Prevent the video from playing when the area is clicked
        videoUpload.click(); // Trigger the file input to select a new video file
    });

    function addQuestion() {
        questionCount++;
        const quizContent = document.querySelector('.quiz-content');
        const newQuestion = document.createElement('div');
    
        newQuestion.classList.add('quiz-container');
    
        newQuestion.innerHTML = 
            `<div class="quiz-container-header">
                <h5>Question ${questionCount}</h5>
            </div>
            <div class="quiz-question">
                <div class="question-input">
                    <input type="text" placeholder="Type your question here...">
                </div>
                <div class="image-upload">
                    <h5>Upload an image for the question (optional)</h5>
                    <div class="image-upload-box">
                        <div class="image-upload-area">
                            <i class="bi bi-image-fill"></i>
                            <p>Add Image</p>
                        </div>
                        <input type="file" id="imageUpload${questionCount}" accept="image/*" style="display: none;">
                    </div>
                </div>
                <div class="question-options">
                    <h5>Enter the options. Mark the correct answer.</h5>
                    <div class="option">
                        <input type="radio" id="option1_${questionCount}" name="options${questionCount}">
                        <input type="text" placeholder="Option 1">
                    </div>
                    <div class="option">
                        <input type="radio" id="option2_${questionCount}" name="options${questionCount}">
                        <input type="text" placeholder="Option 2">
                    </div>
                    <div class="option">
                        <input type="radio" id="option3_${questionCount}" name="options${questionCount}">
                        <input type="text" placeholder="Option 3">
                    </div>
                    <div class="option">
                        <input type="radio" id="option4_${questionCount}" name="options${questionCount}">
                        <input type="text" placeholder="Option 4">
                    </div>
                </div>
                <div class="delete-question">
                    <button class="delete-question-btn">Delete</button>
                </div>`;

        quizContent.appendChild(newQuestion);

        if (questionCount > 1) {
            newQuestion.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Image Upload Logic
        const imageUploadInput = newQuestion.querySelector(`#imageUpload${questionCount}`);
        const imageUploadBox = newQuestion.querySelector('.image-upload-box .image-upload-area');

        newQuestion.querySelector('.image-upload-box').addEventListener('click', function () {
            imageUploadInput.click();
        });

        imageUploadInput.addEventListener('change', function () {
            if (imageUploadInput.files.length > 0) {
                const file = imageUploadInput.files[0];
                const imageUrl = URL.createObjectURL(file);
                imageUploadBox.innerHTML = `<img src="${imageUrl}" class="img-thumbnail" alt="${file.name}">`;
            }
        });

        // Delete Question Logic
        const deleteButton = newQuestion.querySelector('.delete-question-btn');
        deleteButton.addEventListener('click', function () {
            quizContent.removeChild(newQuestion);
            updateQuestionNumbers();
        });
    }

    // Function to update question numbers after deletion
    function updateQuestionNumbers() {
        const questionHeaders = document.querySelectorAll('.quiz-container-header h5');
        questionHeaders.forEach((header, index) => {
            header.textContent = `Question ${index + 1}`;
        });
        questionCount = questionHeaders.length; // Update question count
    }

    function updatePreview() {
        // Implement preview logic here, similar to how it was described in your original code.
    }

    // Modal steps management
    const steps = ['step1', 'step2', 'step3'];
    let currentStepIndex = 0;

    const nextButton = document.querySelector('.modal-footer .next-btn');
    const backButton = document.querySelector('.modal-footer .back-btn');
    const saveButton = document.querySelector('.modal-footer .save-btn');

    // Show the initial step
    showStep(currentStepIndex);

    // Handle Next button click
    if (nextButton) {
        nextButton.addEventListener('click', function () {
            if (currentStepIndex < steps.length - 1) {
                currentStepIndex++;
                showStep(currentStepIndex);
            }
        });
    }

    // Handle Back button click
    if (backButton) {
        backButton.addEventListener('click', function () {
            if (currentStepIndex > 0) {
                currentStepIndex--;
                showStep(currentStepIndex);
            }
        });
    }

    // Function to show the current step and update button visibility
    function showStep(stepIndex) {
        steps.forEach(step => {
            const stepElement = document.getElementById(step);
            if (stepElement) {
                // Pause all videos within the step being hidden
                const videos = stepElement.querySelectorAll('video');
                videos.forEach(video => {
                    video.pause();
                    video.currentTime = 0; // Optional: Reset to the start
                });
                // Hide the step
                stepElement.classList.add('d-none');
            }
        });

        // Show the current step
        const currentStepElement = document.getElementById(steps[stepIndex]);
        if (currentStepElement) currentStepElement.classList.remove('d-none');

        // Update button visibility
        updateButtonVisibility(stepIndex);

        // If it's the final step, show the preview
        if (stepIndex === steps.length - 1) {
            updatePreview();
        }
    }

    // Function to update button visibility based on the current step
    function updateButtonVisibility(stepIndex) {
        if (backButton) backButton.style.display = stepIndex > 0 ? 'inline-block' : 'none';
        if (nextButton) nextButton.style.display = stepIndex < steps.length - 1 ? 'inline-block' : 'none';
        if (saveButton) saveButton.style.display = stepIndex === steps.length - 1 ? 'inline-block' : 'none';
    }

});