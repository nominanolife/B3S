// Import Firebase dependencies (Firestore, Authentication, etc.)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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
const auth = getAuth(app);

// Function to fetch applicant data from Firestore based on logged-in user's ID
async function fetchApplicantData(applicantId) {
    try {
        // Reference the document in the 'applicants' collection using applicantId
        const docRef = doc(db, "applicants", applicantId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const packageType = data.packageType; // Fetch the packageType string or array
            console.log("Package Type from Firestore:", packageType);

            // Enable the appropriate cards based on the packageType
            enableCard(packageType);
        } else {
            console.log("No such document!");
        }
    } catch (error) {
        console.error("Error fetching document:", error);
    }
}

// Function to enable or disable cards based on the packageType (can be string or array)
function enableCard(packageType) {
    // Ensure packageType is treated as an array if it isn't already
    const packageArray = Array.isArray(packageType) ? packageType : [packageType];

    // Handle the 4-WHEELS card based on the package type
    const fourWheelsCard = document.querySelector('.tdc'); // Assuming '.tdc' represents 4-WHEELS
    if (packageArray.includes("PDC-4Wheels")) {
        fourWheelsCard.removeAttribute('disabled'); // Enable the 4-WHEELS card
        fourWheelsCard.classList.remove('disabled'); // Optionally remove the 'disabled' class
        localStorage.setItem('pdc4WheelsState', 'enabled'); // Store the state in localStorage
    } else {
        fourWheelsCard.setAttribute('disabled', 'disabled'); // Disable the 4-WHEELS card
        fourWheelsCard.classList.add('disabled'); // Optionally add the 'disabled' class
        localStorage.setItem('pdc4WheelsState', 'disabled'); // Update localStorage state
    }

    // Handle the MOTORCYCLE card based on the package type
    const motorcycleCard = document.querySelector('.pdc'); // Assuming '.pdc' represents MOTORCYCLE
    if (packageArray.includes("PDC-Motors")) {
        motorcycleCard.removeAttribute('disabled'); // Enable the MOTORCYCLE card
        motorcycleCard.classList.remove('disabled'); // Optionally remove the 'disabled' class
        localStorage.setItem('pdcMotorsState', 'enabled'); // Store the state in localStorage
    } else {
        motorcycleCard.setAttribute('disabled', 'disabled'); // Disable the MOTORCYCLE card
        motorcycleCard.classList.add('disabled'); // Optionally add the 'disabled' class
        localStorage.setItem('pdcMotorsState', 'disabled'); // Update localStorage state
    }
}

// Function to apply stored card states from localStorage
function applyStoredCardStates() {
    const pdc4WheelsState = localStorage.getItem('pdc4WheelsState');
    const pdcMotorsState = localStorage.getItem('pdcMotorsState');

    // Apply the state for the 4-WHEELS card
    const fourWheelsCard = document.querySelector('.tdc');
    if (pdc4WheelsState === 'enabled') {
        fourWheelsCard.removeAttribute('disabled');
        fourWheelsCard.classList.remove('disabled');
    } else {
        fourWheelsCard.setAttribute('disabled', 'disabled');
        fourWheelsCard.classList.add('disabled');
    }

    // Apply the state for the MOTORCYCLE card
    const motorcycleCard = document.querySelector('.pdc');
    if (pdcMotorsState === 'enabled') {
        motorcycleCard.removeAttribute('disabled');
        motorcycleCard.classList.remove('disabled');
    } else {
        motorcycleCard.setAttribute('disabled', 'disabled');
        motorcycleCard.classList.add('disabled');
    }
}

// Apply the stored states as soon as the page loads
document.addEventListener("DOMContentLoaded", () => {
    applyStoredCardStates();
});

// Listen for the currently logged-in user
onAuthStateChanged(auth, (user) => {
    if (user) {
        const applicantId = user.uid; // Use the logged-in user's unique ID (uid)
        fetchApplicantData(applicantId); // Fetch applicant data using the user's ID
    } else {
        console.log("No user is logged in");
    }
});
// JavaScript for sidebar toggle
document.getElementById('toggleSidebarBtn').addEventListener('click', function() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    // Toggle the 'active' class to show or hide the sidebar
    sidebar.classList.toggle('active');
    mainContent.classList.toggle('active');
});
