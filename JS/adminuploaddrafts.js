// Firebase configuration and imports for version 10.12.4
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, getBlob } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

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

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize variables
    let questionCount = 0;
    let currentDraftId = '';


    // Get all the trash icons and handle delete confirmation
    const trashIcons = document.querySelectorAll('.bi-trash3');
    trashIcons.forEach(icon => {
        icon.addEventListener('click', function(event) {
            event.stopPropagation(); // Stop event propagation to prevent triggering draft-container click
            $('#deleteConfirmationModal').modal('show');
        });
    });

    async function fetchDrafts() {
        try {
            const draftCollectionRef = collection(db, 'onlineDrafts');
            const draftSnapshot = await getDocs(draftCollectionRef);
    
            const draftListContainer = document.querySelector('.draft-list');
            draftListContainer.innerHTML = '';  // Clear the previous drafts
    
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
                            <h4>${draftData.title}</h4>
                        </div>
                        <div class="draft-delete">
                            <i class="bi bi-trash3" data-id="${draftId}"></i>
                        </div>
                    </div>
                `;
    
                draftCard.addEventListener('click', () => openDraft(draftId, draftData));
                draftListContainer.appendChild(draftCard);
            });
        } catch (error) {
            console.error("Error fetching drafts:", error);
        }
    }

    // Function to open a draft and populate the modal
    async function openDraft(draftId, draftData) {
        console.log("Draft data being passed to openDraft:", draftData);
        currentDraftId = draftId; // Assign the draftId to the global variable
        
        // Update the global draftData so it's accessible in other functions
        window.draftData = draftData; // Using window to make it explicitly available globally

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
            console.error("Error fetching thumbnail/video:", error);
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


    // Initialize the modal and bind event listeners
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

    const questionText = questionData?.question || '';
    const optionValues = questionData?.options?.length
        ? questionData.options
        : [{ label: '', value: '' }, { label: '', value: '' }, { label: '', value: '' }, { label: '', value: '' }];
    const correctAnswer = questionData?.correctAnswer ?? null;
    const questionImageURL = questionData?.imageURL || ''; // Use the imageURL if provided

    // Use the incremented questionCount to display the question number right away
    newQuestion.innerHTML = `
        <div class="quiz-container-header">
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
                        ${questionImageURL ? `<img src="${questionImageURL}" class="img-thumbnail" alt="Question Image">` : `<i class="bi bi-image-fill"></i><p>Add Image</p>`}
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
            </div>
        </div>
    `;

    quizContent.appendChild(newQuestion);

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
        console.log("Draft data being used in preview:", window.draftData); // Access global draftData explicitly
    
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
    
            const quizPreviewItem = document.createElement('div');
            quizPreviewItem.classList.add('quiz-preview-item');
    
            // Add question text with number
            const questionPreview = document.createElement('h4');
            questionPreview.textContent = `Question ${index + 1}. ${questionText || ''}`;
            quizPreviewItem.appendChild(questionPreview);
    
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

        if (stepIndex === steps.length - 1) {
            updatePreview();
        }
    }

    function updateButtonVisibility(stepIndex) {
        if (backButton) backButton.style.display = stepIndex > 0 ? 'inline-block' : 'none';
        if (nextButton) nextButton.style.display = stepIndex < steps.length - 1 ? 'inline-block' : 'none';
        if (saveButton) saveButton.style.display = stepIndex === steps.length - 1 ? 'inline-block' : 'none';
    }

    saveButton.addEventListener('click', async function () {
        console.log('Draft Data being used for saving:', window.draftData);
    
        const videoFile = videoUpload.files[0]; // Check if a new video is uploaded
        const thumbnailFile = thumbnailUpload.files[0]; // Check if a new thumbnail is uploaded
        const title = videoTitleInput.value.trim() || window.draftData?.title || '';  // Use draftData.title if input is empty
        const category = document.querySelector('.category .selected').textContent.trim() || window.draftData?.category || ''; // Use draftData.category if input is empty
    
        if (!title || !category) {
            console.log("Missing required fields: Title or Category.");
            return;
        }
    
        try {
            // Ensure we use draftData if no new video or thumbnail files are uploaded
            let videoURL = window.draftData?.videoURL || '';  // Fallback to draft video URL
            let thumbnailURL = window.draftData?.thumbnailURL || '';  // Fallback to draft thumbnail URL
    
            // Step 1: Handle Video Upload or Duplication
            if (videoFile) {
                console.log(`New video file uploaded: ${videoFile.name}`);
                const videoRef = ref(storage, `videos/${currentDraftId}`); // Use document ID as filename
                const snapshot = await uploadBytes(videoRef, videoFile);
                videoURL = await getDownloadURL(snapshot.ref);  // Use uploaded video URL
            } else if (window.draftData?.videoURL && window.draftData?.videoURL.includes('dVideos')) {
                // Duplicate video from draft folder to final folder using getBlob
                console.log(`Duplicating draft video from dVideos to videos folder.`);
                const draftVideoRef = ref(storage, window.draftData.videoURL);
                const videoBlob = await getBlob(draftVideoRef);
                const videoRef = ref(storage, `videos/${currentDraftId}`);
                await uploadBytes(videoRef, videoBlob);
                videoURL = await getDownloadURL(videoRef);
                // After successful duplication, delete the draft video
                await deleteObject(draftVideoRef);
                console.log('Draft video deleted from dVideos folder.');
            }
    
            // Step 2: Handle Thumbnail Upload or Duplication
            if (thumbnailFile) {
                console.log(`New thumbnail file uploaded: ${thumbnailFile.name}`);
                const thumbnailRef = ref(storage, `thumbnails/${currentDraftId}`);
                const snapshot = await uploadBytes(thumbnailRef, thumbnailFile);
                thumbnailURL = await getDownloadURL(snapshot.ref);  // Use uploaded thumbnail URL
            } else if (window.draftData?.thumbnailURL && window.draftData?.thumbnailURL.includes('dThumbnails')) {
                // Duplicate thumbnail from draft folder to final folder using getBlob
                console.log(`Duplicating draft thumbnail from dThumbnails to thumbnails folder.`);
                const draftThumbnailRef = ref(storage, window.draftData.thumbnailURL);
                const thumbnailBlob = await getBlob(draftThumbnailRef);
                const thumbnailRef = ref(storage, `thumbnails/${currentDraftId}`);
                await uploadBytes(thumbnailRef, thumbnailBlob);
                thumbnailURL = await getDownloadURL(thumbnailRef);
                // After successful duplication, delete the draft thumbnail
                await deleteObject(draftThumbnailRef);
                console.log('Draft thumbnail deleted from dThumbnails folder.');
            }
    
            // Step 3: Process Quiz Questions
            const quizContainers = document.querySelectorAll('.quiz-container');
            let quizQuestions = [];
    
            for (const [index, container] of quizContainers.entries()) {
                const questionText = container.querySelector('.question-input input').value.trim() || window.draftData?.quizQuestions?.[index]?.question;
                const options = container.querySelectorAll('.question-options input[type="text"]');
                const correctOption = container.querySelector('.question-options input[type="radio"]:checked');
    
                // Handle question image upload or duplication
                let questionImageURL = window.draftData?.quizQuestions?.[index]?.imageFile || '';
                const imageUploadInput = container.querySelector(`#imageUpload${index + 1}`);
    
                if (imageUploadInput.files.length > 0) {
                    console.log(`New question image file uploaded for Question ${index + 1}`);
                    const file = imageUploadInput.files[0];
                    const imageRef = ref(storage, `quiz_images/${currentDraftId}_${index}`);
                    const snapshot = await uploadBytes(imageRef, file);
                    questionImageURL = await getDownloadURL(snapshot.ref);  // Use uploaded image URL
                } else if (window.draftData?.quizQuestions?.[index]?.imageFile && window.draftData?.quizQuestions?.[index]?.imageFile.includes('dQuiz_images')) {
                    // Duplicate quiz image from draft folder to final folder using getBlob
                    console.log(`Duplicating draft quiz image for Question ${index + 1}`);
                    const draftImageRef = ref(storage, window.draftData.quizQuestions[index].imageFile);
                    const imageBlob = await getBlob(draftImageRef);
                    const imageRef = ref(storage, `quiz_images/${currentDraftId}_${index}`);
                    await uploadBytes(imageRef, imageBlob);
                    questionImageURL = await getDownloadURL(imageRef);
                    // After successful duplication, delete the draft quiz image
                    await deleteObject(draftImageRef);
                    console.log('Draft quiz image deleted from dQuiz_images folder.');
                }
    
                // Extract and save question data
                quizQuestions.push({
                    question: questionText,
                    options: Array.from(options).map(option => option.value.trim()),  // Map options to values
                    correctAnswer: Array.from(options).findIndex(option => option === correctOption?.nextElementSibling),  // Get the correct option index
                    imageURL: questionImageURL,  // Use either new or draft image
                });
            }
    
            // Step 4: Save to Firestore
            // Save video, thumbnail, and quizQuestions data to Firestore (videos and quizzes collections)
            const videoDocRef = doc(db, 'videos', currentDraftId);
            await setDoc(videoDocRef, {
                title: title,
                category: category,
                videoURL: videoURL,
                thumbnailURL: thumbnailURL,
                createdAt: new Date(),
            });
    
            const quizDocRef = doc(db, 'quizzes', currentDraftId);
            await setDoc(quizDocRef, {
                quizQuestions: quizQuestions,
                category: category,
                createdAt: new Date(),
            });
    
            // Step 5: Delete old draft files (from Storage) that are no longer needed
            await deleteFilesFromDraftStorage(window.draftData);
    
            const draftDocRef = doc(db, 'onlineDrafts', currentDraftId);
            await deleteDoc(draftDocRef);
            console.log(`Draft document with ID ${currentDraftId} deleted from Firestore.`);
    
            // Step 6: Log Everything for Verification
            console.log('Final Quiz Questions:', quizQuestions);
            console.log('Video Document Data:', {
                title: title,
                category: category,
                videoURL: videoURL,
                thumbnailURL: thumbnailURL,
                createdAt: new Date(),
            });
            console.log('Quiz Document Data:', {
                quizQuestions: quizQuestions,
                category: category,
                createdAt: new Date(),
            });
    
        } catch (error) {
            console.error('Error during saving and file deletion:', error);
        }
    });
    
    // Fetch initial drafts
    fetchDrafts();    
    
});
