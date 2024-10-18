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

// Function to enable cards based on the packageType (can be string or array)
function enableCard(packageType) {
    // Ensure packageType is treated as an array if it isn't already
    const packageArray = Array.isArray(packageType) ? packageType : [packageType];

    // Enable the 4-WHEELS card if "PDC-4Wheels" is in the packageType array
    if (packageArray.includes("PDC-4Wheels")) {
        const fourWheelsCard = document.querySelector('.tdc'); // Assuming '.tdc' represents 4-WHEELS
        fourWheelsCard.removeAttribute('disabled'); // Enable the 4-WHEELS card
        fourWheelsCard.classList.remove('disabled'); // Optionally remove the 'disabled' class
    }

    // Enable the MOTORCYCLE card if "PDC-Motors" is in the packageType array
    if (packageArray.includes("PDC-Motors")) {
        const motorcycleCard = document.querySelector('.pdc'); // Assuming '.pdc' represents MOTORCYCLE
        motorcycleCard.removeAttribute('disabled'); // Enable the MOTORCYCLE card
        motorcycleCard.classList.remove('disabled'); // Optionally remove the 'disabled' class
    }
}

// Listen for the currently logged-in user
onAuthStateChanged(auth, (user) => {
    if (user) {
        const applicantId = user.uid; // Use the logged-in user's unique ID (uid)
        fetchApplicantData(applicantId); // Fetch applicant data using the user's ID
    } else {
        console.log("No user is logged in");
    }
});
