document.getElementById('uploadIcon').addEventListener('click', function() {
    document.getElementById('editProfilePic').click();
});

document.getElementById('editProfilePic').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profilePicPreview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

document.querySelector('.modal-footer .btn-secondary').addEventListener('click', function() {
    // Reset profile picture
    document.getElementById('profilePicPreview').src = 'Assets/default-profile.png';

    // Reset file input
    document.getElementById('editProfilePic').value = '';

    // Reset form fields
    document.getElementById('editProfileForm').reset();
});
