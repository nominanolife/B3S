import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// Your web app's Firebase configuration
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
const auth = getAuth(app); // Initialize authentication

// Function to handle the saving of traits
document.getElementById('saveButton').addEventListener('click', function() {
    // Listen for authentication state changes
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, retrieve the user ID
        const userId = user.uid;

        // Collect the selected traits
        const selectedTraits = [];
        document.querySelectorAll('input[name="traits"]:checked').forEach((checkbox) => {
          selectedTraits.push(checkbox.nextElementSibling.innerText);
        });

        // Reference to the Firestore document
        const userDocRef = doc(db, 'applicants', userId);

        // Update the Firestore document with the selected traits
        try {
          await setDoc(userDocRef, {
            traits: selectedTraits
          }, { merge: true });

          alert("Traits saved successfully!");

          // Redirect to the userinstructormatch.html page after saving
          window.location.href = 'userinstructormatch.html';

        } catch (error) {
          console.error("Error saving traits: ", error);
          alert("An error occurred while saving traits.");
        }
      } else {
        // User is not signed in
        alert("You must be logged in to save traits.");
      }
    });
});
