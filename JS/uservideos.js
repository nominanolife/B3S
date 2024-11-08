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

// Declare global variable for user progress
let globalUserProgress = {}; // Declare at the top level to make it accessible throughout the code
let fadeOutTimer, cursorFadeTimer;

// Function to show video controls and cursor
const showControls = (controlsDiv, videoPlayer) => {
    controlsDiv.style.opacity = '1';
    videoPlayer.style.cursor = 'default'; // Show cursor
};

// Function to hide video controls and cursor
const hideControls = (controlsDiv, videoPlayer) => {
    controlsDiv.style.opacity = '0';
    videoPlayer.style.cursor = 'none'; // Hide cursor
};

// Function to reset the timer for fading controls and cursor
const resetFadeOutTimer = (videoElement, controlsDiv, videoPlayer) => {
    // Clear any existing timers
    clearTimeout(fadeOutTimer);
    clearTimeout(cursorFadeTimer);
    
    // Show controls and cursor when user moves the mouse
    showControls(controlsDiv, videoPlayer);
    
    // Set the fade-out timer for controls and cursor for 2 seconds
    fadeOutTimer = setTimeout(() => {
        if (!videoElement.paused) {
            hideControls(controlsDiv, videoPlayer);
        }
    }, 2000);
    
    // Set the fade-out timer for cursor for 2 seconds
    cursorFadeTimer = setTimeout(() => {
        if (!videoElement.paused) {
            videoPlayer.style.cursor = 'none'; // Hide cursor
        }
    }, 2000);
};

document.addEventListener('DOMContentLoaded', () => {
    const videoPlayer = document.getElementById('lesson-video'); 

    if (videoPlayer) {
        videoPlayer.addEventListener('mousemove', () => {
            const controlsDiv = videoPlayer.querySelector('.video-controls');
            if (controlsDiv) {
                resetFadeOutTimer(videoPlayer.querySelector('video'), controlsDiv, videoPlayer);
            }
        });

        videoPlayer.addEventListener('mouseleave', () => {
            const controlsDiv = videoPlayer.querySelector('.video-controls');
            if (controlsDiv) {
                hideControls(controlsDiv, videoPlayer);
            }
        });

        const controlsDiv = videoPlayer.querySelector('.video-controls');
        if (controlsDiv) {
            resetFadeOutTimer(videoPlayer.querySelector('video'), controlsDiv, videoPlayer);
        }
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userId = user.uid;
            const urlParams = new URLSearchParams(window.location.search);
            const categoryFilter = urlParams.get('category');
    
            try {
                const videosSnapshot = await getDocs(collection(db, 'videos'));
                const videos = videosSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
    
                const userProgressDocRef = doc(db, 'userProgress', userId);
    
                onSnapshot(userProgressDocRef, (userProgressDoc) => {
                    globalUserProgress = userProgressDoc.exists() ? userProgressDoc.data() : {};
                    updateLessonList(videos, globalUserProgress, userId);
                });
    
                // Step 1: Check for a selectedVideoId in sessionStorage (priority if set by video card click)
                let videoId = sessionStorage.getItem('selectedVideoId');
    
                // Step 2: If no videoId from sessionStorage, check if categoryFilter exists in URL
                if (!videoId && categoryFilter) {
                    const matchingVideo = videos.find(video => video.category === categoryFilter);
                    if (matchingVideo) {
                        videoId = matchingVideo.id;
                    }
                }
    
                // Step 3: If still no videoId, default to the first video in the list
                if (!videoId && videos.length > 0) {
                    videoId = videos[0].id;
                }
    
                // Step 4: Save the selected videoId to sessionStorage only if it’s newly set
                if (!sessionStorage.getItem('selectedVideoId') && videoId) {
                    sessionStorage.setItem('selectedVideoId', videoId);
                }
    
                // Step 5: Render the video details using the resolved videoId
                if (videoId) {
                    renderVideoDetails(videoId, videos, userId);
                }
            } catch (error) {
                console.error("Error fetching videos:", error);
            }
        } else {
            window.location.href = 'login.html';
        }

        // Clear selectedVideoId from sessionStorage when leaving the page
        window.addEventListener('beforeunload', () => {
            sessionStorage.removeItem('selectedVideoId');
        });
    });

    displayInitialBotMessages();
});

