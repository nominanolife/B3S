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

// Function to fetch user progress from Firestore
async function fetchUserProgress(userId) {
    const userProgressDoc = await getDoc(doc(db, 'userProgress', userId));
    return userProgressDoc.exists() ? userProgressDoc.data() : {};
}

// Monitor authentication state and fetch progress
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("User is authenticated.");
        const userId = user.uid;

        try {
            // Fetch videos and user progress
            const videos = await fetchVideos();
            const userProgress = await fetchUserProgress(userId);

            // Update the exam button based on progress
            updateExamAvailability(videos, userProgress);

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
