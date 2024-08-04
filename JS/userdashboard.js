import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';

// Your Firebase configuration
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

document.addEventListener('DOMContentLoaded', function () {
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

    // Check user role and disable links if needed
    onAuthStateChanged(auth, async function(user) {
        if (user) {
            try {
                const userDocRef = doc(db, "applicants", user.uid);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    const userRole = userData.role;
                    const userFirstName = userData.personalInfo.first;

                    // Update the welcome message with the user's first name
                    document.querySelector('.page-content h2').textContent = `Welcome, ${userFirstName}!`;

                    if (userRole === "applicant") {
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
});
