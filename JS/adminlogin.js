document.addEventListener('DOMContentLoaded', function() {
    // Your web app's Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyBflGD3TVFhlOeUBUPaX3uJTuB-KEgd0ow",
        authDomain: "authentication-d6496.firebaseapp.com",
        databaseURL: "https://authentication-d6496-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "authentication-d6496",
        storageBucket: "authentication-d6496.appspot.com",
        messagingSenderId: "195867894399",
        appId: "1:195867894399:web:596fb109d308aea8b6154a"
    };
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();

    // Add event listener to the login button
    document.getElementById('loginBtn').addEventListener('click', function(event) {
        event.preventDefault();
        
        // Show the loader when login starts
        document.getElementById('loader1').style.display = 'flex';

        var name = document.getElementById('name').value;
        var password = document.getElementById('password').value;

        if (name && password) {
            db.collection("admin").doc("admin").get().then((doc) => {
                if (doc.exists) {
                    var adminData = doc.data();

                    if (adminData.name !== name) {
                        hideLoader();  // Hide the loader
                        showModal("Email is incorrect");
                    } else if (adminData.password !== password) {
                        hideLoader();  // Hide the loader
                        showModal("Password is incorrect");
                    } else {
                        // Redirect to admin dashboard
                        hideLoader();  // Hide the loader before redirect
                        window.location.href = "admindashboard.html";
                    }
                } else {
                    hideLoader();  // Hide the loader
                    showModal("No such document!");
                }
            }).catch((error) => {
                hideLoader();  // Hide the loader
                showModal("Error logging in");
            });
        } else {
            hideLoader();  // Hide the loader
            showModal("Please fill in both fields");
        }
    });

    // Function to hide the loader
    function hideLoader() {
        document.getElementById('loader1').style.display = 'none';
    }

    // Function to set up password toggle
    function setupPasswordToggle(toggleId, passwordId) {
        const togglePassword = document.getElementById(toggleId);
        if (togglePassword) {
            togglePassword.addEventListener('click', function () {
                const passwordInput = document.getElementById(passwordId);
                const icon = this.querySelector('i');
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                }
            });
        }
    }

    // Function to show the modal with a specific message
    function showModal(message) {
        document.getElementById('notificationMessage').textContent = message;
        const notificationModal = new bootstrap.Modal(document.getElementById('notificationModal'));
        notificationModal.show();
    }

    // Call the function with the appropriate IDs
    setupPasswordToggle('togglePassword', 'password');
});