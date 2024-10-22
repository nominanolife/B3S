// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBflGD3TVFhlOeUBUPaX3uJTuB-KEgd0ow",
    authDomain: "authentication-d6496.firebaseapp.com",
    projectId: "authentication-d6496",
    storageBucket: "authentication-d6496.appspot.com",
    messagingSenderId: "195867894399",
    appId: "1:195867894399:web:596fb109d308aea8b6154a"
};
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

let tempProfileData = {};

// Function to get user data and populate profile page (existing code)
async function getUserData() {
    const user = auth.currentUser;
    if (user) {
        const userDoc = await db.collection('applicants').doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            const personalInfo = userData.personalInfo;

            document.querySelector('.name').textContent = `${personalInfo.first} ${personalInfo.middle} ${personalInfo.last} ${personalInfo.suffix}`;
            document.querySelector('.email').textContent = user.email;
            document.getElementById('birthdate').textContent = personalInfo.birthday;
            document.getElementById('age').textContent = personalInfo.age;
            document.getElementById('status').textContent = personalInfo.status;
            document.getElementById('contactNumber').textContent = userData.phoneNumber;
            document.getElementById('address').textContent = personalInfo.address;
            document.querySelector('.profile-pic').src = personalInfo.profilePicUrl || 'Assets/default-profile.png';
            document.getElementById('profilePicPreview').src = personalInfo.profilePicUrl || 'Assets/default-profile.png';

            // Store existing data temporarily
            tempProfileData = {
                firstName: personalInfo.first || '',
                middleName: personalInfo.middle || '',
                lastName: personalInfo.last || '',
                suffix: personalInfo.suffix || '',
                birthdate: personalInfo.birthday || '',
                age: personalInfo.age || '',
                status: personalInfo.status || 'Single',
                contactNumber: userData.phoneNumber || '',
                address: personalInfo.address || '',
                profilePicUrl: personalInfo.profilePicUrl || ''
            };

            // Pre-fill edit profile modal with existing data
            document.getElementById('editFirstName').value = tempProfileData.firstName;
            document.getElementById('editMiddleName').value = tempProfileData.middleName;
            document.getElementById('editLastName').value = tempProfileData.lastName;
            document.getElementById('editSuffix').value = tempProfileData.suffix;
            document.getElementById('editBirthdate').value = tempProfileData.birthdate;
            document.getElementById('editAge').value = tempProfileData.age;
            document.getElementById('editStatus').textContent = tempProfileData.status;

            document.getElementById('editContactNumber').value = tempProfileData.contactNumber;
            document.getElementById('editAddress').value = tempProfileData.address;
        }
    }
}

// Custom dropdown functionality
document.querySelector('.custom-dropdown').addEventListener('click', function (e) {
    const dropdown = e.currentTarget;
    dropdown.classList.toggle('open');
    e.stopPropagation(); // Prevent event from bubbling to the document level
});

// Close dropdown on selecting an option and update the selected value
document.querySelectorAll('.option').forEach(option => {
    option.addEventListener('click', function (e) {
        const selectedOption = e.currentTarget;
        const dropdown = selectedOption.closest('.custom-dropdown');
        dropdown.querySelector('.selected').textContent = selectedOption.textContent;
        dropdown.classList.remove('open'); // Close the dropdown after selecting an option
        e.stopPropagation(); // Prevent the event from bubbling up and causing unintended behavior
    });
});

// Close dropdown when clicking outside of it
document.addEventListener('click', function (event) {
    const dropdown = document.querySelector('.custom-dropdown');
    if (!dropdown.contains(event.target)) {
        dropdown.classList.remove('open');
    }
});

