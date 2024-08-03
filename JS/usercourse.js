import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';

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

function renderPackages(packages) {
  packageContainer.innerHTML = '';
  packages.forEach(pkg => {
    const packageHtml = `
      <div class="package-tiles">
        <button class="info" type="button" id="infoButton"><i class="bi bi-info-circle"></i></button>
        <form class="package-body">
          <div class="package-text">
            <h2>${pkg.name}</h2>
            <span>Tuition Fee: &#8369;${pkg.price}</span>
            <h3>${pkg.description}</h3>
          </div>
          <div class="package-footer">
            <button class="enroll-now-button" type="button" data-package-id="${pkg.id}" data-package-name="${pkg.name}">Enroll Now</button>
          </div>
        </form>
      </div>`;
    packageContainer.insertAdjacentHTML('beforeend', packageHtml);
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

// Handle info button click
document.addEventListener('click', (e) => {
  if (e.target && e.target.classList.contains('info')) {
    $('#infoModal').modal('show');
  }
});

// Handle close button click
document.querySelector('.modal .close').addEventListener('click', () => {
  $('#infoModal').modal('hide');
});

// Handle enroll button click
document.addEventListener('click', async (e) => {
  if (e.target && e.target.classList.contains('enroll-now-button')) {
    const packageId = e.target.dataset.packageId;
    const packageName = e.target.dataset.packageName;
    const user = auth.currentUser;

    if (user) {
      const userId = user.uid;

      if (userEnrolledPackage) {
        $('#enrollmentToast').toast('show');
      } else {
        if (confirm("Enroll in this course?")) {
          try {
            await updateDoc(doc(db, "applicants", userId), {
              role: "student",
              enrolledPackage: packageName // Store the package name
            });
            document.querySelectorAll('.enroll-now-button').forEach(btn => btn.disabled = true);
            userEnrolledPackage = packageName;
            window.location.href = "userappointment.html";
          } catch (error) {
            console.error("Error updating user role: ", error);
          }
        }
      }
    } else {
      console.error("No user is currently signed in.");
    }
  }
});

// Check enrollment status on page load
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userId = user.uid;
    try {
      const docSnap = await getDoc(doc(db, "applicants", userId));
      if (docSnap.exists()) {
        const userData = docSnap.data();
        userEnrolledPackage = userData.enrolledPackage || null;
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