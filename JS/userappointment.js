import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBflGD3TVFhlOeUBUPaX3uJTuB-KEgd0ow",
  authDomain: "authentication-d6496.firebaseapp.com",
  projectId: "authentication-d6496",
  storageBucket: "authentication-d6496.appspot.com",
  messagingSenderId: "195867894399",
  appId: "1:195867894399:web:596fb109d308aea8b6154a",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Cache to prevent redundant calls
let userCache = null;

// Function to update PDC state in the UI
function updatePDCState(enabled) {
  const pdcElement = document.querySelector('.pdc');
  if (enabled) {
    pdcElement.classList.remove('disabled');
    pdcElement.removeAttribute('disabled');
    console.log("PDC Enabled");
    localStorage.setItem('pdcState', 'enabled');
  } else {
    pdcElement.classList.add('disabled');
    pdcElement.setAttribute('disabled', true);
    console.log("PDC Disabled");
    localStorage.setItem('pdcState', 'disabled');
  }
}

// Function to apply stored PDC state
function applyStoredPDCState() {
  const storedState = localStorage.getItem('pdcState');
  updatePDCState(storedState === 'enabled');
}

// Load PDC state immediately on page load
applyStoredPDCState();

// Fetch user data once to prevent repeated calls
async function fetchUserData(userId) {
  if (userCache) return userCache; // Return cached data if available

  try {
    const userDocRef = doc(db, "applicants", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      userCache = userDocSnap.data(); // Cache the user data
      return userCache;
    } else {
      console.log("No user document found.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}

// Function to determine PDC status based on TDC completion and package type
async function determinePDCStatus(userId) {
  const userData = await fetchUserData(userId);
  if (!userData) {
    updatePDCState(false); // Disable if no user data found
    return;
  }

  const packageType = userData.packageType || [];

  // Check completed bookings for TDC
  const completedBookingDocRef = doc(db, "completedBookings", userId);
  const completedBookingDoc = await getDoc(completedBookingDocRef);
  const completedBookings = completedBookingDoc.exists() ? completedBookingDoc.data().completedBookings || [] : [];

  const hasCompletedTDC = completedBookings.some(
    (booking) => booking.course === "TDC" && booking.progress === "Completed"
  );

  // Enable PDC if TDC is completed or user has a PDC package
  if (hasCompletedTDC || packageType.includes("PDC")) {
    updatePDCState(true);
  } else {
    updatePDCState(false);
  }
}

// Function to monitor active TDC progress using Firestore snapshots
async function monitorActiveBookings(userId) {
  const appointmentsRef = collection(db, "appointments");

  onSnapshot(query(appointmentsRef, where("bookings.userId", "==", userId)), async (snapshot) => {
    let tdcCompleted = false;

    snapshot.forEach((doc) => {
      const appointment = doc.data();
      if (Array.isArray(appointment.bookings)) {
        tdcCompleted = appointment.bookings.some(
          (booking) => booking.userId === userId && booking.course === "TDC" && booking.progress === "Completed"
        );
      }
    });

    if (tdcCompleted) {
      console.log("TDC is completed in active bookings!");
      updatePDCState(true); // Enable PDC if TDC is completed
    } else {
      await determinePDCStatus(userId); // Check completed bookings and package type
    }
  });
}

// Main function to initialize checks on user sign-in
onAuthStateChanged(auth, (user) => {
  if (user) {
    const userId = user.uid;
    determinePDCStatus(userId); // Check user's enrolled package and completed bookings
    monitorActiveBookings(userId); // Monitor TDC progress in real-time
  } else {
    console.log("No user is signed in.");
    updatePDCState(false); // Ensure PDC is disabled if no user is signed in
  }
});
