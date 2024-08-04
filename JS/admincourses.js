import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

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
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", async function() {
    // Get elements
    const addButton = document.getElementById("addButton");
    const deleteButton = document.getElementById("deleteButton");
    const packageModal = document.getElementById("packageModal");
    const closeModal = document.querySelector(".close-modal");
    const savePackage = document.querySelector(".save-package");
    const packageList = document.getElementById("packageList");
    const packageNameInput = document.querySelector(".package-name");
    const packagePriceInput = document.querySelector(".package-price");
    const packageDescriptionInput = document.querySelector(".package-description");
    const deleteConfirmModal = document.getElementById("deleteConfirmModal");
    const confirmDeleteButton = document.querySelector(".confirm-delete");
    const cancelDeleteModalButton = document.querySelector(".cancel-delete-modal");

    let packageElementToDelete = null;

    // Create and style cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = "Cancel";
    cancelButton.className = "cancel-button";
    cancelButton.style.display = "none"; // Initially hidden
    cancelButton.style.backgroundColor = "#7B1719"; 
    cancelButton.style.color = "#ffffff"; 
    cancelButton.style.border = "none";
    cancelButton.style.borderRadius = "10px";
    cancelButton.style.padding = "10px 20px";
    cancelButton.style.cursor = "pointer";
    cancelButton.style.fontFamily = "Poppins";
    cancelButton.style.fontSize = "14px";
    cancelButton.style.fontWeight = "bold";

    // Add the cancel button to the buttons container
    const buttonsContainer = document.querySelector('.buttons');
    buttonsContainer.appendChild(cancelButton);

    // Show modal when "Add Package" button is clicked
    addButton.addEventListener("click", function() {
        packageModal.style.display = "block";
    });

    // Hide modal when "Close" button is clicked
    closeModal.addEventListener("click", function() {
        packageModal.style.display = "none";
    });

    // Hide delete confirmation modal when "Cancel" button is clicked
    cancelDeleteModalButton.addEventListener("click", function() {
        deleteConfirmModal.style.display = "none";
        packageElementToDelete = null;
    });

    // Cancel button functionality
    cancelButton.addEventListener("click", function() {
        // Hide cancel button
        cancelButton.style.display = "none";

        // Show the Add and Delete buttons again
        addButton.style.display = "inline";
        deleteButton.style.display = "inline";

        // Hide delete button animations
        const deleteButtons = document.querySelectorAll(".delete-button");
        deleteButtons.forEach(button => {
            button.style.display = "none"; // Hide delete button
            button.classList.remove("wiggle"); // Remove wiggle animation
        });
    });

    // Show delete buttons when "Delete Package" button is clicked
    deleteButton.addEventListener("click", function() {
        // Hide Add and Delete buttons
        addButton.style.display = "none";
        deleteButton.style.display = "none";

        // Show the Cancel button
        cancelButton.style.display = "inline";

        const deleteButtons = document.querySelectorAll(".delete-button");
        deleteButtons.forEach(button => {
            button.style.display = "inline"; // Show the delete button
            button.classList.add("wiggle"); // Add wiggle animation
        });
    });

    // Confirm delete button click event
    confirmDeleteButton.addEventListener("click", async function() {
        if (packageElementToDelete) {
            const packageId = packageElementToDelete.getAttribute("data-id");
            await deletePackageFromFirestore(packageId);
            deleteConfirmModal.style.display = "none";
            packageElementToDelete = null;
        }
    });

    // Function to add package to Firestore
    async function addPackageToFirestore(packageName, packagePrice, packageDescription) {
        try {
            const docRef = await addDoc(collection(db, "packages"), {
                name: packageName,
                price: packagePrice,
                description: packageDescription
            });
            addPackageToDOM(docRef.id, packageName, packagePrice, packageDescription);

            // Show success toast notification
            Toastify({
                text: "Package added successfully!",
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right",
                backgroundColor: "green",
                stopOnFocus: true
            }).showToast();

        } catch (e) {
            console.error("Error adding document: ", e);

            // Show error toast notification
            Toastify({
                text: "Failed to add package. Please try again.",
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right",
                backgroundColor: "red",
                stopOnFocus: true
            }).showToast();
        }
    }

    // Function to add package to the DOM
    function addPackageToDOM(id, packageName, packagePrice, packageDescription) {
        const packageElement = document.createElement("div");
        packageElement.classList.add("package-text");
        packageElement.setAttribute("data-id", id);
        packageElement.innerHTML = `
            <h2>${packageName}</h2>
            <span>Tuition Fee: &#8369;${packagePrice}</span>
            <h4>${packageDescription}</h4>
            <button class="delete-button">&times;</button>
        `;

        // Append the new package to the package list
        packageList.appendChild(packageElement);

        // Attach delete event to the delete button
        const deleteButton = packageElement.querySelector(".delete-button");
        deleteButton.addEventListener("click", function() {
            packageElementToDelete = packageElement;
            deleteConfirmModal.style.display = "block";
        });
    }

    // Function to delete package from Firestore
    async function deletePackageFromFirestore(packageId) {
        try {
            await deleteDoc(doc(db, "packages", packageId));
            if (packageElementToDelete) {
                packageList.removeChild(packageElementToDelete);
            }

            // Show success toast notification
            Toastify({
                text: "Package deleted successfully!",
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right",
                backgroundColor: "green",
                stopOnFocus: true
            }).showToast();
        } catch (e) {
            console.error("Error deleting document: ", e);

            // Show error toast notification
            Toastify({
                text: "Failed to delete package. Please try again.",
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right",
                backgroundColor: "red",
                stopOnFocus: true
            }).showToast();
        }
    }

    // Function to load packages from Firestore and add them to the DOM
    async function loadPackages() {
        const querySnapshot = await getDocs(collection(db, "packages"));
        querySnapshot.forEach((doc) => {
            addPackageToDOM(doc.id, doc.data().name, doc.data().price, doc.data().description);
        });
    }

    // Load packages when the page loads
    await loadPackages();

    // Save package button click event
    savePackage.addEventListener("click", function(event) {
        event.preventDefault(); // Prevent form submission

        // Get package details from inputs
        const packageName = packageNameInput.value;
        const packagePrice = packagePriceInput.value;
        const packageDescription = packageDescriptionInput.value;

        // Check if all fields are filled
        if (packageName && packagePrice && packageDescription) {
            // Add the package to Firestore and DOM
            addPackageToFirestore(packageName, packagePrice, packageDescription);

            // Hide the modal
            packageModal.style.display = "none";

            // Clear the input fields
            packageNameInput.value = '';
            packagePriceInput.value = '';
            packageDescriptionInput.value = '';
        } else {
            alert("Please fill out all fields.");
        }
    });
});
