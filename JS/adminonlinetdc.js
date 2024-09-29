import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js';
import { getFirestore, collection, addDoc, doc, getDocs, getDoc, updateDoc, deleteDoc, query, where, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBflGD3TVFhlOeUBUPaX3uJTuB-KEgd0ow",
    authDomain: "authentication-d6496.firebaseapp.com",
    projectId: "authentication-d6496",
    storageBucket: "authentication-d6496.appspot.com",
    messagingSenderId: "195867894399",
    appId: "1:195867894399:web:596fb109d308aea8b6154a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);

let quizQuestions = []; // Declare this globally to be used across functions
let editingVideoId = null;  // Holds the ID of the video being edited
let videoIdToDelete = null;  // To store videoId for deletion

async function fetchSavedVideosAndQuizzes() {
    try {
        // Reference to Firestore collections
        const videosCollection = collection(db, 'videos');
        const quizzesCollection = collection(db, 'quizzes');
        
        // Fetch all documents from 'videos' and 'quizzes' collections
        const videosSnapshot = await getDocs(videosCollection);
        const quizzesSnapshot = await getDocs(quizzesCollection);

        // Check if videosSnapshot has documents
        if (videosSnapshot.empty) {
            console.error("No videos found in Firestore.");
            return;
        }

        // Clear any existing content in the course-content-list container
        const courseContentList = document.querySelector('.course-content-list');
        courseContentList.innerHTML = '';  // Clear out the default static content

        // Map quizzes to video IDs
        const quizzesMap = {};
        quizzesSnapshot.forEach(quizDoc => {
            const quizData = quizDoc.data();
            quizzesMap[quizData.videoId] = quizData;
        });

        videosSnapshot.forEach(doc => {
            const videoData = doc.data(); // Get the video document data
            const videoId = doc.id; // Get the video document ID
        
            console.log("Rendering video: ", videoData); // Check if the videos are rendering
        
            // Create a new course card for each video
            const courseCard = document.createElement('div');
            courseCard.classList.add('course-card');
        
            // Create and append the course image (thumbnail)
            const courseImage = document.createElement('div');
            courseImage.classList.add('course-image');
            const thumbnail = document.createElement('img');
            thumbnail.src = videoData.thumbnailURL;
            thumbnail.alt = videoData.title;
            thumbnail.classList.add('video-thumbnail');
            courseImage.appendChild(thumbnail);
        
            // Create and append the course details (title)
            const courseDetails = document.createElement('div');
            courseDetails.classList.add('course-details');
            const courseTitle = document.createElement('div');
            courseTitle.classList.add('course-title');
            const title = document.createElement('h3');
            title.textContent = videoData.title;
            courseTitle.appendChild(title);
            courseDetails.appendChild(courseTitle);
        
            // Add Edit and Delete buttons
            const courseOptions = document.createElement('div');
            courseOptions.classList.add('course-options');
            const threeDots = document.createElement('i');
            threeDots.classList.add('bi', 'bi-three-dots-vertical');
            const optionsDropdown = document.createElement('div');
            optionsDropdown.classList.add('triple-dot-options');
            const editButton = document.createElement('i');
            editButton.classList.add('option-dropdown', 'edit-btn');
            editButton.textContent = 'Edit';
            editButton.onclick = () => editLesson(videoId); // Attach edit functionality
            const deleteButton = document.createElement('i');
            deleteButton.classList.add('option-dropdown', 'delete-btn');
            // Updated deleteButton functionality
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => showDeleteModal(videoId); 
            optionsDropdown.appendChild(editButton);
            optionsDropdown.appendChild(deleteButton);
            courseOptions.appendChild(threeDots);
            courseOptions.appendChild(optionsDropdown);
            courseDetails.appendChild(courseOptions);
        
            // Append course image and details to the course card
            courseCard.appendChild(courseImage);
            courseCard.appendChild(courseDetails);
        
            // Append the new course card to the course-content-list
            courseContentList.appendChild(courseCard);
        
            // **Add this part to toggle the dropdown visibility**
            threeDots.addEventListener('click', function () {
                const options = this.nextElementSibling;
                if (options) options.style.display = options.style.display === 'block' ? 'none' : 'block';
            });
        });

    } catch (error) {
        console.error("Error fetching videos and quizzes:", error);
        alert('Failed to fetch videos and quizzes. Please try again.');
    }
}

async function editLesson(videoId) {
    editingVideoId = videoId;  // Set the editingVideoId
    try {
        // Fetch video data
        const videoDocRef = doc(db, 'videos', videoId);
        const videoDoc = await getDoc(videoDocRef);
        const videoData = videoDoc.data();

        // Fetch quiz data
        const quizQuery = query(collection(db, 'quizzes'), where('videoId', '==', videoId));
        const quizSnapshot = await getDocs(quizQuery);

        let quizData = null;
        if (!quizSnapshot.empty) {
            quizSnapshot.forEach(quizDoc => {
                quizData = quizDoc.data();
            });
        }

        // Log the data to check if it's correctly fetched
        console.log('Video Data:', videoData);
        console.log('Quiz Data:', quizData);

        // Populate Video Fields
        document.getElementById('editVideoTitleInput').value = videoData.title;
        
        // Check if category exists in Firestore data and populate it
        const selectedCategoryElement = document.querySelector('#editSelectedCategory');
        if (videoData.category) {
            selectedCategoryElement.innerHTML = videoData.category;
        } else {
            selectedCategoryElement.innerHTML = 'Select a category';  // Fallback if no category is found
            console.error('No category found for this video.');
        }

        // Populate video thumbnail and video
        document.querySelector('#editModal .video-thumbnail-box .video-thumbnail-area').innerHTML = 
            `<img src="${videoData.thumbnailURL}" class="img-thumbnail">`;

        document.querySelector('#editModal .video-upload-box .video-upload-area').innerHTML = 
            `<video controls class="vid-thumbnail">
                <source src="${videoData.videoURL}" type="video/mp4">
                Your browser does not support the video tag.
            </video>`;

        // Populate Quiz Fields
        if (quizData && quizData.questions) {
            quizQuestions = quizData.questions; // Store fetched quiz data into quizQuestions[]
            populateQuizFields(quizQuestions); // Call a function to populate the quiz fields
        }

        // Open the modal
        $('#editModal').modal('show');

    } catch (error) {
        console.error('Error fetching video/quiz data for editing:', error);
    }
}

function populateQuizFields(questions) {
    const quizContent = document.querySelector('.edit-quiz-container .quiz-content');
    
    // Clear existing questions before populating new ones
    quizContent.innerHTML = '';  
    let questionCount = 0;  // Initialize questionCount to 0 or the correct initial value

    questions.forEach((question, index) => {
        if (!question || !question.options || question.options.length === 0) {
            console.error(`Question or options missing for question index: ${index}`);
            return; // Skip this question if it's invalid
        }

        const questionContainer = document.createElement('div');
        questionContainer.classList.add('quiz-container');

        // Increment the question count for each new question
        questionCount++;

        // Create option labels (A, B, C, D)
        const optionLabels = ['A', 'B', 'C', 'D'];

        // Determine if there's an existing image for the question
        const questionImage = question.imageURL || '';  // Assuming imageURL contains the image path, if available

        // Build question and options UI
        const questionHTML = `
            <div class="quiz-container-header">
                <h5>Question ${questionCount}</h5>  <!-- Use questionCount -->
            </div>
            <div class="quiz-question">
                <div class="question-input">
                    <input type="text" value="${question.question}" placeholder="Enter your question..." data-index="${index}" class="question-text">
                </div>
                <div class="image-upload">
                    <h5>Upload an image for the question (optional)</h5>
                    <div class="image-upload-box">
                        <div class="image-upload-area">
                            ${questionImage 
                                ? `<img src="${questionImage}" class="img-thumbnail" alt="Uploaded Image">` 
                                : '<i class="bi bi-image-fill"></i><p>Add Image</p>'}
                        </div>
                        <input type="file" id="imageUpload${questionCount}" accept="image/*" style="display: none;">
                    </div>
                </div>
                <div class="question-options">
                    ${question.options.map((option, i) => `
                        <div class="option">
                            <input type="radio" name="options${index}" ${question.correctAnswer === i ? 'checked' : ''} class="correct-option" data-index="${index}" data-option="${i}">
                            <span class="option-label">${optionLabels[i]}.</span>
                            <input type="text" value="${option.value}" placeholder="Option ${i + 1}" class="option-value" data-index="${index}" data-option="${i}">
                        </div>
                    `).join('')}
                </div>
        `;

        // Insert the question and its options into the container
        questionContainer.innerHTML = questionHTML;

        // Append the container to the quiz content area
        quizContent.appendChild(questionContainer);

        // Add event listeners for dynamic updates
        questionContainer.querySelector('.question-text').addEventListener('input', updateEditPreview);
        
        const optionInputs = questionContainer.querySelectorAll('.option-value');
        optionInputs.forEach(optionInput => {
            optionInput.addEventListener('input', updateEditPreview);
        });
        
        const radioButtons = questionContainer.querySelectorAll('.correct-option');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', updateEditPreview);
        });

        // Add image upload functionality
        const imageUploadInput = questionContainer.querySelector(`#imageUpload${questionCount}`);
        const imageUploadBox = questionContainer.querySelector('.image-upload-box .image-upload-area');
        
        // Trigger file input when clicking the upload area
        questionContainer.querySelector('.image-upload-box').addEventListener('click', function () {
            imageUploadInput.click();
        });

        // Display image thumbnail when an image is uploaded
        imageUploadInput.addEventListener('change', function () {
            if (imageUploadInput.files.length > 0) {
                const file = imageUploadInput.files[0];
                const imageUrl = URL.createObjectURL(file);
                imageUploadBox.innerHTML = `<img src="${imageUrl}" class="img-thumbnail" alt="${file.name}">`;
            }
        });
    });
}


