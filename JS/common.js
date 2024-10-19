import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBflGD3TVFhlOeUBUPaX3uJTuB-KEgd0ow",
    authDomain: "authentication-d6496.firebaseapp.com",
    projectId: "authentication-d6496",
    storageBucket: "authentication-d6496.appspot.com",
    messagingSenderId: "195867894399",
    appId: "1:195867894399:web:596fb109d308aea8b6154a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Function to disable sidebar links
function disableLinks() {
    const linksToDisable = [
        'usermodule.html',
        'uservideolearning.html',
        'userquiz.html',
        'userappointment.html'
    ];

    linksToDisable.forEach(link => {
        disableLink(link);
    });
    // Store the state in local storage
    localStorage.setItem('linksState', 'disabled');
}

// Function to enable sidebar links
function enableLinks() {
    const linksToEnable = [
        'usermodule.html',
        'uservideolearning.html',
        'userquiz.html',
        'userappointment.html'
    ];

    linksToEnable.forEach(link => {
        enableLink(link);
    });
    // Store the state in local storage
    localStorage.setItem('linksState', 'enabled');
}

// Functions to enable or disable a single link and store its state
function enableLink(link) {
    const anchor = document.querySelector(`a[href="${link}"]`);
    if (anchor) {
        anchor.classList.remove('disabled-link');
        anchor.style.pointerEvents = 'auto';
        anchor.style.color = '';
        anchor.style.cursor = 'pointer';
    }
    // Store the state in local storage
    localStorage.setItem(`linkState_${link}`, 'enabled');
}

function disableLink(link) {
    const anchor = document.querySelector(`a[href="${link}"]`);
    if (anchor) {
        anchor.classList.add('disabled-link');
        anchor.style.pointerEvents = 'none';
        anchor.style.color = 'gray';
        anchor.style.cursor = 'default';
    }
    // Store the state in local storage
    localStorage.setItem(`linkState_${link}`, 'disabled');
}

// Function to apply the stored links state
function applyStoredLinksState() {
    const links = [
        'usermodule.html',
        'uservideolearning.html',
        'userquiz.html',
        'userappointment.html',
        'useronlinetdc.html',
        'userinstructorreminder.html'
    ];

    links.forEach(link => {
        const storedState = localStorage.getItem(`linkState_${link}`);
        if (storedState === 'enabled') {
            enableLink(link);
        } else {
            disableLink(link);
        }
    });
}

// Apply the stored links state immediately on page load
applyStoredLinksState();

// Function to set up logout and profile functionality
function setupButtons() {
    const profileButton = document.getElementById('profileBtn');
    const logoutButton = document.querySelector('.logout');
    const confirmLogoutButton = document.getElementById('confirmLogoutBtn');

    profileButton.addEventListener('click', function() {
        window.location.href = 'userprofile.html';
    });

    logoutButton.addEventListener('click', function() {
        $('#logoutModal').modal('show');
    });

    confirmLogoutButton.addEventListener('click', function() {
        console.log('Logout confirmed');
        signOut(auth).then(() => {
            console.log('User signed out.');
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error('Sign out error:', error);
        });
    });
}

// Check user role and disable links if needed
function checkUserRole() {
    onAuthStateChanged(auth, function(user) {
        if (user) {
            try {
                const userDocRef = doc(db, "applicants", user.uid);
                // Set up a real-time listener on the user's document
                onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        const userRole = userData.role;

                        // Disable or enable links based on user role
                        if (userRole !== "student") {
                            disableLinks();
                        } else {
                            enableLinks();
                        }

                        const packageType = userData.packageType;  // Adjust this based on your data structure

                        // Enable or disable 'useronlinetdc.html' based on 'TDC' in packageType
                        if (packageType && packageType.includes('TDC')) {
                            enableLink('useronlinetdc.html');
                        } else {
                            disableLink('useronlinetdc.html');
                        }

                        // Enable or disable 'userinstructorreminder.html' based on 'PDC' in packageType
                        if (packageType && (packageType.includes('PDC-4Wheels') || packageType.includes('PDC-Motors'))) {
                            enableLink('userinstructorreminder.html');
                        } else {
                            disableLink('userinstructorreminder.html');
                        }
                    } else {
                        console.error("No such document!");
                    }
                }, (error) => {
                    console.error("Error getting document:", error);
                });
            } catch (error) {
                console.error("Error setting up snapshot listener:", error);
            }
        } else {
            console.error("No user is currently signed in.");
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    const profileButton = document.getElementById('profileBtn');

    if (currentPath.includes('userprofile.html')) {
        profileButton.classList.add('active');
    } else {
        profileButton.classList.remove('active');
    }

    // Existing setup for logout button and role check
    setupButtons();
    checkUserRole();
});