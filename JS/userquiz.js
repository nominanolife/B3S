import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

async function fetchAndRandomizeQuizzes() {
    // Show loader before fetching quizzes
    document.getElementById('loader1').style.display = 'flex';

    try {
        const selectedLanguage = localStorage.getItem('selectedLanguage'); // Retrieve the stored language choice

        const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
        quizzesSnapshot.forEach(doc => {
            const quizData = doc.data();

            // Check if the 'questions' field exists and is an array
            if (quizData.questions && Array.isArray(quizData.questions)) {
                quizData.questions
                    // Filter questions by language and active status
                    .filter(question => question.language === selectedLanguage && question.active)
                    .forEach(question => {
                        questions.push({
                            ...question,
                            category: quizData.category
                        });
                    });
            } else {
                console.log('No questions found or invalid structure in quiz:', doc.id);
            }
        });

        // Shuffle questions after filtering
        questions = questions.sort(() => Math.random() - 0.5);

        if (questions.length > 0) {
            renderQuestion(currentQuestionIndex); // Render the first question
        } else {
            alert('No questions available for the selected language.');
            console.log('Final Questions Array is empty:', questions);
        }
    } catch (error) {
        console.error('Error fetching quizzes:', error);
    } finally {
        // Hide loader once the quiz is loaded
        document.getElementById('loader1').style.display = 'none';
    }
}
// Save User Answer in Firestore
async function saveUserAnswerToFirestore(index) {
    const selectedOption = document.querySelector('input[name="questionanswer"]:checked');
    if (selectedOption && userId) {
        const correctAnswerIndex = questions[index].correctAnswer;
        const correctAnswerValue = questions[index].options[correctAnswerIndex].value;

        userAnswers[index] = {
            question: questions[index].question,
            answer: selectedOption.value,
            isCorrect: selectedOption.value === correctAnswerValue,
            category: questions[index].category
        };

        // Save to Firestore
        try {
            const userQuizDocRef = doc(db, 'userQuizProgress', userId);
            await setDoc(userQuizDocRef, { answers: userAnswers }, { merge: true });
           
        } catch (error) {
            
        }
    }
}

// Load User Answers from Firestore on page reload
async function loadUserAnswersFromFirestore() {
    if (userId) {
        try {
            const userQuizDocRef = doc(db, 'userQuizProgress', userId);
            const userQuizDoc = await getDoc(userQuizDocRef);
            if (userQuizDoc.exists()) {
                userAnswers = userQuizDoc.data().answers || {};
               
            }
        } catch (error) {
           
        }
    }
}

// Shuffle function to randomize the options array
function shuffleOptions(options) {
    return options.sort(() => Math.random() - 0.5);
}

// Render Question with Shuffled Options
async function renderQuestion(index) {
    await loadUserAnswersFromFirestore();  // Load answers when rendering each question

    if (index >= 0 && index < questions.length) {
        const questionElement = document.querySelector('.quiz-question-body h4');
        const optionsContainer = document.querySelector('.question-options');
        const questionImageContainer = document.querySelector('.quiz-image');  // Select the image container
        const categoryElement = document.querySelector('.quiz-category');
        const nextBtn = document.querySelector('.next-btn'); // Get the next button
        const saveBtn = document.querySelector('.save-btn'); // Get the save button (submit)

        const questionData = questions[index];

        // Disable the next button by default
        nextBtn.disabled = true;
        saveBtn.disabled = true; // Also disable save button by default

        // Update question text
        if (questionElement) {
            questionElement.textContent = `${index + 1}. ${questionData.question}`;
        }

        // Update category text
        if (categoryElement) {
            categoryElement.textContent = `${questionData.category}`;
        }

        // Clear existing content in the image container
        if (questionImageContainer) {
            questionImageContainer.innerHTML = '';
        }

        // Dynamically create and add image if available
        if (questionData.imageURL && questionImageContainer) {
            try {
                const imageRef = ref(storage, questionData.imageURL);
                const imageUrl = await getDownloadURL(imageRef);

                const imgElement = document.createElement('img');
                imgElement.src = imageUrl;
                imgElement.alt = "Quiz Image";
                imgElement.style.display = "block";  // Show the image if the URL is valid

                questionImageContainer.appendChild(imgElement);
            } catch (error) {
               
            }
        }

        // Clear existing options
        if (optionsContainer) {
            optionsContainer.innerHTML = '';
        }

        // Store the correct answer value before shuffling
        const correctAnswerValue = questionData.options[questionData.correctAnswer].value;

        // Shuffle the options array before rendering
        const shuffledOptions = shuffleOptions(questionData.options);

        // Find the new index of the correct answer after shuffling
        const newCorrectAnswerIndex = shuffledOptions.findIndex(option => option.value === correctAnswerValue);

        // Update the question object with the new correct answer index
        questionData.correctAnswer = newCorrectAnswerIndex;

        // Populate new shuffled options
        shuffledOptions.forEach((option, i) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.innerHTML = `
                <input type="radio" name="questionanswer" id="option${i}" value="${option.value}">
                <span class="option-answer">${String.fromCharCode(65 + i)}.</span>
                <p>${option.value}</p>
            `;
            optionsContainer.appendChild(optionElement);
        });

        // Add event listener to enable the next or save button when a choice is selected
        const radioButtons = document.querySelectorAll('input[name="questionanswer"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => {
                nextBtn.disabled = false; // Enable the next button when an option is selected

                // Check if it's the last question
                if (index === questions.length - 1) {
                    saveBtn.disabled = false; // Enable the save button for the last question
                }
            });
        });

        // Load saved answer from Firestore if available
        const savedAnswer = userAnswers[index];
        if (savedAnswer) {
            const optionToSelect = document.querySelector(`input[name="questionanswer"][value="${savedAnswer.answer}"]`);
            if (optionToSelect) {
                optionToSelect.checked = true;
                nextBtn.disabled = false; // Enable the next button if an answer was previously saved

                // Enable save button for the last question
                if (index === questions.length - 1) {
                    saveBtn.disabled = false; // Enable the save button for the last question
                }
            }
        }

        // Update the progress bar and text
        updateProgress(index + 1);
        manageButtons(index + 1, questions.length);
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

