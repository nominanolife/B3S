import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
    import { getFirestore, doc, setDoc, collection} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

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

    document.querySelector('.bi-arrow-left').addEventListener('click', function() {
        window.location.href = 'userinstructor.html';
    });
    
    document.addEventListener('DOMContentLoaded', () => {
        const findMatchBtn = document.getElementById('findMatchBtn');
        const loader = document.getElementById('loader');
        const loadingBar = document.querySelector('.loading-bar');
        const loadingPercentage = document.querySelector('.loading-percentage');
    
        // Firestore reference to the 'matches' collection
        const matchesCollectionRef = collection(db, 'matches');
    
        findMatchBtn.addEventListener('click', async () => {
            // Show the loader
            loader.style.display = 'flex';
            loadingBar.style.width = '0'; // Reset loading bar width
            loadingPercentage.textContent = '0%'; // Reset percentage text
            loadingPercentage.style.color = '#142A74'; // Dark color for initial text
            
            // Simulate loading progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += 1;
                loadingBar.style.width = progress + '%';
                loadingPercentage.textContent = progress + '%';
                
                // Adjust text color based on progress
                if (progress > 48.5) {
                    loadingPercentage.style.color = '#ffffff'; // Light color for better contrast
                } else {
                    loadingPercentage.style.color = '#142A74'; // Dark color
                }
                
                if (progress >= 100) {
                    clearInterval(interval);
                    setTimeout(async () => {
                        // Hide the loader
                        loader.style.display = 'none';
    
                        console.log('Starting fetch request...');
                        fetch('http://127.0.0.1:5000/match', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        })
                        .then(response => response.json())
                        .then(async (data) => {
                            console.log('Data received:', data);
                            if (data.status === 'success') {
                                const studentId = Object.keys(data)[0];  // Extract the student ID
                                const instructorId = data[studentId];    // Extract the instructor ID
                                
                                // Save the match in Firestore
                                await saveMatchToFirestore(studentId, instructorId);
    
                                // Redirect to matched instructor page
                                window.location.href = 'userinstructormatch.html';
                            } else {
                                alert('An error occurred: ' + data.message);
                            }
                        })
                        .catch(error => {
                            console.error('Error:', error);
                            alert('An error occurred while contacting the server: ' + error.message);
                        });
                    }, 100);
                }
            }, 100); // Adjust speed as necessary
        });
    
        // Function to save the match in Firestore
        async function saveMatchToFirestore(studentId, instructorId) {
            try {
                // Save the match to the Firestore collection
                await setDoc(doc(matchesCollectionRef, studentId), {
                    instructorId: instructorId,
                    matchedAt: serverTimestamp() // Store the timestamp of the match
                });
                console.log('Match successfully saved to Firestore');
            } catch (error) {
                console.error('Error saving match to Firestore:', error);
            }
        }
    });
    