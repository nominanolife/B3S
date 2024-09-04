import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

let studentId = ''; // To store the logged-in user's student ID
let instructorId = ''; // To store the matched instructor ID

// Listen to authentication state and fetch the match data once a user is logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        studentId = user.uid; // Assign the logged-in user's ID as the studentId
        fetchMatchAndInstructorData(studentId); // Call the function to fetch data
    } else {
        console.error('No user is logged in.');
    }
});

async function fetchMatchAndInstructorData(studentId) {
    try {
        console.log("Fetching match for studentId:", studentId);

        // Fetch the match document from Firestore based on studentId
        const matchDoc = await getDoc(doc(db, 'matches', studentId));

        if (!matchDoc.exists()) {
            console.error(`Match not found for the given student ID: ${studentId}`);
            return;
        }

        // Extract the instructorId from the match
        const matchData = matchDoc.data();
        instructorId = matchData.instructorId;

        // Now fetch the instructor data using the instructorId
        const instructorDoc = await getDoc(doc(db, 'instructors', instructorId));

        if (!instructorDoc.exists()) {
            console.error(`Instructor not found for the given instructor ID: ${instructorId}`);
            return;
        }

        const instructorData = instructorDoc.data();

        // Update the HTML with the instructor data
        document.getElementById('profilePic').src = instructorData.imageUrl || 'Assets/default-profile.png';
        document.getElementById('instructorName').textContent = instructorData.name || 'Instructor Name';
        
        const totalRatings = instructorData.totalRatings || 0;
        const rating = instructorData.rating || 0.0;

        // Update overall rating and total ratings count
        document.getElementById('ratingValue').textContent = rating.toFixed(1);
        document.getElementById('ratingTotal').textContent = `Based on ${totalRatings} ratings`;

        // Correcting the order for rating bars and counts (index 4 = 5 stars, index 0 = 1 star)
        const ratingCounts = instructorData.ratings || [0, 0, 0, 0, 0]; // For 1-5 stars
        for (let i = 1; i <= 5; i++) {
            const count = ratingCounts[i - 1] || 0; // Access the correct index
            const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
            document.getElementById(`ratingBar${i}`).style.width = `${percentage}%`;
            document.getElementById(`ratingCount${i}`).textContent = count;
        }

        // Update traits, with a fallback to an empty array if traits are not found
        const traits = instructorData.traits || [];
        traits.forEach((trait, index) => {
            document.getElementById(`instructorTraits${index + 1}`).textContent = trait;
        });

        // Update stars dynamically based on the average rating
        updateStarsUI(rating);

    } catch (error) {
        console.error('Error fetching data:', error);
        alert('An error occurred while fetching data.');
    }
}

function updateStarsUI(averageRating) {
    // Get the star container element
    const starContainer = document.getElementById('starContainer');

    // Check if the starContainer element exists
    if (!starContainer) {
        console.error("Star container element not found.");
        return; // Exit the function if the element is not found
    }

    // Clear the existing stars (if any)
    starContainer.innerHTML = '';

    // Convert the average rating to an integer part and a decimal part
    const fullStars = Math.floor(averageRating); // Full stars
    const halfStar = (averageRating - fullStars >= 0.5); // Whether to display a half star

    // Add full stars
    for (let i = 0; i < fullStars; i++) {
        const star = document.createElement('i');
        star.classList.add('bi', 'bi-star-fill'); // Full star icon
        starContainer.appendChild(star);
    }

    // Add half star if needed
    if (halfStar) {
        const halfStarIcon = document.createElement('i');
        halfStarIcon.classList.add('bi', 'bi-star-half'); // Half star icon
        starContainer.appendChild(halfStarIcon);
    }

    // Fill the rest with empty stars up to 5 stars
    const remainingStars = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < remainingStars; i++) {
        const emptyStar = document.createElement('i');
        emptyStar.classList.add('bi', 'bi-star'); // Empty star icon
        starContainer.appendChild(emptyStar);
    }
}

// Handle star rating click
const stars = document.querySelectorAll('.stars-rating i');
let rating = 0;

stars.forEach(star => {
    star.addEventListener('click', function () {
        rating = this.getAttribute('data-value');
        updateStars(rating);
    });

    star.addEventListener('mouseover', function () {
        updateStars(this.getAttribute('data-value'));
    });

    star.addEventListener('mouseout', function () {
        updateStars(rating);
    });
});

function updateStars(rating) {
    stars.forEach(star => {
        if (star.getAttribute('data-value') <= rating) {
            star.classList.remove('bi-star');
            star.classList.add('bi-star-fill');
        } else {
            star.classList.remove('bi-star-fill');
            star.classList.add('bi-star');
        }
    });
}

