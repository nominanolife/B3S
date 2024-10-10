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

// Fetch quiz questions from Firestore and render them grouped by category
document.addEventListener('DOMContentLoaded', () => {
    fetchQuizQuestions();  // Call the function to fetch quizzes when the page is loaded
});

/// Fetch and render quiz questions grouped by category
async function fetchQuizQuestions() {
    const quizList = document.querySelector('.container-wrapper');
    quizList.innerHTML = ''; // Clear the quiz container

    try {
        const querySnapshot = await getDocs(collection(db, "quizzes"));
        const quizzes = {};

        // Keep track of quiz document IDs
        const quizDocuments = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const category = data.category;

            quizDocuments.push({ id: doc.id, data: data });  // Store document ID

            if (!quizzes[category]) {
                quizzes[category] = [];
            }

            quizzes[category].push(...data.questions);
        });

        // Render the questions grouped by category
        quizDocuments.forEach((quizDoc, index) => {
            const category = quizDoc.data.category;

            // Insert Category Header
            quizList.insertAdjacentHTML('beforeend', `
                <div class="header-container">
                    <h3 class="category-title">${category}</h3>
                    <label for="selectAll${index}" class="select-all-label">
                        <input type="checkbox" id="selectAll${index}" name="select_all_${index}" class="select-all-checkbox" data-quiz-id="${quizDoc.id}"> Select All
                    </label>
                </div>
                <div class="container-box" id="category-${index}">
                </div>
            `);

            const categoryBox = document.getElementById(`category-${index}`);

            quizDoc.data.questions.forEach((question, questionIndex) => {
                const optionsHTML = question.options.map((option, i) => `
                    <p>${String.fromCharCode(65 + i)}. ${option.value}</p>
                `).join('');

                // Render each question with its active status (checked if active)
                categoryBox.insertAdjacentHTML('beforeend', `
                    <div class="question">
                        <div class="question-header">
                            <p>Question ${questionIndex + 1}: ${question.question}</p>
                            <label class="select-all-label">
                                <input type="checkbox" name="select_${category}_${questionIndex}" class="question-checkbox" data-quiz-id="${quizDoc.id}" data-question-index="${questionIndex}" ${question.active ? 'checked' : ''}> 
                            </label>
                        </div>
                        <div class="options">
                            ${optionsHTML}
                        </div>
                    </div>
                `);
            });
        });

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
        console.error("Error fetching quiz questions:", error);
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
            trackQuestionChange(checkbox.dataset.quizId, checkbox.dataset.questionIndex, checkbox.checked);
        });
    });
}

// Batch update to Firestore on publish
async function applyChangesToFirestore() {
    const batch = writeBatch(db);  // Initialize batch

    // Iterate over tracked changes and batch update
    for (const quizId in changesToApply) {
        const quizDocRef = doc(db, "quizzes", quizId);
        const quizDoc = await getDoc(quizDocRef);

        if (!quizDoc.exists()) {
            console.error("Quiz document not found for quizId:", quizId);
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
    console.log("Batch update completed.");

    // Reset tracking
    changesToApply = {};
}

// Setup publish button with batch write functionality
function setupPublishButton() {
    const publishButton = document.querySelector('.publish-btn');
    if (!publishButton) {
        console.error("Publish button not found");
        return;
    }

    publishButton.addEventListener('click', async () => {
        try {
            // Apply all tracked changes to Firestore using batch
            await applyChangesToFirestore();
            console.log("Changes applied successfully.");
        } catch (error) {
            console.error("Error applying batch changes:", error);
        }
    });
}

// Initialize the publish button with batch update functionality
setupPublishButton();
