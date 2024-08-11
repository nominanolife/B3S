import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

async function checkTDCProgress(userId) {
    const appointmentsRef = collection(db, "appointments");
    const querySnapshot = await getDocs(appointmentsRef);

    let tdcCompleted = false;

    if (querySnapshot.empty) {
        console.log("No matching documents.");
        return;
    }

    querySnapshot.forEach((doc) => {
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

    const pdcElement = document.querySelector('.pdc');

    console.log(`TDC Completed: ${tdcCompleted}`);
    console.log(`PDC Element: ${pdcElement}`);

    if (tdcCompleted) {
        console.log("Enabling PDC...");
        pdcElement.classList.remove('disabled');
        pdcElement.removeAttribute('disabled');
    } else {
        console.log("Disabling PDC...");
        pdcElement.classList.add('disabled');
        pdcElement.setAttribute('disabled', true);
    }
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