// Handle form submission and store feedback in Firestore
document.querySelector('.feedback-form').addEventListener('submit', function (e) {
    e.preventDefault(); // Prevent page reload

    const comment = document.getElementById('comments').value;
    if (rating === 0) {
        alert("Please select a star rating.");
        return;
    }

    if (!instructorId) {
        alert("Instructor ID not available.");
        return;
    }

    if (!studentId) {
        alert("Student ID not available.");
        return;
    }

    // Store feedback in Firestore
    storeFeedbackInFirestore(studentId, instructorId, rating, comment);

    // Reset form
    document.querySelector('.feedback-form').reset();
    updateStars(0); // Reset stars

    // Hide feedback form and show rating container again
    document.querySelector('.feedback-form').style.display = 'none';
    document.querySelector('.rating-container').style.display = 'flex';
    document.querySelector('.left-info-header').style.display = 'block';

    // Alert user and refresh the ratings UI
    alert('Thank you for your feedback!');
    updateRatingUI(instructorId); // Refresh the ratings after feedback
});

// Ensure the 'Give Feedback' button is linked to the correct element in the DOM
document.getElementById('giveFeedbackBtn').addEventListener('click', function () {
    document.querySelector('.rating-container').style.display = 'none'; // Hide the ratings section
    document.querySelector('.left-info-header').style.display = 'none'; // Hide the header section
    document.querySelector('.feedback-form').style.display = 'block';  // Show the feedback form
});

// Handle closing of the feedback form when the close button is clicked
document.getElementById('closeFeedbackBtn').addEventListener('click', function () {
    document.querySelector('.feedback-form').style.display = 'none'; // Hide the feedback form
    document.querySelector('.rating-container').style.display = 'flex'; // Show the ratings section again
    document.querySelector('.left-info-header').style.display = 'block'; // Show the header section again
});

async function storeFeedbackInFirestore(studentId, instructorId, rating, comment) {
    try {
        const instructorRef = doc(db, 'instructors', instructorId);

        // Get current ratings and comments
        const docSnap = await getDoc(instructorRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            let ratingsArray = data.ratings || [0, 0, 0, 0, 0]; // Store counts for 1-5 stars
            let commentsArray = data.comments || []; // Array to store comments
            let totalRatings = data.totalRatings || 0;
            let currentAverage = data.rating || 0;

            // Update the corresponding rating index
            ratingsArray[rating - 1] += 1;  // Increment the selected rating

            // Add the new comment as an object
            const newComment = {
                studentId: studentId,
                comment: comment,
                timestamp: new Date().toISOString()  // Correct timestamp
            };
            commentsArray.push(newComment);

            // Recalculate the total ratings and new average
            totalRatings += 1;
            let totalScore = 0;
            for (let i = 0; i < ratingsArray.length; i++) {
                totalScore += ratingsArray[i] * (i + 1);
            }
            let newAverageRating = totalScore / totalRatings;

            // Update the instructor document
            await updateDoc(instructorRef, {
                ratings: ratingsArray,
                comments: commentsArray,
                totalRatings: totalRatings,
                rating: newAverageRating
            });

            // Refresh the UI with the updated ratings
            updateRatingUI(instructorId);

        } else {
            console.error("Instructor not found.");
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        alert('Error submitting feedback. Please try again later.');
    }
}

// Fetch and update the UI with the latest rating distribution
async function updateRatingUI(instructorId) {
    const instructorRef = doc(db, 'instructors', instructorId); // Use the correct instructor ID
    const docSnap = await getDoc(instructorRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        const ratingsData = data.ratings || [0, 0, 0, 0, 0]; // Array for 1-star to 5-stars
        const totalRatings = data.totalRatings || 0;

        document.getElementById('ratingTotal').textContent = `Based on ${totalRatings} ratings`;

        const starMapping = {
            1: ratingsData[0] || 0, // 1 star is stored at index 0
            2: ratingsData[1] || 0, // 2 stars are stored at index 1
            3: ratingsData[2] || 0, // 3 stars at index 2
            4: ratingsData[3] || 0, // 4 stars at index 3
            5: ratingsData[4] || 0  // 5 stars at index 4
        };

        // Display counts and percentages for each rating bar
        for (let i = 1; i <= 5; i++) {
            const count = starMapping[i];
            const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
            document.getElementById(`ratingBar${i}`).style.width = `${percentage}%`;
            document.getElementById(`ratingCount${i}`).textContent = count;
        }

        // Calculate the average rating using the hardcoded star mapping
        let weightedSum = 0;
        for (let i = 1; i <= 5; i++) {
            weightedSum += starMapping[i] * i; // Multiply stars by their corresponding index (1-5 stars)
        }

        const newAverageRating = totalRatings > 0 ? (weightedSum / totalRatings).toFixed(1) : '0.0';

        // Display the new average rating
        document.getElementById('ratingValue').textContent = newAverageRating;

        // Dynamically update the stars based on the new average rating
        updateStarsUI(newAverageRating);

        // Display comments section
        const commentsSection = document.getElementById('commentsSection');
        commentsSection.innerHTML = ''; // Clear existing comments
        const comments = data.comments || [];
        comments.forEach(commentObj => {
            const commentElement = document.createElement('div');
            commentElement.innerHTML = `
                <p><strong>Comment:</strong> ${commentObj.comment}</p>
                <p><em>Student ID:</em> ${commentObj.studentId}</p>
                <hr>`;
            commentsSection.appendChild(commentElement);
        });

    } else {
        console.log('Instructor data not found');
    }
}