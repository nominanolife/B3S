// Firebase configuration and imports for version 10.12.4
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBflGD3TVFhlOeUBUPaX3uJTuB-KEgd0ow",
    authDomain: "authentication-d6496.firebaseapp.com",
    projectId: "authentication-d6496",
    storageBucket: "authentication-d6496.appspot.com",
    messagingSenderId: "195867894399",
    appId: "1:195867894399:web:596fb109d308aea8b6154a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

let draftData = {}; // Initialize draftData globally
let autosaveInterval = null; 

document.addEventListener('DOMContentLoaded', async function() {
    const draftListContainer = document.querySelector('.draft-list');
    let currentDraftId = ''; // Store the draft ID to delete
    let questionCount = 0; // Define questionCount globally at the start of the script

    // Event delegation to handle clicks on trash icons
    draftListContainer.addEventListener('click', function(event) {
        if (event.target.classList.contains('bi-trash3')) {
            event.stopPropagation(); // Prevent other clicks from interfering

            currentDraftId = event.target.getAttribute('data-id');  // Get the draft ID

            // Hide the upload modal if it's open
            $('#uploadModal').modal('hide');

            // Show delete confirmation modal
            $('#deleteConfirmationModal').modal('show');
        }
    });

    // Handle the confirmation of deletion in the modal
    document.querySelector('#confirmDeleteBtn').addEventListener('click', async function() {
        try {
            if (currentDraftId) {
                // Stop autosave before deleting the draft
                if (autosaveInterval) {
                    clearInterval(autosaveInterval); // Stop autosave
                }

                // Close the confirmation modal
                $('#deleteConfirmationModal').modal('hide');

                // Fetch the draft data by ID
                const draftData = await fetchDraftData(currentDraftId);

                // If draft data exists, proceed with deletion
                if (draftData) {
                    // Delete the draft and related files
                    await deleteDraftInfo(draftData, currentDraftId);

                    // Remove the draft card from the UI
                    const draftCard = document.querySelector(`.draft-container[data-id="${currentDraftId}"]`);
                    if (draftCard) draftCard.remove();

                    // Check if there are no remaining drafts
                    const remainingDrafts = document.querySelectorAll('.draft-container');
                    if (remainingDrafts.length === 0) {
                        const draftListContainer = document.querySelector('.draft-list');
                        draftListContainer.innerHTML = `<p>No drafts available</p>`; // Update to show "No drafts available"
                    }

                    // Show success notification
                    document.getElementById('notificationModalBody').innerText = "Draft deleted successfully!";
                    $('#notificationModal').modal('show');
                }
            }
        } catch (error) {
            // Show error notification
            document.getElementById('notificationModalBody').innerText = "An error occurred. Please try again.";
            $('#notificationModal').modal('show');
        }
    });

    // Fetch and display drafts
    await fetchDrafts();

    // Fetch draft data by draft ID
    async function fetchDraftData(draftId) {
        const draftDocRef = doc(db, 'onlineDrafts', draftId);
        const draftSnapshot = await getDoc(draftDocRef);
    
        if (draftSnapshot.exists()) {
            const draftData = draftSnapshot.data();  // Fetch the draft data
            return draftData;  // Return the fetched data for further operations
        } else {
            throw new Error('Draft not found.');
        }
    }    

    async function fetchDrafts() {
        try {
            const draftCollectionRef = collection(db, 'onlineDrafts');
            const draftSnapshot = await getDocs(draftCollectionRef);
            const draftListContainer = document.querySelector('.draft-list');
            draftListContainer.innerHTML = ''; 

            if (draftSnapshot.empty) {
                draftListContainer.innerHTML = `<p>No drafts available</p>`;
                return;
            }

            draftSnapshot.forEach(doc => {
                const draftData = doc.data();
                const draftId = doc.id;

                const draftCard = document.createElement('div');
                draftCard.classList.add('draft-container');
                draftCard.setAttribute('data-id', draftId);

                draftCard.innerHTML = `
                    <div class="draft-image">
                        <i class="bi bi-floppy"></i>
                    </div>
                    <div class="draft-details">
                        <div class="draft-title">
                            <h4>${draftData.title || 'Untitled Draft'}</h4>
                        </div>
                        <div class="draft-delete">
                            <i class="bi bi-trash3" data-id="${draftId}"></i>
                        </div>
                    </div>
                `;

                draftCard.addEventListener('click', function(event) {
                    if (!event.target.classList.contains('bi-trash3')) {
                        openDraft(draftId, draftData);
                    }
                });

                const trashIcon = draftCard.querySelector('.bi-trash3');
                trashIcon.addEventListener('click', function(event) {
                    event.stopPropagation();
                    currentDraftId = draftId;
                    $('#deleteConfirmationModal').modal('show');
                });

                draftListContainer.appendChild(draftCard);
            });
        } catch (error) {
        }
    }

    function startAutosave() {
        if (autosaveInterval) {
            clearInterval(autosaveInterval); // Clear previous interval to avoid multiple autosaves
        }
        autosaveInterval = setInterval(autosaveDraft, 500); // Autosave every 30 seconds
    }

    // Function to delete Firestore document and associated storage files
    async function deleteDraftInfo(draftData, draftId) {
        try {
            if (!draftId) {
                throw new Error("Draft ID is undefined");
            }
    
            // Delete draft video file if it exists in storage
            if (draftData.videoURL && typeof draftData.videoURL === 'string' && draftData.videoURL.includes('dVideos')) {
                const draftVideoRef = ref(storage, draftData.videoURL);
                await deleteObject(draftVideoRef).catch(error => {
                    console.error("Error deleting video file:", error);
                    throw new Error("Failed to delete video file.");
                });
            }
    
            // Delete draft thumbnail file if it exists in storage
            if (draftData.thumbnailURL && typeof draftData.thumbnailURL === 'string' && draftData.thumbnailURL.includes('dThumbnails')) {
                const draftThumbnailRef = ref(storage, draftData.thumbnailURL);
                await deleteObject(draftThumbnailRef).catch(error => {
                    console.error("Error deleting thumbnail file:", error);
                    throw new Error("Failed to delete thumbnail file.");
                });
            }
    
            // Delete draft quiz images if they exist in storage
            if (draftData.quizQuestions) {
                for (const question of draftData.quizQuestions) {
                    if (question.imageFile && typeof question.imageFile === 'string' && question.imageFile.includes('dQuiz_images')) {
                        const draftImageRef = ref(storage, question.imageFile);
                        await deleteObject(draftImageRef).catch(error => {
                            console.error("Error deleting quiz image file:", error);
                            throw new Error("Failed to delete quiz image file.");
                        });
                    }
                }
            }
    
            // Delete the draft document from Firestore
            const draftDocRef = doc(db, 'onlineDrafts', draftId);
            await deleteDoc(draftDocRef).catch(error => {
                console.error("Error deleting Firestore document:", error);
                throw new Error("Failed to delete Firestore document.");
            });
    
        } catch (error) {
            console.error("Error deleting draft data:", error);
            throw error;
        }
    }    

    // Function to open a draft and populate the modal
    async function openDraft(draftId, draftData) {
        currentDraftId = draftId; // Assign the draftId to the global variable
        questionCount = 0;  // Ensure question count is reset
        startAutosave();
        
        // Update the global draftData so it's accessible in other functions
        window.draftData = draftData;

        // Populate title and category
        document.getElementById('videoTitleInput').value = draftData.title;
        document.getElementById('selectedCategory').textContent = draftData.category;

        try {
            // Fetch and display video and thumbnail from Firebase if they exist
            if (draftData.thumbnailURL) {
                const thumbnailRef = ref(storage, draftData.thumbnailURL);
                const thumbnailURL = await getDownloadURL(thumbnailRef);
                document.querySelector('.video-thumbnail-area').innerHTML = `<img src="${thumbnailURL}" class="img-thumbnail">`;
            } else {
                document.querySelector('.video-thumbnail-area').innerHTML = `<p>No thumbnail uploaded</p>`;
            }

            if (draftData.videoURL) {
                const videoRef = ref(storage, draftData.videoURL);
                const videoURL = await getDownloadURL(videoRef);
                document.querySelector('.video-upload-area').innerHTML = `
                    <video controls class="vid-thumbnail">
                        <source src="${videoURL}" type="video/mp4">
                    </video>
                `;
            } else {
                document.querySelector('.video-upload-area').innerHTML = `<p>No video uploaded</p>`;
            }

        } catch (error) {
            document.querySelector('.video-thumbnail-area').innerHTML = `<p>Error fetching thumbnail</p>`;
            document.querySelector('.video-upload-area').innerHTML = `<p>Error fetching video</p>`;
        }

        // Populate quiz questions
        const quizContent = document.querySelector('.quiz-content');
        quizContent.innerHTML = '';  // Clear previous quiz content

        if (draftData.quizQuestions && draftData.quizQuestions.length > 0) {
            draftData.quizQuestions.forEach((question, index) => {
                // Add question to the quiz
                addQuestion({
                    question: question.question,
                    options: question.options,
                    correctAnswer: question.correctAnswer,
                    imageURL: question.imageFile // Use the imageFile field to display the image
                });
            });
        } else {
            quizContent.innerHTML = `<p>No quiz questions available</p>`;
        }

        // Show modal
        $('#uploadModal').modal('show');
        
        // Call updatePreview and pass draftData to use it there explicitly
        updatePreview(draftData);    
    }

    async function autosaveDraft() {
        try {
            const title = document.getElementById('videoTitleInput').value.trim() || window.draftData?.title || '';
            const category = document.querySelector('.category .selected').textContent.trim() || window.draftData?.category || '';

            if (!title || !category) {
                return;  // Only autosave if there is sufficient information
            }

            const draftDocRef = doc(db, 'onlineDrafts', currentDraftId || '');  // Use the currentDraftId if it exists

            // Prepare video and thumbnail URLs
            let videoURL = window.draftData?.videoURL || '';  // Use draft video URL if not uploading new
            let thumbnailURL = window.draftData?.thumbnailURL || '';  // Use draft thumbnail URL if not uploading new

            const quizContainers = document.querySelectorAll('.quiz-container');
            const quizQuestions = [];

            quizContainers.forEach((container, index) => {
                const questionText = container.querySelector('.question-input input').value.trim() || window.draftData?.quizQuestions?.[index]?.question;
                const options = container.querySelectorAll('.question-options input[type="text"]');
                const correctOption = container.querySelector('.question-options input[type="radio"]:checked');

                quizQuestions.push({
                    question: questionText,
                    options: Array.from(options).map(opt => opt.value.trim()),
                    correctAnswer: Array.from(options).findIndex(opt => opt === correctOption?.nextElementSibling),
                    imageFile: window.draftData?.quizQuestions?.[index]?.imageFile || '', // If applicable, use draft quiz image
                });
            });

            // Save or update the draft document in Firestore
            await setDoc(draftDocRef, {
                title,
                category,
                videoURL,
                thumbnailURL,
                quizQuestions,
                updatedAt: new Date(),
            });

        } catch (error) {
        }await fetchDrafts();
    }

    // Ensure modal steps are properly initialized and managed
    $('#uploadModal').on('shown.bs.modal', function() {
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
        thumbnailUpload.addEventListener('change', function() {
            if (thumbnailUpload.files.length > 0) {
                const file = thumbnailUpload.files[0];
                const imageUrl = URL.createObjectURL(file);
                thumbnailBox.innerHTML = `<img src="${imageUrl}" class="img-thumbnail">`;
            }
        });
    }

    if (videoUpload) {
        videoUpload.addEventListener('change', function() {
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

    document.querySelector('.video-thumbnail-box').addEventListener('click', function() {
        if (thumbnailUpload) thumbnailUpload.click();
    });

    document.querySelector('.video-upload-box .video-upload-area').addEventListener('click', function(event) {
        event.preventDefault(); // Prevent the video from playing when the area is clicked
        videoUpload.click(); // Trigger video file selection
    });

    function addQuestion(questionData = null) {
        questionCount++; // Increment question count first
        const quizContent = document.querySelector('.quiz-content');
        const newQuestion = document.createElement('div');
        newQuestion.classList.add('quiz-container');
    
        // Correctly map the question and options from the passed data
        const questionText = questionData?.question || ''; // Fetch question text
        const optionValues = questionData?.options?.length
            ? questionData.options
            : ['', '', '', '']; // Ensure an array with four empty options if not provided
        const correctAnswer = questionData?.correctAnswer ?? null;
        const questionImageURL = questionData?.imageURL || ''; // Use the imageURL if provided
        const language = questionData?.language || 'Filipino'; // Set default language to 'English'

    
        // Use the incremented questionCount to display the question number right away
        newQuestion.innerHTML = `
            <div class="quiz-container-header">
                <h5>Question ${questionCount}</h5>
            </div>
            <!-- Language dropdown -->
            <div class="language-dropdown">
                <label for="languageSelect${questionCount}">Language:</label>
                <select id="languageSelect${questionCount}" class="language-select">
                    <option value="English" ${language === 'English' ? 'selected' : ''}>English</option>
                    <option value="Filipino" ${language === 'Filipino' ? 'selected' : ''}>Filipino</option>
                </select>
            </div>
            <div class="quiz-question">
                <div class="question-input">
                    <input type="text" value="${questionText}" placeholder="Type your question here...">
                </div>
                <div class="image-upload">
                    <h5>Upload an image for the question (optional)</h5>
                    <div class="image-upload-box">
                        <div class="image-upload-area">
                            ${questionImageURL ? `<img src="${questionImageURL}" class="img-thumbnail" alt="Question Image">` : `<i class="bi bi-image-fill"></i><p>Add Image</p>`}
                        </div>
                        <input type="file" id="imageUpload${questionCount}" accept="image/*" style="display: none;">
                    </div>
                </div>
                <div class="question-options">
                    <h5>Enter the options. Mark the correct answer.</h5>
                    ${optionValues.map((option, index) => `
                        <div class="option">
                            <input type="radio" id="option${index + 1}_${questionCount}" name="options${questionCount}" ${correctAnswer === index ? 'checked' : ''}>
                            <input type="text" value="${option}" placeholder="Option ${index + 1}">
                        </div>
                    `).join('')}
                </div>
                <div class="delete-question">
                    <button class="delete-question-btn">Delete</button>
                </div>
            </div>
        `;
    
        quizContent.appendChild(newQuestion);
    
        // Add event listeners for validation on the new question's input fields
        const questionInput = newQuestion.querySelector('.question-input input');
        const optionInputs = newQuestion.querySelectorAll('.question-options input[type="text"]');
        const radioButtons = newQuestion.querySelectorAll('.question-options input[type="radio"]');
    
        // Re-validate Step 2 when changes are made to the new question inputs
        questionInput.addEventListener('input', validateStep2);
        optionInputs.forEach(input => input.addEventListener('input', validateStep2));
        radioButtons.forEach(radio => radio.addEventListener('change', validateStep2));
    
        // Trigger validation after adding a new question
        validateStep2();
    
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
    
        const deleteButton = newQuestion.querySelector('.delete-question-btn');
        deleteButton.addEventListener('click', function () {
            quizContent.removeChild(newQuestion);
            updateQuestionNumbers();
            validateStep2(); // Re-validate after deleting a question
        });
    
        updateQuestionNumbers(); // Call this to ensure question numbers are updated correctly
    }    
    
    // Function to update question numbers dynamically
    function updateQuestionNumbers() {
        const quizContainers = document.querySelectorAll('.quiz-container');
    
        quizContainers.forEach((container, index) => {
            const header = container.querySelector('.quiz-container-header h5');
            header.textContent = `Question ${index + 1}`;  // Dynamically update the question number
        });
    
        questionCount = quizContainers.length; // Reset questionCount based on the number of questions
    }
    
    function updatePreview() {
    
        // Use window.draftData instead of passing it
        const draftData = window.draftData; 
    
        // Update category preview
        const selectedCategory = document.querySelector('.category .selected').textContent.trim() || draftData.category;
        if (selectedCategory && selectedCategory !== 'Select a category') {
            categoryPreviewContainer.innerHTML = `<p>${selectedCategory}</p>`;
        } else {
            categoryPreviewContainer.innerHTML = `<p>No category selected</p>`;
        }
    
        // Update video title preview
        const videoTitle = document.getElementById('videoTitleInput').value.trim() || draftData.title;
        if (videoTitlePreviewContainer) {
            videoTitlePreviewContainer.innerHTML = ''; // Clear previous title content
            if (videoTitle) {
                videoTitlePreviewContainer.innerHTML = `<p>${videoTitle}</p>`;
            } else {
                videoTitlePreviewContainer.innerHTML = `<p>No title provided</p>`;
            }
        }
    
        // Update video preview with either uploaded file or draft data
        const videoPreviewContainer = document.getElementById('videoPreviewContainer');
        const videoFile = videoUpload.files[0];
        const draftVideoURL = draftData.videoURL || '';  // Fallback to draft video URL
        if (videoFile) {
            const videoUrl = URL.createObjectURL(videoFile);
            videoPreviewContainer.innerHTML = `<video controls class="vid-thumbnail">
                                                    <source src="${videoUrl}" type="${videoFile.type}">
                                                    Your browser does not support the video tag.
                                                </video>`;
        } else if (draftVideoURL) {
            videoPreviewContainer.innerHTML = `<video controls class="vid-thumbnail">
                                                    <source src="${draftVideoURL}" type="video/mp4">
                                                </video>`;
        } else {
            videoPreviewContainer.innerHTML = `<p>No video uploaded</p>`;
        }
    
        // Update thumbnail preview with either uploaded file or draft data
        const thumbnailPreviewContainer = document.getElementById('thumbnailPreviewContainer');
        const thumbnailFile = thumbnailUpload.files[0];
        const draftThumbnailURL = draftData.thumbnailURL || '';  // Fallback to draft thumbnail URL
        if (thumbnailFile) {
            const thumbnailUrl = URL.createObjectURL(thumbnailFile);
            thumbnailPreviewContainer.innerHTML = `<div class="image-thumbnail">
                                                        <img src="${thumbnailUrl}" class="img-thumbnail">
                                                    </div>`;
        } else if (draftThumbnailURL) {
            thumbnailPreviewContainer.innerHTML = `<div class="image-thumbnail">
                                                        <img src="${draftThumbnailURL}" class="img-thumbnail">
                                                    </div>`;
        } else {
            thumbnailPreviewContainer.innerHTML = `<p>No thumbnail uploaded</p>`;
        }
    
        // Update quiz preview
        const quizPreviewContainer = document.getElementById('quizPreviewContainer');
        quizPreviewContainer.innerHTML = ''; // Clear previous content
        const quizContainers = document.querySelectorAll('#uploadModal .quiz-container');
    
        quizContainers.forEach((container, index) => {
            const questionText = container.querySelector('.question-input input').value || draftData.quizQuestions?.[index]?.question;
            const options = container.querySelectorAll('.question-options input[type="text"]');
            const correctOption = container.querySelector('.question-options input[type="radio"]:checked');
            const imageUploadInput = container.querySelector(`#imageUpload${index + 1}`);
            const draftQuizImageURL = draftData.quizQuestions?.[index]?.imageFile || '';  // Use draft image URL if available
            const language = container.querySelector('.language-select')?.value || draftData.quizQuestions?.[index]?.language || 'Filipino'; // Default to English if no data
    
            const quizPreviewItem = document.createElement('div');
            quizPreviewItem.classList.add('quiz-preview-item');
    
            // Add question text with number
            const questionPreview = document.createElement('h4');
            questionPreview.textContent = `Question ${index + 1}. ${questionText || ''}`;
            quizPreviewItem.appendChild(questionPreview);

            // Add language preview
            const languagePreview = document.createElement('p');
            languagePreview.textContent = `Language: ${language}`;
            quizPreviewItem.appendChild(languagePreview);
    
            // Add question image preview if an image was uploaded or from draftData
            if (imageUploadInput && imageUploadInput.files.length > 0) {
                const file = imageUploadInput.files[0];
                const imageUrl = URL.createObjectURL(file);
                const imagePreview = document.createElement('img');
                imagePreview.src = imageUrl;
                imagePreview.classList.add('img-thumbnail');
                imagePreview.alt = 'Uploaded Question Image';
                quizPreviewItem.appendChild(imagePreview);
            } else if (draftQuizImageURL) {
                const imagePreview = document.createElement('img');
                imagePreview.src = draftQuizImageURL;
                imagePreview.classList.add('img-thumbnail');
                imagePreview.alt = 'Draft Question Image';
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
                optionPreview.textContent = option.value || draftData.quizQuestions?.[index]?.options?.[optIndex]?.value || ''; // Use draft data as fallback
    
                optionWrapper.appendChild(radio);
                optionWrapper.appendChild(optionLabel); // Add the label with the custom class
                optionWrapper.appendChild(optionPreview);
    
                quizPreviewItem.appendChild(optionWrapper);
            });
    
            quizPreviewContainer.appendChild(quizPreviewItem);
        });
    }
    
    // Modal steps management
    const steps = ['step1', 'step2', 'step3'];
    let currentStepIndex = 0;

    const nextButton = document.querySelector('.modal-footer .next-btn');
    const backButton = document.querySelector('.modal-footer .back-btn');
    const saveButton = document.querySelector('.modal-footer .save-btn'); // Moved below its initialization

    // Show the initial step
    showStep(currentStepIndex);

    if (nextButton) {
        nextButton.addEventListener('click', function() {
            if (currentStepIndex < steps.length - 1) {
                currentStepIndex++;
                showStep(currentStepIndex);
            }
        });
    }

    if (backButton) {
        backButton.addEventListener('click', function() {
            if (currentStepIndex > 0) {
                currentStepIndex--;
                showStep(currentStepIndex);
            }
        });
    }

    function showStep(stepIndex) {
        steps.forEach(step => {
            const stepElement = document.getElementById(step);
            if (stepElement) {
                const videos = stepElement.querySelectorAll('video');
                videos.forEach(video => {
                    video.pause();
                    video.currentTime = 0; // Reset to the start
                });
                stepElement.classList.add('d-none');
            }
        });
    
        const currentStepElement = document.getElementById(steps[stepIndex]);
        if (currentStepElement) currentStepElement.classList.remove('d-none');
    
        updateButtonVisibility(stepIndex);
    
        // Call validateStep2 when displaying step2 to ensure correct button state
        if (stepIndex === 1) {
            validateStep2();
        }
    
        if (stepIndex === steps.length - 1) {
            updatePreview();
        }
    }    

    // Function to check if Step 1 is fulfilled
    function validateStep1() {
        // Check required fields in Step 1
        const videoTitleInput = document.getElementById('videoTitleInput');
        const category = document.querySelector('.category .selected').textContent.trim();
        const thumbnailUpload = document.getElementById('thumbnailUpload');
        const videoUpload = document.getElementById('videoUpload');
    
        // Validate if the video title is not empty, a category is selected, and a video is uploaded
        const isValid = videoTitleInput.value.trim() !== '' && 
                        category !== 'Select a category' &&
                        (thumbnailUpload.files.length > 0 || window.draftData?.thumbnailURL) &&
                        (videoUpload.files.length > 0 || window.draftData?.videoURL);
    
        // Enable or disable the next button based on validation
        nextButton.disabled = !isValid;
    }

    // Attach event listeners to the required fields in Step 1
    const videoTitleInput = document.getElementById('videoTitleInput');
    const categorySelect = document.querySelector('.category .selected');

    if (videoTitleInput) {
        videoTitleInput.addEventListener('input', validateStep1);
    }

    if (categorySelect) {
        const observer = new MutationObserver(() => {
            validateStep1(); // Call the validation whenever the category changes
        });
    
        // Configure the observer to listen for subtree modifications (e.g., text changes)
        observer.observe(categorySelect, { childList: true, subtree: true });
    }    

    if (thumbnailUpload) {
        thumbnailUpload.addEventListener('change', validateStep1); // Validate when a new thumbnail is uploaded
    }
    
    if (videoUpload) {
        videoUpload.addEventListener('change', validateStep1); // Validate when a new video is uploaded
    }
    
    // Call validateStep1 initially to ensure proper button state
    validateStep1();

    // Function to validate Step 2
    function validateStep2() {
        // Example of inputs that need to be validated in Step 2
        const questionInputs = document.querySelectorAll('.quiz-container .question-input input');
        const optionInputs = document.querySelectorAll('.quiz-container .question-options input[type="text"]');
        const correctOptions = document.querySelectorAll('.quiz-container .question-options input[type="radio"]:checked');

        // Check if all question inputs are filled
        const areQuestionsFilled = Array.from(questionInputs).every(input => input.value.trim() !== '');

        // Check if all option inputs are filled
        const areOptionsFilled = Array.from(optionInputs).every(input => input.value.trim() !== '');

        // Ensure each question has at least one correct option selected
        const areCorrectOptionsSelected = Array.from(document.querySelectorAll('.quiz-container')).every(container => {
            return container.querySelector('.question-options input[type="radio"]:checked');
        });

        // Enable or disable the next button based on validation
        const isStep2Valid = areQuestionsFilled && areOptionsFilled && areCorrectOptionsSelected;
        nextButton.disabled = !isStep2Valid;
    }

    // Attach event listeners to monitor changes in Step 2 inputs
    document.addEventListener('input', function(event) {
        if (event.target.closest('.quiz-container')) {
            validateStep2();
        }
    });

    function updateButtonVisibility(stepIndex) {
        if (backButton) backButton.style.display = stepIndex > 0 ? 'inline-block' : 'none';
        if (nextButton) nextButton.style.display = stepIndex < steps.length - 1 ? 'inline-block' : 'none';
        if (saveButton) saveButton.style.display = stepIndex === steps.length - 1 ? 'inline-block' : 'none';
    }

    saveButton.addEventListener('click', async function () {
        const title = videoTitleInput.value.trim() || window.draftData?.title || '';  
        const category = document.querySelector('.category .selected').textContent.trim() || window.draftData?.category || ''; 
    
        if (!title || !category) {
            return;
        }
    
        // Show loader
        document.getElementById('loader1').style.display = 'flex';
    
        try {
            const videoDocRef = doc(collection(db, 'videos'));
            const videoDocId = videoDocRef.id;
    
            // Handle video upload or draft video re-upload
            let videoURL = '';
            if (videoUpload.files.length > 0) {
                const finalVideoRef = ref(storage, `videos/${videoDocId}`);
                const file = videoUpload.files[0];
                await uploadBytes(finalVideoRef, file);
                videoURL = await getDownloadURL(finalVideoRef);
            } else if (window.draftData?.videoURL && window.draftData.videoURL.includes('dVideos')) {
                const finalVideoRef = ref(storage, `videos/${videoDocId}`);
                await reuploadUsingDraftFile(window.draftData.videoURL, finalVideoRef);
                videoURL = await getDownloadURL(finalVideoRef);
            }
    
            // Handle thumbnail upload or draft thumbnail re-upload
            let thumbnailURL = '';
            if (thumbnailUpload.files.length > 0) {
                const finalThumbnailRef = ref(storage, `thumbnails/${videoDocId}`);
                const file = thumbnailUpload.files[0];
                await uploadBytes(finalThumbnailRef, file);
                thumbnailURL = await getDownloadURL(finalThumbnailRef);
            } else if (window.draftData?.thumbnailURL && window.draftData.thumbnailURL.includes('dThumbnails')) {
                const finalThumbnailRef = ref(storage, `thumbnails/${videoDocId}`);
                await reuploadUsingDraftFile(window.draftData.thumbnailURL, finalThumbnailRef);
                thumbnailURL = await getDownloadURL(finalThumbnailRef);
            }
    
            // Process quiz questions
            const quizContainers = document.querySelectorAll('.quiz-container');
            let questions = [];
    
            for (const [index, container] of quizContainers.entries()) {
                const questionText = container.querySelector('.question-input input').value.trim() || window.draftData?.quizQuestions?.[index]?.question;
                const options = container.querySelectorAll('.question-options input[type="text"]');
                const correctOption = container.querySelector('.question-options input[type="radio"]:checked');

                // Get selected language for the question
                const languageSelect = container.querySelector('.language-select');
                const language = languageSelect ? languageSelect.value : (window.draftData?.quizQuestions?.[index]?.language || 'English'); // Default to English if not found
    
                // Handle image upload or draft image re-upload
                let questionImageURL = '';
                if (container.querySelector(`#imageUpload${index + 1}`).files.length > 0) {
                    const finalImageRef = ref(storage, `quiz_images/${videoDocId}_${index}`);
                    const file = container.querySelector(`#imageUpload${index + 1}`).files[0];
                    await uploadBytes(finalImageRef, file);
                    questionImageURL = await getDownloadURL(finalImageRef);
                } else if (window.draftData?.quizQuestions?.[index]?.imageFile && window.draftData.quizQuestions[index].imageFile.includes('dQuiz_images')) {
                    const finalImageRef = ref(storage, `quiz_images/${videoDocId}_${index}`);
                    await reuploadUsingDraftFile(window.draftData.quizQuestions[index].imageFile, finalImageRef);
                    questionImageURL = await getDownloadURL(finalImageRef);
                }
    
                const formattedOptions = Array.from(options).map((option, optIndex) => ({
                    label: `Option ${optIndex + 1}`,
                    value: option.value.trim()
                }));
    
                questions.push({
                    language: language,
                    question: questionText,
                    options: formattedOptions,
                    correctAnswer: Array.from(options).findIndex(option => option === correctOption?.nextElementSibling),
                    imageURL: questionImageURL || null,
                });
            }
    
            // Save the final data to Firestore
            await setDoc(videoDocRef, {
                title: title,
                category: category,
                videoURL: videoURL,
                thumbnailURL: thumbnailURL,
                createdAt: new Date(),
            });
    
            const quizDocRef = doc(db, 'quizzes', videoDocId);
            await setDoc(quizDocRef, {
                questions: questions,
                category: category,
                videoId: videoDocId,
                createdAt: new Date(),
            });
    
            // Delete draft data from Firestore and Firebase Storage after successful upload
            await deleteDraftData(window.draftData, currentDraftId);
    
            // Remove the draft card from the UI after successful save and deletion
            const draftCard = document.querySelector(`.draft-container[data-id="${currentDraftId}"]`);
            if (draftCard) draftCard.remove();
    
            // Hide loader and close modal
            document.getElementById('loader1').style.display = 'none';
            $('#uploadModal').modal('hide');  // Close modal
    
            // Show success notification
            document.getElementById('notificationModalBody').innerText = "Uploaded successfully!";
            $('#notificationModal').modal('show');
    
            // Optionally, refresh the drafts list to update the view
            await fetchDrafts();  // Refresh the drafts list to reflect changes
        } catch (error) {
            // Hide loader in case of error
            document.getElementById('loader1').style.display = 'none';
            // Show error notification
            document.getElementById('notificationModalBody').innerText = "Upload failed. Please try again.";
            $('#notificationModal').modal('show');
        }
    });              

    // Helper function to re-upload a file using the existing draft file URL
    async function reuploadUsingDraftFile(draftURL, finalRef) {
        try {
            const response = await fetch(draftURL);
            const blob = await response.blob();
            await uploadBytes(finalRef, blob);
        } catch (error) {
        }
    }

    // Function to delete Firestore document and associated storage files
    async function deleteDraftData(draftData, draftId) {
        try {
            if (!draftId) {
                throw new Error("Draft ID is undefined or null");
            }
    
            if (!draftData) {
                throw new Error("Draft data is undefined or invalid");
            }
    
            console.log("Deleting draft with ID:", draftId);
    
            // Temporarily stop any autosave or editing before deletion
            if (autosaveInterval) {
                clearInterval(autosaveInterval);
                autosaveInterval = null;
            }
    
            // Delete draft video file if it exists
            if (draftData.videoURL && draftData.videoURL.includes('dVideos')) {
                const draftVideoRef = ref(storage, draftData.videoURL);
                await deleteObject(draftVideoRef);
                console.log("Deleted video file:", draftData.videoURL);
            }
    
            // Delete draft thumbnail file if it exists
            if (draftData.thumbnailURL && draftData.thumbnailURL.includes('dThumbnails')) {
                const draftThumbnailRef = ref(storage, draftData.thumbnailURL);
                await deleteObject(draftThumbnailRef);
                console.log("Deleted thumbnail file:", draftData.thumbnailURL);
            }
    
            // Delete draft quiz images if they exist
            if (draftData.quizQuestions && Array.isArray(draftData.quizQuestions)) {
                for (const question of draftData.quizQuestions) {
                    if (question.imageFile && question.imageFile.includes('dQuiz_images')) {
                        const draftImageRef = ref(storage, question.imageFile);
                        await deleteObject(draftImageRef);
                        console.log("Deleted quiz image file:", question.imageFile);
                    }
                }
            }
    
            // Ensure the document is deleted only once
            const draftDocRef = doc(db, 'onlineDrafts', draftId);
            const draftSnapshot = await getDoc(draftDocRef);
    
            if (draftSnapshot.exists()) {
                await deleteDoc(draftDocRef);
                console.log("Draft document deleted:", draftId);
            } else {
                console.log(`Draft document with ID ${draftId} does not exist.`);
            }
    
            // Optionally refetch drafts to refresh the UI
            await fetchDrafts();
    
        } catch (error) {
            console.error("Error deleting draft:", error);
            throw error;
        }
    }

    // Fetch initial drafts
    fetchDrafts();
});