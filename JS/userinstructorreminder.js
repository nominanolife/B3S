import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, query, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

const findMatchBtn = document.getElementById('findMatchBtn');

// Check if button was previously enabled
if (sessionStorage.getItem('findMatchEnabled') === 'true') {
    findMatchBtn.disabled = false;
} else {
    findMatchBtn.disabled = true;
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

            // If no traits are saved, show the personality traits modal
            if (savedTraits.length === 0) {
                personalityTraitsModal.show();
                return;
            }

            // Check if the user has a confirmed PDC appointment
            const hasPDCAppointment = await checkPDCAppointment(studentId);

            // Enable or disable the "Find your match" button based on the appointment status
            if (hasPDCAppointment) {
                findMatchBtn.disabled = false;  // Enable the button if a valid appointment exists
                sessionStorage.setItem('findMatchEnabled', 'true');  // Store button state in sessionStorage
            } else {
                showNotification("You must have a confirmed PDC appointment before matching with an instructor.");
                findMatchBtn.disabled = true;  // Keep the button disabled if no appointment is found
                sessionStorage.removeItem('findMatchEnabled');  // Remove stored state if no appointment
            }
        } else {
            showNotification("You must be logged in to continue.");
            $('#notificationModal').on('hidden.bs.modal', function () {
                window.location.href = 'login.html';  // Redirect after modal is closed
            });
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
    
        // Show the loader before starting the matching process
        loader.style.display = 'flex';  
        let progress = 0;
    
        // Function to update loader progress
        function updateLoader(increment) {
            progress = Math.min(progress + increment, 100);
            loadingBar.style.width = `${progress}%`;
            loadingPercentage.textContent = `${progress}%`;
    
            // Change the loading percentage text color to white when progress is 48% or more
            if (progress >= 48) {
                loadingPercentage.style.color = 'white';
            } else {
                loadingPercentage.style.color = ''; // Reset to default color if below 48%
            }
        }
    
        try {
            // Initial progress update - Fetching match data
            updateLoader(30);
        
            const response = await fetch(`https://authentication-d6496.df.r.appspot.com/match/${studentId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        
            updateLoader(40); // Increment as data is fetched
        
            const data = await response.json();
            console.log('Data received:', data);
        
            if (data.status === 'success') {
                const studentId = data.student_id;
                const instructorId = data.instructor_id;
        
                // Update loader progress while saving the match
                updateLoader(20);
        
                await saveMatchToFirestore(studentId, instructorId);
        
                // Complete the loader progress when everything is done
                updateLoader(10);
                loadingBar.style.width = '100%';
                loadingPercentage.textContent = '100%';
        
                // Add a slight delay before proceeding to hide the loader
                setTimeout(() => {
                    // Hide the loader first
                    loader.style.display = 'none';
        
                    // Redirect after completing the matching process
                    setTimeout(() => {
                        window.location.href = 'userinstructormatch.html'; // Redirect to matched instructor page
                    });
                });
            } else {
                // Error handling
                showNotification('An error occurred: ' + data.message);
                loader.style.display = 'none';
            }
        } catch (error) {
            // Error handling
            console.error('Error:', error);
            showNotification('An error occurred while contacting the server: ' + error.message);
            loader.style.display = 'none';
        }        
    });
    
    document.getElementById('saveButton').addEventListener('click', async function () {
        const saveButton = document.getElementById('saveButton');
        saveButton.disabled = true; // Disable save button to prevent multiple submissions
    
        // Show loader
        document.getElementById('loader1').style.display = 'flex';
    
        // Collect the selected traits
        const selectedTraits = new Set();
        const normalizedTraits = new Set();
    
        document.querySelectorAll('input[name="traits"]:checked').forEach((checkbox) => {
            if (checkbox.id !== 'othersCheckbox') { // Exclude the "Others" checkbox from saving
                const trait = checkbox.nextElementSibling.innerText;
                const normalizedTrait = trait.toLowerCase();
                if (!normalizedTraits.has(normalizedTrait)) {
                    selectedTraits.add(trait);
                    normalizedTraits.add(normalizedTrait);
                }
            }
        });
    
        // Handle custom traits from the 'Others' input
        if (document.getElementById('othersCheckbox').checked && document.getElementById('otherTraitInput').value.trim() !== '') {
            const otherTraits = document.getElementById('otherTraitInput').value
                .split(',')
                .map(trait => trait.trim())
                .filter(trait => trait)
                .map(trait => trait.charAt(0).toUpperCase() + trait.slice(1).toLowerCase());
    
            otherTraits.forEach(trait => {
                const normalizedTrait = trait.toLowerCase();
                if (!normalizedTraits.has(normalizedTrait)) {
                    selectedTraits.add(trait);
                    normalizedTraits.add(normalizedTrait);
                }
            });
        }
    
        // Convert Set back to an array for saving
        const uniqueSelectedTraits = Array.from(selectedTraits);
    
        // Fetch existing traits from Firestore
        try {
            const userDocRef = doc(db, 'applicants', studentId);
            const docSnap = await getDoc(userDocRef);
    
            if (docSnap.exists()) {
                const existingTraits = docSnap.data().traits || [];
    
                // Check if there are any changes between existing and new traits
                const existingTraitsSet = new Set(existingTraits.map(trait => trait.toLowerCase()));
                const newTraitsSet = new Set(uniqueSelectedTraits.map(trait => trait.toLowerCase()));
    
                const traitsChanged = 
                    existingTraits.length !== uniqueSelectedTraits.length || 
                    ![...newTraitsSet].every(trait => existingTraitsSet.has(trait)) || 
                    ![...existingTraitsSet].every(trait => newTraitsSet.has(trait));
    
                if (!traitsChanged) {
                    // Notify the user and prevent saving if no changes were made
                    showNotification("Existing traits are the same. No changes were made.");
                    document.getElementById('loader1').style.display = 'none';
                    saveButton.disabled = false;
                    return;
                }
    
                // Save the selected traits if there are changes
                await setDoc(userDocRef, { traits: uniqueSelectedTraits }, { merge: true });
    
                showNotification("Traits updated successfully!");
            } else {
                // If the document doesn't exist, save the new traits
                await setDoc(userDocRef, { traits: uniqueSelectedTraits });
    
                showNotification("Traits saved successfully!");
            }
    
            // Hide loader and re-enable save button
            document.getElementById('loader1').style.display = 'none';
            saveButton.disabled = false;
    
            // Close the modal
            personalityTraitsModal.hide();
    
            // Dynamically refresh the traits without reloading
            loadSavedTraits(uniqueSelectedTraits);
    
            // Uncheck the 'Others' checkbox and clear the input field
            const othersCheckbox = document.getElementById('othersCheckbox');
            othersCheckbox.checked = false;
            document.getElementById('otherTraitInput').style.display = 'none';
            document.getElementById('otherTraitInput').value = '';
    
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
    
        } catch (error) {
            console.error('Error saving match to Firestore:', error);
            showNotification('An error occurred while saving the match. Please try again.');
        }
    }
});

// Function to fetch and display saved traits from Firestore
function loadSavedTraits(savedTraits) {
    // Get the container that holds all the form groups
    const formGroupAll = document.querySelector('.form-group-all');

    // Remove any previous dynamically added traits
    formGroupAll.querySelectorAll('.form-group.dynamic-trait').forEach(element => element.remove());

    // Function to create and add a new checkbox for a trait
    function addTrait(trait) {
        // Create form group
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group dynamic-trait';  // Add class to identify dynamic traits

        // Create checkbox input
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'traits';
        checkbox.id = `trait-${trait}`;
        checkbox.checked = true;

        // Create label for the checkbox
        const label = document.createElement('label');
        label.className = 'custom-checkbox';

        // Create span for the label text
        const span = document.createElement('span');
        span.className = 'checkbox-label';
        span.innerText = trait;

        // Append checkbox and label
        label.appendChild(checkbox);
        label.appendChild(span);
        formGroup.appendChild(label);

        // Insert before the "Other traits" input
        const otherTraitsFormGroup = formGroupAll.querySelector('.form-group:last-of-type');
        formGroupAll.insertBefore(formGroup, otherTraitsFormGroup);
    }

    // Iterate over saved traits and add them
    savedTraits.forEach(trait => {
        if (!['Shy', 'Bold', 'Timid', 'Outgoing', 'Quiet', 'Impulsive'].includes(trait)) {
            addTrait(trait);  // Add custom traits
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

// Function to check if the user has a confirmed PDC appointment
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