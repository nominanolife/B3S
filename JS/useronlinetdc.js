// Import Firebase modules (Modular syntax for Firebase v9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

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
const db = getFirestore(app);
const auth = getAuth(app);

let userId = null;  // Declare userId globally so it can be accessed in all functions

// Get the "Start Exam" button and the "Confirm" button from the modal
const startExamButton = document.getElementById('startExamButton');
const confirmStartQuizBtn = document.getElementById('confirmStartQuizBtn');

// Function to update exam button based on user progress
function updateExamAvailability(videos, userProgress) {
    // Check if all videos are completed
    const allCompleted = videos.every(video => userProgress[video.id]?.completed);

    if (allCompleted) {
        // Enable the "Start Exam" button
        startExamButton.disabled = false;
        startExamButton.classList.remove('disabled');
    } else {
        // Keep the button disabled
        startExamButton.disabled = true;
        startExamButton.classList.add('disabled');
    }
}

// Function to fetch videos from Firestore
async function fetchVideos() {
    const videosSnapshot = await getDocs(collection(db, 'videos'));
    const videos = videosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    return videos;
}

// Function to check if there's existing progress and show the Continue button
async function checkUserProgress() {
    if (userId) {
        try {
            const userQuizDocRef = doc(db, 'userQuizProgress', userId);
            const userQuizDoc = await getDoc(userQuizDocRef);
            const continueButton = document.getElementById('continueButton');

            // Ensure the "Continue" button exists in the DOM
            if (continueButton) {
                if (userQuizDoc.exists() && userQuizDoc.data().answers) {
                    // Show the "Continue" button if progress exists
                    continueButton.style.display = 'block';
                } else {
                    // Hide the "Continue" button if no progress is found
                    continueButton.style.display = 'none';
                }
            } else {
                console.error('Continue button not found in DOM.');
            }
        } catch (error) {
            console.error("Error checking user progress:", error);
        }
    }
}

// Add event listener for the "Continue" button to resume the quiz
document.getElementById('continueButton').addEventListener('click', function () {
    window.location.href = 'userquiz.html';  // Redirect to the quiz page
});

// Monitor authentication state and set up real-time listener for user progress
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid;  // Set userId globally when the user is authenticated
        checkUserProgress();  // Check user progress on page load
        console.log("User is authenticated.");

        try {
            // Fetch videos once
            const videos = await fetchVideos();

            // Set up real-time listener for user progress
            const userProgressDocRef = doc(db, 'userProgress', userId);
            onSnapshot(userProgressDocRef, (docSnapshot) => {
                const userProgress = docSnapshot.exists() ? docSnapshot.data() : {};
                // Update the exam button based on real-time progress
                updateExamAvailability(videos, userProgress);
            });

        } catch (error) {
            console.error("Error fetching data:", error);
        }
    } else {
        console.error("User is not authenticated.");
    }
});

// Event listener for the confirm button in the modal
confirmStartQuizBtn.addEventListener('click', function () {
    // Redirect to the exam page when the confirm button is clicked
    window.location.href = 'userquiz.html';
});
