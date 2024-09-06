import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, query, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

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
const auth = getAuth(app);

let studentId = '';  // Variable to store student ID

// Helper function to display notification modal
function showNotification(message) {
    document.getElementById('notificationModalBody').innerText = message;
    $('#notificationModal').modal('show');
}

// Authentication check to store the user ID
onAuthStateChanged(auth, (user) => {
    if (user) {
        studentId = user.uid;  // Set the logged-in user ID
    } else {
        // Use notification modal instead of alert
        showNotification("You must be logged in to continue.");
        $('#notificationModal').on('hidden.bs.modal', function () {
            window.location.href = 'login.html';  // Redirect after modal is closed
        });
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const findMatchBtn = document.getElementById('findMatchBtn');
    const loader = document.getElementById('loader2');
    const loadingBar = document.querySelector('.loading-bar');
    const loadingPercentage = document.querySelector('.loading-percentage');
    const addTraitsBtn = document.querySelector('.traits-btn'); // Select the Add your Traits button
    const personalityTraitsModal = new bootstrap.Modal(document.getElementById('personalityTraitsModal'), {backdrop: 'static', keyboard: false}); // Bootstrap modal instance
    const othersCheckbox = document.getElementById('othersCheckbox');
    const otherTraitInput = document.getElementById('otherTraitInput');

    // Fetch and display saved traits, and decide whether to show the modal
    await checkAndShowTraitsModal();

    async function checkAndShowTraitsModal() {
        try {
            const userDocRef = doc(db, 'applicants', studentId);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const data = userDoc.data();
                const savedTraits = data.traits || [];

                if (savedTraits.length === 0) {
                    // If no traits saved, show the traits modal
                    personalityTraitsModal.show();
                }
            } else {
                // If no document found, show the traits modal
                personalityTraitsModal.show();
            }
        } catch (error) {
            console.error('Error checking saved traits:', error);
        }
    }

    // Add an event listener to toggle the text input field
    othersCheckbox.addEventListener('change', function() {
        if (this.checked) {
            otherTraitInput.style.display = 'block'; // Show the input field
        } else {
            otherTraitInput.style.display = 'none';  // Hide the input field
            otherTraitInput.value = '';  // Clear the input field
        }
    });

    // Event listener for Add your Traits button
    addTraitsBtn.addEventListener('click', () => {
        personalityTraitsModal.show();  // Show the modal when button is clicked
    });

    // Firestore reference to the 'matches' collection
    const matchesCollectionRef = collection(db, 'matches');

    // Event listener for Find Match button
    findMatchBtn.addEventListener('click', async () => {
        // Check if student has a confirmed PDC appointment
        const hasPDCAppointment = await checkPDCAppointment(studentId);
    
        if (!hasPDCAppointment) {
            // Use notification modal instead of alert
            showNotification("You must have a confirmed PDC appointment (4Wheels or Motors) before matching with an instructor.");
            return;  // Stop further execution
        }
    
        // Proceed with finding match if PDC appointment exists
        loader.style.display = 'flex';  // Show the loader
        loadingBar.style.width = '0';   // Reset loading bar width
        loadingPercentage.textContent = '0%';  // Reset percentage text
        loadingPercentage.style.color = '#142A74';  // Dark color for initial text
    
        // Simulate loading progress dynamically
        let progress = 0;
        const interval = setInterval(() => {
            // Increase the progress randomly between 1% and 5%
            const increment = Math.floor(Math.random() * 5) + 1;
            progress = Math.min(progress + increment, 99);  // Cap progress at 99% until real match happens
            loadingBar.style.width = progress + '%';
            loadingPercentage.textContent = progress + '%';
    
            // Adjust text color based on progress
            if (progress > 48.5) {
                loadingPercentage.style.color = '#ffffff';  // Light color for better contrast
            } else {
                loadingPercentage.style.color = '#142A74';  // Dark color
            }
    
            // If progress reaches 99%, stop the interval and wait for the real match
            if (progress >= 99) {
                clearInterval(interval);
            }
        }, 100);  // Adjust speed as necessary
    
        // Simulate real matching process
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
    
                // Complete the loader
                loadingBar.style.width = '100%';
                loadingPercentage.textContent = '100%';
    
                setTimeout(() => {
                    loader.style.display = 'none';  // Hide the loader
                    window.location.href = 'userinstructormatch.html';  // Redirect to matched instructor page
                }, 500);  // Add a slight delay to let the user see the 100% completion
            } else {
                showNotification('An error occurred: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An error occurred while contacting the server: ' + error.message);
        });
    });

    // Function to handle the saving of traits
    document.getElementById('saveButton').addEventListener('click', async function() {
        const saveButton = document.getElementById('saveButton');
        saveButton.disabled = true; // Disable save button to prevent multiple submissions
        
        // Show loader
        document.getElementById('loader1').style.display = 'flex';

        // Collect the selected traits
        const selectedTraits = [];
        document.querySelectorAll('input[name="traits"]:checked').forEach((checkbox) => {
            selectedTraits.push(checkbox.nextElementSibling.innerText);
        });

        // Check if "Others" is selected and if there are any traits in the input
        if (document.getElementById('othersCheckbox').checked && document.getElementById('otherTraitInput').value.trim() !== '') {
            const otherTraits = document.getElementById('otherTraitInput').value.split(',').map(trait => trait.trim());
            selectedTraits.push(...otherTraits);
        }

        // Validate: Ensure at least one trait is selected
        if (selectedTraits.length === 0) {
            document.getElementById('loader1').style.display = 'none'; // Hide loader
            saveButton.disabled = false;  // Re-enable save button
            showNotification("Please select at least one trait before saving."); // Show notification
            return;
        }

        try {
            // Reference to Firestore document
            const userDocRef = doc(db, 'applicants', studentId);

            // Save traits to Firestore
            await setDoc(userDocRef, {
                traits: selectedTraits
            }, { merge: true });

            showNotification("Traits saved successfully!"); // Success notification

            // Hide loader and re-enable save button
            document.getElementById('loader1').style.display = 'none';
            saveButton.disabled = false;

            // Close the modal
            personalityTraitsModal.hide();
        } catch (error) {
            console.error("Error saving traits: ", error);
            showNotification("An error occurred while saving traits. Please try again.");
            document.getElementById('loader1').style.display = 'none';
            saveButton.disabled = false;
        }
    });

    // Function to save the match in Firestore
    async function saveMatchToFirestore(studentId, instructorId) {
        try {
            // Check if a match already exists for the student
            const existingMatch = await getDoc(doc(matchesCollectionRef, studentId));
            
            if (existingMatch.exists()) {
                // If match exists, notify the user and prevent saving
                showNotification("You are already matched with an instructor.");
                return;  // Stop further execution
            }

            // If no match exists, proceed with saving
            await setDoc(doc(matchesCollectionRef, studentId), {
                instructorId: instructorId,
                matchedAt: new Date()  // Store the timestamp of the match
            });

            console.log('Match successfully saved to Firestore');
        } catch (error) {
            console.error('Error saving match to Firestore:', error);
            // Show error notification
            showNotification('An error occurred while saving the match. Please try again.');
        }
    }

    await loadSavedTraits(studentId);
});

