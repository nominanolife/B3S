// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";
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
const storage = getStorage(app);
const auth = getAuth(app);

async function renderVideoCards(userProgress) {
    const videoContainer = document.querySelector('.video-grid'); // Container to hold all video cards

    // Clear existing video cards to prevent duplicates
    videoContainer.innerHTML = '';

    try {
        // Step 1: Fetch all videos from the 'videos' collection
        const videosSnapshot = await getDocs(collection(db, 'videos'));
        let videos = videosSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Step 2: Sort videos by title
        videos.sort((a, b) => a.title.localeCompare(b.title));

        // Step 3: Render each video card
        videos.forEach((video, index) => {
            const videoCard = document.createElement('div');
            videoCard.classList.add('video-card');
            videoCard.setAttribute('data-video-id', video.id);

            // Corrected isUnlocked logic
            let isUnlocked;
            if (index === 0) {
                // First video is always unlocked
                isUnlocked = true;
            } else {
                // Check if the previous video is completed
                const prevVideo = videos[index - 1];
                const prevVideoProgress = userProgress[prevVideo.id];
                isUnlocked = prevVideoProgress && prevVideoProgress.completed === true;
            }

            // Add content to video card
            videoCard.innerHTML = `
                <div class="video-card-preview">
                    <img src="${video.thumbnailURL}" alt="${video.title}">
                </div>
                <div class="video-details">
                    <div class="video-title">
                        <h3>${video.title}</h3>
                    </div>
                </div>
            `;

            // Add lock overlay if the video is locked
            if (!isUnlocked) {
                videoCard.classList.add('locked');
                const lockOverlay = document.createElement('div');
                lockOverlay.classList.add('lock-overlay');
                lockOverlay.innerHTML = `<i class="fas fa-lock"></i>`;
                videoCard.appendChild(lockOverlay);
            } else {
                // Add click event listener for unlocked video
                videoCard.addEventListener('click', () => {
                    // Use sessionStorage to pass context
                    sessionStorage.setItem('selectedVideoId', video.id);
                    // Redirect to uservideos.html
                    window.location.href = "uservideos.html";
                });
            }

            // Append the video card to the container
            videoContainer.appendChild(videoCard);
        });

    } catch (error) {
        console.error('Error fetching video data:', error);
    }
}

function listenToUserProgress() {
    const userId = auth.currentUser.uid;
    const userProgressRef = doc(db, 'userProgress', userId);

    // Listen for real-time updates to the userProgress document
    onSnapshot(userProgressRef, async (docSnapshot) => {
        const userProgress = docSnapshot.exists() ? docSnapshot.data() : {};

        // Call renderVideoCards with the updated userProgress
        await renderVideoCards(userProgress);
    });
}

// Call the function when the page is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase authentication to initialize and ensure user is logged in
    onAuthStateChanged(auth, user => {
        if (user) {
            listenToUserProgress();
        } else {
            console.log('User is not logged in');
            // Optionally redirect to login page
        }
    });
});
// JavaScript for sidebar toggle
document.getElementById('toggleSidebarBtn').addEventListener('click', function() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    // Toggle the 'active' class to show or hide the sidebar
    sidebar.classList.toggle('active');
    mainContent.classList.toggle('active');
});
