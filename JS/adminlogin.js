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

    document.getElementById('loginBtn').addEventListener('click', function(event) {
        event.preventDefault();
        var name = document.getElementById('name').value;
        var password = document.getElementById('password').value;

        if (name && password) {
            db.collection("admin").doc("admin").get().then((doc) => {
                if (doc.exists) {
                    var adminData = doc.data();
                    if (adminData.name === name && adminData.password === password) {
                        // Redirect to admin dashboard
                        window.location.href = "admindashboard.html";
                    } else {
                        alert("Invalid credentials");
                    }
                } else {
                    alert("No such document!");
                }
            }).catch((error) => {
                console.error("Error getting document: ", error);
                alert("Error logging in");
            });
        } else {
            alert("Please fill in both fields");
        }
    });

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

    // Call the function with the appropriate IDs
    setupPasswordToggle('togglePassword', 'password');
});