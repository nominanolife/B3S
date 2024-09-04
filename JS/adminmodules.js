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
    const tripleDotIcons = document.querySelectorAll('.bi-three-dots-vertical');
    tripleDotIcons.forEach(function(icon) {
        icon.addEventListener('click', function(event) {
            const optionsMenu = this.nextElementSibling;
            optionsMenu.style.display = optionsMenu.style.display === 'block' ? 'none' : 'block';
            
            document.addEventListener('click', function(e) {
                if (!icon.contains(e.target) && !optionsMenu.contains(e.target)) {
                    optionsMenu.style.display = 'none';
                }
            });
        });
    });

    // Add event listener to dynamically handle Edit/Delete buttons
    document.querySelector('.module-list').addEventListener('click', function(event) {
        const target = event.target.textContent.trim();

        if (target === 'Edit') {
            toggleModal(document.getElementById('editModuleModal'), 'show');
        } else if (target === 'Delete') {
            toggleModal(document.getElementById('deleteConfirmModal'), 'show');
        }
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

    document.querySelector('.save-module').addEventListener('click', function(event) {
        event.preventDefault();
        alert('Module uploaded successfully!');
        toggleModal(document.getElementById('moduleModal'), 'hide');
    });

    // Image preview handling for Edit Modal
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

    // Close modals when clicking outside of them
    document.getElementById('moduleModal').addEventListener('click', function(event) {
        const modalDialog = this.querySelector('.modal-dialog');
        if (!modalDialog.contains(event.target)) {
            toggleModal(this, 'hide');
        }
    });
});
