import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

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
const storage = getStorage(app);
const auth = getAuth(app);

let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let userId = null; // Variable to store user ID

// Fetch and Randomize Quizzes
async function fetchAndRandomizeQuizzes() {
    try {
        const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
        quizzesSnapshot.forEach(doc => {
            const quizData = doc.data();
            quizData.questions.forEach(question => {
                questions.push({
                    ...question,
                    category: quizData.category
                });
            });
        });
        questions = questions.sort(() => Math.random() - 0.5); // Shuffle questions
        renderQuestion(currentQuestionIndex); // Render the first question
    } catch (error) {
        console.error("Error fetching quizzes:", error);
    }
}

// Save User Answer and Store in Session Storage
function saveUserAnswer(index) {
    const selectedOption = document.querySelector('input[name="questionanswer"]:checked');
    if (selectedOption) {
        userAnswers[index] = {
            question: questions[index].question,
            answer: selectedOption.value,
            category: questions[index].category
        };
        
        // Save to session storage
        sessionStorage.setItem('userAnswers', JSON.stringify(userAnswers));
    }
}

async function renderQuestion(index) {
    if (index >= 0 && index < questions.length) {
        // Update question number dynamically
        const questionHeader = document.querySelector('.quiz-container-header h5');
        questionHeader.textContent = `Question ${index + 1}`;

        const questionElement = document.querySelector('.quiz-question-body h4');
        const optionsContainer = document.querySelector('.question-options');
        const questionImageContainer = document.querySelector('.quiz-image');
        const categoryElement = document.querySelector('.quiz-category');

        const questionData = questions[index];

        // Update question text
        questionElement.textContent = `${index + 1}. ${questionData.question}`;

        // Update category text
        categoryElement.textContent = `${questionData.category}`;

        // Clear existing content in questionImageContainer
        questionImageContainer.innerHTML = '';

        // Dynamically create and add image if available
        if (questionData.imageURL) {
            try {
                // Fetch the image reference from Firebase Storage
                const imageRef = ref(storage, questionData.imageURL);  // Directly use the imageURL field from Firestore
                const imageUrl = await getDownloadURL(imageRef);
                questionImage.src = imageUrl;  // Update the image source with the Firebase URL
                questionImage.style.display = "block";  // Show the image if the URL is valid

                // Create an image element dynamically
                const imgElement = document.createElement('img');
                imgElement.src = imageUrl;
                imgElement.alt = "Quiz Image";
                imgElement.style.display = "block";

                // Append image to the container
                questionImageContainer.appendChild(imgElement);
            } catch (error) {
                console.error("Error fetching image from storage:", error);
                questionImage.style.display = "none";  // Hide image if an error occurs
            }
        } else {
            questionImage.style.display = "none";  // Hide the image if no imageURL is available
        }

        // Clear existing options
        optionsContainer.innerHTML = '';

        // Populate new options from the nested options array
        if (questionData.options && Array.isArray(questionData.options)) {
            questionData.options.forEach((option, i) => {
                const optionElement = document.createElement('div');
                optionElement.className = 'option';
                optionElement.innerHTML = `
                    <input type="radio" name="questionanswer" id="option${i}" value="${option.value}">
                    <span class="option-answer">${String.fromCharCode(65 + i)}.</span>
                    <p>${option.value}</p>
                `;
                optionsContainer.appendChild(optionElement);
            });
        }

        // Load saved answer from session storage if available
        const savedAnswers = JSON.parse(sessionStorage.getItem('userAnswers'));
        if (savedAnswers && savedAnswers[index]) {
            const savedAnswerValue = savedAnswers[index].answer;
            const optionToSelect = document.querySelector(`input[name="questionanswer"][value="${savedAnswerValue}"]`);
            if (optionToSelect) {
                optionToSelect.checked = true;
            }
        }

        // Update the progress bar and text
        updateProgress(index + 1);
        updateButtons();  // Update button visibility based on current question
    }
}

