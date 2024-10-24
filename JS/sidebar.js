import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

// Flag to prevent multiple redirections
let redirectionInProgress = false;

// Listen for authentication state and handle sidebar button click
onAuthStateChanged(auth, (user) => {
    if (user) {
        const studentId = user.uid;  // Get the logged-in user's ID
        
        // Add event listener to the "Instructors" button
        document.getElementById('sidebarInstructorButton').addEventListener('click', async function(event) {
            event.preventDefault();  // Prevent the default navigation action
            
            // Check if a redirection is already in progress
            if (!redirectionInProgress) {
                await checkMatch(studentId);  // Run the checkMatch function when the button is clicked
            }
        });
    } else {
        // Optionally redirect to a login page or show an error message
        window.location.href = 'login.html'; // Redirect to login if no user is logged in
    }
});

// Function to check if the student is already matched with an instructor
async function checkMatch(studentId) {
    try {
        // Check if a redirection is already in progress
        if (redirectionInProgress) {
            return; // Exit the function if a redirection is already in progress
        }

        // Set the flag to true to prevent further clicks during processing
        redirectionInProgress = true;

        // Fetch the match document from Firestore
        const matchDoc = await getDoc(doc(db, 'matches', studentId));

        if (matchDoc.exists()) {
            const matchData = matchDoc.data();
            const matchStatus = matchData.matchStatus;  // Get the match status

            if (matchStatus === "In Progress") {

                window.location.href = 'userinstructormatch.html';
            } else if (matchStatus === "Completed") {
                window.location.href = 'userinstructorreminder.html';
            } else {
            }
        } else {
            window.location.href = 'userinstructorreminder.html'; // Adjust URL accordingly
        }
    } catch (error) {
    } finally {
        // Reset the flag after processing
        redirectionInProgress = false;
    }
}

// Add debounce to the button click event
let debounceTimeout;
document.getElementById('sidebarInstructorButton').addEventListener('click', function(event) {
    event.preventDefault();

    // Clear the previous timeout if the button was clicked again quickly
    clearTimeout(debounceTimeout);

    // Set a new timeout to call the function after a short delay (e.g., 500ms)
    debounceTimeout = setTimeout(() => {
        if (!redirectionInProgress) {
            checkMatch(studentId);
        }
    }, 100);
});