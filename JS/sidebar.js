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

// Listen for authentication state and handle sidebar button click
onAuthStateChanged(auth, (user) => {
    if (user) {
        const studentId = user.uid;  // Get the logged-in user's ID
        
        // Add event listener to the "Instructors" button
        document.getElementById('sidebarInstructorButton').addEventListener('click', async function(event) {
            event.preventDefault();  // Prevent the default navigation action
            await checkMatch(studentId);  // Run the checkMatch function when the button is clicked
        });
    } else {
        console.error('No user is logged in.');
        // Optionally redirect to a login page or show an error message
        window.location.href = 'login.html'; // Redirect to login if no user is logged in
    }
});

// Function to check if the student is already matched with an instructor
async function checkMatch(studentId) {
    try {
        // Fetch the match document from Firestore
        const matchDoc = await getDoc(doc(db, 'matches', studentId));

        if (matchDoc.exists()) {
            const matchData = matchDoc.data();
            const matchStatus = matchData.matchStatus;  // Get the match status

            if (matchStatus === "In Progress") {
                // If match is in progress, redirect to the matched instructor page
                console.log("Match is in progress. Redirecting to matched instructor page...");
                window.location.href = 'userinstructormatch.html';
            } else if (matchStatus === "Completed") {
                // If match is completed, redirect to the reminder page
                console.log("Match is completed. Redirecting to reminder page...");
                window.location.href = 'userinstructorreminder.html';
            } else {
                // Handle unexpected status cases
                console.error("Unknown match status:", matchStatus);
            }
        } else {
            // If no match document exists, redirect to the first page
            console.log('No match document found, redirecting to the first page...');
            window.location.href = 'userinstructorreminder.html'; // Adjust URL accordingly
        }
    } catch (error) {
        console.error('Error checking match status:', error);
    }
}