// Function to save profile changes with validation (update the code)
async function saveProfileChanges() {
    const user = auth.currentUser;
    if (user) {
        const originalData = tempProfileData;

        const firstName = document.getElementById('editFirstName').value.trim();
        const middleName = document.getElementById('editMiddleName').value.trim();
        const lastName = document.getElementById('editLastName').value.trim();
        const suffix = document.getElementById('editSuffix').value.trim();
        const birthdate = document.getElementById('editBirthdate').value.trim();
        const age = document.getElementById('editAge').value.trim();
        const status = document.getElementById('editStatus').textContent.trim(); // Update to get text content
        const contactNumber = document.getElementById('editContactNumber').value.trim();
        const address = document.getElementById('editAddress').value.trim();
        const profilePicFile = document.getElementById('editProfilePic').files[0];

        // Validate birthdate
        if (!birthdate) {
            showNotificationModal("Please fill in the birthdate.", "warning");
            return;
        }

        const birthDateObj = new Date(birthdate);
        if (isNaN(birthDateObj.getTime())) {
            showNotificationModal("Invalid birthdate. Please enter a valid date.", "warning");
            return;
        }

        // Check if any field has changed
        if (
            firstName === originalData.firstName &&
            middleName === originalData.middleName &&
            lastName === originalData.lastName &&
            suffix === originalData.suffix &&
            birthdate === originalData.birthdate &&
            age === originalData.age &&
            status === originalData.status &&
            contactNumber === originalData.contactNumber &&
            address === originalData.address &&
            !profilePicFile
        ) {
            showNotificationModal("Please edit at least one field before saving.", "warning");
            return;
        }

        const updatedData = {};

        if (firstName !== originalData.firstName) updatedData['personalInfo.first'] = firstName;
        if (middleName !== originalData.middleName) updatedData['personalInfo.middle'] = middleName;
        if (lastName !== originalData.lastName) updatedData['personalInfo.last'] = lastName;
        if (suffix !== originalData.suffix) updatedData['personalInfo.suffix'] = suffix;
        if (birthdate !== originalData.birthdate) updatedData['personalInfo.birthday'] = birthdate;
        if (age !== originalData.age) updatedData['personalInfo.age'] = age;
        if (status !== originalData.status) updatedData['personalInfo.status'] = status;
        if (contactNumber !== originalData.contactNumber) updatedData['phoneNumber'] = contactNumber;
        if (address !== originalData.address) updatedData['personalInfo.address'] = address;

        try {
            if (Object.keys(updatedData).length > 0) {
                await db.collection('applicants').doc(user.uid).update(updatedData);
            }

            if (profilePicFile) {
                const storageRef = storage.ref();
                const profilePicRef = storageRef.child(`profile_pictures/${user.uid}`);
                await profilePicRef.put(profilePicFile);
                const profilePicUrl = await profilePicRef.getDownloadURL();
                await db.collection('applicants').doc(user.uid).update({ 'personalInfo.profilePicUrl': profilePicUrl });
            }

            $('#editProfileModal').modal('hide');
            getUserData();
            showNotificationModal("Profile Updated Successfully!", "success");

        } catch (error) {
            showNotificationModal(`Error updating profile: ${error.message}`, "error");
        }
    }
}

// Function to reset the edit profile form to the existing data (existing code)
function resetEditProfileForm() {
    document.getElementById('editFirstName').value = tempProfileData.firstName;
    document.getElementById('editMiddleName').value = tempProfileData.middleName;
    document.getElementById('editLastName').value = tempProfileData.lastName;
    document.getElementById('editSuffix').value = tempProfileData.suffix;
    document.getElementById('editBirthdate').value = tempProfileData.birthdate;
    document.getElementById('editAge').value = tempProfileData.age;
    document.getElementById('editStatus').textContent = tempProfileData.status; // Update to set text content

    document.getElementById('editContactNumber').value = tempProfileData.contactNumber;
    document.getElementById('editAddress').value = tempProfileData.address;
    document.getElementById('profilePicPreview').src = tempProfileData.profilePicUrl || 'Assets/default-profile.png';
}

// Event listeners (update/add)
document.getElementById('profileBtn').addEventListener('click', getUserData);
document.getElementById('saveProfileChanges').addEventListener('click', saveProfileChanges);
document.getElementById('cancelProfileChanges').addEventListener('click', resetEditProfileForm);
document.getElementById('editProfilePic').addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profilePicPreview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('uploadIcon').addEventListener('click', function() {
    document.getElementById('editProfilePic').click();
});

document.getElementById('editBirthdate').addEventListener('change', function() {
    const birthdate = this.value;
    const age = calculateAge(birthdate);
    document.getElementById('editAge').value = age;
});

auth.onAuthStateChanged((user) => {
    if (user) {
        getUserData();
    } else {
        window.location.href = 'login.html';
    }
});

// Function to show notification modal with a custom message
function showNotificationModal(message, type) {
    const modalBody = document.getElementById("notificationModalBody");
    modalBody.textContent = message;

    // Change the color of the text based on the type
    if (type === "success") {
        modalBody.style.color = "green";
    } else if (type === "error") {
        modalBody.style.color = "red";
    } else if (type === "warning") {
        modalBody.style.color = "orange";
    }

    $('#notificationModal').modal('show'); // Use jQuery to show the modal
}
// JavaScript for sidebar toggle
document.getElementById('toggleSidebarBtn').addEventListener('click', function() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    // Toggle the 'active' class to show or hide the sidebar
    sidebar.classList.toggle('active');
    mainContent.classList.toggle('active');
});
