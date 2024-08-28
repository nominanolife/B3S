import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, getDocs, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

    // Get element for the filter dropdown
    const courseFilter = document.getElementById("courseFilter");

    let packageElementToDelete = null;
    let packageIdToEdit = null;
    let allPackages = [];  // Store all packages to filter them

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

    // Function to create a new package
    async function addPackageToFirestore(packageName, packagePrice, packageDescription, packageType) {
        // Validate input fields and checkbox
        if (!packageName || !packagePrice || !packageDescription || !packageType) {
            showNotificationModal("Please fill in all fields and select at least one package type.", "error");
            return; // Exit the function if validation fails
        }

        try {
            // Save package data to Firestore
            const docRef = await addDoc(collection(db, "packages"), {
                name: packageName,
                price: packagePrice,
                description: packageDescription,
                type: packageType  // Include the package type
            });

            addPackageToDOM(docRef.id, packageName, packagePrice, packageDescription, packageType);

            showNotificationModal("Package Added Successfully!", "success");

        } catch (e) {
            console.error("Error adding document: ", e);
            showNotificationModal("Failed to add package. Please try again.", "error");
        }
    }

    // Function to add package to the DOM
    function addPackageToDOM(id, packageName, packagePrice, packageDescription, packageType) {
        const packageElement = document.createElement("div");
        packageElement.classList.add("package-text");
        packageElement.setAttribute("data-id", id);
        packageElement.innerHTML = `
            <h1>${packageType.join(' + ')}</h1>
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

    async function updatePackageInFirestore(packageId, packageName, packagePrice, packageDescription, packageType) {
        // Validate input fields and ensure no duplicate values in packageType
        if (!packageName || !packagePrice || !packageDescription || !packageType || packageType.length === 0) {
            showNotificationModal("Please fill in all fields and select at least one package type.", "error");
            return; // Exit the function if validation fails
        }
    
        // Ensure there are no duplicate values in packageType
        const uniquePackageTypes = [...new Set(packageType)];
    
        const batch = writeBatch(db);
        
        try {
            // Update the package document
            const packageRef = doc(db, "packages", packageId);
            batch.update(packageRef, {
                name: packageName,
                price: packagePrice,
                description: packageDescription,
                type: uniquePackageTypes // Use the unique package types
            });
            
            // Fetch all applicants
            const applicantsSnapshot = await getDocs(collection(db, "applicants"));
            
            // Update enrolled package information for relevant applicants
            let updatedCount = 0;
            for (const applicantDoc of applicantsSnapshot.docs) {
                const applicantData = applicantDoc.data();
            
                if (applicantData.packageName === packageName) { // Ensure it updates relevant applicants
                    const applicantRef = doc(db, "applicants", applicantDoc.id);
            
                    batch.update(applicantRef, {
                        enrolledPackage: packageName,
                        packagePrice: packagePrice,
                        packageType: uniquePackageTypes // Use the unique package types
                    });
                    updatedCount++;
                }
            }
            
            await batch.commit(); // Commit the batch operation
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

    //Function to handle checkbox changes
    function handleCheckboxChange(packageId, checkbox) {
        // Get the current package document reference
        const packageRef = doc(db, "packages", packageId);
    
        // Get the current value of the package type from the database
        getDoc(packageRef).then((docSnap) => {
            if (docSnap.exists()) {
                let packageTypes = docSnap.data().type || [];
    
                if (checkbox.checked) {
                    // If checked and not already in the array, add the type
                    if (!packageTypes.includes(checkbox.value)) {
                        packageTypes.push(checkbox.value);
                    }
                } else {
                    // If unchecked, remove the type from the array
                    packageTypes = packageTypes.filter(type => type !== checkbox.value);
                }
    
                // Update the package in Firestore
                updateDoc(packageRef, { type: packageTypes })
                    .then(() => {
                        console.log("Package types updated successfully.");
                    })
                    .catch((error) => {
                        console.error("Error updating package types: ", error);
                    });
            }
        });
    }
    
    // Show the edit modal and populate fields
    function showEditModal(packageElement) {
        packageIdToEdit = packageElement.getAttribute("data-id");
        const name = packageElement.querySelector("h2").textContent;
        const priceText = packageElement.querySelector("span").textContent;
        const price = priceText.replace(/[^0-9.]/g, '');
        const description = packageElement.querySelector("h4").textContent;
    
        document.querySelector(".edit-package-name").value = name;
        document.querySelector(".edit-package-price").value = price;
        document.querySelector(".edit-package-description").value = description;
    
        document.querySelectorAll('input[name="editCourseType"]').forEach(checkbox => {
            checkbox.checked = false; // Clear previous selections
        });
    
        const packageTypes = packageElement.querySelector("h1").textContent.split(" + ");
        packageTypes.forEach(type => {
            const checkbox = document.querySelector(`input[name="editCourseType"][value="${type.trim()}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    
        document.querySelectorAll('input[name="editCourseType"]').forEach(checkbox => {
            // Attach the change event listener to each checkbox
            checkbox.addEventListener('change', function() {
                handleCheckboxChange(packageIdToEdit, checkbox);
            });
        });
    
        const editPackageModal = document.getElementById("editPackageModal");
        if (editPackageModal) {
            editPackageModal.style.display = "block";
        } else {
            console.error("Edit modal not found in the DOM.");
        }
    }
    
    // Update package details
updatePackage.addEventListener("click", async function(event) {
    event.preventDefault(); // Prevent form submission

    // Get updated package details from inputs
    const packageName = editPackageNameInput.value;
    const packagePrice = editPackagePriceInput.value;
    const packageDescription = editPackageDescriptionInput.value;

    // Get selected package types from checkboxes
    const selectedTypes = document.querySelectorAll('input[name="editCourseType"]:checked');
    const packageType = Array.from(selectedTypes).map(input => input.value);

    if (packageName && packagePrice && packageDescription) {
        if (packageIdToEdit) {
            // Update the package in Firestore
            await updatePackageInFirestore(packageIdToEdit, packageName, packagePrice, packageDescription, packageType);
            
            // Update the package in the DOM
            const packageElement = document.querySelector(`.package-text[data-id="${packageIdToEdit}"]`);
            
            if (packageElement) {
                const packageNameElement = packageElement.querySelector("h2");
                const packagePriceElement = packageElement.querySelector("span:nth-child(2)");
                const packageTypeElement = packageElement.querySelector("h1");
                const packageDescriptionElement = packageElement.querySelector("h4");

                if (packageNameElement) {
                    packageNameElement.textContent = packageName;
                }
                if (packagePriceElement) {
                    packagePriceElement.innerHTML = `Price: &#8369;${packagePrice}`;
                }
                if (packageTypeElement) {
                    packageTypeElement.innerHTML = packageType.join(' + ');
                }
                if (packageDescriptionElement) {
                    packageDescriptionElement.textContent = packageDescription;
                }
            } else {
                console.error(`Package element with ID ${packageIdToEdit} not found.`);
            }

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
            allPackages = querySnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data
                };
            });

            renderPackages(allPackages);
        } catch (e) {
            console.error("Error loading packages: ", e);
        }
    }

    // Function to render packages based on the filter
    function renderPackages(packages) {
        packageList.innerHTML = ''; // Clear the current package list
        packages.forEach(pkg => {
            addPackageToDOM(pkg.id, pkg.name, pkg.price, pkg.description, pkg.type || []);
        });
    }

   // Filter packages when dropdown value changes
    courseFilter.addEventListener('change', async function() {
        const selectedType = this.value;

        try {
            // Re-fetch the packages from Firestore when the filter is changed
            const querySnapshot = await getDocs(collection(db, "packages"));
            allPackages = querySnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data
                };
            });

            // Filter packages based on the selected type
            if (selectedType === "") {
                // Show all packages if 'All' is selected
                renderPackages(allPackages);
            } else {
                // Filter packages by selected type
                const filteredPackages = allPackages.filter(pkg => {
                    return Array.isArray(pkg.type) && pkg.type.includes(selectedType);
                });
                renderPackages(filteredPackages);
            }
        } catch (e) {
            console.error("Error reloading packages: ", e);
        }
    });

    // Load packages on page load
    loadPackages();

    // Save new package
    savePackage.addEventListener("click", function(event) {
        event.preventDefault(); // Prevent form submission

        // Get package details from inputs
        const packageName = packageNameInput.value;
        const packagePrice = packagePriceInput.value;
        const packageDescription = packageDescriptionInput.value;

        // Get selected package types from checkboxes
        const selectedTypes = document.querySelectorAll('input[name="courseType"]:checked');
        const packageType = Array.from(selectedTypes).map(input => input.value);

        // Check if all fields are filled
        if (packageName && packagePrice && packageDescription) {
            // Add the package to Firestore
            addPackageToFirestore(packageName, packagePrice, packageDescription, packageType);

            // Hide the modal
            packageModal.style.display = "none";

            // Clear the input fields
            packageNameInput.value = '';
            packagePriceInput.value = '';
            packageDescriptionInput.value = '';
            document.querySelectorAll('input[name="courseType"]').forEach(input => input.checked = false); // Clear checkbox selections
        } else {
            showNotificationModal("Please fill out all fields.", "error");
        }
    });
});
