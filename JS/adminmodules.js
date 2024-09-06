// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, getDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

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

// Fetch and display modules function
async function fetchAndDisplayModules() {
    const modulesCollection = collection(db, 'modules');
    const moduleSnapshot = await getDocs(modulesCollection);
    const modules = moduleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const moduleContainer = document.querySelector('.module-list'); // The container for the modules
    moduleContainer.innerHTML = ''; // Clear previous content

    // Display the modules
    modules.forEach(module => {
        const moduleElement = document.createElement('div');
        moduleElement.classList.add('module-container');
        moduleElement.setAttribute('data-module-id', module.id); // Store module ID

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

    // Handle triple-dot options display and selecting options
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
            }, { once: true });

        } else if (target.classList.contains('option-dropdown')) {
            const action = target.textContent.trim();
            const moduleContainer = target.closest('.module-container');
            const moduleId = moduleContainer.getAttribute('data-module-id');

            if (action === 'Edit') {
                toggleModal(document.getElementById('editModuleModal'), 'show');
                editModule(moduleId); // Open the edit modal with current module data
            } else if (action === 'Delete') {
                toggleModal(document.getElementById('deleteConfirmModal'), 'show');
                document.querySelector('.confirm-delete').addEventListener('click', function() {
                    deleteModule(moduleId);
                    toggleModal(document.getElementById('deleteConfirmModal'), 'hide');
                });
            }

            // Close the options menu after an action is selected
            const optionsMenu = target.closest('.triple-dot-options');
            optionsMenu.style.display = 'none';
        }
    });

    // Upload Module function (re-added)
    document.querySelector('.upload-module').addEventListener('click', function() {
        toggleModal(document.getElementById('moduleModal'), 'show');
    });

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
            document.querySelector('.default-icon').style.display = 'block';
            
            // Fetch and display updated modules
            fetchAndDisplayModules();

        } catch (error) {
            console.error('Error uploading module:', error);
            showNotificationModal('Error uploading module. Please try again.');
        }
    });

    // Edit Module function
    async function editModule(moduleId) {
        const moduleDocRef = doc(db, 'modules', moduleId);
        const moduleDoc = await getDoc(moduleDocRef);
        const moduleData = moduleDoc.data();
    
        // Populate modal fields with current module data
        document.querySelector('.edit-module-name').value = moduleData.title;
        document.querySelector('.edit-module-description').value = moduleData.description;
        
        // Display the current file
        document.querySelector('.file-file-name').textContent = moduleData.fileName || 'No file selected';
        
        // Display the preview image if there is one (if file is an image, or use a default icon for non-images)
        document.querySelector('.preview-image').src = moduleData.fileUrl || '';
        
        // Update the module on form submission
        document.querySelector('.update-module').addEventListener('click', async function(event) {
            event.preventDefault();
    
            const newTitle = document.querySelector('.edit-module-name').value;
            const newDescription = document.querySelector('.edit-module-description').value;
            const newFileInput = document.querySelector('.edit-module-file');
            let newFileUrl = moduleData.fileUrl;
            let newFileName = moduleData.fileName;
    
            // Handle file upload if a new file is selected
            if (newFileInput.files[0]) {
                const newFile = newFileInput.files[0];
                const fileName = newFile.name;
                const storageRef = ref(storage, `modules/${fileName}`);
    
                const uploadTask = await uploadBytes(storageRef, newFile);
                newFileUrl = await getDownloadURL(uploadTask.ref);
                newFileName = fileName; // Update the file name as well
            }
    
            // Update the existing Firestore document
            await updateDoc(moduleDocRef, {
                title: newTitle,
                description: newDescription,
                fileUrl: newFileUrl,
                fileName: newFileName
            });
    
            // Close the modal
            toggleModal(document.getElementById('editModuleModal'), 'hide');
    
            // Refresh the module list
            fetchAndDisplayModules();
        });
    }

    // Delete Module function
    async function deleteModule(moduleId) {
        // Get the module document to retrieve the file details
        const moduleDocRef = doc(db, 'modules', moduleId);
        const moduleDoc = await getDoc(moduleDocRef);
        
        if (moduleDoc.exists()) {
            const moduleData = moduleDoc.data();
    
            // Get the file URL or file path (fileName) from the document
            const fileUrl = moduleData.fileUrl;
            const fileName = moduleData.fileName;
    
            // If the file exists, delete it from Firebase Storage
            if (fileName) {
                const storageRef = ref(storage, `modules/${fileName}`); // Assuming files are stored in the 'modules' folder
                await deleteObject(storageRef)
                    .then(() => {
                        console.log(`File ${fileName} deleted successfully.`);
                    })
                    .catch((error) => {
                        console.error("Error deleting file from storage:", error);
                    });
            }
            
            // Delete the Firestore document
            await deleteDoc(moduleDocRef);
            console.log("Module document deleted successfully.");
    
            // Refresh the module list
            fetchAndDisplayModules();
        } else {
            console.error("Module not found.");
        }
    }

    // Handle file input change
    handleFileInputChange('.module-file', '.module-file-name');
    handleFileInputChange('.edit-module-file', '.file-file-name');

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

    // Cancel buttons to close modals
    document.querySelector('.close-edit-modal').addEventListener('click', function() {
        toggleModal(document.getElementById('editModuleModal'), 'hide');
    });

    document.querySelector('.cancel-delete-modal').addEventListener('click', function() {
        toggleModal(document.getElementById('deleteConfirmModal'), 'hide');
    });

    document.querySelector('.close-modal').addEventListener('click', function() {
        toggleModal(document.getElementById('moduleModal'), 'hide');
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

    // Initial fetch of modules
    fetchAndDisplayModules();
});