// Function to fetch and display saved traits from Firestore
async function loadSavedTraits(studentId) {
    try {
        const userDocRef = doc(db, 'applicants', studentId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const data = userDoc.data();
            const savedTraits = data.traits || [];

            // Loop through the checkboxes and check them if they match the saved traits
            document.querySelectorAll('input[name="traits"]').forEach((checkbox) => {
                const labelText = checkbox.nextElementSibling.innerText;
                if (savedTraits.includes(labelText)) {
                    checkbox.checked = true; // Check the box if the trait is saved
                }
            });

            // Handle "Others" input field if any other traits were saved
            const otherTraits = savedTraits.filter(trait => 
                !['Determined', 'Anxious', 'Adaptable', 'Curious', 'Patient'].includes(trait)
            );

            if (otherTraits.length > 0) {
                document.getElementById('othersCheckbox').checked = true; // Check the "Others" checkbox
                document.getElementById('otherTraitInput').style.display = 'block'; // Show the input field
                document.getElementById('otherTraitInput').value = otherTraits.join(', '); // Populate the input field
            }
        }
    } catch (error) {
        console.error('Error loading saved traits:', error);
    }
}

// Function to check if the user has a confirmed PDC appointment
async function checkPDCAppointment(studentId) {
    try {
        const appointmentsRef = collection(db, 'appointments');
        const q = query(appointmentsRef);
        const querySnapshot = await getDocs(q);

        console.log("Checking appointments for userId:", studentId);

        // Iterate through appointments and check the bookings array
        let hasValidBooking = false;
        querySnapshot.forEach((doc) => {
            const appointmentData = doc.data();
            
            // First check the course at the top level of the document
            const course = appointmentData.course;
            if (course !== "PDC-4Wheels" && course !== "PDC-Motors") {
                console.log(`Skipping appointment as course is not valid: ${course}`);
                return;
            }

            // Check if the bookings field exists and is an array
            if (appointmentData.bookings && Array.isArray(appointmentData.bookings)) {
                const bookings = appointmentData.bookings;

                bookings.forEach((booking) => {
                    console.log("Evaluating booking:", booking);

                    // Accept bookings with "In Progress" or "Not yet Started" progress
                    if (booking.userId === studentId && 
                        booking.status === "Booked" && 
                        (booking.progress === "In Progress" || booking.progress === "Not yet Started")) {

                        hasValidBooking = true;  // Valid PDC appointment found
                        console.log("Valid booking found:", booking);
                    }
                });
            } else {
                console.warn(`No bookings array found in document ${doc.id}`);
            }
        });

        if (!hasValidBooking) {
            console.log("No valid PDC booking found.");
        }

        return hasValidBooking;
    } catch (error) {
        console.error('Error checking PDC appointment:', error);
        return false;  // Treat as no appointment in case of error
    }
}