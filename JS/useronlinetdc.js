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

$(document).ready(function () {
    // Initialize the popover for the wrapper (since the button is disabled)
    $('.buttons').popover({
        trigger: 'hover', // Automatically show popover on hover
        html: true,
        placement: 'bottom',
        content: 'You need to complete all videos to unlock the exam'
    });

    // Check if the button was already enabled and disable popover if needed
    if (localStorage.getItem('examEnabled') === 'true') {
        enableStartExamButton();
    } else {
        // Add event listeners for the popover only if the button is disabled
        $('.buttons').on('mouseenter', function () {
            if ($('#startExamButton').hasClass('disabled-btn')) {
                $(this).popover('show');
            }
        });

        $('.buttons').on('mouseleave', function () {
            $(this).popover('hide');
        });
    }
});

// Function to enable the Start Exam button
function enableStartExamButton() {
    // Enable the "Start Exam" button
    startExamButton.disabled = false;
    startExamButton.classList.remove('disabled', 'disabled-btn');

    // Dispose of the popover and remove any popover-related events
    $(startExamButton).popover('dispose');
    $('.buttons').off('mouseenter mouseleave'); // Disable hover events for the buttons wrapper

    // Store in localStorage that the exam is enabled
    localStorage.setItem('examEnabled', 'true');
}

// Function to update exam button based on user progress
function updateExamAvailability(videos, userProgress) {
    // Check if all videos are completed
    const allCompleted = videos.every(video => userProgress[video.id]?.completed);

    if (allCompleted) {
        enableStartExamButton(); // Enable the button if all videos are completed
    } else {
        // Keep the button disabled and change color
        startExamButton.disabled = true;
        startExamButton.classList.add('disabled', 'disabled-btn');

        // Re-enable the popover if the button is disabled
        $(startExamButton).popover();
        $('.buttons').on('mouseenter', function () {
            if ($('#startExamButton').hasClass('disabled-btn')) {
                $(this).popover('show');
            }
        }).on('mouseleave', function () {
            $(this).popover('hide');
        });

        // Remove the enabled state from localStorage if the user hasn't completed the videos
        localStorage.removeItem('examEnabled');
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

// Monitor authentication state and check user progress instantly on page load
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid;  // Set userId globally when the user is authenticated
        checkUserProgress();  // Immediately check the user progress upon authentication
        console.log("User is authenticated.");
    } else {
        console.error("User is not authenticated.");
    }
});

// Function to check if there's existing progress and instantly show the appropriate button
async function checkUserProgress() {
    if (!userId) return;

    try {
        const userQuizDocRef = doc(db, 'userQuizProgress', userId);
        const userQuizDoc = await getDoc(userQuizDocRef);
        const continueButton = document.getElementById('continueButton');
        const startExamButton = document.getElementById('startExamButton');

        // Initially hide both buttons to avoid flashing the wrong button
        continueButton.style.display = 'none';
        startExamButton.style.display = 'none';

        // Determine which button to show based on quiz progress
        if (userQuizDoc.exists() && userQuizDoc.data().answers) {
            // Show "Continue Quiz" button
            continueButton.style.display = 'block';
        } else {
            // Show "Start the Exam" button
            startExamButton.style.display = 'block';
        }
    } catch (error) {
        console.error("Error checking user progress:", error);
    }
}

// Event listener for the "Continue" button to resume the quiz
document.getElementById('continueButton').addEventListener('click', function () {
    window.location.href = 'userquiz.html';  // Redirect to the quiz page
});

// Event listener for the confirm button in the modal
confirmStartQuizBtn.addEventListener('click', function () {
    // Redirect to the exam page when the confirm button is clicked
    window.location.href = 'userquiz.html';
});