function displayInitialBotMessages() {
    // First bot message
    displayMessage("Hi! I'm DriveHub's Chatbot. I can only answer simple questions about the lectures. Please make your questions direct and concise.", 'bot-message');

    // Second bot message after a short delay (optional for a more natural chat flow)
    setTimeout(() => {
        displayMessage('For example, you can ask "What is the definition of this sign?"', 'bot-message');
    }, 500); // 500ms delay between messages
}

async function renderVideoDetails(videoId, videos, userId) {
    const videoPlayer = document.getElementById('lesson-video');
    const userProgressDocRef = doc(db, 'userProgress', userId);

    try {
        
        
        // Sort videos array by title
        videos.sort((a, b) => {
            if (a.title < b.title) return -1;
            if (a.title > b.title) return 1;
            return 0;
        });

        const videoDoc = await getDoc(doc(db, 'videos', videoId));
        if (videoDoc.exists()) {
            const videoData = videoDoc.data();
            const videoTitleElement = document.querySelector('.video-header h3');

            if (!videoTitleElement || !videoPlayer) {
               
                return;
            }

            // Pause and unload existing video element
            const existingVideoElement = videoPlayer.querySelector('video');
            if (existingVideoElement) {
                existingVideoElement.pause();
                existingVideoElement.src = '';
                existingVideoElement.load();
            }

            videoPlayer.innerHTML = ''; // Clear the video player container

            const videoElement = document.createElement('video');
            videoElement.src = videoData.videoURL;
            videoElement.style.width = "100%";
            videoElement.style.height = "100%";
            videoElement.style.objectFit = "contain";
            videoElement.style.backgroundColor = "black";
            videoElement.volume = 0.5;
            videoElement.autoplay = true;
            videoElement.crossOrigin = "anonymous"; // Alternative to "anonymous"

            if (videoData.subtitleURL) {
                console.log("Subtitle URL: ", videoData.subtitleURL); // Log the subtitle URL
                const subtitleTrack = document.createElement('track');
                subtitleTrack.src = videoData.subtitleURL;
                subtitleTrack.kind = 'subtitles';
                subtitleTrack.label = 'Filipino';
                subtitleTrack.srclang = 'tl';
                subtitleTrack.default = true;
            
                // Additional event listeners to debug different stages
                subtitleTrack.addEventListener('loadstart', () => {
                    console.log('Subtitle load started:', subtitleTrack.src);
                });
            
                subtitleTrack.addEventListener('load', () => {
                    console.log('Subtitle loaded successfully:', subtitleTrack.src);
                });
            
                subtitleTrack.addEventListener('error', (event) => {
                    console.error('Error loading subtitle:', subtitleTrack.src);
                    console.error('Error details:', event);
                    // Log specific error code if available
                    if (event.target && event.target.error) {
                        console.error('Subtitle Error Code:', event.target.error.code);
                    }
                });
            
                // Append the subtitle track to the video element
                videoElement.appendChild(subtitleTrack);
            }

            videoElement.addEventListener('contextmenu', function (e) {
                e.preventDefault();
            });

            videoPlayer.appendChild(videoElement);
            videoTitleElement.textContent = videoData.title;

            const controlsDiv = document.createElement('div');
            controlsDiv.classList.add('video-controls');
            videoPlayer.appendChild(controlsDiv);

            const playPauseButton = document.createElement('button');
            playPauseButton.classList.add('control-button');
            playPauseButton.innerHTML = '<i class="bi bi-pause-fill"></i>';
            controlsDiv.appendChild(playPauseButton);

            const seekContainer = document.createElement('div');
            seekContainer.classList.add('seek-container');
            controlsDiv.appendChild(seekContainer);

            const currentTimeDisplay = document.createElement('span');
            currentTimeDisplay.classList.add('current-time');
            currentTimeDisplay.textContent = '0:00';
            seekContainer.appendChild(currentTimeDisplay);

            const seekBar = document.createElement('input');
            seekBar.type = 'range';
            seekBar.classList.add('seek-bar');
            seekBar.value = 0;
            seekBar.max = 100;
            seekContainer.appendChild(seekBar);

            let maxAllowedSeekTime = 0;
            let lastSavedTime = 0; // For throttling save progress

            // Fetch user progress for the current video
            const userProgressDoc = await getDoc(userProgressDocRef);
            if (userProgressDoc.exists() && userProgressDoc.data()[videoId]) {
                const userProgress = userProgressDoc.data()[videoId];
                maxAllowedSeekTime = userProgress.completed ? Infinity : userProgress.currentTime;
                
            } else {
               
            }

            videoElement.addEventListener('loadedmetadata', () => {
                if (Number.isFinite(maxAllowedSeekTime) && maxAllowedSeekTime >= 0 && maxAllowedSeekTime <= videoElement.duration) {
                    videoElement.currentTime = maxAllowedSeekTime;
                }
            });
            
            const volumeContainer = document.createElement('div');
            volumeContainer.classList.add('volume-container');
            controlsDiv.appendChild(volumeContainer);

            const volumeIcon = document.createElement('i');
            volumeIcon.classList.add('bi', 'bi-volume-up-fill');
            volumeContainer.appendChild(volumeIcon);

            const volumeControl = document.createElement('input');
            volumeControl.type = 'range';
            volumeControl.classList.add('volume-control');
            volumeControl.min = 0;
            volumeControl.max = 1;
            volumeControl.step = 0.1;
            volumeControl.value = 0.5;
            volumeContainer.appendChild(volumeControl);

            const fullscreenButton = document.createElement('button');
            fullscreenButton.classList.add('control-button');
            fullscreenButton.innerHTML = '<i class="bi bi-fullscreen"></i>';
            controlsDiv.appendChild(fullscreenButton);

            const togglePlayPause = () => {
                if (videoElement.paused) {
                    videoElement.play();
                    playPauseButton.innerHTML = '<i class="bi bi-pause-fill"></i>';
                } else {
                    videoElement.pause();
                    playPauseButton.innerHTML = '<i class="bi bi-play-fill"></i>';
                }
            };

            playPauseButton.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePlayPause();
            });

            videoPlayer.addEventListener('click', (e) => {
                if (e.target !== volumeControl && e.target !== volumeIcon) {
                    togglePlayPause();
                }
            });

            videoElement.addEventListener('timeupdate', () => {
                if (videoElement.duration && videoElement.currentTime <= videoElement.duration) {
                    const value = (100 / videoElement.duration) * videoElement.currentTime;
                    seekBar.value = value;
                }

                const currentMinutes = Math.floor(videoElement.currentTime / 60);
                const currentSeconds = Math.floor(videoElement.currentTime % 60).toString().padStart(2, '0');
                currentTimeDisplay.textContent = `${currentMinutes}:${currentSeconds}`;

                if (videoElement.currentTime > maxAllowedSeekTime) {
                    maxAllowedSeekTime = videoElement.currentTime;
                }

                // Save progress every 5 seconds
                if (videoElement.currentTime - lastSavedTime >= 5) {
                    saveUserProgress(userId, videoId, videoElement.currentTime);
                    lastSavedTime = videoElement.currentTime;
                }
            });

            seekBar.addEventListener('input', () => {
                const seekTo = (videoElement.duration / 100) * seekBar.value;
                if (maxAllowedSeekTime === Infinity || seekTo <= maxAllowedSeekTime) {
                    videoElement.currentTime = seekTo;
                } else {
                    seekBar.value = (100 / videoElement.duration) * maxAllowedSeekTime;
                }
            });

            volumeControl.addEventListener('input', () => {
                videoElement.volume = volumeControl.value;
            });

            fullscreenButton.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    videoPlayer.requestFullscreen().catch(err => {
                        
                    });
                } else {
                    document.exitFullscreen().catch(err => {
                  
                    });
                }
            });

            document.addEventListener('fullscreenchange', () => {
                if (document.fullscreenElement) {
                    fullscreenButton.innerHTML = '<i class="bi bi-fullscreen-exit"></i>';
                } else {
                    fullscreenButton.innerHTML = '<i class="bi bi-fullscreen"></i>';
                }
            });

            videoElement.addEventListener('ended', async () => {
               

                try {
                    // Mark current video as completed in the database
                    await saveUserProgress(userId, videoId, videoElement.duration, true);

                    await unlockNextLesson(userId, videos, videoId);
                    const currentIndex = videos.findIndex(video => video.id === videoId);
                    if (currentIndex >= 0 && currentIndex < videos.length - 1) {
                        const nextVideoId = videos[currentIndex + 1].id;
                        

                        // Update sessionStorage with the next video ID
                        sessionStorage.setItem('selectedVideoId', nextVideoId);

                        // Render the next video
                        renderVideoDetails(nextVideoId, videos, userId);

                        // Update the lesson list to reflect the new current video
                        updateLessonList(videos, globalUserProgress, userId);
                    }
                } catch (error) {
                    
                }
            });

            // Update sessionStorage with the current video ID
            sessionStorage.setItem('selectedVideoId', videoId);

            // Update the lesson list to reflect the current video
            updateLessonList(videos, globalUserProgress, userId);

            controlsDiv.classList.remove('hidden'); // Ensure controls are visible initially

        } else {
           
        }
    } catch (error) {
       
    }
}

