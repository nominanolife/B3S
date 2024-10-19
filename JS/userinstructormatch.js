import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

// Function to show loader
function showLoader() {
    document.getElementById('loader1').style.display = 'flex';
}

// Function to hide loader
function hideLoader() {
    document.getElementById('loader1').style.display = 'none';
}

$(document).ready(function () {
    // Initialize the popover for the wrapper (since the button is disabled)
    $('.feedback').popover({
        trigger: 'hover', // Automatically show popover on hover
        html: true,
        placement: 'top', // Adjust placement if needed
        content: 'The feedback will be available when the appointment is completed or after 24 hours of the appointment'
    });

    // Show the popover when hovering over the wrapper, but only if the button is disabled
    $('.feedback').on('mouseenter', function () {
        const feedbackButton = $('#giveFeedbackBtn');
        if (feedbackButton.is(':disabled')) {
            $(this).popover('show');
        }
    });

    // Hide the popover when the mouse leaves the wrapper
    $('.feedback').on('mouseleave', function () {
        $(this).popover('hide');
    });
});

// Listen to authentication state and fetch the match data once a user is logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        studentId = user.uid; // Assign the logged-in user's ID as the studentId
        fetchMatchAndInstructorData(studentId); // Call the function to fetch data
    } else {
        console.error('No user is logged in.');
        hideLoader(); // Hide loader if no user is logged in
    }
});

