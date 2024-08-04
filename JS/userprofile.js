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

        // Function to get user data
        async function getUserData() {
            const user = auth.currentUser;
            if (user) {
                const userDoc = await db.collection('applicants').doc(user.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const personalInfo = userData.personalInfo;

                    document.querySelector('.name').textContent = `${personalInfo.first} ${personalInfo.last}`;
                    document.querySelector('.email').textContent = user.email;
                    document.getElementById('birthdate').textContent = personalInfo.birthday;
                    document.getElementById('age').textContent = personalInfo.age;
                    document.getElementById('status').textContent = personalInfo.status;
                    document.getElementById('contactNumber').textContent = userData.phoneNumber;
                    document.getElementById('address').textContent = personalInfo.address;
                    document.querySelector('.profile-pic').src = personalInfo.profilePicUrl || 'Assets/default-profile.png';
                    document.getElementById('profilePicPreview').src = personalInfo.profilePicUrl || 'Assets/default-profile.png';
                }
            }
        }

         
            // Function to save profile changes with validation
        async function saveProfileChanges() {
            const user = auth.currentUser;
            if (user) {
                const firstName = document.getElementById('editFirstName').value.trim();
                const middleName = document.getElementById('editMiddleName').value.trim();
                const lastName = document.getElementById('editLastName').value.trim();
                const suffix = document.getElementById('editSuffix').value.trim();
                const birthdate = document.getElementById('editBirthdate').value.trim();
                const age = document.getElementById('editAge').value.trim();
                const status = document.getElementById('editStatus').value.trim();
                const contactNumber = document.getElementById('editContactNumber').value.trim();
                const address = document.getElementById('editAddress').value.trim();

                if (!firstName || !lastName || !birthdate || !age || !status || !contactNumber || !address) {
                    alert("Please fill out all required fields.");
                    return;
                }

                const updatedData = {
                    'personalInfo.first': firstName,
                    'personalInfo.middle': middleName,
                    'personalInfo.last': lastName,
                    'personalInfo.suffix': suffix,
                    'personalInfo.birthday': birthdate,
                    'personalInfo.age': age,
                    'personalInfo.status': status,
                    'personalInfo.address': address,
                    'phoneNumber': contactNumber
                };

                try {
                    await db.collection('applicants').doc(user.uid).update(updatedData);

                    const profilePicFile = document.getElementById('editProfilePic').files[0];
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
                        position: "center", // Position of the toast
                        backgroundColor: "#4CAF50", // Success color
                        close: true // Show close button
                    }).showToast();

                } catch (error) {
                    // Show error toast notification
                    Toastify({
                        text: `Error updating profile: ${error.message}`,
                        duration: 3000, // 3 seconds
                        gravity: "top", // Position of the toast
                        position: "center", // Position of the toast
                        backgroundColor: "#f44336", // Error color
                        close: true // Show close button
                    }).showToast();
                }
            }
        }

        // Event listeners
        document.getElementById('profileBtn').addEventListener('click', getUserData);
        document.getElementById('saveProfileChanges').addEventListener('click', saveProfileChanges);
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

        // Load user data on page load
        auth.onAuthStateChanged((user) => {
            if (user) {
                getUserData();
            } else {
                window.location.href = 'login.html';
            }
        });