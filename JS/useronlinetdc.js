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
    // Initialize the popover only if the button is disabled
    if (startExamButton.disabled || startExamButton.classList.contains('disabled-btn')) {
        initializePopover();
    }
});

function initializePopover() {
    $('.buttons').popover({
        trigger: 'hover', // Automatically show popover on hover
        html: true,
        placement: 'bottom',
        content: 'You need to complete all videos to unlock the exam'
    });

    // Add event listeners for the popover
    $('.buttons').on('mouseenter', function () {
        if ($('#startExamButton').hasClass('disabled-btn')) {
            $(this).popover('show');
        }
    });

    $('.buttons').on('mouseleave', function () {
        $(this).popover('hide');
    });
}

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

        initializePopover();

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
       
        // Fetch videos and user progress
        try {
            const videos = await fetchVideos();
            const userProgressDoc = await getDoc(doc(db, 'userProgress', userId));
            const userProgress = userProgressDoc.exists() ? userProgressDoc.data() : {};

            // Update exam availability based on fetched data
            updateExamAvailability(videos, userProgress);
        } catch (error) {
           
        }

        // Check quiz progress
        checkUserProgress();  // Ensure this runs after updating exam availability
    } else {
      
    }
});

// Function to check if there's existing progress and instantly show the appropriate button
async function checkUserProgress() {
    if (!userId) return;

    try {
        // Fetch quiz progress
        const userQuizDocRef = doc(db, 'userQuizProgress', userId);
        const userQuizDoc = await getDoc(userQuizDocRef);
        const continueButton = document.getElementById('continueButton');
        const startExamButton = document.getElementById('startExamButton');

        // Determine which button to show based on quiz progress
        if (userQuizDoc.exists() && userQuizDoc.data().answers) {
            // Show "Continue Quiz" button
            continueButton.style.display = 'block';
            startExamButton.style.display = 'none'; // Hide "Start Exam" button
        } else {
            // Show "Start the Exam" button
            continueButton.style.display = 'none';
            startExamButton.style.display = 'block';
        }
    } catch (error) {
        
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
// JavaScript for sidebar toggle
document.getElementById('toggleSidebarBtn').addEventListener('click', function() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    // Toggle the 'active' class to show or hide the sidebar
    sidebar.classList.toggle('active');
    mainContent.classList.toggle('active');
});
