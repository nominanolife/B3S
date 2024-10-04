// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("User is authenticated.");
            const userId = user.uid;
            const videoId = sessionStorage.getItem('selectedVideoId');
            console.log("Selected video ID:", videoId);
            console.log("Current user ID:", userId);

            try {
                // Step 1: Fetch all lessons from Firestore
                console.log("Fetching lessons from Firestore...");
                const videosSnapshot = await getDocs(collection(db, 'videos'));

                if (videosSnapshot.empty) {
                    console.error("No videos found in Firestore.");
                    return;
                }

                const videos = videosSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log("Fetched videos:", videos);

                // Step 2: Set up a real-time listener for user progress
                console.log("Fetching user progress in real-time...");
                const userProgressDocRef = doc(db, 'userProgress', userId);
                onSnapshot(userProgressDocRef, (userProgressDoc) => {
                    const userProgress = userProgressDoc.exists() ? userProgressDoc.data() : {};
                    console.log("Real-time user progress:", userProgress);
                    // Update the sidebar lessons dynamically whenever progress changes
                    updateLessonList(videos, userProgress);
                    updateExamAvailability(videos, userProgress);
                });

                // Step 3: Render the current video
                if (videoId) {
                    console.log("Fetching video document from Firestore...");
                    const videoDoc = await getDoc(doc(db, 'videos', videoId));
                    if (videoDoc.exists()) {
                        const videoData = videoDoc.data();
                        const videoTitleElement = document.querySelector('.video-header h3');
                        const videoPlayer = document.getElementById('lesson-video');

                        if (!videoTitleElement || !videoPlayer) {
                            console.error("Video title element or video player not found in DOM.");
                            return;
                        }

                        // Set video details
                        videoTitleElement.textContent = videoData.title;
                        videoPlayer.src = videoData.videoURL;

                        // Disable the seek bar to prevent skipping
                        videoPlayer.addEventListener('timeupdate', () => {
                            videoPlayer.controls = false;
                        });

                        // Check when 10 seconds are left, mark as completed
                        videoPlayer.addEventListener('timeupdate', async () => {
                            const remainingTime = videoPlayer.duration - videoPlayer.currentTime;
                            if (remainingTime <= 10) {
                                try {
                                    console.log(`10 seconds or less remaining. Marking video ${videoId} as completed.`);
                                    await setDoc(userProgressDocRef, {
                                        [videoId]: {
                                            currentTime: 0,
                                            completed: true
                                        }
                                    }, { merge: true });

                                    // Unlock the next lesson
                                    await unlockNextLesson(userId, videos, videoId);

                                    // Update the lesson list to reflect changes
                                    const updatedUserProgressDoc = await getDoc(userProgressDocRef);
                                    const updatedUserProgress = updatedUserProgressDoc.exists() ? updatedUserProgressDoc.data() : {};
                                    updateLessonList(videos, updatedUserProgress);
                                    updateExamAvailability(videos, updatedUserProgress);
                                } catch (error) {
                                    console.error("Error marking video as completed:", error);
                                }
                            }
                        });

                    } else {
                        console.error("No such video document found in Firestore for videoId:", videoId);
                    }
                }
            } catch (error) {
                console.error("Error during Firestore operations:", error);
            }
        } else {
            console.error("User is not authenticated.");
        }
    });
});

// Function to unlock the next lesson
async function unlockNextLesson(userId, videos, currentVideoId) {
    try {
        const currentIndex = videos.findIndex(video => video.id === currentVideoId);
        if (currentIndex >= 0 && currentIndex < videos.length - 1) {
            const nextVideoId = videos[currentIndex + 1].id;
            console.log(`Attempting to unlock the next lesson: ${nextVideoId}`);
            await setDoc(doc(db, 'userProgress', userId), {
                [nextVideoId]: {
                    currentTime: 0,
                    completed: false
                }
            }, { merge: true });
            console.log(`Unlocked the next lesson: ${nextVideoId}`);
        } else {
            console.error("Unable to unlock the next lesson. Either at the last video or index not found.");
        }
    } catch (error) {
        console.error("Error unlocking next lesson:", error);
    }
}

// Function to update the lesson list dynamically
function updateLessonList(videos, userProgress) {
    const lessonListContainer = document.querySelector('.lessons ul');
    if (!lessonListContainer) {
        console.error("Lesson list container not found in DOM.");
        return;
    }

    lessonListContainer.innerHTML = ''; // Clear old list items
    videos.forEach((video, index) => {
        const listItem = document.createElement('li');
        const isUnlocked = userProgress[video.id]?.completed || (index === 0) || (userProgress[videos[index - 1]?.id]?.completed);

        const lessonLink = document.createElement('a');
        lessonLink.textContent = video.title;

        if (isUnlocked) {
            lessonLink.href = '#';
            lessonLink.addEventListener('click', () => {
                sessionStorage.setItem('selectedVideoId', video.id);
                console.log("Navigating to video ID:", video.id);
                renderVideoDetails(video.id); // Ensure that the correct video gets displayed
            });
        } else {
            listItem.classList.add('locked');
            lessonLink.classList.add('disabled');
            const lockIcon = document.createElement('i');
            lockIcon.classList.add('bi', 'bi-lock');
            listItem.appendChild(lockIcon);
        }

        listItem.appendChild(lessonLink);
        lessonListContainer.appendChild(listItem);
    });
}

// Function to update "Written Exam" availability
function updateExamAvailability(videos, userProgress) {
    const writtenExamLink = document.querySelector('.exams ul li a');
    if (!writtenExamLink) {
        console.error("Written Exam link not found in DOM.");
        return;
    }

    // Check if all videos are completed
    const allCompleted = videos.every(video => userProgress[video.id]?.completed);
    if (allCompleted) {
        writtenExamLink.classList.remove('disabled');
        writtenExamLink.href = 'userquizreminder.html';
    } else {
        writtenExamLink.classList.add('disabled');
        writtenExamLink.removeAttribute('href');
    }
}

// Function to render a specific video (called when navigating between lessons)
function renderVideoDetails(videoId) {
    console.log(`Rendering video with ID: ${videoId}`);
    sessionStorage.setItem('selectedVideoId', videoId);
    window.location.reload(); // Reload the page with new context
}

document.getElementById('toggle-button').addEventListener('click', function () {
    const lessonList = document.querySelector('.lesson-list');
    const toggleButtonIcon = document.getElementById('toggle-button');

    if (!lessonList.classList.contains('show')) {
        lessonList.classList.add('show');
        toggleButtonIcon.classList.remove('bi-chevron-left');
        toggleButtonIcon.classList.add('bi-chevron-right');
    } else {
        lessonList.classList.remove('show');
        toggleButtonIcon.classList.remove('bi-chevron-right');
        toggleButtonIcon.classList.add('bi-chevron-left');
    }
});

// Toggle for chat content
document.getElementById('toggle-chat').addEventListener('click', function () {
    const chatContent = document.querySelector('.chat-content');
    const toggleChatIcon = document.getElementById('toggle-chat');

    if (!chatContent.classList.contains('show')) {
        chatContent.classList.add('show');
        toggleChatIcon.classList.remove('bi-chevron-up');
        toggleChatIcon.classList.add('bi-chevron-down');
    } else {
        chatContent.classList.remove('show');
        toggleChatIcon.classList.remove('bi-chevron-down');
        toggleChatIcon.classList.add('bi-chevron-up');
    }
});
