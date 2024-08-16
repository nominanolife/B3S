import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

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

    // Get elements for the edit modal
    const editPackageModal = document.getElementById("editPackageModal");
    const closeEditModal = document.querySelector(".close-edit-modal");
    const updatePackage = document.querySelector(".update-package");
    const editPackageNameInput = document.querySelector(".edit-package-name");
    const editPackagePriceInput = document.querySelector(".edit-package-price");
    const editPackageDescriptionInput = document.querySelector(".edit-package-description");

    let packageElementToDelete = null;
    let packageIdToEdit = null;

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

    // Function to restrict input to numbers only
    function restrictToNumbers(inputElement) {
        inputElement.addEventListener('input', function(event) {
            // Remove any non-numeric characters
            this.value = this.value.replace(/[^0-9.]/g, '');
        });
    }

    // Apply the restriction to both price inputs
    restrictToNumbers(packagePriceInput);
    restrictToNumbers(editPackagePriceInput);

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

    // Hide edit modal when "Close" button is clicked
    closeEditModal.addEventListener("click", function() {
        editPackageModal.style.display = "none";
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

    // Function to show delete mode
    function activateDeleteMode() {
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

        // Hide edit buttons
        const editButtons = document.querySelectorAll(".edit-button");
        editButtons.forEach(button => {
            button.classList.add("hide-edit-button"); // Hide edit button
        });
    }

    // Function to cancel delete mode
    function cancelDeleteMode() {
        // Hide cancel button
        cancelButton.style.display = "none";

        // Show Add and Delete buttons
        addButton.style.display = "inline";
        deleteButton.style.display = "inline";

        // Hide delete button animations
        const deleteButtons = document.querySelectorAll(".delete-button");
        deleteButtons.forEach(button => {
            button.style.display = "none"; // Hide delete button
            button.classList.remove("wiggle"); // Remove wiggle animation
        });

        // Show edit buttons
        const editButtons = document.querySelectorAll(".edit-button");
        editButtons.forEach(button => {
            button.classList.remove("hide-edit-button"); // Show edit button
        });
    }

    // Show delete buttons when "Delete Package" button is clicked
    deleteButton.addEventListener("click", function() {
        activateDeleteMode();
    });

    // Cancel button functionality
    cancelButton.addEventListener("click", function() {
        cancelDeleteMode();
    });

    // Confirm delete button click event
    confirmDeleteButton.addEventListener("click", async function() {
        if (packageElementToDelete) {
            const packageId = packageElementToDelete.getAttribute("data-id");
            await deletePackageFromFirestore(packageId);
            deleteConfirmModal.style.display = "none";
            packageElementToDelete = null;

            // Cancel delete mode after successful deletion
            cancelDeleteMode();
        }
    });


    // Confirm delete button click event
    confirmDeleteButton.addEventListener("click", async function() {
        if (packageElementToDelete) {
            const packageId = packageElementToDelete.getAttribute("data-id");
            await deletePackageFromFirestore(packageId);
            deleteConfirmModal.style.display = "none";
            packageElementToDelete = null;

            // Cancel delete mode after successful deletion
            cancelButton.style.display = "none"; // Hide cancel button
            addButton.style.display = "inline"; // Show add button
            deleteButton.style.display = "inline"; // Show delete button

            // Hide delete button animations
            const deleteButtons = document.querySelectorAll(".delete-button");
            deleteButtons.forEach(button => {
                button.style.display = "none"; // Hide delete button
                button.classList.remove("wiggle"); // Remove wiggle animation
            });
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

            // Show success notification modal
            showNotificationModal("Package added successfully!", "success");

        } catch (e) {
            console.error("Error adding document: ", e);

            // Show error notification modal
            showNotificationModal("Failed to add package. Please try again.", "error");
        }
    }

    // Function to add package to the DOM
    function addPackageToDOM(id, packageName, packagePrice, packageDescription) {
        const packageElement = document.createElement("div");
        packageElement.classList.add("package-text");
        packageElement.setAttribute("data-id", id);
        packageElement.innerHTML = `
            <h2>${packageName}</h2>
            <span>Price: &#8369;${packagePrice}</span>
            <h4>${packageDescription}</h4>
            <button class="edit-button"><i class="bi bi-three-dots-vertical"></i></button>
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

        // Attach edit event to the edit button
        const editButton = packageElement.querySelector(".edit-button");
        editButton.addEventListener("click", function() {
            showEditModal(packageElement);
        });
    }

    // Function to delete package from Firestore
    async function deletePackageFromFirestore(packageId) {
        try {
            await deleteDoc(doc(db, "packages", packageId));
            if (packageElementToDelete) {
                packageList.removeChild(packageElementToDelete);
            }

            // Show success notification modal
            showNotificationModal("Package deleted successfully!", "success");
        } catch (e) {
            console.error("Error deleting document: ", e);

            // Show error notification modal
            showNotificationModal("Failed to delete package. Please try again.", "error");
        }
    }

    async function updatePackageInFirestore(packageId, packageName, packagePrice, packageDescription) {
        const batch = writeBatch(db);
        try {
            // Update the package document
            const packageRef = doc(db, "packages", packageId);
            batch.update(packageRef, {
                name: packageName,
                price: packagePrice,
                description: packageDescription
            });
        
            // Fetch all applicants
            const applicantsSnapshot = await getDocs(collection(db, "applicants"));
        
            // Update enrolled package information for relevant applicants
            let updatedCount = 0;
            for (const applicantDoc of applicantsSnapshot.docs) {
                const applicantData = applicantDoc.data();
        
                if (applicantData.packageName) {
                    const applicantRef = doc(db, "applicants", applicantDoc.id);
        
                    batch.update(applicantRef, {
                        enrolledPackage: packageName,
                        packagePrice: packagePrice
                    });
                    updatedCount++;
                }
            }
        
            await batch.commit();
            console.log(`Updated ${updatedCount} applicants.`);
        
            // Show success notification modal
            showNotificationModal("Package updated successfully!", "success");
        } catch (e) {
            console.error("Error updating document: ", e);
        
            // Show error notification modal
            showNotificationModal("Failed to update package. Please try again.", "error");
        }
    }

    function showNotificationModal(message, type) {
        const notificationModal = document.getElementById("notificationModal");
        const notificationModalBody = document.getElementById("notificationModalBody");
        
        notificationModalBody.textContent = message;
        
        if (type === "success") {
            notificationModalBody.style.color = "green";
        } else if (type === "error") {
            notificationModalBody.style.color = "red";
        }
    
        $(notificationModal).modal('show');
    }
    

    // Function to show edit modal and populate fields
    function showEditModal(packageElement) {
        packageIdToEdit = packageElement.getAttribute("data-id");
        const name = packageElement.querySelector("h2").textContent;
        const priceText = packageElement.querySelector("span").textContent;
        
        // Extract only the numeric part from the price text
        const price = priceText.replace(/[^0-9.]/g, ''); // Keep only digits and dot
        
        const description = packageElement.querySelector("h4").textContent;

        // Populate the edit modal with current package details
        editPackageNameInput.value = name;
        editPackagePriceInput.value = price;
        editPackageDescriptionInput.value = description;

        // Show the edit modal
        editPackageModal.style.display = "block";
    }


    // Update package details
    updatePackage.addEventListener("click", async function(event) {
        event.preventDefault(); // Prevent form submission

        // Get updated package details from inputs
        const packageName = editPackageNameInput.value;
        const packagePrice = editPackagePriceInput.value;
        const packageDescription = editPackageDescriptionInput.value;

        // Check if all fields are filled
        if (packageName && packagePrice && packageDescription) {
            if (packageIdToEdit) {
                // Update the package in Firestore
                await updatePackageInFirestore(packageIdToEdit, packageName, packagePrice, packageDescription);
                
                // Update the package in the DOM with "Price" label and currency symbol
                const packageElement = document.querySelector(`.package-text[data-id="${packageIdToEdit}"]`);
                packageElement.querySelector("h2").textContent = packageName;
                packageElement.querySelector("span").innerHTML = `Price: &#8369;${packagePrice}`;
                packageElement.querySelector("h4").textContent = packageDescription;

                // Hide the edit modal
                editPackageModal.style.display = "none";

                // Clear the input fields
                editPackageNameInput.value = '';
                editPackagePriceInput.value = '';
                editPackageDescriptionInput.value = '';
            }
        } else {
            showNotificationModal("Please fill out all fields.", "error");
        }
    });


    // Load existing packages from Firestore and add to DOM
    async function loadPackages() {
        try {
            const querySnapshot = await getDocs(collection(db, "packages"));
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                addPackageToDOM(doc.id, data.name, data.price, data.description);
            });
        } catch (e) {
            console.error("Error loading packages: ", e);
        }
    }

    // Load packages on page load
    loadPackages();

    // Save new package
    savePackage.addEventListener("click", function(event) {
        event.preventDefault(); // Prevent form submission

        // Get package details from inputs
        const packageName = packageNameInput.value;
        const packagePrice = packagePriceInput.value;
        const packageDescription = packageDescriptionInput.value;

        // Check if all fields are filled
        if (packageName && packagePrice && packageDescription) {
            // Add the package to Firestore
            addPackageToFirestore(packageName, packagePrice, packageDescription);

            // Hide the modal
            packageModal.style.display = "none";

            // Clear the input fields
            packageNameInput.value = '';
            packagePriceInput.value = '';
            packageDescriptionInput.value = '';
        } else {
            showNotificationModal("Please fill out all fields.", "error");
        }
    });
});