import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js';

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
const storage = getStorage(app);

// Select elements from the DOM
const saveButton = document.querySelector('.save-instructor');
const profilePicInput = document.getElementById('editProfilePic');
const profilePicPreview = document.getElementById('profilePicPreview');
const instructorNameInput = document.querySelector('.instructor-name');
const coursesCheckboxes = document.querySelectorAll('[name="courses"]');
const traitsInput = document.querySelector('.traits-input');
const addTraitButton = document.querySelector('.add-trait');
const traitsList = document.querySelector('.traits-list');

// Store dynamically added traits
let traits = [];
let currentInstructorId = null;

// Fetch and Populate Instructor Data
async function fetchInstructorData(instructorId) {
    try {
      const docRef = doc(db, 'instructors', instructorId);
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        const data = docSnap.data();
  
        // Populate profile fields
        document.querySelector('.profile-pic').src = data.imageUrl || 'Assets/default-profile.png';
        document.querySelector('.name').textContent = data.name || 'N/A';
  
        // Populate courses
        const courseListContainer = document.querySelector('.course-list');
        courseListContainer.innerHTML = ''; // Clear current course list
        (data.courses || []).forEach(course => {
          const courseItem = document.createElement('span');
          courseItem.className = 'course';
          courseItem.textContent = course;
          courseListContainer.appendChild(courseItem);
        });
  
        // Populate traits
        const traitsContainer = document.querySelector('.saved-traits-list');
        traitsContainer.innerHTML = ''; // Clear current traits list
        (data.instructor_traits || []).forEach(trait => {
          const traitSpan = document.createElement('span');
          traitSpan.className = 'trait';
          traitSpan.textContent = trait;
          traitsContainer.appendChild(traitSpan);
        });
      } else {
        console.error('Instructor data not found.');
      }
    } catch (error) {
      console.error('Error fetching instructor data:', error);
    }
  }

  // Function to populate modal fields with instructor data
async function populateEditModal(instructorId) {
    try {
      // Fetch instructor data from Firestore
      const instructorRef = doc(db, 'instructors', instructorId);
      const instructorSnap = await getDoc(instructorRef);
  
      if (instructorSnap.exists()) {
        const instructorData = instructorSnap.data();
  
        // Populate name
        document.querySelector('.instructor-name').value = instructorData.name || '';
  
        // Populate profile picture
        const profilePicPreview = document.getElementById('profilePicPreview');
        profilePicPreview.src = instructorData.imageUrl || 'Assets/default-profile.png';
  
        // Populate courses
        const coursesCheckboxes = document.querySelectorAll('[name="courses"]');
        coursesCheckboxes.forEach((checkbox) => {
          checkbox.checked = instructorData.courses?.includes(checkbox.nextElementSibling.textContent) || false;
        });
  
        // Populate predefined traits
        const predefinedTraitsCheckboxes = document.querySelectorAll('[name="traits"]');
        predefinedTraitsCheckboxes.forEach((checkbox) => {
          checkbox.checked = instructorData.instructor_traits?.includes(checkbox.nextElementSibling.textContent) || false;
        });
  
        // Populate custom traits
        const customTraitsContainer = document.querySelector('.traits-list');
        customTraitsContainer.innerHTML = ''; // Clear existing custom traits
        const customTraits = instructorData.instructor_traits?.filter((trait) => {
          // Filter traits that are not predefined
          return !Array.from(predefinedTraitsCheckboxes).some((checkbox) => checkbox.nextElementSibling.textContent === trait);
        });
  
        if (customTraits) {
          customTraits.forEach((trait) => {
            const traitSpan = document.createElement('span');
            traitSpan.className = 'trait';
            traitSpan.textContent = trait;
            customTraitsContainer.appendChild(traitSpan);
          });
        }
      } else {
        console.error('Instructor data not found.');
      }
    } catch (error) {
      console.error('Error populating edit modal:', error);
    }
  }