function updateEditPreview() {
    console.log("Updating preview based on form data");

    const videoTitleContainer = document.getElementById('editVideoTitlePreviewContainer');
    const videoTitle = document.getElementById('editVideoTitleInput').value.trim();

    if (videoTitleContainer) {
        videoTitleContainer.innerHTML = ''; // Clear previous title content
        if (videoTitle) {
            videoTitleContainer.innerHTML = `<h5>${videoTitle}</h5>`;
        } else {
            videoTitleContainer.innerHTML = `<p>No title provided</p>`;
        }
    }

    // Video preview
    const videoPreviewContainer = document.getElementById('editVideoPreviewContainer');
    const videoFile = document.getElementById('editVideoUpload').files[0];
    const videoUrl = videoFile ? URL.createObjectURL(videoFile) : document.querySelector('#editModal .video-upload-box video source').src;

    if (videoPreviewContainer) {
        videoPreviewContainer.innerHTML = '';
        if (videoUrl) {
            videoPreviewContainer.innerHTML = `
                <video controls class="vid-thumbnail">
                    <source src="${videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>`;
        } else {
            videoPreviewContainer.innerHTML = `<p>No video available</p>`;
        }
    }

    // Thumbnail preview
    const thumbnailPreviewContainer = document.getElementById('editThumbnailPreviewContainer');
    const thumbnailFile = document.getElementById('editThumbnailUpload').files[0];
    const thumbnailUrl = thumbnailFile ? URL.createObjectURL(thumbnailFile) : document.querySelector('#editModal .video-thumbnail-area img').src;

    if (thumbnailPreviewContainer) {
        thumbnailPreviewContainer.innerHTML = '';
        if (thumbnailUrl) {
            thumbnailPreviewContainer.innerHTML = `
                <div class="image-thumbnail">
                    <img src="${thumbnailUrl}" class="img-thumbnail">
                </div>`;
        } else {
            thumbnailPreviewContainer.innerHTML = `<p>No thumbnail available</p>`;
        }
    }

    // Category preview
    const categoryPreviewContainer = document.getElementById('editCategoryPreviewContainer');
    const selectedCategory = document.querySelector('#editSelectedCategory').textContent;

    if (categoryPreviewContainer) {
        categoryPreviewContainer.innerHTML = '';
        if (selectedCategory) {
            categoryPreviewContainer.innerHTML = `<p>${selectedCategory}</p>`;
        } else {
            categoryPreviewContainer.innerHTML = `<p>No category selected</p>`;
        }
    }

    // Quiz preview (no changes needed for this part)
    const quizPreviewContainer = document.getElementById('editQuizPreviewContainer');
    if (quizPreviewContainer) {
        quizPreviewContainer.innerHTML = '';

        const quizContainers = document.querySelectorAll('.edit-quiz-container .quiz-container');

        if (quizContainers.length > 0) {
            quizContainers.forEach((container, index) => {
                const questionText = container.querySelector('.question-input input').value.trim();
                const options = container.querySelectorAll('.question-options input[type="text"]');
                const correctOptionIndex = Array.from(container.querySelectorAll('.question-options input[type="radio"]')).findIndex(radio => radio.checked);
                const imageUploadInput = container.querySelector(`#imageUpload${index + 1}`);
                const imageFile = imageUploadInput ? imageUploadInput.files[0] : null;
                let imageUrl = imageFile ? URL.createObjectURL(imageFile) : null;

                const hasValidOptions = Array.from(options).some(option => option.value.trim() !== '');

                if (questionText && hasValidOptions) {
                    const quizPreviewItem = document.createElement('div');
                    quizPreviewItem.classList.add('quiz-preview-item');

                    // Add question text with number
                    const questionPreview = document.createElement('h4');
                    questionPreview.textContent = `Question ${index + 1}. ${questionText}`;
                    quizPreviewItem.appendChild(questionPreview);

                    // Add question image preview if an image is uploaded
                    if (imageUrl) {
                        const imagePreview = document.createElement('img');
                        imagePreview.src = imageUrl;
                        imagePreview.classList.add('img-thumbnail');
                        imagePreview.alt = 'Uploaded Question Image';
                        quizPreviewItem.appendChild(imagePreview);
                    }

                    // Add options with labels (A, B, C, D)
                    const optionLabels = ['A', 'B', 'C', 'D'];
                    options.forEach((option, optIndex) => {
                        const optionValue = option.value.trim();
                        if (optionValue) {
                            const optionWrapper = document.createElement('div');
                            optionWrapper.classList.add('option');

                            const radio = document.createElement('input');
                            radio.type = 'radio';
                            radio.name = `previewOptions${index}`;
                            radio.disabled = true;
                            radio.checked = (correctOptionIndex === optIndex);

                            const optionLabel = document.createElement('span');
                            optionLabel.classList.add('option-label');
                            optionLabel.textContent = `${optionLabels[optIndex]}: `;

                            const optionPreview = document.createElement('p');
                            optionPreview.textContent = optionValue;

                            optionWrapper.appendChild(radio);
                            optionWrapper.appendChild(optionLabel);
                            optionWrapper.appendChild(optionPreview);

                            quizPreviewItem.appendChild(optionWrapper);
                        }
                    });

                    quizPreviewContainer.appendChild(quizPreviewItem);
                } else {
                    console.error("Question or valid options missing for question index:", index);
                }
            });
        } else {
            quizPreviewContainer.innerHTML = `<p>No quiz questions available</p>`;
        }
    }
}

