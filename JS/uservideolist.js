// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";
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

async function renderVideoCards() {
    const videoContainer = document.querySelector('.video-grid'); // Container to hold all video cards

    try {
        // Step 1: Fetch all videos from the 'videos' collection
        const videosSnapshot = await getDocs(collection(db, 'videos'));
        let videos = videosSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Step 2: Sort videos by title
        videos.sort((a, b) => {
            if (a.title < b.title) return -1;
            if (a.title > b.title) return 1;
            return 0;
        });

        // Step 3: Fetch user progress
        const userId = auth.currentUser.uid; // Assuming the user is already authenticated
        const userProgressDoc = await getDoc(doc(db, 'userProgress', userId));
        const userProgress = userProgressDoc.exists() ? userProgressDoc.data() : {};

        // Step 4: Render each video card
        videos.forEach((video, index) => {
            const videoCard = document.createElement('div');
            videoCard.classList.add('video-card');
            videoCard.setAttribute('data-video-id', video.id);

            // Check if the video is unlocked or locked
            const isUnlocked = userProgress[video.id] || index === 0;

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
                    // Option 1: Use localStorage or sessionStorage to pass context
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

// Call the function when the page is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase authentication to initialize and ensure user is logged in
    onAuthStateChanged(auth, user => {
        if (user) {
            renderVideoCards();
        } else {
            console.log('User is not logged in');
            // Optionally redirect to login page
        }
    });
});
