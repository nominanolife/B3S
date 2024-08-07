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

// Function to get user data and populate profile page
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
            document.getElementById('editStatus').value = tempProfileData.status;
            document.getElementById('editContactNumber').value = tempProfileData.contactNumber;
            document.getElementById('editAddress').value = tempProfileData.address;
        }
    }
}

// Function to calculate age based on birthdate
function calculateAge(birthdate) {
    const birthDate = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
}

// Function to save profile changes with validation
async function saveProfileChanges() {
    const user = auth.currentUser;
    if (user) {
        // Get the existing data for comparison
        const originalData = tempProfileData;

        // Get the input values
        const firstName = document.getElementById('editFirstName').value.trim();
        const middleName = document.getElementById('editMiddleName').value.trim();
        const lastName = document.getElementById('editLastName').value.trim();
        const suffix = document.getElementById('editSuffix').value.trim();
        const birthdate = document.getElementById('editBirthdate').value.trim();
        const age = document.getElementById('editAge').value.trim();
        const status = document.getElementById('editStatus').value.trim();
        const contactNumber = document.getElementById('editContactNumber').value.trim();
        const address = document.getElementById('editAddress').value.trim();

        const profilePicFile = document.getElementById('editProfilePic').files[0];

        // Validate birthdate
        if (!birthdate) {
            Toastify({
                text: "Please fill in the birthdate.",
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "#ff9800",
            }).showToast();
            return;
        }

        const birthDateObj = new Date(birthdate);
        if (isNaN(birthDateObj.getTime())) {
            Toastify({
                text: "Invalid birthdate. Please enter a valid date.",
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "#ff9800",
            }).showToast();
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
            // Show validation message
            Toastify({
                text: "Please edit at least one field before saving.",
                duration: 3000, // 3 seconds
                gravity: "top", // Position of the toast
                position: "right", // Position of the toast
                backgroundColor: "#ff9800", // Warning color
            }).showToast();
            return; // Exit the function
        }

        const updatedData = {};

        // Only update fields that have been changed
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
            // Update only if there are changes
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

            // Show success toast notification
            Toastify({
                text: "Profile Updated Successfully!",
                duration: 3000, // 3 seconds
                gravity: "top", // Position of the toast
                position: "right", // Position of the toast
                backgroundColor: "#4CAF50", // Success color
            }).showToast();

        } catch (error) {
            // Show error toast notification
            Toastify({
                text: `Error updating profile: ${error.message}`,
                duration: 3000, // 3 seconds
                gravity: "top", // Position of the toast
                position: "center", // Position of the toast
                backgroundColor: "#f44336", // Error color
            }).showToast();
        }
    }
}

// Function to reset the edit profile form to the existing data
function resetEditProfileForm() {
    document.getElementById('editFirstName').value = tempProfileData.firstName;
    document.getElementById('editMiddleName').value = tempProfileData.middleName;
    document.getElementById('editLastName').value = tempProfileData.lastName;
    document.getElementById('editSuffix').value = tempProfileData.suffix;
    document.getElementById('editBirthdate').value = tempProfileData.birthdate;
    document.getElementById('editAge').value = tempProfileData.age;
    document.getElementById('editStatus').value = tempProfileData.status;
    document.getElementById('editContactNumber').value = tempProfileData.contactNumber;
    document.getElementById('editAddress').value = tempProfileData.address;
    document.getElementById('profilePicPreview').src = tempProfileData.profilePicUrl || 'Assets/default-profile.png';
}

// Event listeners
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

// Load user data on page load
auth.onAuthStateChanged((user) => {
    if (user) {
        getUserData();
    } else {
        window.location.href = 'login.html';
    }
});
