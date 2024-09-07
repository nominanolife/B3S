import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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
        let hasCompletedTDC = false;

        completedBookings.forEach(booking => {
            if (booking.course === "TDC" && booking.progress === "Completed") {
                console.log("TDC is completed in completedBookings!");
                hasCompletedTDC = true;
                enablePDC(); // Enable PDC if TDC is completed
            }
        });

        if (!hasCompletedTDC) {
            console.log("TDC not completed in completedBookings.");
            // Check if PDC should remain enabled based on user's package type
            const userDocRef = doc(db, "applicants", userId);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const packageType = userData.packageType;
                
                if (packageType && packageType.includes("PDC")) {
                    enablePDC(); // Ensure PDC remains enabled if user has PDC type
                } else {
                    disablePDC(); // Disable PDC if the user does not have the PDC type
                }
            } else {
                disablePDC(); // No user document found, ensure PDC is disabled
            }
        }
    } else {
        console.log("No completed bookings document found for the user.");
        // Check if PDC should remain enabled based on user's package type
        const userDocRef = doc(db, "applicants", userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const packageType = userData.packageType;
            
            if (packageType && packageType.includes("PDC")) {
                enablePDC(); // Ensure PDC remains enabled if user has PDC type
            } else {
                disablePDC(); // Disable PDC if the user does not have the PDC type
            }
        } else {
            disablePDC(); // No user document found, ensure PDC is disabled
        }
    }
}

// Function to check the user's enrolled package and adjust the UI
async function checkUserEnrolledPackage(userId) {
    try {
        const userDocRef = doc(db, "applicants", userId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const packageType = userData.packageType; // Assume this is an array

            console.log("User's Package Type:", packageType); // Debugging statement

            if (packageType && packageType.includes("PDC")) {
                enablePDC(); // Enable PDC if user has enrolled in a package with PDC
            } else if (packageType && packageType.includes("TDC")) {
                disablePDC(); // Disable PDC if user has only enrolled in TDC
            } else {
                console.log("Neither PDC nor TDC found in user's package type.");
                disablePDC(); // Ensure PDC stays disabled if no valid type is found
            }
        } else {
            console.log("No user document found.");
            disablePDC();
        }
    } catch (error) {
        console.error("Error checking user's enrolled package:", error);
        disablePDC();
    }
}

// Get the logged-in user's ID and check their package and TDC progress
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userId = user.uid;
        checkUserEnrolledPackage(userId); // Check the user's enrolled package
        checkTDCProgress(userId); // Check TDC progress as before
    } else {
        console.log("No user is signed in.");
    }
});