// Detect the logged-in user
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentInstructorId = user.uid; // Use the authenticated user's UID as the instructor ID
    fetchInstructorData(currentInstructorId);
    populateEditModal(currentInstructorId);
  } else {
    console.error("No logged-in user. Redirect to login.");
    // Optionally redirect to login page
    // window.location.href = 'login.html';
  }
});

// Trigger the file input when clicking the upload icon
document.querySelector('#uploadIcon').addEventListener('click', (event) => {
    event.preventDefault(); // Prevent default behavior
    document.querySelector('#editProfilePic').click(); // Open the file dialog
});

// Update profile picture preview when a file is selected
document.querySelector('#editProfilePic').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.querySelector('#profilePicPreview').src = e.target.result; // Show the selected image
        };
        reader.readAsDataURL(file);
    }
});

// Handle adding custom traits
addTraitButton.addEventListener('click', (event) => {
    event.preventDefault(); // Prevent default button behavior
  
    // Get and trim the trait input
    const trait = traitsInput.value.trim();
    if (!trait) {
      alert('Please enter a trait.');
      return;
    }
  
    // Capitalize the first letter of the trait
    const formattedTrait = trait.charAt(0).toUpperCase() + trait.slice(1).toLowerCase();
  
    // Check if the trait already exists (both in predefined and custom traits)
    const predefinedTraits = Array.from(document.querySelectorAll('[name="traits"]:checked, [name="traits"]'))
      .map((checkbox) => checkbox.nextElementSibling.textContent);
    if (predefinedTraits.includes(formattedTrait) || traits.includes(formattedTrait)) {
      alert('This trait already exists.');
      traitsInput.value = ''; // Clear input field
      return;
    }
  
    // Add the trait to the custom traits list
    traits.push(formattedTrait);
  
    // Create a span element for the new trait
    const traitSpan = document.createElement('span');
    traitSpan.className = 'trait';
    traitSpan.textContent = formattedTrait;
  
    // Append the new trait span to the traits-list container
    traitsList.appendChild(traitSpan);
  
    // Clear the input field
    traitsInput.value = '';
  });

  saveButton.addEventListener('click', async (event) => {
    event.preventDefault();

    // Ensure the instructor is logged in and we have their UID
    if (!currentInstructorId) {
        alert('No logged-in instructor. Please log in first.');
        return;
    }

    // Validate required fields
    const instructorName = instructorNameInput.value.trim();
    if (!instructorName) {
        alert('Please enter the instructor\'s name.');
        return;
    }

    // Get selected courses
    const selectedCourses = Array.from(coursesCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.nextElementSibling.textContent);

    // Collect predefined traits from checked checkboxes
    const predefinedTraits = Array.from(document.querySelectorAll('[name="traits"]:checked'))
        .map(checkbox => checkbox.nextElementSibling.textContent);

    // Update `traits` array with the current custom traits shown in the modal
    const displayedCustomTraits = Array.from(document.querySelectorAll('.traits-list .trait'))
        .map(traitSpan => traitSpan.textContent);

    traits = displayedCustomTraits; // Update `traits` array to match what's currently displayed

    // Combine predefined traits with custom traits
    const allTraits = [...predefinedTraits, ...traits];

    try {
        // Upload the profile picture if provided
        let profilePicUrl = 'Assets/default-profile.png';
        if (profilePicInput.files.length > 0) {
            const file = profilePicInput.files[0];
            const storageRef = ref(storage, `instructor_pictures/${currentInstructorId}.jpg`);
            await uploadBytes(storageRef, file);
            profilePicUrl = await getDownloadURL(storageRef);
        }

        // Save data to the `instructors` collection with the logged-in UID
        await setDoc(doc(db, 'instructors', currentInstructorId), {
            name: instructorName,
            courses: selectedCourses,
            instructor_traits: allTraits, // Save all traits (predefined + custom)
            imageUrl: profilePicUrl,
        });

        alert('Instructor profile updated successfully.');
        location.reload(); // Reload the page to update the list
    } catch (error) {
        console.error('Error saving instructor profile:', error);
        alert('An error occurred while updating the profile.');
    }
});