// Function to save user progress
async function saveUserProgress(userId, videoId, currentTime, completed = false) {
    try {
        const userProgressDocRef = doc(db, 'userProgress', userId);
        const existingProgressDoc = await getDoc(userProgressDocRef);
        let existingProgress = {};
        
        if (existingProgressDoc.exists()) {
            existingProgress = existingProgressDoc.data();
        }

        await setDoc(userProgressDocRef, {
            [videoId]: {
                currentTime: currentTime,
                completed: existingProgress[videoId]?.completed || completed
            }
        }, { merge: true });
    } catch (error) {
       
    }
}

// Function to unlock the next lesson
async function unlockNextLesson(userId, videos, currentVideoId) {
    try {
        const currentIndex = videos.findIndex(video => video.id === currentVideoId);
        if (currentIndex >= 0 && currentIndex < videos.length - 1) {
            const nextVideoId = videos[currentIndex + 1].id;
           
            await setDoc(doc(db, 'userProgress', userId), {
                [nextVideoId]: {
                    currentTime: 0,
                    completed: false
                }
            }, { merge: true });
           
        } else {
           
        }
    } catch (error) {
        
    }
}

// Function to update the lesson list dynamically, now includes the exam logic
function updateLessonList(videos, userProgress, userId) {
    const lessonListContainer = document.querySelector('.lessons ul');
    if (!lessonListContainer) {
       
        return;
    }

    lessonListContainer.innerHTML = ''; // Clear old list items
    const currentVideoId = sessionStorage.getItem('selectedVideoId'); // Get the currently playing video ID

    videos.forEach((video, index) => {
        const listItem = document.createElement('li');
        const isUnlocked = userProgress[video.id]?.completed || (index === 0) || (userProgress[videos[index - 1]?.id]?.completed);

        const lessonLink = document.createElement('a');
        lessonLink.textContent = video.title;

        if (isUnlocked) {
            lessonLink.href = ''; // Optional: keep the link here if needed
            listItem.addEventListener('click', () => {
                sessionStorage.setItem('selectedVideoId', video.id);
                
                renderVideoDetails(video.id, videos, userId);

                // Update the lesson list to reflect the new current video
                updateLessonList(videos, userProgress, userId);
            });
            listItem.appendChild(lessonLink);
        } else {
            listItem.classList.add('locked');
            lessonLink.classList.add('disabled');
            const lockIcon = document.createElement('i');
            lockIcon.classList.add('bi', 'bi-lock');
            
            // Append the lesson link first and then the lock icon
            listItem.appendChild(lessonLink);
            listItem.appendChild(lockIcon);
        }

        // Highlight the currently playing video
        if (video.id === currentVideoId) {
            listItem.classList.add('active-lesson');
        }

        // Append the list item to the container
        lessonListContainer.appendChild(listItem);
    });

    // Check if all videos are completed to unlock the exam
    const allCompleted = videos.every(video => userProgress[video.id]?.completed);

    // Always show the "Take the Written Exam" as the last item
    const examListItem = document.createElement('li');
    const examLink = document.createElement('a');
    examLink.textContent = 'Take the Written Exam';

    if (allCompleted) {
        // Unlock the exam if all videos are completed
        examLink.href = 'useronlinetdc.html'; // Link to the exam
        examListItem.classList.add('unlocked');
        examListItem.appendChild(examLink); // Added line
    } else {
        // Lock the exam if not all videos are completed
        examListItem.classList.add('locked');
        examLink.classList.add('disabled');
        
        const lockIcon = document.createElement('i');
        lockIcon.classList.add('bi', 'bi-lock');
        
        // Append the text first and then the lock icon for the exam
        examListItem.appendChild(examLink);
        examListItem.appendChild(lockIcon);
    }

    lessonListContainer.appendChild(examListItem); // Append the exam item at the end of the lessons list
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

document.querySelector('.message').addEventListener('submit', async function (e) {
    e.preventDefault();

    // Get the user input message
    const userMessage = document.getElementById('chat-message').value.trim();

    if (userMessage === '') return;  // Don't submit if message is empty

    // Display user message in the chat
    displayMessage(userMessage, 'user-message');

    // Clear the input field
    document.getElementById('chat-message').value = '';

    // Show the typing indicator
    showTypingIndicator();

    // Send the user message to the chatbot API
    try {
        const response = await fetch('https://questions-dot-authentication-d6496.df.r.appspot.com/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: userMessage })  // Adjust the payload to match your API
        });

        const data = await response.json();

        // Remove the typing indicator once the response is received
        removeTypingIndicator();

        if (response.ok) {
            // Display the bot response in the chat
            displayMessage(data.response, 'bot-message');
        } else {
            // If there's an error, display a fallback response
            displayMessage("Sorry, I couldn't process your request. Please try again.", 'bot-message');
        }
    } catch (error) {
        // Remove the typing indicator if there's an error
        removeTypingIndicator();

        // Handle fetch errors (e.g., network issues)
        displayMessage("There was an error connecting to the chatbot.", 'bot-message');
       
    }
});