async function fetchMatchAndInstructorData(studentId) {
    try {
        // Show loader before starting the fetch operation
        showLoader();

        console.log("Fetching match for studentId:", studentId);

        // Fetch the match document from Firestore based on studentId
        const matchDoc = await getDoc(doc(db, 'matches', studentId));

        if (!matchDoc.exists()) {
            console.error(`Match not found for the given student ID: ${studentId}`);
            hideLoader(); // Hide loader if match is not found
            return;
        }

        // Extract the instructorId from the match
        const matchData = matchDoc.data();
        instructorId = matchData.instructorId;

        // Now fetch the instructor data using the instructorId
        const instructorDoc = await getDoc(doc(db, 'instructors', instructorId));

        if (!instructorDoc.exists()) {
            console.error(`Instructor not found for the given instructor ID: ${instructorId}`);
            hideLoader(); // Hide loader if instructor is not found
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

        // Dynamically update the traits section, splitting the traits into two columns if more than 7
        const traitsContainer = document.querySelector('.about-item');
        traitsContainer.innerHTML = ''; // Clear existing content

        const traits = instructorData.instructor_traits || [];

        if (traits.length > 0) {
            const column1 = document.createElement('div');
            const column2 = document.createElement('div');

            column1.classList.add('traits-column');
            column2.classList.add('traits-column');

            // Split the traits into two columns
            const firstSevenTraits = traits.slice(0, 7); // First 7 traits
            const remainingTraits = traits.slice(7); // Remaining traits

            firstSevenTraits.forEach((trait) => {
                const traitElement = document.createElement('span');
                traitElement.classList.add('traits');
                traitElement.innerHTML = `<i class="bi bi-check-circle"></i> ${trait}`;
                column1.appendChild(traitElement);
            });

            remainingTraits.forEach((trait) => {
                const traitElement = document.createElement('span');
                traitElement.classList.add('traits');
                traitElement.innerHTML = `<i class="bi bi-check-circle"></i> ${trait}`;
                column2.appendChild(traitElement);
            });

            // Append both columns to the traits container
            traitsContainer.appendChild(column1);
            if (remainingTraits.length > 0) {
                traitsContainer.appendChild(column2);
            }
        }

        // Update stars dynamically based on the average rating
        updateStarsUI(rating);

        // Display comments section (showing comments without needing to provide feedback)
        const commentsSection = document.getElementById('commentsSection');
        commentsSection.innerHTML = ''; // Clear existing comments
        const comments = instructorData.comments || []; // Ensure comments are an array

        // Check if there are any comments
        if (comments.length === 0) {
            // No comments, show a placeholder message
            const noCommentsElement = document.createElement('div');
            noCommentsElement.classList.add('no-comments');
            noCommentsElement.textContent = "No feedbacks yet";
            commentsSection.appendChild(noCommentsElement);
        } else {
            // Display each comment with its star rating, student number, and feedback date
            comments.forEach((commentObj, index) => {
                const commentElement = document.createElement('div');
                commentElement.classList.add('comment');

                // Add the rating stars next to the comment
                let starsHtml = '';
                for (let i = 0; i < commentObj.rating; i++) {
                    starsHtml += '<i class="bi bi-star-fill"></i>';
                }
                for (let i = commentObj.rating; i < 5; i++) {
                    starsHtml += '<i class="bi bi-star"></i>';
                }

                // Format the date from the timestamp
                const commentDate = new Date(commentObj.timestamp).toLocaleDateString();

                // Replace studentId with "Student X" and add the date
                commentElement.innerHTML = `
                    <div class="feedback-section">
                        <p>by Student ${index + 1} ${starsHtml}</p> 
                        <p class="feedback-date">(${commentDate})</p>
                    </div>
                    <span>${commentObj.comment}</span>
                    <hr>
                `;

                commentsSection.appendChild(commentElement);
            });
        }

        // Hide the loader once the data has been loaded successfully
        hideLoader();

    } catch (error) {
        console.error('Error fetching data:', error);
        showNotification('An error occurred while fetching data.');
        // Hide the loader in case of an error
        hideLoader();
    }
}

// Show the loader as soon as the page starts loading
document.addEventListener('DOMContentLoaded', showLoader);

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

    // Handle the case when the rating is 0
    if (averageRating === 0) {
        for (let i = 0; i < 5; i++) {
            const emptyStar = document.createElement('i');
            emptyStar.classList.add('bi', 'bi-star'); // Empty star icon
            starContainer.appendChild(emptyStar);
        }
        return; // Exit the function since the rating is 0
    }

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
document.querySelector('.feedback-form').addEventListener('submit', async function (e) {
    e.preventDefault(); // Prevent page reload

    const comment = document.getElementById('comments').value;

    // Ensure a rating is selected
    if (rating === 0) {
        showNotification("Please select a star rating.");
        return;
    }

    // Ensure instructorId and studentId are available
    if (!instructorId || !studentId) {
        showNotification("Instructor or Student ID not available.");
        return;
    }

    // Check if this student has already submitted feedback
    const instructorRef = doc(db, 'instructors', instructorId);
    const docSnap = await getDoc(instructorRef);

    if (docSnap.exists()) {
        const data = docSnap.data();

        // Store feedback if not already submitted
        await storeFeedbackInFirestore(studentId, instructorId, rating, comment);

        // Clear the form inputs
        document.getElementById('comments').value = '';
        rating = 0;
        updateStars(0); // Reset the stars UI

        // Hide feedback form and return to the ratings section
        document.querySelector('.feedback-form').style.display = 'none'; 
        document.querySelector('.rating-container').style.display = 'flex';
        document.querySelector('.left-info-header').style.display = 'block';

        // Show success modal
        showNotification("Feedback successfully added");

        // Fetch updated instructor data and refresh the UI
        await updateRatingUI(instructorId);
        window.location.href = 'userdashboard.html';

    } else {
        console.error("Instructor not found.");
    }
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

// Store feedback in Firestore and update UI instantly
async function storeFeedbackInFirestore(studentId, instructorId, rating, comment) {
    try {
        const instructorRef = doc(db, 'instructors', instructorId);
        const docSnap = await getDoc(instructorRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            let ratingsArray = data.ratings || [0, 0, 0, 0, 0]; // Store counts for 1-5 stars
            let commentsArray = data.comments || []; // Array to store comments
            let totalRatings = data.totalRatings || 0;

            // Update the corresponding rating index
            ratingsArray[rating - 1] += 1;  // Increment the selected rating

            // Add the new comment with the status 'completed'
            const newComment = {
                studentId: studentId,
                comment: comment,
                rating: rating,
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

            // Update the instructor document with the new ratings, comments, and completed status
            await updateDoc(instructorRef, {
                ratings: ratingsArray,
                comments: commentsArray,
                totalRatings: totalRatings,
                rating: newAverageRating,
            });

            // Instantly reflect the new comment in the comments section
            addCommentToUI(newComment, commentsArray.length);

            // Show success notification
            showNotification("Feedback successfully added");

            // Update match status to 'Completed' after feedback submission
            await completeMatch(studentId);  // Call the completeMatch function
        } else {
            console.error("Instructor not found.");
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showNotification('Error submitting feedback. Please try again later.');
    }
}

// Function to update match status to 'Completed'
async function completeMatch(studentId) {
    try {
        // Create a reference to the "matches" document for the student
        const matchRef = doc(db, 'matches', studentId);

        // Update the match status to "Completed"
        await updateDoc(matchRef, {
            'matchStatus': 'Completed'
        });

        console.log('Match status updated to Completed');
    } catch (error) {
        console.error('Error updating match status:', error);
    }
}


// Function to add the new comment directly to the UI
function addCommentToUI(commentObj, commentIndex) {
    const commentsSection = document.getElementById('commentsSection');
    
    // Remove "No feedbacks yet" if present
    const noCommentsElement = commentsSection.querySelector('.no-comments');
    if (noCommentsElement) {
        noCommentsElement.remove();
    }

    // Create a new comment element
    const commentElement = document.createElement('div');
    commentElement.classList.add('comment');
    
    // Add the rating stars next to the comment
    let starsHtml = '';
    for (let i = 0; i < commentObj.rating; i++) {
        starsHtml += '<i class="bi bi-star-fill"></i>';
    }
    for (let i = commentObj.rating; i < 5; i++) {
        starsHtml += '<i class="bi bi-star"></i>';
    }

    // Format the date from the timestamp
    const commentDate = new Date(commentObj.timestamp).toLocaleDateString();

    // Replace studentId with "Student X" and add the date
    commentElement.innerHTML = `
        <div class="feedback-section">
            <p>by Student ${commentIndex} ${starsHtml}</p> 
            <p class="feedback-date">(${commentDate})</p>
        </div>
        <span>${commentObj.comment}</span>
        <hr>
    `;

    // Append the new comment to the comments section
    commentsSection.appendChild(commentElement);
}

// Wait for the DOM to fully load before running any script
document.addEventListener('DOMContentLoaded', () => {
    // Disable the "Give Feedback" button initially
    const feedbackButton = document.getElementById('giveFeedbackBtn');
    feedbackButton.disabled = true;

    // Check authentication state and then check appointment progress
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('User is logged in:', user.uid);
            studentId = user.uid;
            checkAppointmentProgress(studentId);
        } else {
            console.error('No user is logged in.');
            hideLoader(); // Ensure the loader is hidden
        }
    });
});


async function checkAppointmentProgress(studentId) {
    const appointmentsRef = collection(db, 'appointments');
    const querySnapshot = await getDocs(appointmentsRef);

    const currentDate = new Date();
    let feedbackButtonEnabled = false;

    // Iterate over each document in the appointments collection
    for (const doc of querySnapshot.docs) {
        const appointmentData = doc.data();

        // Fetch the appointment date from the main document (not inside bookings array)
        const appointmentDate = new Date(appointmentData.date);  // Get the date outside bookings

        // Check if bookings is an array and contains valid data
        if (appointmentData.bookings && Array.isArray(appointmentData.bookings)) {
            for (const booking of appointmentData.bookings) {
                console.log('Checking booking:', booking);

                // Check if the booking matches the student ID and is completed
                if (booking.userId === studentId && booking.progress === "Completed") {
                    console.log('Appointment Date:', appointmentDate);

                    // Calculate the difference in time between current date and appointment date
                    const timeDifference = currentDate.getTime() - appointmentDate.getTime();
                    const daysDifference = timeDifference / (1000 * 3600 * 24);

                    // Enable feedback if appointment was within the last 24 hours
                    if (daysDifference <= 1) {
                        feedbackButtonEnabled = true;
                        console.log('Feedback button should be enabled');
                        break; // Stop further iteration once the condition is met
                    }
                }
            }
        }

        if (feedbackButtonEnabled) break; // Exit outer loop if feedback condition is met
    }

    // Update button status based on the condition
    const feedbackButton = document.getElementById('giveFeedbackBtn');
    feedbackButton.disabled = !feedbackButtonEnabled;

    if (!feedbackButtonEnabled) {
        console.log('Feedback button remains disabled');
    } else {
        console.log('Feedback button is enabled');
    }
}

// Fetch and update the UI with the latest rating distribution
async function updateRatingUI(instructorId) {
    const instructorRef = doc(db, 'instructors', instructorId);
    const docSnap = await getDoc(instructorRef);

    if (docSnap.exists()) {
        const instructorData = docSnap.data(); // Fetching the data
        const ratingsData = instructorData.ratings || [0, 0, 0, 0, 0]; // Using instructorData

        const totalRatings = instructorData.totalRatings || 0;

        document.getElementById('ratingTotal').textContent = `Based on ${totalRatings} ratings`;

        // Star mapping logic
        const starMapping = {
            1: ratingsData[0] || 0,
            2: ratingsData[1] || 0,
            3: ratingsData[2] || 0,
            4: ratingsData[3] || 0,
            5: ratingsData[4] || 0
        };

        // Update rating bars and counts
        for (let i = 1; i <= 5; i++) {
            const count = starMapping[i];
            const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
            document.getElementById(`ratingBar${i}`).style.width = `${percentage}%`;
            document.getElementById(`ratingCount${i}`).textContent = count;
        }

        // Update stars dynamically
        let weightedSum = 0;
        for (let i = 1; i <= 5; i++) {
            weightedSum += starMapping[i] * i;
        }
        const newAverageRating = totalRatings > 0 ? (weightedSum / totalRatings).toFixed(1) : '0.0';
        document.getElementById('ratingValue').textContent = newAverageRating;

        // Update stars UI
        updateStarsUI(newAverageRating);
    } else {
        console.error('Instructor data not found');
    }
}




function showNotification(message) {
    document.getElementById('notificationMessage').textContent = message;
    $('#notificationModal').modal('show');
}