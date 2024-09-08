import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, query, getDocs, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

// Ensure the modal is initialized at the global level, not inside DOMContentLoaded
const personalityTraitsModal = new bootstrap.Modal(document.getElementById('personalityTraitsModal'), { backdrop: 'static', keyboard: false });

// Function to check if traits are saved and show modal if not
function checkAndShowTraitsModal(savedTraits) {
    if (savedTraits.length === 0) {
        // If no traits saved, show the traits modal
        personalityTraitsModal.show();
    }
}

// Authentication check to store the user ID and ensure it's correctly assigned
onAuthStateChanged(auth, async (user) => {
    if (user) {
        studentId = user.uid;  // Set the logged-in user ID
        console.log("Student ID set: ", studentId);  // Debugging log

        // Fetch traits once and use them in both functions
        const userDocRef = doc(db, 'applicants', studentId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const savedTraits = userDoc.data().traits || [];
            
            // Load traits into checkboxes
            loadSavedTraits(savedTraits);
            
            // Check if modal should be shown
            checkAndShowTraitsModal(savedTraits);
        } else {
            // No document exists for the user
            checkAndShowTraitsModal([]);
        }
    } else {
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
    const othersCheckbox = document.getElementById('othersCheckbox');
    const otherTraitInput = document.getElementById('otherTraitInput');

    // Add an event listener to toggle the text input field
    othersCheckbox.addEventListener('change', function () {
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

    findMatchBtn.addEventListener('click', async () => {
        if (!studentId) {
            showNotification("You must be logged in to find your match.");
            return;
        }
    
        // Check if traits are saved before proceeding
        const userDocRef = doc(db, 'applicants', studentId);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists() || !userDoc.data().traits || userDoc.data().traits.length === 0) {
            // Show modal if no traits are saved
            personalityTraitsModal.show();
            return;
        }
    
        // Check if student has a confirmed PDC appointment
        const hasPDCAppointment = await checkPDCAppointment(studentId);
    
        if (!hasPDCAppointment) {
            showNotification("You must have a confirmed PDC appointment before matching with an instructor.");
            return;
        }
    
        // Proceed with finding match
        loader.style.display = 'flex';  // Show the loader
        loadingBar.style.width = '0';   // Reset loading bar width
        loadingPercentage.textContent = '0%';  // Reset percentage text
    
        // Start the loader animation
        let progress = 0;
        const interval = setInterval(() => {
            const increment = Math.floor(Math.random() * 5) + 1;
            progress = Math.min(progress + increment, 99);
            loadingBar.style.width = progress + '%';
            loadingPercentage.textContent = progress + '%';
            
            if (progress >= 99) {
                clearInterval(interval);
            }
        }, 100);
    
        // Pass studentId as part of the request
        fetch(`http://127.0.0.1:5000/match/${studentId}`, {  // Update URL to include studentId
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(response => response.json())
        .then(async (data) => {
            console.log('Data received:', data);
            if (data.status === 'success') {
                const studentId = data.student_id;
                const instructorId = data.instructor_id;
                
                // Save the match in Firestore
                await saveMatchToFirestore(studentId, instructorId);
    
                // Complete the loader
                loadingBar.style.width = '100%';
                loadingPercentage.textContent = '100%';
    
                setTimeout(() => {
                    loader.style.display = 'none';
                    window.location.href = 'userinstructormatch.html';  // Redirect to matched instructor page
                }, 500);
            } else {
                showNotification('An error occurred: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An error occurred while contacting the server: ' + error.message);
        });
    });

    // Function to handle saving the traits
    document.getElementById('saveButton').addEventListener('click', async function () {
        const saveButton = document.getElementById('saveButton');
        saveButton.disabled = true; // Disable save button to prevent multiple submissions

        // Show loader
        document.getElementById('loader1').style.display = 'flex';

        // Collect the selected traits
        const selectedTraits = [];
        document.querySelectorAll('input[name="traits"]:checked').forEach((checkbox) => {
            if (checkbox.id !== 'othersCheckbox') { // Exclude the "Others" checkbox from saving
                selectedTraits.push(checkbox.nextElementSibling.innerText);
            }
        });

        // Handle custom traits from the 'Others' input
        if (document.getElementById('othersCheckbox').checked && document.getElementById('otherTraitInput').value.trim() !== '') {
            const otherTraits = document.getElementById('otherTraitInput').value
                .split(',')
                .map(trait => trait.trim())
                .filter(trait => trait) // Remove any empty strings
                .map(trait => trait.charAt(0).toUpperCase() + trait.slice(1).toLowerCase()); // Capitalize first letter
            selectedTraits.push(...otherTraits);
        }

        // Save the selected traits to Firestore, removing unchecked ones
        try {
            const userDocRef = doc(db, 'applicants', studentId);

            // Overwrite traits with only the selected ones (unchecked ones will be removed)
            await setDoc(userDocRef, { traits: selectedTraits }, { merge: true });

            showNotification("Traits updated successfully!");

            // Hide loader and re-enable save button
            document.getElementById('loader1').style.display = 'none';
            saveButton.disabled = false;

            // Close the modal
            personalityTraitsModal.hide();

            // Dynamically refresh the traits without reloading
            loadSavedTraits(selectedTraits);

        } catch (error) {
            console.error("Error updating traits: ", error);
            showNotification("An error occurred while updating traits. Please try again.");
            document.getElementById('loader1').style.display = 'none';
            saveButton.disabled = false;
        }
    });

    async function saveMatchToFirestore(studentId, instructorId) {
        try {
            // Create a reference to the "matches" collection with the studentId as the document ID
            const matchRef = doc(collection(db, 'matches'), studentId);
    
            // Save or update the match with "In Progress" status
            await setDoc(matchRef, {
                'instructorId': instructorId,
                'studentId': studentId,
                'matchedAt': new Date(),  // Store the timestamp of the match
                'matchStatus': 'In Progress'  // Set initial status as 'In Progress'
            }, { merge: true }); // Ensure it merges with existing data
    
            console.log('Match successfully saved to Firestore');
            showNotification('You have been successfully matched with the instructor.');
    
        } catch (error) {
            console.error('Error saving match to Firestore:', error);
            showNotification('An error occurred while saving the match. Please try again.');
        }
    }
});

// Function to fetch and display saved traits from Firestore
function loadSavedTraits(savedTraits) {
    // Clear previous dynamic checkboxes
    document.getElementById('dynamicTraits').innerHTML = ''; // Make sure this element exists in your HTML

    // Loop through the saved traits and check them
    savedTraits.forEach(trait => {
        if (!['Determined', 'Anxious', 'Adaptable', 'Curious', 'Patient'].includes(trait)) {
            // Add custom traits as checkboxes dynamically
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'traits';
            checkbox.id = `trait-${trait}`;
            checkbox.checked = true;

            const label = document.createElement('label');
            label.htmlFor = `trait-${trait}`;
            label.innerText = trait;

            // Append to the dynamic traits container
            document.getElementById('dynamicTraits').appendChild(checkbox);
            document.getElementById('dynamicTraits').appendChild(label);
        } else {
            // Check predefined traits if they match saved traits
            document.querySelectorAll('input[name="traits"]').forEach(checkbox => {
                if (checkbox.nextElementSibling.innerText === trait) {
                    checkbox.checked = true;
                }
            });
        }
    });
}

async function checkPDCAppointment(studentId) {
    try {
        const appointmentsRef = collection(db, 'appointments');
        const q = query(appointmentsRef);
        const querySnapshot = await getDocs(q);

        console.log("Checking appointments for userId:", studentId);

        // Iterate through appointments and check the bookings array
        for (let docSnap of querySnapshot.docs) {
            const appointmentData = docSnap.data();

            // First check the course at the top level of the document
            const course = appointmentData.course;
            if (course !== "PDC-4Wheels" && course !== "PDC-Motors") {
                console.log(`Skipping appointment as course is not valid: ${course}`);
                continue;
            }

            // Check if the bookings field exists and is an array
            if (appointmentData.bookings && Array.isArray(appointmentData.bookings)) {
                const bookings = appointmentData.bookings;

                for (let booking of bookings) {
                    console.log("Evaluating booking:", booking);

                    // Accept bookings only with "Not yet Started" progress
                    if (booking.userId === studentId &&
                        booking.status === "Booked" &&
                        booking.progress === "Not yet Started") {

                        console.log("Valid booking found:", booking);
                        return true;  // Exit the function and return true as soon as a valid booking is found
                    }
                }
            } else {
                console.warn(`No bookings array found in document ${docSnap.id}`);
            }
        }

        console.log("No valid PDC booking found.");
        return false;  // No valid booking found after iterating through all appointments

    } catch (error) {
        console.error('Error checking PDC appointment:', error);
        return false;  // Treat as no appointment in case of error
    }
}
