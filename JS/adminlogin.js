// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBflGD3TVFhlOeUBUPaX3uJTuB-KEgd0ow",
  authDomain: "authentication-d6496.firebaseapp.com",
  projectId: "authentication-d6496",
  storageBucket: "authentication-d6496.appspot.com",
  messagingSenderId: "195867894399",
  appId: "1:195867894399:web:596fb109d308aea8b6154a"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth and Firestore
const auth = getAuth(app);
const db = getFirestore(app);

document.getElementById('loginBtn').addEventListener('click', async function (event) {
  event.preventDefault();

  const identifier = document.getElementById('name').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!identifier || !password) {
    showModal("Please fill in both fields.");
    return;
  }

  document.getElementById('loader1').style.display = 'flex'; // Show loader

  try {
    // Step 1: Check if the user is an admin
    const isAdmin = await checkAdminCredentials(identifier, password);

    if (isAdmin) {
      // Admin credentials matched; redirect to admin dashboard
      window.location.href = "admindashboard.html";
      return;
    }

    // Step 2: If not an admin, attempt Firebase Authentication for instructors
    const userCredential = await signInWithEmailAndPassword(auth, identifier, password);
    const user = userCredential.user;

    // Step 3: Redirect instructors to their profile
    window.location.href = "instructorpofile.html";
  } catch (error) {
    console.error("Login error:", error);
    showModal("Invalid credentials. Please try again.");
  } finally {
    document.getElementById('loader1').style.display = 'none'; // Hide loader
  }
});

// Function to check admin credentials in Firestore
async function checkAdminCredentials(identifier, password) {
  try {
    const querySnapshot = await getDocs(collection(db, "admin"));
    let isAdmin = false;

    querySnapshot.forEach((doc) => {
      const userData = doc.data();

      if ((userData.email === identifier || userData.name === identifier) && userData.password === password && userData.role === "admin") {
        isAdmin = true;
      }
    });

    return isAdmin;
  } catch (error) {
    console.error("Error checking admin credentials:", error);
    return false;
  }
}

// Function to show error messages in a modal
function showModal(message) {
  document.getElementById('notificationMessage').textContent = message;
  const notificationModal = new bootstrap.Modal(document.getElementById('notificationModal'));
  notificationModal.show();
}
