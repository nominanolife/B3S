// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// Firebase configuration
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
const db = getFirestore(app); // Firestore
const storage = getStorage(app); // Firebase Storage

// Function to fetch and display modules
async function fetchAndDisplayModules() {
    const modulesCollection = collection(db, 'modules');
    const moduleSnapshot = await getDocs(modulesCollection);
    const modules = moduleSnapshot.docs.map(doc => doc.data());

    const moduleContainer = document.querySelector('.module-list'); // The container for the modules

    // Clear existing content
    moduleContainer.innerHTML = '';

    // Iterate through the retrieved modules and create elements
    modules.forEach(module => {
        const moduleElement = document.createElement('div');
        moduleElement.classList.add('module-container');

        // Create HTML content for the module element
        moduleElement.innerHTML = `
            <div class="module-preview">
                <i class="bi bi-folder2 default-icon"></i>
            </div>
            <div class="module-details">
                <div class="description">
                    <h3>${module.title}</h3>
                    <p>${module.description}</p>
                </div>
                <button class="btn download-btn">Download</button>
            </div>
        `;

        // Append the module element to the container
        moduleContainer.appendChild(moduleElement);

        // Add event listener to open the file in a new tab when the button is clicked
        const downloadButton = moduleElement.querySelector('.download-btn');
        downloadButton.addEventListener('click', () => {
            openFileInNewTab(module.fileUrl);
        });
    });
}

// Function to open the file in a new tab
function openFileInNewTab(fileUrl) {
    // Open the file URL in a new tab
    window.open(fileUrl, '_blank');
}

document.addEventListener('DOMContentLoaded', function() {
    // Fetch and display modules on page load
    fetchAndDisplayModules();
});
