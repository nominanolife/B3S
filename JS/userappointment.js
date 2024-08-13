import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Function to disable the PDC element
function disablePDC() {
    const pdcElement = document.querySelector('.pdc');
    pdcElement.classList.add('disabled');
    pdcElement.setAttribute('disabled', true);
    console.log("PDC Disabled");
    // Store the state in local storage
    localStorage.setItem('pdcState', 'disabled');
}

// Function to enable the PDC element
function enablePDC() {
    const pdcElement = document.querySelector('.pdc');
    pdcElement.classList.remove('disabled');
    pdcElement.removeAttribute('disabled');
    console.log("PDC Enabled");
    // Store the state in local storage
    localStorage.setItem('pdcState', 'enabled');
}

// Function to check the stored PDC state and apply it
function applyStoredPDCState() {
    const storedState = localStorage.getItem('pdcState');
    if (storedState === 'enabled') {
        enablePDC();
    } else {
        disablePDC();
    }
}

// Apply the stored PDC state immediately on page load
applyStoredPDCState();

async function checkTDCProgress(userId) {
    const appointmentsRef = collection(db, "appointments");

    // Listen for real-time updates in the "appointments" collection
    onSnapshot(appointmentsRef, (snapshot) => {
        let tdcCompleted = false;

        snapshot.forEach((doc) => {
            const appointment = doc.data();

            if (Array.isArray(appointment.bookings)) {
                const userBookings = appointment.bookings.filter(booking => booking.userId === userId);

                userBookings.forEach(booking => {
                    console.log(`Booking found: ${JSON.stringify(booking)}`);
                    if (booking.progress === "Completed") {
                        console.log("TDC is completed!");
                        tdcCompleted = true;
                    }
                });
            }
        });

        // Update the PDC element state based on TDC completion status
        if (tdcCompleted) {
            enablePDC();
        } else {
            disablePDC();
        }
    });
}

// Get the logged-in user's ID
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userId = user.uid;
        checkTDCProgress(userId);
    } else {
        console.log("No user is signed in.");
    }
});
