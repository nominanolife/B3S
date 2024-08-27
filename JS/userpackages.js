import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';

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

// Common functions and variables
let currentIndex = 0;
const tilesPerPage = 1;
const packageContainer = document.querySelector('.package-container');
let packages = [];
let userEnrolledPackage = null; // To store the user's enrolled package

function renderPackages(packagesToRender) {
  packageContainer.innerHTML = '';

  if (packagesToRender.length === 0) {
    packageContainer.innerHTML = '<h3>No packages are available at the moment.</h3>';
    return;
  }

  packagesToRender.forEach(pkg => {
    const packageType = Array.isArray(pkg.type) && pkg.type.length > 0 ? pkg.type.join(', ') : ''; // Ensure type is valid and not empty

    const packageHtml = `
      <div class="package-tiles">
        <div class="package-header">
          <h1></h1>
          <i class="info bi bi-info-circle" data-toggle="modal" data-target="#infoModal"></i>
        </div>
        <form class="package-body">
          <div class="package-text">
            <h1>${packageType}</h1> <!-- Displaying Package Type -->
            <h2>${pkg.name}</h2>
            <span>Tuition Fee: &#8369;${pkg.price}</span>
            <h3>${pkg.description}</h3>
          </div>
          <div class="package-footer">
            <button class="enroll-now-button" type="button" data-package-id="${pkg.id}" data-package-name="${pkg.name}" ${userEnrolledPackage ? 'disabled' : ''}>Enroll Now</button>
          </div>
        </form>
      </div>
    `;
    packageContainer.insertAdjacentHTML('beforebegin', packageHtml);
  });

  showTiles(currentIndex);
}

function showTiles(index) {
  document.querySelectorAll('.package-tiles').forEach((tile, i) => {
    tile.classList.toggle('active', i >= index && i < index + tilesPerPage);
    tile.style.display = i >= index && i < index + tilesPerPage ? 'block' : 'none';
  });

  document.querySelector('.left-arrow').style.visibility = currentIndex === 0 ? 'hidden' : 'visible';
  document.querySelector('.right-arrow').style.visibility = currentIndex + tilesPerPage >= packages.length ? 'hidden' : 'visible';
}

document.querySelector('.right-arrow').addEventListener('click', () => {
  if (currentIndex + tilesPerPage < packages.length) {
    currentIndex += tilesPerPage;
    showTiles(currentIndex);
  }
});

document.querySelector('.left-arrow').addEventListener('click', () => {
  if (currentIndex - tilesPerPage >= 0) {
    currentIndex -= tilesPerPage;
    showTiles(currentIndex);
  }
});

// Fetch packages from Firestore and render them
async function fetchPackages() {
  try {
    const querySnapshot = await getDocs(collection(db, "packages"));
    packages = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    renderPackages(packages);
  } catch (error) {
    console.error("Error fetching packages: ", error);
  }
}

fetchPackages();

// Handle close button click
document.querySelector('.modal .close').addEventListener('click', () => {
  $('#infoModal').modal('hide');
});

document.addEventListener('click', (e) => {
  if (e.target && e.target.classList.contains('enroll-now-button')) {
    const packageId = e.target.dataset.packageId;
    const packageName = e.target.dataset.packageName;

    // Set the package information on the modal
    document.getElementById('confirmEnrollButton').dataset.packageId = packageId;
    document.getElementById('confirmEnrollButton').dataset.packageName = packageName;

    // Show the confirmation modal
    $('#confirmModal').modal('show');
  }
});

document.getElementById('confirmEnrollButton').addEventListener('click', async () => {
  const packageId = document.getElementById('confirmEnrollButton').dataset.packageId;
  const packageName = document.getElementById('confirmEnrollButton').dataset.packageName;
  const user = auth.currentUser;

  if (user) {
    const userId = user.uid;
    const selectedPackage = packages.find(pkg => pkg.id === packageId);

    if (userEnrolledPackage) {
      showEnrollmentModal("You are currently enrolled in this package. Please consult the admin to change your enrolled package.", "error");
    } else {
      if (selectedPackage) {
        try {
          await updateDoc(doc(db, "applicants", userId), {
            role: "student",
            packageName: packageName, // Store the package name
            packagePrice: selectedPackage.price, // Store the package price
            packageType: selectedPackage.type // Store the package type
          });
          document.querySelectorAll('.enroll-now-button').forEach(btn => btn.disabled = true);
          userEnrolledPackage = packageName;
          showEnrollmentModal("Enrollment successful!", "success");
        } catch (error) {
          showEnrollmentModal("Failed to enroll. Please try again.", "error");
        }
      } else {
        console.error("Package not found.");
      }
    }
  } else {
    console.error("No user is currently signed in.");
  }

  // Hide the confirmation modal
  $('#confirmModal').modal('hide');
});

// Function to show enrollment modal with a custom message
function showEnrollmentModal(message, type) {
  const modalBody = document.getElementById("enrollmentModalBody");
  modalBody.textContent = message;

  if (type === "success") {
    modalBody.style.color = "green";
  } else if (type === "error") {
    modalBody.style.color = "red";
  }

  // Show the modal
  $('#enrollmentModal').modal('show');

  // Redirect to userappointment.html after the modal is closed if enrollment is successful
  if (type === "success") {
    $('#enrollmentModal').on('hidden.bs.modal', function () {
      window.location.href = "userappointment.html";
    });
  }
}

// Check enrollment status on page load
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userId = user.uid;
    try {
      const docSnap = await getDoc(doc(db, "applicants", userId));
      if (docSnap.exists()) {
        const userData = docSnap.data();
        userEnrolledPackage = userData.packageName || null;
        if (userEnrolledPackage) {
          document.querySelectorAll('.enroll-now-button').forEach(btn => btn.disabled = true);
        }
      } else {
        console.error("No such document!");
      }
    } catch (error) {
      console.error("Error getting document:", error);
    }
  } else {
    console.error("No user is currently signed in.");
  }
});
