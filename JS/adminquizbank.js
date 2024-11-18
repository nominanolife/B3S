import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, doc, getDoc, collection, getDocs, writeBatch, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Your web app's Firebase configuration
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
const db = getFirestore(app);

let changesToApply = {};  // Track changes until publish is clicked

document.addEventListener("DOMContentLoaded", async function () {
    const selectedLanguageElement = document.querySelector('.selected');
    const dropdownOptions = document.querySelector('.dropdown-options');
    const languageFilter = document.getElementById('languageFilter');

    // Initially show all questions
    await fetchQuizQuestions(); // Default fetch without filtering

    // Toggle dropdown visibility
    selectedLanguageElement.addEventListener('click', function () {
        console.log('Toggling dropdown'); // Debugging log
        if (languageFilter.classList.contains('open')) {
            languageFilter.classList.remove('open'); // Hide dropdown
        } else {
            languageFilter.classList.add('open'); // Show dropdown
        }
    });

    // Handle dropdown selection
    dropdownOptions.addEventListener('click', async function (event) {
        const option = event.target.closest('.option');
        if (option) {
            const selectedLanguage = option.getAttribute('data-value');
            selectedLanguageElement.textContent = option.textContent; // Update displayed language
            languageFilter.classList.remove('open'); // Close dropdown

            // Fetch and render questions based on the selected language
            if (selectedLanguage === "all") {
                await fetchQuizQuestions(); // Show all questions
            } else {
                await fetchQuizQuestions(selectedLanguage); // Filter by selected language
            }
        }
    });

    // Close the dropdown when clicking outside
    document.addEventListener('click', function (event) {
        if (!languageFilter.contains(event.target)) {
            languageFilter.classList.remove('open'); // Close dropdown
        }
    });
});
async function fetchQuizQuestions(selectedLanguage = null) {
    const quizList = document.querySelector('.container-wrapper');
    quizList.innerHTML = ''; // Clear the quiz container

    try {
        const querySnapshot = await getDocs(collection(db, "quizzes"));
        const quizzes = {};
        const quizDocuments = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const category = data.category;

            if (data.questions && Array.isArray(data.questions)) {
                // Filter questions if a specific language is selected
                const filteredQuestions = selectedLanguage
                    ? data.questions.filter(question => {
                          return question.language &&
                                 typeof question.language === "string" &&
                                 question.language.toLowerCase() === selectedLanguage.toLowerCase();
                      })
                    : data.questions; // Show all questions if no language is selected

                if (filteredQuestions.length > 0) {
                    quizDocuments.push({ id: doc.id, data: { ...data, questions: filteredQuestions } });

                    if (!quizzes[category]) {
                        quizzes[category] = [];
                    }

                    quizzes[category].push(...filteredQuestions);
                }
            }
        });

        // Render questions grouped by category
        quizDocuments.forEach((quizDoc, index) => {
            const category = quizDoc.data.category;

            quizList.insertAdjacentHTML('beforeend', `
                <div class="container-wrapper-wrap">
                    <div class="header-container">
                        <h3 class="category-title">${category}</h3>
                        <label for="selectAll${index}" class="custom-checkbox">
                            <input type="checkbox" id="selectAll${index}" name="select_all_${index}" class="select-all-checkbox" data-quiz-id="${quizDoc.id}"> 
                            <span class="checkbox-label">Select All</span>
                        </label>
                    </div>
                    <div class="container-box" id="category-${index}"></div>
                </div>
            `);

            const categoryBox = document.getElementById(`category-${index}`);
            let allActive = true;

            quizDoc.data.questions.forEach((question, questionIndex) => {
                const optionsHTML = question.options.map((option, i) => `
                    <p>${String.fromCharCode(65 + i)}. ${option.value}</p>
                `).join('');

                if (!question.active) {
                    allActive = false;
                }

                categoryBox.insertAdjacentHTML('beforeend', `
                    <div class="question">
                        <div class="question-header">
                            <div class="question-text">
                                <h5>Language: ${question.language || "Not specified"}</h5> <!-- Display language above question -->
                                <p>Question ${questionIndex + 1}: ${question.question}</p>
                            </div>
                            <label class="custom-checkbox">
                                <input type="checkbox" name="select_${category}_${questionIndex}" class="question-checkbox" data-quiz-id="${quizDoc.id}" data-question-index="${questionIndex}" ${question.active ? 'checked' : ''}> 
                                <span class="checkbox-label"></span>
                            </label>
                        </div>
                        <div class="options">
                            ${optionsHTML}
                        </div>
                    </div>
                `);
            });

            const selectAllCheckbox = document.getElementById(`selectAll${index}`);
            selectAllCheckbox.checked = allActive;
        });

        // Add the footer dynamically after questions are rendered
        if (!document.querySelector('.footer')) { // Prevent duplicate footers
            addFooterWithPublishButton();
        }

        // Event listener for individual "Select All" in each category
        document.querySelectorAll('.select-all-checkbox').forEach((selectAllCheckbox) => {
            const quizId = selectAllCheckbox.dataset.quizId;

            selectAllCheckbox.addEventListener('change', (event) => {
                const checkboxes = document.querySelectorAll(`.question-checkbox[data-quiz-id="${quizId}"]`);
                checkboxes.forEach(checkbox => {
                    checkbox.checked = event.target.checked;
                    trackQuestionChange(quizId, checkbox.dataset.questionIndex, checkbox.checked);  // Track changes
                });
            });
        });

        // Set up listeners for individual question checkboxes
        setupCheckboxListeners();

    } catch (error) {
        console.error("Error fetching or rendering quiz questions:", error);
    }
}



