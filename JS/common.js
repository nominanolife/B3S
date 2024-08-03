import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

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
        'userquiz.html'
    ];

    linksToDisable.forEach(link => {
        const anchor = document.querySelector(`a[href="${link}"]`);
        if (anchor) {
            anchor.classList.add('disabled-link');
            anchor.style.pointerEvents = 'none';  // Make the link unclickable
            anchor.style.color = 'gray';  // Change color to indicate it's disabled
            anchor.style.cursor = 'default';  // Change cursor to default
        }
    });
}

// Function to set up logout functionality
function setupLogout() {
    const logoutButton = document.querySelector('.logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            console.log('Logout button clicked');
            signOut(auth).then(() => {
                console.log('User signed out.');
                window.location.href = 'index.html'; // Redirect to login page or home page
            }).catch((error) => {
                console.error('Sign out error:', error);
            });
        });
    }
}

// Check user role and disable links if needed
function checkUserRole() {
    onAuthStateChanged(auth, async function(user) {
        if (user) {
            try {
                const userDocRef = doc(db, "applicants", user.uid);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    const userRole = userData.role;

                    // Disable links based on user role
                    if (userRole !== "student") {
                        disableLinks();
                    }
                } else {
                    console.error("No such document!");
                }
            } catch (error) {
                console.error("Error getting document:", error);
            }
        } else {
            console.error("No user is currently signed in.");
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    setupLogout();
    checkUserRole();
});
