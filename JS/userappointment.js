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
$(document).ready(function () {
  // Apply stored PDC and TDC state immediately after the DOM is ready
  applyStoredPDCState();
  applyStoredTDCState();

  // Attach event listener to the appointment navigation button
  $('#appointment-btn').on('click', function (e) {
    if (localStorage.getItem('pdcState') !== 'enabled' || localStorage.getItem('tdcState') !== 'enabled') {
      e.preventDefault(); // Prevent navigation
      alert("You must enroll in both TDC and PDC packages to proceed to the appointment.");
    }
  });
});

// Function to apply stored TDC state
function applyStoredTDCState() {
  const storedState = localStorage.getItem('tdcState');
  updateTDCState(storedState === 'enabled');
}

// Function to update PDC state in the UI with popover handling
function updatePDCState(enabled) {
  const pdcElement = $('.pdc');
  
  if (enabled) {
    pdcElement.removeClass('disabled-link');
    console.log("PDC Enabled");
    localStorage.setItem('pdcState', 'enabled');

    // Remove the popover and event handlers
    pdcElement.popover('dispose');
    pdcElement.off('mouseenter mouseleave click');
  } else {
    pdcElement.addClass('disabled-link');
    console.log("PDC Disabled");
    localStorage.setItem('pdcState', 'disabled');

    // Initialize popover
    pdcElement.popover({
      trigger: 'manual',
      html: true,
      placement: 'bottom',
      content: 'You must enroll in a package that includes PDC to unlock this feature.'
    });

    // Show popover on hover
    pdcElement.on('mouseenter', function () {
      $(this).popover('show');
    }).on('mouseleave', function () {
      $(this).popover('hide');
    });

    // Prevent default action on click
    pdcElement.on('click', function (e) {
      e.preventDefault();
    });
  }
}

// Function to apply stored PDC state
function applyStoredPDCState() {
  const storedState = localStorage.getItem('pdcState');
  updatePDCState(storedState === 'enabled');
}

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

// Function to update TDC state in the UI with popover handling
function updateTDCState(enabled) {
  const tdcElement = $('.tdc');
  
  if (enabled) {
    tdcElement.removeClass('disabled-link');
    console.log("TDC Enabled");
    localStorage.setItem('tdcState', 'enabled');

    // Remove the popover and event handlers
    tdcElement.popover('dispose');
    tdcElement.off('mouseenter mouseleave click');
  } else {
    tdcElement.addClass('disabled-link');
    console.log("TDC Disabled");
    localStorage.setItem('tdcState', 'disabled');

    // Initialize popover
    tdcElement.popover({
      trigger: 'manual',
      html: true,
      placement: 'bottom',
      content: 'You must enroll in a package that includes TDC to unlock this feature.'
    });

    // Show popover on hover
    tdcElement.on('mouseenter', function () {
      $(this).popover('show');
    }).on('mouseleave', function () {
      $(this).popover('hide');
    });

    // Prevent default action on click
    tdcElement.on('click', function (e) {
      e.preventDefault();
    });
  }
}

// Modify determinePDCStatus to also check for TDC package
async function determinePDCStatus(userId) {
  const userData = await fetchUserData(userId);
  if (!userData) {
    updatePDCState(false); // Disable if no user data found
    updateTDCState(false); // Also disable TDC
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

  // Check for TDC package and enable/disable TDC accordingly
  if (packageType.includes("TDC")) {
    updateTDCState(true); // Enable if the user has a TDC package
  } else {
    updateTDCState(false); // Disable if no TDC package
  }
}

/// Modify determinePDCStatus to enable both TDC and PDC simultaneously if the package includes both
async function determinePDCAndTDCStatus(userId) {
  const userData = await fetchUserData(userId);
  if (!userData) {
    updatePDCState(false); // Disable if no user data found
    updateTDCState(false); // Also disable TDC
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

  // Check if either PDC-4Wheels or PDC-Motors is part of the package
  const hasPDC4Wheels = packageType.includes("PDC-4Wheels");
  const hasPDCMotors = packageType.includes("PDC-Motors");

  // Enable PDC if TDC is completed or user has either PDC-4Wheels or PDC-Motors package
  if (hasCompletedTDC || hasPDC4Wheels || hasPDCMotors) {
    updatePDCState(true);
  } else {
    updatePDCState(false);
  }

  // Enable TDC if the package includes TDC or if TDC has been completed
  if (packageType.includes("TDC") || hasCompletedTDC) {
    updateTDCState(true);
  } else {
    updateTDCState(false);
  }
}

// Modify monitorActiveBookings to handle both TDC and PDC
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
      updateTDCState(true); // Enable TDC if completed
      updatePDCState(true); // Simultaneously check PDC as TDC is a prerequisite
    } else {
      await determinePDCAndTDCStatus(userId); // Check completed bookings and package types for both courses
    }
  });
}

// Main function to initialize checks on user sign-in
onAuthStateChanged(auth, (user) => {
  if (user) {
    const userId = user.uid;
    determinePDCAndTDCStatus(userId); // Check user's enrolled package and completed bookings for both PDC and TDC
    monitorActiveBookings(userId); // Monitor TDC progress in real-time
  } else {
    console.log("No user is signed in.");
    updatePDCState(false); // Ensure PDC is disabled if no user is signed in
    updateTDCState(false); // Ensure TDC is disabled if no user is signed in
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