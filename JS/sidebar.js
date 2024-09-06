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
            const instructorId = matchData.instructorId;

            if (instructorId) {
                // If a match exists, check if the student has already given feedback
                console.log('Match found. Checking for feedback...');
                await checkForExistingComment(studentId, instructorId); // Run after button click
            } else {
                // If no match exists, redirect to the first page
                console.log('No match found, redirecting to the first page...');
                window.location.href = 'userinstructor.html'; // Adjust URL accordingly
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

// Function to check if the user has already commented on the matched instructor
async function checkForExistingComment(studentId, instructorId) {
    try {
        // Fetch the instructor document from Firestore
        const instructorDoc = await getDoc(doc(db, 'instructors', instructorId));

        if (instructorDoc.exists()) {
            const instructorData = instructorDoc.data();
            const comments = instructorData.comments || []; // Ensure comments is an array

            // Check if the student has already commented
            const hasCommented = comments.some(comment => comment.studentId === studentId);

            if (hasCommented) {
                // If the student has already commented, redirect to the first page
                console.log("User has already submitted feedback. Redirecting to the first page...");
                window.location.href = 'userinstructorreminder.html'; // Adjust URL accordingly
            } else {
                // If the student has not commented yet, redirect to the matched instructor's page
                console.log('No feedback submitted. Redirecting to matched instructor page...');
                window.location.href = 'userinstructormatch.html'; // Adjust URL accordingly
            }
        } else {
            console.error("Instructor document not found.");
            // If the instructor document is not found, handle it accordingly (e.g., log an error, show a message)
        }
    } catch (error) {
        console.error('Error checking for existing comment:', error);
    }
}