// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

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

        moduleElement.innerHTML = `
            <div class="module-preview">
                <i class="bi bi-folder2 default-icon"></i>
            </div>
            <div class="module-details">
                <div class="description">
                    <h3>${module.title}</h3>
                    <p>${module.description}</p>
                </div>
                <div class="module-options">
                    <i class="bi bi-three-dots-vertical"></i>
                    <div class="triple-dot-options">
                        <i class="option-dropdown">Edit</i>
                        <i class="option-dropdown">Delete</i>
                    </div>
                </div>
            </div>
        `;

        moduleContainer.appendChild(moduleElement);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Function to handle showing/hiding modals
    function toggleModal(modal, action) {
        modal.style.display = action === 'show' ? 'block' : 'none';
    }

    // Function to handle file input changes
    function handleFileInputChange(inputSelector, displaySelector) {
        document.querySelector(inputSelector).addEventListener('change', function() {
            const fileName = this.files[0] ? this.files[0].name : 'No file selected';
            document.querySelector(displaySelector).textContent = fileName;
        });
    }

    // Handle showing triple-dot options
    document.querySelector('.module-list').addEventListener('click', function(event) {
        const target = event.target;
        if (target.classList.contains('bi-three-dots-vertical')) {
            const optionsMenu = target.nextElementSibling;
            optionsMenu.style.display = optionsMenu.style.display === 'block' ? 'none' : 'block';
            
            // Hide options menu if clicking outside
            document.addEventListener('click', function(e) {
                if (!target.contains(e.target) && !optionsMenu.contains(e.target)) {
                    optionsMenu.style.display = 'none';
                }
            }, {});
        } else if (target.classList.contains('option-dropdown')) {
            const action = target.textContent.trim();
            if (action === 'Edit') {
                toggleModal(document.getElementById('editModuleModal'), 'show');
            } else if (action === 'Delete') {
                toggleModal(document.getElementById('deleteConfirmModal'), 'show');
            }
        }
    });

    // Cancel buttons to close modals
    document.querySelector('.cancel-delete-modal').addEventListener('click', function() {
        toggleModal(document.getElementById('deleteConfirmModal'), 'hide');
    });

    // Close modals on Cancel buttons
    document.querySelector('.cancel-delete-modal').addEventListener('click', function() {
        toggleModal(document.getElementById('deleteConfirmModal'), 'hide');
    });
    
    document.querySelector('.close-edit-modal').addEventListener('click', function() {
        toggleModal(document.getElementById('editModuleModal'), 'hide');
    });

    // Handle 'Upload Module' button and form submission
    document.querySelector('.upload-module').addEventListener('click', function() {
        toggleModal(document.getElementById('moduleModal'), 'show');
    });

    document.querySelector('.close-modal').addEventListener('click', function() {
        toggleModal(document.getElementById('moduleModal'), 'hide');
    });

    // Handle module upload to Firebase
    document.querySelector('.save-module').addEventListener('click', async function(event) {
        event.preventDefault();

        const fileInput = document.querySelector('.module-file');
        const moduleName = document.querySelector('.module-name').value;
        const moduleDescription = document.querySelector('.module-description').value;

        if (!fileInput.files[0] || !moduleName || !moduleDescription) {
            showNotificationModal('Please fill in all fields and select a file.');
            return;
        }

        const file = fileInput.files[0];
        const fileName = file.name;
        const storageRef = ref(storage, `modules/${fileName}`);

        try {
            // Upload the file to Firebase Storage
            const uploadTask = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(uploadTask.ref);

            // Store module info in Firestore
            await addDoc(collection(db, 'modules'), {
                title: moduleName,
                description: moduleDescription,
                fileUrl: downloadURL,
                fileName: fileName
            });

            showNotificationModal('Module uploaded successfully!');
            toggleModal(document.getElementById('moduleModal'), 'hide');

            // Reset the form after successful upload
            document.querySelector('.module-file-name').textContent = 'No file selected';
            document.querySelector('.module-name').value = '';
            document.querySelector('.module-description').value = '';
            document.querySelector('.preview-image').style.display = 'none';
            document.querySelector('.default-icon').style.display = 'block';
            
            // Fetch and display updated modules
            fetchAndDisplayModules();

        } catch (error) {
            console.error('Error uploading module:', error);
            showNotificationModal('Error uploading module. Please try again.');
        }
    });

    // Handle image preview for Edit Modal
    const editModuleImageInput = document.querySelector('.edit-module-image');
    const editModulePreviewImage = document.querySelector('#editModuleModal .preview-image');
    const defaultIcon = document.querySelector('#editModuleModal .default-icon');

    editModuleImageInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                editModulePreviewImage.src = e.target.result;
                editModulePreviewImage.style.display = 'block';
                defaultIcon.style.display = 'none';
            };
            reader.readAsDataURL(file);
        } else {
            editModulePreviewImage.style.display = 'none';
            defaultIcon.style.display = 'block';
        }
    });

    // Handle file inputs
    handleFileInputChange('.edit-module-image', '.image-file-name');
    handleFileInputChange('.edit-module-file', '.file-file-name');
    handleFileInputChange('.module-file', '.module-file-name');

    // Handle image previews
    document.querySelectorAll('.module-preview, .preview').forEach(function(container) {
        const img = container.querySelector('.preview-image');
        const defaultIcon = container.querySelector('.default-icon');

        img.addEventListener('load', function() {
            img.classList.add('loaded');
            defaultIcon.style.display = 'none';
        });

        img.addEventListener('error', function() {
            img.style.display = 'none';
            defaultIcon.style.display = 'block';
        });

        if (!img.src || (img.complete && img.naturalHeight === 0)) {
            img.style.display = 'none';
            defaultIcon.style.display = 'block';
        }
    });

    // Fetch and display modules on page load
    fetchAndDisplayModules();
});

// Function to display the notification modal
function showNotificationModal(message) {
    // Get modal elements
    const notificationModal = document.getElementById('notificationModal');
    const notificationModalBody = document.getElementById('notificationModalBody');

    // Set the message inside the modal
    notificationModalBody.textContent = message;

    // Show the modal
    $(notificationModal).modal('show');
}
