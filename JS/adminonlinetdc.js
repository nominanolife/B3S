document.addEventListener('DOMContentLoaded', function () {
    const uploadContainer = document.querySelector('.upload-container');
    const nextButton = document.querySelector('.modal-footer .next-btn');
    const backButton = document.querySelector('.modal-footer .back-btn');
    const saveButton = document.querySelector('.modal-footer .save-btn');
    const steps = ['step1', 'step2', 'step3'];
    let currentStep = 0;
    let questionCount = 0;

    // Ensure upload container triggers the modal correctly
    if (uploadContainer) {
        uploadContainer.addEventListener('click', function () {
            $('#uploadModal').modal({
                backdrop: 'static',
                keyboard: false
            });
        });
    }    

    const thumbnailUpload = document.getElementById('thumbnailUpload');
    const videoUpload = document.getElementById('videoUpload');
    const videoTitleInput = document.getElementById('videoTitleInput');
    
    const thumbnailBox = document.querySelector('.video-thumbnail-box .video-thumbnail-area');
    const videoBox = document.querySelector('.video-upload-box .video-upload-area');

    if (thumbnailUpload) {
        // Preview the uploaded image (Thumbnail)
        thumbnailUpload.addEventListener('change', function () {
            if (thumbnailUpload.files.length > 0) {
                const file = thumbnailUpload.files[0];
                const imageUrl = URL.createObjectURL(file);
                thumbnailBox.innerHTML = `<img src="${imageUrl}" class="img-thumbnail">`;

                // Delay scroll to ensure image is loaded
                setTimeout(() => {
                    thumbnailBox.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    window.scrollTo(0, document.body.scrollHeight);
                }, 100);
            }
        });
    }

    if (videoUpload) {
        // Preview the uploaded video
        videoUpload.addEventListener('change', function () {
            if (videoUpload.files.length > 0) {
                const file = videoUpload.files[0];
                const videoUrl = URL.createObjectURL(file);
                videoBox.innerHTML = `<video controls class="vid-thumbnail">
                                        <source src="${videoUrl}" type="${file.type}">
                                        Your browser does not support the video tag.
                                    </video>`;

                // Delay scroll to ensure video is loaded
                setTimeout(() => {
                    videoBox.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    window.scrollTo(0, document.body.scrollHeight);
                }, 100);
            }
        });
    }

    document.querySelector('.video-thumbnail-box').addEventListener('click', function () {
        if (thumbnailUpload) thumbnailUpload.click();
    });

    document.querySelector('.video-upload-box').addEventListener('click', function () {
        if (videoUpload) videoUpload.click();
    });

    function showStep(stepIndex) {
        steps.forEach(step => {
            const stepElement = document.getElementById(step);
            if (stepElement) stepElement.classList.add('d-none');
        });
        const currentStepElement = document.getElementById(steps[stepIndex]);
        if (currentStepElement) currentStepElement.classList.remove('d-none');
        updateButtonVisibility(stepIndex);

        if (stepIndex === 2) {
            updatePreview();
        }
    }

    function updateButtonVisibility(stepIndex) {
        if (backButton) backButton.style.display = stepIndex > 0 ? 'inline-block' : 'none';
        if (nextButton) nextButton.style.display = stepIndex < steps.length - 1 ? 'inline-block' : 'none';
        if (saveButton) saveButton.style.display = stepIndex === steps.length - 1 ? 'inline-block' : 'none';
    }

    if (nextButton) {
        nextButton.addEventListener('click', function () {
            if (currentStep < steps.length - 1) {
                currentStep++;
                showStep(currentStep);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    if (backButton) {
        backButton.addEventListener('click', function () {
            if (currentStep > 0) {
                currentStep--;
                showStep(currentStep);
            }
        });
    }

    showStep(currentStep);

    // Handle Delete Confirmation Modal
    const deleteButtons = document.querySelectorAll('.option-dropdown'); 
    const deleteConfirmationModal = $('#deleteConfirmationModal'); 
 
    deleteButtons.forEach(button => {
        if (button.textContent === 'Delete') {
            button.addEventListener('click', function () {
                deleteConfirmationModal.modal('show'); 
            });
        }
    });

    const tripleDotIcons = document.querySelectorAll('.bi-three-dots-vertical');

    tripleDotIcons.forEach(icon => {
        icon.addEventListener('click', function () {
            const options = this.nextElementSibling;
            if (options) options.style.display = options.style.display === 'block' ? 'none' : 'block';
        });
    });

    window.addEventListener('click', function (event) {
        if (!event.target.matches('.bi-three-dots-vertical')) {
            const dropdowns = document.querySelectorAll('.triple-dot-options');
            dropdowns.forEach(dropdown => {
                dropdown.style.display = 'none';
            });
        }
    });

    function updateQuestionNumbers() {
        const quizContainers = document.querySelectorAll('.quiz-container');
        questionCount = quizContainers.length;

        quizContainers.forEach((container, index) => {
            const header = container.querySelector('.quiz-container-header h5');
            header.textContent = `Question ${index + 1}`;
        });
    }

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

                // Delay scroll to ensure image is loaded
                setTimeout(() => {
                    imageUploadBox.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 100);
            }
        });

        const deleteButton = newQuestion.querySelector('.delete-question-btn');
        deleteButton.addEventListener('click', function () {
            quizContent.removeChild(newQuestion);
            updateQuestionNumbers();
        });
    }

    addQuestion();

    document.querySelector('.add-question').addEventListener('click', addQuestion);

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

    function updatePreview() {
        // Update video preview
        const videoPreviewContainer = document.getElementById('videoPreviewContainer');
        const videoFile = videoUpload.files[0];
        if (videoFile) {
            const videoUrl = URL.createObjectURL(videoFile);
            videoPreviewContainer.innerHTML = `<video controls class="vid-thumbnail">
                                                    <source src="${videoUrl}" type="${videoFile.type}">
                                                    Your browser does not support the video tag.
                                                </video>`;
        }
    
        // Update thumbnail preview with title
        const thumbnailPreviewContainer = document.getElementById('thumbnailPreviewContainer');
        const thumbnailFile = thumbnailUpload.files[0];
        const videoTitle = videoTitleInput.value; // Ensure the title is retrieved
    
        if (thumbnailFile) {
            const thumbnailUrl = URL.createObjectURL(thumbnailFile);
            thumbnailPreviewContainer.innerHTML = `<div class="image-thumbnail">
                                                        <img src="${thumbnailUrl}" class="img-thumbnail">
                                                        <h5 class="video-thumbnail-title">${videoTitle}</h5>
                                                    </div>`;
        }
    
        // Update quiz preview
        const quizPreviewContainer = document.getElementById('quizPreviewContainer');
        quizPreviewContainer.innerHTML = ''; // Clear previous content
        const quizContainers = document.querySelectorAll('.quiz-container');
    
        quizContainers.forEach((container, index) => {
            const questionText = container.querySelector('.question-input input').value;
            const options = container.querySelectorAll('.question-options input[type="text"]');
            const correctOption = container.querySelector('.question-options input[type="radio"]:checked');
            const imageUploadInput = container.querySelector(`#imageUpload${index + 1}`);
            const quizPreviewItem = document.createElement('div');
            quizPreviewItem.classList.add('quiz-preview-item');
    
            // Add question text with number
            const questionPreview = document.createElement('h4');
            questionPreview.textContent = `Question ${index + 1}. ${questionText}`;
            quizPreviewItem.appendChild(questionPreview);
    
            // Add question image preview if an image was uploaded
            if (imageUploadInput && imageUploadInput.files.length > 0) {
                const file = imageUploadInput.files[0];
                const imageUrl = URL.createObjectURL(file);
                const imagePreview = document.createElement('img');
                imagePreview.src = imageUrl;
                imagePreview.classList.add('img-thumbnail');
                imagePreview.alt = 'Uploaded Question Image';
                quizPreviewItem.appendChild(imagePreview);
            }
    
            // Add options with labels (a, b, c, d) and radio button to indicate the correct answer
            const optionLabels = ['A', 'B', 'C', 'D']; // Option labels
            options.forEach((option, optIndex) => {
                const optionWrapper = document.createElement('div');
                optionWrapper.classList.add('option'); // Apply the .option class for styles
    
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `previewOptions${index}`;
                radio.disabled = true; // Make radio button unclickable in preview
                if (correctOption && correctOption.id === option.previousElementSibling.id) {
                    radio.checked = true; // Check the radio button for the correct answer
                }
    
                const optionLabel = document.createElement('span');
                optionLabel.classList.add('option-label'); // Add custom class for styling labels
                optionLabel.textContent = `${optionLabels[optIndex]}. `;
    
                const optionPreview = document.createElement('p');
                optionPreview.textContent = option.value; // Use the exact text input by the user
    
                optionWrapper.appendChild(radio);
                optionWrapper.appendChild(optionLabel); // Add the label with the custom class
                optionWrapper.appendChild(optionPreview);
    
                quizPreviewItem.appendChild(optionWrapper);
            });
    
            quizPreviewContainer.appendChild(quizPreviewItem);
        });
    }
});