// Function to determine if the user passed
function checkIfPassed() {
    let correctCount = 0;

    Object.keys(userAnswers).forEach(index => {
        if (userAnswers[index].isCorrect) {
            correctCount++;
        }
    });

    const totalQuestions = Object.keys(userAnswers).length;
    const scorePercentage = (correctCount / totalQuestions) * 100;
    

    return scorePercentage >= 80; // 80% passing grade
}

// Function to get the current number of attempts
async function getAttempts(userId) {
    const userResultsRef = doc(db, 'userResults', userId);
    const userResultsSnap = await getDoc(userResultsRef);
    
    if (userResultsSnap.exists()) {
        const data = userResultsSnap.data();
        return data.attempts || 0; // Default to 0 if no attempts field
    }
    return 0; // No record means no attempts yet
}

// Function to save quiz results and attempts
async function saveResultsAndAttempts() {
    if (userId) {
        try {
            const userResultsRef = doc(db, 'userResults', userId);
            
            // Get current attempts
            let attempts = await getAttempts(userId);
            
            // Increment attempts if user hasn't passed
            const passed = checkIfPassed();
            if (!passed) {
                attempts++;
            }
            
            // Prepare data to save
            const userResults = {
                answers: userAnswers,
                timestamp: new Date(),
                attempts: attempts,
                passed: passed,
            };

            // Save to Firestore
            await setDoc(userResultsRef, userResults, { merge: true });
           
            
            // Redirect to results page
            window.location.href = 'userresults.html';

        } catch (error) {
           
        }
    } else {
       
    }
}

// Navigation Event Listeners
document.querySelector('.next-btn').addEventListener('click', () => {
    if (currentQuestionIndex < questions.length - 1) {
        saveUserAnswerToFirestore(currentQuestionIndex);
        currentQuestionIndex++;
        renderQuestion(currentQuestionIndex);
    }
});

document.querySelector('.back-btn').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        saveUserAnswerToFirestore(currentQuestionIndex);
        currentQuestionIndex--;
        renderQuestion(currentQuestionIndex);
    }
});

// Submit Button Event Listener
document.querySelector('.save-btn').addEventListener('click', async () => {
    // Save the current answer
    saveUserAnswerToFirestore(currentQuestionIndex);

    // Save quiz results and attempts
    await saveResultsAndAttempts();
});

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid; // Store the user's UID
       
        // Fetch quizzes once we know the user is authenticated
        fetchAndRandomizeQuizzes();
    } else {
       
        // Optionally redirect to a login page
        window.location.href = 'login.html';
    }
});

// Initial Fetch and Render
document.addEventListener('DOMContentLoaded', () => {
    // Fetch and randomize quizzes will only be called after the user is authenticated
});

// JavaScript for sidebar toggle
document.getElementById('toggleSidebarBtn').addEventListener('click', function() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    // Toggle the 'active' class to show or hide the sidebar
    sidebar.classList.toggle('active');
    mainContent.classList.toggle('active');
});
