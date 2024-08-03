document.addEventListener("DOMContentLoaded", function() {
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

    // Show modal when "Add Package" button is clicked
    addButton.addEventListener("click", function() {
        packageModal.style.display = "block";
    });

    // Hide modal when "Close" button is clicked
    closeModal.addEventListener("click", function() {
        packageModal.style.display = "none";
    });

    // Function to add package to the list
    function addPackage(packageName, packagePrice, packageDescription) {
        const packageElement = document.createElement("div");
        packageElement.classList.add("package-text");
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
            packageList.removeChild(packageElement);
        });
    }

    // Show delete buttons when "Delete Package" button is clicked
    deleteButton.addEventListener("click", function() {
        const deleteButtons = document.querySelectorAll(".delete-button");
        deleteButtons.forEach(button => {
            button.style.display = "inline"; // Show the delete button
            button.classList.add("wiggle"); // Add wiggle animation
        });
    });

    // Save package button click event
    savePackage.addEventListener("click", function(event) {
        event.preventDefault(); // Prevent form submission

        // Get package details from inputs
        const packageName = packageNameInput.value;
        const packagePrice = packagePriceInput.value;
        const packageDescription = packageDescriptionInput.value;

        // Add the package
        addPackage(packageName, packagePrice, packageDescription);

        // Hide the modal
        packageModal.style.display = "none";

        // Clear the input fields
        packageNameInput.value = '';
        packagePriceInput.value = '';
        packageDescriptionInput.value = '';
    });
});
