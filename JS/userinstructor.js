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

let userId = '';  // Variable to hold user ID

// Early authentication check (Solution 5)
onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid;  // Store user ID once authenticated
    } else {
        // If user is not logged in, show alert and redirect to login page
        alert("You must be logged in to select traits.");
        window.location.href = 'login.html';  // Redirect to login page
    }
});

// Function to handle the saving of traits
document.getElementById('saveButton').addEventListener('click', async function() {
  // Disable save button to prevent multiple submissions (Solution 2)
  const saveButton = document.getElementById('saveButton');
  saveButton.disabled = true;

  // Show loader
  document.getElementById('loader').style.display = 'flex';

  // Collect the selected traits
  const selectedTraits = [];
  document.querySelectorAll('input[name="traits"]:checked').forEach((checkbox) => {
    selectedTraits.push(checkbox.nextElementSibling.innerText);
  });

  // Validation: Ensure at least one trait is selected (Solution 1)
  if (selectedTraits.length === 0) {
    // Hide loader and re-enable save button if no traits are selected
    document.getElementById('loader').style.display = 'none';
    saveButton.disabled = false;
    alert("Please select at least one trait before saving.");
    return;
  }

  // Reference to the Firestore document
  const userDocRef = doc(db, 'applicants', userId);

  // Update the Firestore document with the selected traits
  try {
    await setDoc(userDocRef, {
      traits: selectedTraits
    }, { merge: true });

    // Display success notification
    document.getElementById('notificationModalBody').innerText = "Traits saved successfully!";
    $('#notificationModal').modal('show');

    // Hide loader
    document.getElementById('loader').style.display = 'none';

    // Redirect to the userinstructormatch.html page after saving
    $('#notificationModal').on('hidden.bs.modal', function () {
      window.location.href = 'userinstructorreminder.html';
    });

  } catch (error) {
    console.error("Error saving traits: ", error);

    // Provide clearer error feedback (Solution 3)
    document.getElementById('notificationModalBody').innerText = "An error occurred while saving traits. Please check your internet connection and try again.";
    $('#notificationModal').modal('show');

    // Hide loader and re-enable save button
    document.getElementById('loader').style.display = 'none';
    saveButton.disabled = false;  // Re-enable button in case of error
  }
});
