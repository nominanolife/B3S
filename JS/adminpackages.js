import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, getDocs, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { writeBatch } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

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

document.addEventListener("DOMContentLoaded", async function () {
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

    // Custom dropdown elements for filtering
    const filterContainer = document.querySelector(".filter-container");
    const selectedElement = filterContainer.querySelector(".selected");
    const dropdownOptions = filterContainer.querySelector(".dropdown-options");

    // Handle dropdown visibility and selection
    selectedElement.addEventListener("click", function () {
        filterContainer.classList.toggle("open");
    });

    dropdownOptions.addEventListener("click", function (event) {
        if (event.target.classList.contains("option")) {
            selectedElement.textContent = event.target.textContent;
            selectedElement.setAttribute("data-value", event.target.getAttribute("data-value"));
            filterContainer.classList.remove("open");

            // Trigger custom change event for filtering
            const changeEvent = new Event("change");
            filterContainer.dispatchEvent(changeEvent);
        }
    });

    // Handle change event to filter packages
    filterContainer.addEventListener("change", async function () {
        const selectedType = selectedElement.getAttribute("data-value");

        try {
            const querySnapshot = await getDocs(collection(db, "packages"));
            allPackages = querySnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data
                };
            });

            // Filter packages based on selected type
            if (selectedType === "") {
                renderPackages(allPackages);
            } else {
                const filteredPackages = allPackages.filter((pkg) => {
                    return Array.isArray(pkg.type) && pkg.type.includes(selectedType);
                });
                renderPackages(filteredPackages);
            }
        } catch (e) {
            console.error("Error reloading packages: ", e);
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (event) {
        if (!filterContainer.contains(event.target)) {
            filterContainer.classList.remove("open");
        }
    });

    let packageElementToDelete = null;
    let packageIdToEdit = null;
    let allPackages = []; // Store all packages to filter them

    // Create and style the cancel button
    const cancelButton = document.createElement("button");
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
        inputElement.addEventListener("input", function () {
            this.value = this.value.replace(/[^0-9.]/g, ""); // Remove any non-numeric characters
        });
    }

    // Apply restriction to both price inputs
    restrictToNumbers(packagePriceInput);
    restrictToNumbers(editPackagePriceInput);

    // Add cancel button to the buttons container
    const buttonsContainer = document.querySelector(".buttons");
    buttonsContainer.appendChild(cancelButton);

    // Show modal when "Add Package" button is clicked
    addButton.addEventListener("click", function () {
        $(packageModal).modal("show");
    });

    // Hide modal when "Close" button is clicked
    closeModal.addEventListener("click", function () {
        $(packageModal).modal("hide");
    });

    // Hide delete confirmation modal when "Cancel" button is clicked
    cancelDeleteModalButton.addEventListener("click", function () {
        $(deleteConfirmModal).modal("hide");
        packageElementToDelete = null;
    });

    // Hide edit modal when "Close" button is clicked
    closeEditModal.addEventListener("click", function () {
        $(editPackageModal).modal("hide");
    });

    // Cancel button functionality
    cancelButton.addEventListener("click", function () {
        cancelDeleteMode();
    });

    // Show delete buttons when "Delete Package" button is clicked
    deleteButton.addEventListener("click", function () {
        activateDeleteMode();
    });

    // Function to show delete mode
    function activateDeleteMode() {
        addButton.style.display = "none";
        deleteButton.style.display = "none";
        cancelButton.style.display = "inline";

        const deleteButtons = document.querySelectorAll(".delete-button");
        deleteButtons.forEach((button) => {
            button.style.display = "inline";
            button.classList.add("wiggle");
        });

        const editButtons = document.querySelectorAll(".bi-three-dots-vertical");
        editButtons.forEach((button) => {
            button.classList.add("hide-bi-three-dots-vertical");
        });
    }

    // Function to cancel delete mode
    function cancelDeleteMode() {
        cancelButton.style.display = "none";
        addButton.style.display = "inline";
        deleteButton.style.display = "inline";

        const deleteButtons = document.querySelectorAll(".delete-button");
        deleteButtons.forEach((button) => {
            button.style.display = "none";
            button.classList.remove("wiggle");
        });

        const editButtons = document.querySelectorAll(".bi-three-dots-vertical");
        editButtons.forEach((button) => {
            button.classList.remove("hide-bi-three-dots-vertical");
        });
    }

    // Attach delete event to the delete button within the DOM
    function attachDeleteEvent(packageElement, packageId) {
        const deleteButton = packageElement.querySelector(".delete-button");
        deleteButton.addEventListener("click", function () {
            packageElementToDelete = packageElement;
            $(deleteConfirmModal).modal("show");
        });
    }

    // Confirm delete button click event handler
    confirmDeleteButton.addEventListener("click", async function () {
        if (packageElementToDelete) {
            const packageId = packageElementToDelete.getAttribute("data-id");
            try {
                await deletePackageFromFirestore(packageId);
                $(deleteConfirmModal).modal("hide");
                packageElementToDelete = null;
                cancelDeleteMode();
            } catch (error) {
                console.error("Error deleting package: ", error);
                showNotificationModal("Failed to delete package. Please try again.", "error");
            }
        }
    });

    // Function to delete package from Firestore
    async function deletePackageFromFirestore(packageId) {
        try {
            await deleteDoc(doc(db, "packages", packageId));
            if (packageElementToDelete) {
                packageList.removeChild(packageElementToDelete);
            }
            showNotificationModal("Package deleted successfully!", "success");
        } catch (e) {
            console.error("Error deleting document: ", e);
            showNotificationModal("Failed to delete package. Please try again.", "error");
        }
    }

    // Function to create a new package
    async function addPackageToFirestore(packageName, packagePrice, packageDescription, packageType) {
        if (!packageName || !packagePrice || !packageDescription || !packageType) {
            showNotificationModal("Please fill in all fields and select at least one package type.", "error");
            return;
        }

        try {
            const docRef = await addDoc(collection(db, "packages"), {
                name: packageName,
                price: packagePrice,
                description: packageDescription,
                type: packageType
            });

            // Remove the "No package available" message if it exists
            const noPackagesMessage = document.getElementById("noPackagesMessage");
            if (noPackagesMessage) {
                noPackagesMessage.remove();
            }

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
            <i class="bi bi-three-dots-vertical"></i>
            <i class="delete-button">&times;</i>
        `;

        packageList.appendChild(packageElement);
        attachDeleteEvent(packageElement, id);

        const editButton = packageElement.querySelector(".bi-three-dots-vertical");
        editButton.addEventListener("click", function () {
            showEditModal(packageElement);
        });
    }

    async function updatePackageInFirestore(packageId, packageName, packagePrice, packageDescription, packageType) {
        if (!packageName || !packagePrice || !packageDescription || !packageType || packageType.length === 0) {
            showNotificationModal("Please fill in all fields and select at least one package type.", "error");
            return;
        }

        const uniquePackageTypes = [...new Set(packageType)];
        const batch = writeBatch(db);

        try {
            const packageRef = doc(db, "packages", packageId);
            batch.update(packageRef, {
                name: packageName,
                price: packagePrice,
                description: packageDescription,
                type: uniquePackageTypes
            });

            const applicantsSnapshot = await getDocs(collection(db, "applicants"));

            let updatedCount = 0;
            for (const applicantDoc of applicantsSnapshot.docs) {
                const applicantData = applicantDoc.data();
                if (applicantData.packageId === packageId) {
                    const applicantRef = doc(db, "applicants", applicantDoc.id);
                    batch.update(applicantRef, {
                        enrolledPackage: packageName,
                        packagePrice: packagePrice,
                        packageType: uniquePackageTypes
                    });
                    updatedCount++;
                }
            }

            await batch.commit();
            console.log(`Updated ${updatedCount} applicants.`);
            showNotificationModal("Package updated successfully!", "success");
        } catch (e) {
            console.error("Error updating document: ", e);
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

        $(notificationModal).modal("show");
    }

    // Handle checkbox changes
    function handleCheckboxChange(packageId, checkbox) {
        const packageRef = doc(db, "packages", packageId);

        getDoc(packageRef).then((docSnap) => {
            if (docSnap.exists()) {
                let packageTypes = docSnap.data().type || [];

                if (checkbox.checked) {
                    if (!packageTypes.includes(checkbox.value)) {
                        packageTypes.push(checkbox.value);
                    }
                } else {
                    packageTypes = packageTypes.filter((type) => type !== checkbox.value);
                }

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
        const price = priceText.replace(/[^0-9.]/g, "");
        const description = packageElement.querySelector("h4").textContent;

        document.querySelector(".edit-package-name").value = name;
        document.querySelector(".edit-package-price").value = price;
        document.querySelector(".edit-package-description").value = description;

        document.querySelectorAll('input[name="editCourseType"]').forEach((checkbox) => {
            checkbox.checked = false;
        });

        const packageTypes = packageElement.querySelector("h1").textContent.split(" + ");
        packageTypes.forEach((type) => {
            const checkbox = document.querySelector(`input[name="editCourseType"][value="${type.trim()}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });

        document.querySelectorAll('input[name="editCourseType"]').forEach((checkbox) => {
            checkbox.addEventListener("change", function () {
                handleCheckboxChange(packageIdToEdit, checkbox);
            });
        });

        $(editPackageModal).modal("show");
    }

    // Update package details
    updatePackage.addEventListener("click", async function (event) {
        event.preventDefault();

        const packageName = editPackageNameInput.value;
        const packagePrice = editPackagePriceInput.value;
        const packageDescription = editPackageDescriptionInput.value;

        const selectedTypes = document.querySelectorAll('input[name="editCourseType"]:checked');
        const packageType = Array.from(selectedTypes).map((input) => input.value);

        if (packageName && packagePrice && packageDescription) {
            if (packageIdToEdit) {
                await updatePackageInFirestore(packageIdToEdit, packageName, packagePrice, packageDescription, packageType);
                updatePackageInDOM(packageIdToEdit, packageName, packagePrice, packageDescription, packageType);
                $(editPackageModal).modal('hide');
                editPackageNameInput.value = "";
                editPackagePriceInput.value = "";
                editPackageDescriptionInput.value = "";
            }
        } else {
            showNotificationModal("Please fill out all fields.", "error");
        }
    });

    // Function to update the package in the DOM
    function updatePackageInDOM(id, packageName, packagePrice, packageDescription, packageType) {
        const packageElement = document.querySelector(`.package-text[data-id="${id}"]`);

        if (packageElement) {
            const packageNameElement = packageElement.querySelector("h2");
            const packagePriceElement = packageElement.querySelector("span");
            const packageTypeElement = packageElement.querySelector("h1");
            const packageDescriptionElement = packageElement.querySelector("h4");

            if (packageNameElement) {
                packageNameElement.textContent = packageName;
            }
            if (packagePriceElement) {
                packagePriceElement.innerHTML = `Price: &#8369;${packagePrice}`;
            }
            if (packageTypeElement) {
                packageTypeElement.innerHTML = packageType.join(" + ");
            }
            if (packageDescriptionElement) {
                packageDescriptionElement.textContent = packageDescription;
            }
        } else {
            console.error(`Package element with ID ${id} not found.`);
        }
    }

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
            applyViewPreference();
        } catch (e) {
            console.error("Error loading packages: ", e);
        }
    }

    // Function to render packages based on the filter
    function renderPackages(packages) {
        packageList.innerHTML = ""; // Clear the package list
        
        // Check if there are any packages
        if (packages.length === 0) {
            // Create the "No package available" message dynamically
            const noPackagesMessage = document.createElement("div");
            noPackagesMessage.id = "noPackagesMessage";
            noPackagesMessage.style.textAlign = "center";
            noPackagesMessage.style.fontFamily = "Poppins";
            noPackagesMessage.style.fontSize = "18px";
            noPackagesMessage.style.color = "#2F2E2E";
            noPackagesMessage.textContent = "No package available";
            
            // Append the message to the package list container
            packageList.appendChild(noPackagesMessage);
        }

        // Render the packages if they exist
        packages.forEach((pkg) => {
            addPackageToDOM(pkg.id, pkg.name, pkg.price, pkg.description, pkg.type || []);
        });
    }

    // Load packages on page load
    loadPackages();

    // Save new package
    savePackage.addEventListener("click", function (event) {
        event.preventDefault();

        const packageName = packageNameInput.value;
        const packagePrice = packagePriceInput.value;
        const packageDescription = packageDescriptionInput.value;

        const selectedTypes = document.querySelectorAll('input[name="courseType"]:checked');
        const packageType = Array.from(selectedTypes).map((input) => input.value);

        if (packageName && packagePrice && packageDescription) {
            addPackageToFirestore(packageName, packagePrice, packageDescription, packageType);
            $(packageModal).modal("hide");
            packageNameInput.value = "";
            packagePriceInput.value = "";
            packageDescriptionInput.value = "";
            document.querySelectorAll('input[name="courseType"]').forEach((input) => (input.checked = false));
        } else {
            showNotificationModal("Please fill out all fields.", "error");
        }
    });

    const gridViewIcon = document.querySelector(".bi-grid");
    const listViewIcon = document.querySelector(".bi-list");

    // Function to apply the view from localStorage
    function applyViewPreference() {
        const savedView = localStorage.getItem("viewPreference");
        const packageItems = packageList.querySelectorAll(".package-text");
        
        // Reset classes first
        packageList.classList.remove("list-view");
        packageItems.forEach((item) => {
            item.classList.remove("list-view-item");
        });
        
        if (savedView === "list") {
            // Apply list view
            listViewIcon.classList.add("active");
            gridViewIcon.classList.remove("active");
            packageList.classList.add("list-view");
            packageItems.forEach((item) => {
                item.classList.add("list-view-item");
            });
        } else {
            // Apply grid view (default)
            gridViewIcon.classList.add("active");
            listViewIcon.classList.remove("active");
            packageList.classList.remove("list-view");
        }
    }

    // Apply the saved view preference on page load
    applyViewPreference();

    // Function to toggle views (this part seems fine)
    listViewIcon.addEventListener("click", function () {
        packageList.classList.add("list-view");
        const packageItems = packageList.querySelectorAll(".package-text");
        packageItems.forEach((item) => {
            item.classList.add("list-view-item");
        });
        listViewIcon.classList.add("active");
        gridViewIcon.classList.remove("active");

        // Save view preference in localStorage
        localStorage.setItem("viewPreference", "list");
    });

    gridViewIcon.addEventListener("click", function () {
        packageList.classList.remove("list-view");
        const packageItems = packageList.querySelectorAll(".package-text");
        packageItems.forEach((item) => {
            item.classList.remove("list-view-item");
        });
        gridViewIcon.classList.add("active");
        listViewIcon.classList.remove("active");

        // Save view preference in localStorage
        localStorage.setItem("viewPreference", "grid");
    });
});
