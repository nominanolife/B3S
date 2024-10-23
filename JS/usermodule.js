// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

// Function to fetch and display modules in real-time
function fetchAndDisplayModules() {
    const modulesCollection = collection(db, 'modules');

    // Listen for real-time updates with onSnapshot
    onSnapshot(modulesCollection, (snapshot) => {
        const modules = snapshot.docs.map(doc => doc.data());

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
                    <a href="${module.fileUrl}" target="_blank" class="btn download-btn">Open File</a>
                </div>
            `;

            // Append the module element to the container
            moduleContainer.appendChild(moduleElement);

            // Check if list-view is active, then make the module clickable
            moduleElement.addEventListener('click', function () {
                const moduleList = document.querySelector('.module-list');
                if (moduleList.classList.contains('list-view')) {
                    // If it's in list-view, redirect to the module file
                    window.open(module.fileUrl, '_blank');
                }
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Fetch and display modules in real-time when the page loads
    fetchAndDisplayModules();

    const gridIcon = document.querySelector('.bi-grid');
    const listIcon = document.querySelector('.bi-list');
    const moduleList = document.querySelector('.module-list');

    // Load the saved view format from localStorage (if exists)
    const savedView = localStorage.getItem('moduleView');
    if (savedView) {
        // Apply the saved view
        if (savedView === 'list-view') {
            listIcon.classList.add('active');
            gridIcon.classList.remove('active');
            moduleList.classList.add('list-view');
        } else {
            gridIcon.classList.add('active');
            listIcon.classList.remove('active');
            moduleList.classList.add('grid-view');
        }
    } else {
        // Default to grid view if no preference is saved
        gridIcon.classList.add('active');
        moduleList.classList.add('grid-view');
    }

    // Event listener for grid view
    gridIcon.addEventListener('click', function () {
        gridIcon.classList.add('active');
        listIcon.classList.remove('active');

        // Change module-list class to grid view and save preference
        moduleList.classList.remove('list-view');
        moduleList.classList.add('grid-view');
        localStorage.setItem('moduleView', 'grid-view'); // Save grid view
    });

    // Event listener for list view
    listIcon.addEventListener('click', function () {
        listIcon.classList.add('active');
        gridIcon.classList.remove('active');

        // Change module-list class to list view and save preference
        moduleList.classList.remove('grid-view');
        moduleList.classList.add('list-view');
        localStorage.setItem('moduleView', 'list-view'); // Save list view
    });
});

// JavaScript for sidebar toggle
document.getElementById('toggleSidebarBtn').addEventListener('click', function() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    // Toggle the 'active' class to show or hide the sidebar
    sidebar.classList.toggle('active');
    mainContent.classList.toggle('active');
});