// Update Progress Bar
function updateProgress(currentQuestion) {
    const progressBarFill = document.querySelector(".progress-bar-fill");
    const progressText = document.querySelector(".quiz-progress span");
    const progressPercentage = (currentQuestion / questions.length) * 100;
    progressBarFill.style.width = progressPercentage + "%";
    progressText.textContent = `${currentQuestion} out of ${questions.length}`;
}

// Manage Button Visibility
function manageButtons(currentQuestion, totalQuestions) {
    const backBtn = document.querySelector('.back-btn');
    const nextBtn = document.querySelector('.next-btn');
    const saveBtn = document.querySelector('.save-btn');

    if (currentQuestion === 1) {
        backBtn.style.display = 'none';
        nextBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
    } else if (currentQuestion > 1 && currentQuestion < totalQuestions) {
        backBtn.style.display = 'inline-block';
        nextBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
    } else if (currentQuestion === totalQuestions) {
        backBtn.style.display = 'inline-block';
        nextBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
    }
}

// Manage Button Visibility Dynamically
function updateButtons() {
    const backBtn = document.querySelector('.back-btn');
    const nextBtn = document.querySelector('.next-btn');
    const saveBtn = document.querySelector('.save-btn');

    // Determine button states based on the current question index
    if (currentQuestionIndex === 0) {
        backBtn.style.display = 'none';  // Hide 'Back' button for the first question
        nextBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';  // Hide 'Submit' button until the end
    } else if (currentQuestionIndex === questions.length - 1) {
        backBtn.style.display = 'inline-block';
        nextBtn.style.display = 'none';  // Hide 'Next' button on the last question
        saveBtn.style.display = 'inline-block';
    } else {
        backBtn.style.display = 'inline-block';
        nextBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
    }
}

// Navigation Event Listeners
document.querySelector('.next-btn').addEventListener('click', () => {
    if (currentQuestionIndex < questions.length - 1) {
        saveUserAnswer(currentQuestionIndex);
        currentQuestionIndex++;
        renderQuestion(currentQuestionIndex);
        updateButtons();  // Update buttons visibility based on current question index
    }
});

document.querySelector('.back-btn').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        saveUserAnswer(currentQuestionIndex);
        currentQuestionIndex--;
        renderQuestion(currentQuestionIndex);
        updateButtons();  // Update buttons visibility based on current question index
    }
});

// Submit Button Event Listener
document.querySelector('.save-btn').addEventListener('click', async () => {
    // Save the current answer
    saveUserAnswer(currentQuestionIndex);

    // Check if user is authenticated
    if (userId) {
        try {
            // Create or update the user's quiz results in Firestore
            const userResultsRef = doc(db, 'userResults', userId);
            const userResults = {
                answers: JSON.parse(sessionStorage.getItem('userAnswers')),
                timestamp: new Date(),
            };

            await setDoc(userResultsRef, userResults, { merge: true });
            console.log("User results saved successfully.");

            // Redirect to the results page
            window.location.href = 'userresults.html';
        } catch (error) {
            console.error("Error saving user results:", error);
        }
    } else {
        console.error("No authenticated user found.");
    }
});

// Initial Fetch and Render
document.addEventListener('DOMContentLoaded', () => {
    // Fetch and randomize quizzes will only be called after the user is authenticated
    updateButtons();  // Set the initial state of buttons when the page loads
});

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid; // Store the user's UID
        console.log("User logged in:", userId);
        // Fetch quizzes once we know the user is authenticated
        fetchAndRandomizeQuizzes();
    } else {
        console.error("User is not logged in.");
        // Optionally redirect to a login page
        window.location.href = 'login.html';
    }
});

// Initial Fetch and Render
document.addEventListener('DOMContentLoaded', () => {
    // Fetch and randomize quizzes will only be called after the user is authenticated
});