// Track changes for batch write
function trackQuestionChange(quizId, questionIndex, isActive) {
    if (!changesToApply[quizId]) {
        changesToApply[quizId] = {};
    }
    changesToApply[quizId][questionIndex] = isActive; // Store the active status
}

// Set up listeners for individual question checkboxes
function setupCheckboxListeners() {
    document.querySelectorAll('.question-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (event) => {
            const quizId = checkbox.dataset.quizId;
            const questionIndex = checkbox.dataset.questionIndex;

            // Track changes to the specific question
            trackQuestionChange(quizId, questionIndex, checkbox.checked);

            // Find the associated 'Select All' checkbox for this category
            const selectAllCheckbox = document.querySelector(`.select-all-checkbox[data-quiz-id="${quizId}"]`);

            // Check if all checkboxes in the category are still checked
            const checkboxes = document.querySelectorAll(`.question-checkbox[data-quiz-id="${quizId}"]`);
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);

            // Update 'Select All' checkbox based on individual checkbox states
            selectAllCheckbox.checked = allChecked;
        });
    });
}

// Function to display the notification modal
function showNotificationModal(message) {
    const notificationModal = new bootstrap.Modal(document.getElementById('notificationModal')); // Initialize modal
    const modalBody = document.getElementById('notificationModalBody'); // Get the modal body element

    modalBody.innerText = message;  // Set the custom message

    notificationModal.show();  // Show the notification modal
}

// Batch update to Firestore on publish
async function applyChangesToFirestore() {
    const batch = writeBatch(db);  // Initialize batch

    // Iterate over tracked changes and batch update
    for (const quizId in changesToApply) {
        const quizDocRef = doc(db, "quizzes", quizId);
        const quizDoc = await getDoc(quizDocRef);

        if (!quizDoc.exists()) {
           
            continue;
        }

        const quizData = quizDoc.data();
        const updatedQuestions = [...quizData.questions];

        // Apply the tracked changes to the questions array
        for (const questionIndex in changesToApply[quizId]) {
            updatedQuestions[questionIndex].active = changesToApply[quizId][questionIndex];
        }

        // Batch update the document
        batch.update(quizDocRef, { questions: updatedQuestions });
    }

    // Commit the batch
    await batch.commit();
  

    // Reset tracking
    changesToApply = {};

    // Show the notification modal with success message
    showNotificationModal('Publish successfully!');
}

// Function to dynamically add the footer and publish button
function addFooterWithPublishButton() {
    // Create footer element
    const footer = document.createElement('div');
    footer.classList.add('footer');

    // Create publish button
    const publishButton = document.createElement('button');
    publishButton.type = 'button';
    publishButton.classList.add('publish-btn');
    publishButton.innerText = 'Publish';

    // Append button to footer
    footer.appendChild(publishButton);

    // Append footer to the main-content or wherever you want it in your page structure
    const mainContent = document.querySelector('.page-content');
    if (mainContent) {
        mainContent.appendChild(footer);  // Add footer dynamically
    }

    // Setup publish button functionality
    setupPublishButton();  // This function handles the publish logic
}

// Setup publish button with confirmation modal functionality
function setupPublishButton() {
    const publishButton = document.querySelector('.publish-btn');
    const confirmationModalElement = document.getElementById('confirmationModal');
    const confirmationModal = new bootstrap.Modal(confirmationModalElement); // Initialize Bootstrap modal
    const confirmPublishButton = document.getElementById('confirmButton');

    if (!publishButton) {
       
        return;
    }

    // Open the confirmation modal when the publish button is clicked
    publishButton.addEventListener('click', () => {
        confirmationModal.show();  // Show the confirmation modal
    });

    // Confirm action: Apply changes to Firestore
    confirmPublishButton.addEventListener('click', async () => {
        try {
            // Apply all tracked changes to Firestore using batch
            await applyChangesToFirestore();
          
        } catch (error) {
          
        } finally {
            confirmationModal.hide();  // Hide modal after confirmation
        }
    });
}