async function deleteLesson(videoId) {
    try {
        // Step 1: Retrieve the video document to get the video and thumbnail URLs
        const videoDocRef = doc(db, 'videos', videoId);
        const videoDocSnapshot = await getDoc(videoDocRef);
        if (!videoDocSnapshot.exists()) {
            throw new Error('Video document not found.');
        }

        const videoData = videoDocSnapshot.data();
        const videoURL = videoData.videoURL;
        const thumbnailURL = videoData.thumbnailURL;

        // Step 2: Delete the video document from Firestore
        await deleteDoc(videoDocRef);
        console.log('Video document deleted successfully.');

        // Step 3: Delete related quiz document from Firestore
        const quizQuery = query(collection(db, 'quizzes'), where('videoId', '==', videoId));
        const quizSnapshot = await getDocs(quizQuery);
        quizSnapshot.forEach(async (quizDoc) => {
            await deleteDoc(doc(db, 'quizzes', quizDoc.id));
            console.log('Quiz document deleted successfully.');
        });

        // Step 4: Delete video file from Firebase Storage
        if (videoURL) {
            const videoRef = ref(storage, videoURL);
            await deleteObject(videoRef);
            console.log('Video file deleted successfully.');
        }

        // Step 5: Delete thumbnail file from Firebase Storage
        if (thumbnailURL) {
            const thumbnailRef = ref(storage, thumbnailURL);
            await deleteObject(thumbnailRef);
            console.log('Thumbnail file deleted successfully.');
        }

        // Step 6: Delete any quiz images associated with the video
        for (let i = 1; i <= quizSnapshot.docs.length; i++) {
            // Handle multiple file types (jpg and png)
            const quizImageExtensions = ['jpg', 'png']; // Add any other supported formats
            for (const extension of quizImageExtensions) {
                const quizImageRef = ref(storage, `quiz_images/${videoId}_question_${i}.${extension}`);
                try {
                    await deleteObject(quizImageRef);
                    console.log(`Quiz image ${i} with extension ${extension} deleted successfully.`);
                } catch (error) {
                    if (error.code === 'storage/object-not-found') {
                        console.log(`Quiz image ${i} with extension ${extension} not found (which is okay).`);
                    } else {
                        throw error; // Re-throw if it's another error
                    }
                }
            }
        }

        alert('Lesson and related data deleted successfully.');
        
    } catch (error) {
        console.error('Error deleting lesson:', error);
        alert('An error occurred while deleting the lesson. Please try again.');
    }
}

