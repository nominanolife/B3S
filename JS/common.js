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
        'userquiz.html',
        'userappointment.html'
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
    setupButtons();  // Call the function to set up logout and profile button functionality
    checkUserRole();
});

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