// Function to display the typing indicator
function showTypingIndicator() {
    const chatBody = document.querySelector('.chat-body');
    const typingIndicator = document.createElement('div');
    typingIndicator.classList.add('chat-body-message', 'typing-indicator');

    // Add the bot's image
    const botImage = document.createElement('img');
    botImage.src = 'Assets/logo.png'; // Replace with the actual path to the bot's image
    botImage.alt = 'DriveHub Logo';
    typingIndicator.appendChild(botImage);

    // Add the animated dots for typing
    const typingContent = document.createElement('div');
    typingContent.classList.add('chat-body-message-content');
    
    const dotContainer = document.createElement('div');
    dotContainer.classList.add('dot-container');
    dotContainer.innerHTML = `
        <div class="dot dot1"></div>
        <div class="dot dot2"></div>
        <div class="dot dot3"></div>
    `;
    
    typingContent.appendChild(dotContainer);
    typingIndicator.appendChild(typingContent);
    chatBody.appendChild(typingIndicator);

    // Scroll to the bottom of the chat
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Function to remove the typing indicator
function removeTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Function to display messages in the chat
function displayMessage(message, className) {
    const chatBody = document.querySelector('.chat-body');
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-body-message', className);

    if (className === 'bot-message') {
        // Add the bot's image when it's a bot message
        const botImage = document.createElement('img');
        botImage.src = 'Assets/logo.png'; // Replace with the actual path to the bot's image
        botImage.alt = 'DriveHub Logo';
        messageElement.appendChild(botImage);
    }

    const messageContent = document.createElement('div');
    messageContent.classList.add('chat-body-message-content');
    messageContent.innerHTML = `<p>${message}</p>`;

    messageElement.appendChild(messageContent);
    chatBody.appendChild(messageElement);

    // Scroll to the bottom of the chat
    chatBody.scrollTop = chatBody.scrollHeight;
}