function showDeleteModal(videoId) {
    console.log('Opening delete alert for video:', videoId);

    // Instead of showing the modal, directly use an alert to confirm the delete action
    if (confirm('Are you sure you want to delete this lesson?')) {
        // If the user clicks "OK", proceed with the delete function
        deleteLesson(videoId);
    } else {
        // If the user clicks "Cancel", just log the action
        console.log('Deletion canceled for video ID:', videoId);
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    fetchSavedVideosAndQuizzes();
    const uploadContainer = document.querySelector('.upload-container');
    const nextButton = document.querySelector('.modal-footer .next-btn');
    const backButton = document.querySelector('.modal-footer .back-btn');
    const saveButton = document.querySelector('.modal-footer .save-btn');
    const editSaveBtn = document.querySelector('.modal-footer .editSavebtn');
    const tripleDotIcons = document.querySelectorAll('.bi-three-dots-vertical');
    const editButtons = document.querySelectorAll('.option-dropdown');
    const editModal = $('#editModal');
    const courseImage = document.querySelector('.course-image');
    const editCategorySelectElement = document.querySelector('#editModal .category');
    const editSelected = editCategorySelectElement.querySelector('.selected');
    const editOptionsContainer = editCategorySelectElement.querySelector('.dropdown-options');
    const editOptionsList = editOptionsContainer.querySelectorAll('.options');

    $('#uploadModal').on('shown.bs.modal', function () {
        const addQuestionBtn = document.querySelector('#uploadModal .add-question');
        addQuestionBtn.removeEventListener('click', addQuestion);  // Ensure no duplicate listeners
        addQuestionBtn.addEventListener('click', addQuestion);
    });
    
    $('#editModal').on('shown.bs.modal', function () {
        const addQuestionBtn = document.querySelector('#editModal .add-question');
        addQuestionBtn.removeEventListener('click', addEditQuestion);  // Ensure no duplicate listeners
        addQuestionBtn.addEventListener('click', addEditQuestion);
    });

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

    // Add functionality for editModal
    // Toggle the dropdown options display for editModal
    editSelected.addEventListener('click', () => {
        editOptionsContainer.style.display = editOptionsContainer.style.display === 'block' ? 'none' : 'block';
    });

    editOptionsList.forEach(option => {
        option.addEventListener('click', () => {
            editSelected.innerHTML = option.innerHTML;
            editOptionsContainer.style.display = 'none';
        });
    });

    document.addEventListener('click', (e) => {
        if (!editCategorySelectElement.contains(e.target)) {
            editOptionsContainer.style.display = 'none';
        }
    });

    const editModalSteps = ['editstep1', 'editstep2', 'editstep3'];
    let currentEditStep = 0;

    const editBackButton = document.querySelector('#editModal .back-btn');
    const editNextButton = document.querySelector('#editModal .next-btn');
    const editSaveButton = document.querySelector('#editModal .save-btn');

    function showEditStep(stepIndex) {
        editModalSteps.forEach(step => {
            const stepElement = document.getElementById(step);
            if (stepElement) stepElement.classList.add('d-none');
        });
        const currentStepElement = document.getElementById(editModalSteps[stepIndex]);
        if (currentStepElement) currentStepElement.classList.remove('d-none');
        updateEditButtonVisibility(stepIndex);

        if (stepIndex === 2) {
            updateEditPreview();
        }
    }

    function updateEditButtonVisibility(stepIndex) {
        if (editBackButton) editBackButton.style.display = stepIndex > 0 ? 'inline-block' : 'none';
        if (editNextButton) editNextButton.style.display = stepIndex < editModalSteps.length - 1 ? 'inline-block' : 'none';
        if (editSaveButton) editSaveButton.style.display = stepIndex === editModalSteps.length - 1 ? 'inline-block' : 'none';
    }

    if (editNextButton) {
        editNextButton.addEventListener('click', function () {
            if (currentEditStep < editModalSteps.length - 1) {
                currentEditStep++;
                showEditStep(currentEditStep);
            }
        });
    }

    if (editBackButton) {
        editBackButton.addEventListener('click', function () {
            if (currentEditStep > 0) {
                currentEditStep--;
                showEditStep(currentEditStep);
            }
        });
    }

    // Initialize the steps for editModal
    showEditStep(currentEditStep);

    editButtons.forEach(button => {
        if (button.textContent === 'Edit') {
            button.addEventListener('click', function () {
                editModal.modal({
                    backdrop: 'static',
                    keyboard: false
                });
                currentEditStep = 0;
                showEditStep(currentEditStep);
            });
        }
    });

    // Update the course image dynamically when a video thumbnail is uploaded
    if (thumbnailUpload) {
        thumbnailUpload.addEventListener('change', function () {
            if (thumbnailUpload.files.length > 0) {
                const file = thumbnailUpload.files[0];
                const imageUrl = URL.createObjectURL(file);
                thumbnailBox.innerHTML = `<img src="${imageUrl}" class="img-thumbnail">`;

                // Update course image dynamically
                if (courseImage) {
                    courseImage.innerHTML = `<img src="${imageUrl}" class="img-thumbnail" alt="Course Image">`;
                }
            } else {
                // Reset to default icon if no image is selected
                if (courseImage) {
                    courseImage.innerHTML = `<i class="bi bi-image-fill"></i>`;
                }
            }
        });
    }

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

    function addQuestion(questionData = null, index = null) {
        questionCount++;
        const quizContent = document.querySelector('.quiz-content');
        const newQuestion = document.createElement('div');
    
        newQuestion.classList.add('quiz-container');
    
        // Ensure that optionValues is always an array (even if questionData.options is undefined)
        const questionText = questionData?.question || '';  // Optional chaining to avoid errors
        const optionValues = questionData?.options?.length 
            ? questionData.options 
            : [{ label: '', value: '' }, { label: '', value: '' }, { label: '', value: '' }, { label: '', value: '' }];
        const correctAnswer = questionData?.correctAnswer ?? null;
    
        newQuestion.innerHTML = 
            `<div class="quiz-container-header">
                <h5>Question ${questionCount}</h5>
            </div>
            <div class="quiz-question">
                <div class="question-input">
                    <input type="text" value="${questionText}" placeholder="Type your question here...">
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
                        <input type="radio" id="option1_${questionCount}" name="options${questionCount}" ${correctAnswer === 0 ? 'checked' : ''}>
                        <input type="text" value="${optionValues[0].value}" placeholder="Option 1">
                    </div>
                    <div class="option">
                        <input type="radio" id="option2_${questionCount}" name="options${questionCount}" ${correctAnswer === 1 ? 'checked' : ''}>
                        <input type="text" value="${optionValues[1].value}" placeholder="Option 2">
                    </div>
                    <div class="option">
                        <input type="radio" id="option3_${questionCount}" name="options${questionCount}" ${correctAnswer === 2 ? 'checked' : ''}>
                        <input type="text" value="${optionValues[2].value}" placeholder="Option 3">
                    </div>
                    <div class="option">
                        <input type="radio" id="option4_${questionCount}" name="options${questionCount}" ${correctAnswer === 3 ? 'checked' : ''}>
                        <input type="text" value="${optionValues[3].value}" placeholder="Option 4">
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
            }
        });
    
        const deleteButton = newQuestion.querySelector('.delete-question-btn');
        deleteButton.addEventListener('click', function () {
            quizContent.removeChild(newQuestion);
            updateQuestionNumbers();
        });
    }

    addQuestion();

    function addEditQuestion(questionData = null) {
        const quizContent = document.querySelector('#editModal .quiz-content');
        const currentQuestionCount = quizContent.querySelectorAll('.quiz-container').length; // Get current question count
    
        const newQuestion = document.createElement('div');
        newQuestion.classList.add('quiz-container');
        
        // If questionData exists, populate with existing data, otherwise use empty defaults
        const questionText = questionData ? questionData.question : '';
        const optionValues = questionData && questionData.options ? questionData.options : [
            { label: '', value: '' },
            { label: '', value: '' },
            { label: '', value: '' },
            { label: '', value: '' }
        ];
        const correctAnswer = questionData ? questionData.correctAnswer : null;
    
        newQuestion.innerHTML = `
            <div class="quiz-container-header">
                <h5>Question ${currentQuestionCount + 1}</h5>  <!-- Set the question number based on current count -->
            </div>
            <div class="quiz-question">
                <div class="question-input">
                    <input type="text" value="${questionText}" placeholder="Type your question here...">
                </div>
                <div class="image-upload">
                    <h5>Upload an image for the question (optional)</h5>
                    <div class="image-upload-box">
                        <div class="image-upload-area">
                            <i class="bi bi-image-fill"></i>
                            <p>Add Image</p>
                        </div>
                        <input type="file" id="imageUpload${currentQuestionCount + 1}" accept="image/*" style="display: none;">
                    </div>
                </div>
                <div class="question-options">
                    <h5>Enter the options. Mark the correct answer.</h5>
                    ${optionValues.map((option, i) => `
                        <div class="option">
                            <input type="radio" id="option${i+1}_${currentQuestionCount + 1}" name="options${currentQuestionCount + 1}" ${correctAnswer === i ? 'checked' : ''}>
                            <input type="text" value="${option.value}" placeholder="Option ${i+1}">
                        </div>
                    `).join('')}
                </div>
                <div class="delete-question">
                    <button class="delete-question-btn">Delete</button>
                </div>`;
    
        // Append the new question to the quiz content area
        quizContent.appendChild(newQuestion);
    
        // Automatically scroll to the new question
        newQuestion.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
        // Add event listener for deleting the question
        const deleteButton = newQuestion.querySelector('.delete-question-btn');
        deleteButton.addEventListener('click', function () {
            quizContent.removeChild(newQuestion);
            updateQuestionNumbers();  // Update question numbering after deletion
        });
    
        // Handle image upload functionality
        const imageUploadInput = newQuestion.querySelector(`#imageUpload${currentQuestionCount + 1}`);
        const imageUploadBox = newQuestion.querySelector('.image-upload-box .image-upload-area');
    
        // Trigger file input when clicking the upload area
        newQuestion.querySelector('.image-upload-box').addEventListener('click', function () {
            imageUploadInput.click();
        });
    
        // Display image thumbnail when an image is uploaded
        imageUploadInput.addEventListener('change', function () {
            if (imageUploadInput.files.length > 0) {
                const file = imageUploadInput.files[0];
                const imageUrl = URL.createObjectURL(file);
                imageUploadBox.innerHTML = `<img src="${imageUrl}" class="img-thumbnail" alt="${file.name}">`;
            }
        });
    
        // After adding a question, update the numbering
        updateQuestionNumbers();
    }
    
    function updateQuestionNumbers() {
        const quizContainers = document.querySelectorAll('#editModal .quiz-container');
    
        // Loop through each container and update the question header to reflect the correct number
        quizContainers.forEach((container, index) => {
            const header = container.querySelector('.quiz-container-header h5');
            header.textContent = `Question ${index + 1}`;  // Set the question number based on its position
        });
    }
    
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
        const quizContainers = document.querySelectorAll('#uploadModal .quiz-container');
    
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
        
        // Update category preview
        const categoryPreviewContainer = document.getElementById('categoryPreviewContainer');
        const selectedCategory = document.querySelector('.category .selected').textContent; // Get the selected category text
        
        if (selectedCategory) {
            categoryPreviewContainer.innerHTML = `<p>${selectedCategory}</p>`;
        } else {
            categoryPreviewContainer.innerHTML = `<p>No category selected</p>`;
        }
    }

    saveButton.addEventListener('click', async function () {
        const videoFile = videoUpload.files[0];
        const thumbnailFile = thumbnailUpload.files[0];
        const title = videoTitleInput.value;
        const category = document.querySelector('.category .selected').textContent.trim();
    
        if (!videoFile || !thumbnailFile || !title || !category) {
            alert("Please fill in all required fields.");
            return;
        }
    
        try {
            // Step 1: Save video metadata first to generate videoId
            const videoDocRef = await addDoc(collection(db, 'videos'), {
                title: title,
                category: category,
                thumbnailURL: '', // Placeholder, updated later
                videoURL: ''      // Placeholder, updated later
            });
            const videoId = videoDocRef.id;  // Get the document ID to use for file renaming
    
            // Step 2: Rename and upload thumbnail to Firebase Storage using videoId
            const thumbnailRef = ref(storage, `thumbnails/${videoId}_thumbnail.${thumbnailFile.type.split('/')[1]}`);
            await uploadBytes(thumbnailRef, thumbnailFile);
            const thumbnailURL = await getDownloadURL(thumbnailRef);
    
            // Step 3: Rename and upload video to Firebase Storage using videoId
            const videoRef = ref(storage, `videos/${videoId}_video.${videoFile.type.split('/')[1]}`);
            await uploadBytes(videoRef, videoFile);
            const videoURL = await getDownloadURL(videoRef);
    
            // Step 4: Update video document with the correct URLs
            await setDoc(videoDocRef, {
                title: title,
                thumbnailURL: thumbnailURL,
                videoURL: videoURL,
                category: category
            }, { merge: true });  // Merge ensures that only the URLs are updated, without overwriting other fields
    
            // Step 5: Prepare and Save Quiz Data with the correct videoId and rename quiz images
            const quizContainers = document.querySelectorAll('.quiz-container');
            let quizQuestions = [];
    
            for (const [index, container] of quizContainers.entries()) {
                const questionText = container.querySelector('.question-input input').value;
                const options = container.querySelectorAll('.question-options input[type="text"]');
                const correctOption = container.querySelector('.question-options input[type="radio"]:checked');
    
                // Handle quiz image upload with custom file name using videoId and question index
                const imageFileInput = container.querySelector('.image-upload input[type="file"]');
                let imageUrl = null;
                if (imageFileInput && imageFileInput.files.length > 0) {
                    const imageFile = imageFileInput.files[0];
                    const customFileName = `${videoId}_question_${index + 1}.${imageFile.type.split('/')[1]}`;
                    const imageRef = ref(storage, `quiz_images/${customFileName}`);
                    await uploadBytes(imageRef, imageFile);
                    imageUrl = await getDownloadURL(imageRef); // Get the URL for the quiz image
                }
    
                let quizQuestion = {
                    question: questionText,
                    options: [],
                    correctAnswer: null,  // Will store the correct answer index
                    imageUrl: imageUrl  // Store the quiz image URL if available
                };
    
                options.forEach((option, optIndex) => {
                    quizQuestion.options.push({
                        label: `Option ${optIndex + 1}`,
                        value: option.value
                    });
                    if (correctOption && correctOption.id === option.previousElementSibling.id) {
                        quizQuestion.correctAnswer = optIndex;  // Save the correct answer index
                    }
                });
    
                quizQuestions.push(quizQuestion);
            }
    
            // Step 6: Save the quiz data with the correct videoId
            await addDoc(collection(db, 'quizzes'), {
                videoId: videoId,  // This links the quiz to the video
                category: category,
                questions: quizQuestions
            });
    
            alert('Video and Quiz saved successfully.');
    
        } catch (error) {
            console.error('Error saving video and quiz:', error);
            alert('An error occurred while saving the video and quiz. Please try again.');
        }
    });

    editSaveBtn.addEventListener('click', async function () {
        try {
            console.log("Starting the Firebase edit process...");
            
            // Collect data from the preview (already validated)
            const videoTitle = document.getElementById('editVideoTitleInput').value.trim();
            const videoUrlFromPreview = document.querySelector('#editVideoPreviewContainer video source')?.src;
            const thumbnailUrlFromPreview = document.querySelector('#editThumbnailPreviewContainer img')?.src;
            const selectedCategory = document.querySelector('#editSelectedCategory').textContent.trim();
            const quizQuestions = await collectQuizQuestions();  // Custom function to collect quiz questions from the preview
    
            // Validate title and category
            if (!videoTitle) {
                alert('Please provide a title for the video.');
                return;
            }
    
            if (!selectedCategory) {
                alert('Please select a category before saving.');
                return;
            }
    
            // Upload video and thumbnail files if changed
            const videoFile = document.getElementById('editVideoUpload').files[0];
            const thumbnailFile = document.getElementById('editThumbnailUpload').files[0];
    
            // Determine video and thumbnail URLs, use existing URLs if files are not changed
            let videoUrl = videoUrlFromPreview;
            let thumbnailUrl = thumbnailUrlFromPreview;
    
            // Handle video upload to Firebase Storage with videoId as the name
            if (videoFile) {
                const videoRef = ref(storage, `videos/${editingVideoId}_video.${videoFile.type.split('/')[1]}`);
                await uploadBytes(videoRef, videoFile);
                videoUrl = await getDownloadURL(videoRef);
            }
    
            // Handle thumbnail upload to Firebase Storage with videoId as the name
            if (thumbnailFile) {
                const thumbnailRef = ref(storage, `thumbnails/${editingVideoId}_thumbnail.${thumbnailFile.type.split('/')[1]}`);
                await uploadBytes(thumbnailRef, thumbnailFile);
                thumbnailUrl = await getDownloadURL(thumbnailRef);
            }
    
            // Ensure videoURL and thumbnailURL are valid
            if (!videoUrl || !thumbnailUrl) {
                alert('Error with video or thumbnail upload. Please ensure files are uploaded correctly.');
                return;
            }
    
            // Prepare video data to save/update in Firestore
            const updatedVideoData = {
                title: videoTitle,
                category: selectedCategory,  // Ensure the category is properly set
                videoURL: videoUrl,
                thumbnailURL: thumbnailUrl
            };
    
            console.log("Video Data to be saved: ", updatedVideoData);
    
            // Update video data using the existing videoId (editingVideoId)
            if (editingVideoId) {
                const videoDocRef = doc(db, 'videos', editingVideoId);
                await setDoc(videoDocRef, updatedVideoData, { merge: true });
            }
    
            // Prepare quiz data to save/update in Firestore
            const updatedQuizData = {
                videoId: editingVideoId,  // Use the same videoId from edit mode
                category: selectedCategory,  // Make sure the category is being set in quizzes too
                questions: quizQuestions
            };
    
            console.log("Quiz Data to be saved: ", updatedQuizData);
    
            // Check if a quiz with the same videoId exists
            const quizQuery = query(collection(db, 'quizzes'), where('videoId', '==', editingVideoId));
            const quizSnapshot = await getDocs(quizQuery);
    
            if (!quizSnapshot.empty) {
                // If quiz exists, update it
                const quizDocRef = quizSnapshot.docs[0].ref;  // Get the document reference from the query result
                await setDoc(quizDocRef, updatedQuizData, { merge: true });
            } else {
                // If no existing quiz, create a new document
                await addDoc(collection(db, 'quizzes'), updatedQuizData);
            }
    
            alert('Video and quiz updated successfully.');
    
        } catch (error) {
            console.error('Error saving video and quiz:', error);
            alert('An error occurred while saving the video and quiz. Please try again.');
        }
    });
    
    // Updated collectQuizQuestions function to handle image uploads for each question
    async function collectQuizQuestions() {
        const quizContainers = document.querySelectorAll('.edit-quiz-container .quiz-container');
        const quizQuestions = [];
    
        for (const container of quizContainers) {
            const questionText = container.querySelector('.question-input input').value.trim();
            const options = Array.from(container.querySelectorAll('.question-options input[type="text"]')).map(input => input.value.trim());
            const correctOptionIndex = Array.from(container.querySelectorAll('.question-options input[type="radio"]')).findIndex(radio => radio.checked);
    
            // Handle quiz image upload
            const imageFileInput = container.querySelector('.image-upload input[type="file"]');
            let imageUrl = null;
            if (imageFileInput && imageFileInput.files.length > 0) {
                const imageFile = imageFileInput.files[0];
                imageUrl = await uploadFileToFirebase(imageFile, `quiz_images/${editingVideoId}_${questionText}_image.${imageFile.type.split('/')[1]}`);  // Use videoId and question text to name the image
            } else {
                // If no new image, use existing image URL from preview (if available)
                imageUrl = container.querySelector('.image-upload-area img')?.src || null;
            }
    
            if (questionText && options.length > 0) {
                quizQuestions.push({
                    question: questionText,
                    options: options.map((option, idx) => ({ label: `Option ${idx + 1}`, value: option })),
                    correctAnswer: correctOptionIndex,
                    imageURL: imageUrl
                });
            }
        }
    
        return quizQuestions;
    }
    
    // Helper function to upload files to Firebase Storage with a custom filename
    async function uploadFileToFirebase(file, customFilename) {
        const fileRef = ref(storage, customFilename);  // Use custom filename for uniqueness
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
    }
});
