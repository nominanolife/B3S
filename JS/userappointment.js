import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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
    let tdcCompleted = false;

    // Check active bookings in "appointments" collection
    const unsubscribe = onSnapshot(query(appointmentsRef, where("bookings.userId", "==", userId)), async (snapshot) => {
        if (snapshot.empty) {
            // No active bookings found
            await checkCompletedBookings(userId);
        } else {
            snapshot.forEach((doc) => {
                const appointment = doc.data();
                if (Array.isArray(appointment.bookings)) {
                    const userBookings = appointment.bookings.filter(booking => booking.userId === userId && booking.course === "TDC");
                    userBookings.forEach(booking => {
                        if (booking.progress === "Completed") {
                            console.log("TDC is completed in active bookings!");
                            tdcCompleted = true;
                            enablePDC();
                        }
                    });
                }
            });
            if (!tdcCompleted) {
                await checkCompletedBookings(userId);
            }
        }
    });
}

async function checkCompletedBookings(userId) {
    const completedBookingDocRef = doc(db, "completedBookings", userId);
    const completedBookingDoc = await getDoc(completedBookingDocRef);

    if (completedBookingDoc.exists()) {
        const completedBookings = completedBookingDoc.data().completedBookings || [];
        completedBookings.forEach(booking => {
            if (booking.course === "TDC" && booking.progress === "Completed") {
                console.log("TDC is completed in completedBookings!");
                enablePDC();
            }
        });
    } else {
        console.log("No completed bookings document found for the user.");
        disablePDC(); // No completion found, ensure PDC stays disabled
    }
}

// Get the logged-in user's ID and check TDC progress
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userId = user.uid;
        checkTDCProgress(userId);
    } else {
        console.log("No user is signed in.");
    }
});