// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, limit, startAfter, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

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
const db = getFirestore(app); // Firestore instance

let currentPage = 1;
let totalPages = 1;
const itemsPerPage = 10; // Limit of 10 students per page
let lastVisibleStudent = null; // Keep track of the last fetched document for pagination
const paginationControls = document.querySelector('.pagination-controls'); // Ensure this points to the correct element

// Fetch students who have a match, with pagination
async function fetchMatchedStudents() {
    const matchesRef = collection(db, 'matches');
    let q = query(matchesRef, where('matchStatus', '==', 'In Progress'), limit(itemsPerPage)); // Limit to 10 students

    if (lastVisibleStudent) {
        q = query(matchesRef, where('matchStatus', '==', 'In Progress'), startAfter(lastVisibleStudent), limit(itemsPerPage));
    }

    try {
        const querySnapshot = await getDocs(q);
        const students = [];

        querySnapshot.forEach((doc) => {
            const matchData = doc.data();
            students.push({
                studentId: doc.id,
                instructorId: matchData.instructorId,
                matchedAt: matchData.matchedAt
            });
        });

        // Update the last visible document for pagination
        lastVisibleStudent = querySnapshot.docs[querySnapshot.docs.length - 1];
        return students;

    } catch (error) {
        console.error('Error fetching students with matches:', error);
    }
}

// Fetch student name and instructor name from Firestore
async function fetchStudentAndInstructorDetails(studentId, instructorId) {
    try {
        // Fetch student details from the 'applicants' collection
        const studentDocRef = doc(db, 'applicants', studentId);
        const studentDoc = await getDoc(studentDocRef);
        let studentName = 'Unknown Student';
        if (studentDoc.exists()) {
            const studentData = studentDoc.data();
            studentName = `${studentData.personalInfo.first} ${studentData.personalInfo.last}`;
        }

        // Fetch instructor details from the 'instructors' collection
        const instructorDocRef = doc(db, 'instructors', instructorId);
        const instructorDoc = await getDoc(instructorDocRef);
        let instructorName = 'Unknown Instructor';
        if (instructorDoc.exists()) {
            instructorName = instructorDoc.data().name;
        }

        // Return both student and instructor names
        return { studentName, instructorName };
    } catch (error) {
        console.error('Error fetching student or instructor details:', error);
    }
}

// Fetch course data and appointment date for the student based on the 'bookings' array, excluding completed status
async function fetchCourseAndAppointmentDateForStudent(studentId) {
    try {
        const appointmentsRef = collection(db, 'appointments');
        const q = query(appointmentsRef);  // Query all documents in appointments
        const querySnapshot = await getDocs(q);

        let course = 'Unknown Course'; // Default course if none is found
        let appointmentDate = 'No Date';  // Default if no appointment is found

        // Iterate through all appointments and find the booking matching the studentId
        querySnapshot.forEach((doc) => {
            const appointmentData = doc.data();

            // Check if the bookings array exists and is not empty
            if (appointmentData.bookings && Array.isArray(appointmentData.bookings)) {
                const bookings = appointmentData.bookings;

                // Check each booking in the array for the correct studentId
                bookings.forEach((booking) => {
                    if (booking.userId === studentId && booking.progress !== 'Completed') {
                        course = appointmentData.course || 'Unknown Course';  // Get the course
                        appointmentDate = new Date(appointmentData.date).toLocaleDateString();  // Get the appointment date
                    }
                });
            }
        });

        return { course, appointmentDate };  // Return both course and appointment date
    } catch (error) {
        console.error('Error fetching course and appointment date for student:', error);
        return { course: 'Error Fetching Course', appointmentDate: 'Error Fetching Date' };  // Return error if something goes wrong
    }
}

// Render the list of students with their match details
async function renderStudents(students) {
    const studentListContainer = document.querySelector('.student-list');
    studentListContainer.innerHTML = ''; // Clear any existing data

    for (let student of students) {
        const { studentId, instructorId, matchedAt } = student;
        const { studentName, instructorName } = await fetchStudentAndInstructorDetails(studentId, instructorId);
        const { course, appointmentDate } = await fetchCourseAndAppointmentDateForStudent(studentId);  // Fetch course and appointment date

        const studentRow = `
            <tr>
                <td>${studentName}</td>
                <td>${instructorName}</td>
                <td>${course}</td>
                <td>${new Date(matchedAt.seconds * 1000).toLocaleDateString()}</td>
                <td>${appointmentDate}</td>  <!-- Add appointment date here -->
                <td>
                    <button class="btn custom-btn" data-student-id="${studentId}" data-instructor-id="${instructorId}">See Instructor</button>
                </td>
            </tr>
        `;
        studentListContainer.innerHTML += studentRow;
    }

    // Attach event listeners for the "See Instructor" buttons
    document.querySelectorAll('.custom-btn').forEach(function(button) {
        button.addEventListener('click', async function() {
            const studentId = this.getAttribute('data-student-id');
            const currentInstructorId = this.getAttribute('data-instructor-id');
            await showInstructorList(studentId, currentInstructorId);  // Show the instructor list for reassignment
        });
    });
}

// Fetch and show available instructors (excluding current instructor)
async function showInstructorList(studentId, currentInstructorId) {
    const { course } = await fetchCourseAndAppointmentDateForStudent(studentId);  // Fetch course dynamically
    const instructors = await fetchInstructorsForCourse(course, currentInstructorId); // Exclude current instructor

    // Populate the modal with instructor data and allow reassignment
    renderInstructors(instructors, studentId);
    $('#assigninstructormodal').modal('show'); // Show the modal
}

// Firestore update for instructor reassignment
async function reassignInstructor(studentId, newInstructorId) {
    try {
        const matchRef = doc(db, 'matches', studentId);
        await updateDoc(matchRef, {
            'instructorId': newInstructorId,
            'matchedAt': new Date(),
            'matchStatus': 'In Progress'
        });

        console.log('Instructor successfully reassigned!');
        alert('Instructor successfully reassigned!');
    } catch (error) {
        console.error('Error reassigning instructor:', error);
        alert('An error occurred while reassigning the instructor. Please try again.');
    }
}

// Fetch instructors based on course for reassignment, excluding the current matched instructor
async function fetchInstructorsForCourse(course, currentInstructorId) {
    const instructorsRef = collection(db, 'instructors');
    let q = query(instructorsRef, where('courses', 'array-contains', course), where('active', '==', true));

    try {
        const querySnapshot = await getDocs(q);
        const instructors = [];

        querySnapshot.forEach((doc) => {
            const instructorData = doc.data();
            
            // Exclude the current matched instructor from the list
            if (doc.id !== currentInstructorId) {  // Ensure the current instructor is excluded
                instructors.push({
                    id: doc.id,
                    name: instructorData.name,
                    courses: instructorData.courses || [],
                    traits: instructorData.instructor_traits || []
                });
            }
        });

        return instructors;

    } catch (error) {
        console.error('Error fetching instructors:', error);
    }
}

// Render instructor list in the modal
function renderInstructors(instructors, studentId) {
    const instructorListContainer = document.querySelector('.instructor-list'); // Ensure class name matches
    instructorListContainer.innerHTML = ''; // Clear any existing data

    instructors.forEach(instructor => {
        const courses = Array.isArray(instructor.courses) ? instructor.courses.join(', ') : 'Unknown Course';

        const instructorRow = `
            <tr>
                <td>${instructor.name}</td>
                <td>${courses}</td>
                <td>
                    <i class="bi bi-info-circle"
                    data-toggle="popover"
                    data-html="true"
                    data-trigger="hover"
                    data-placement="top"
                    data-content="${instructor.traits.join(', ')}">
                    </i>
                </td>
                <td>
                    <button class="btn custom-btn" data-instructor-id="${instructor.id}" data-student-id="${studentId}">Reassign</button>
                </td>
            </tr>
        `;
        instructorListContainer.innerHTML += instructorRow;
    });

    // Reattach popovers after dynamic rendering
    $('[data-toggle="popover"]').popover();

    // Attach event listeners for the "Reassign" buttons
    document.querySelectorAll('.custom-btn').forEach(function(button) {
        button.addEventListener('click', async function() {
            const newInstructorId = this.getAttribute('data-instructor-id');
            const studentId = this.getAttribute('data-student-id');
            await reassignInstructor(studentId, newInstructorId);  // Call the reassignment function
        });
    });
}
// Pagination controls
function updatePaginationControls() {
    paginationControls.innerHTML = '';

    // Previous button
    const prevButton = document.createElement('i');
    prevButton.className = 'bi bi-caret-left';
    if (currentPage === 1) {
        prevButton.classList.add('disabled');
    }
    prevButton.addEventListener('click', async () => {
        if (currentPage > 1) {
            currentPage--;
            lastVisibleStudent = null;  // Reset lastVisibleStudent for fetching previous pages
            await loadMatchedStudents();
        }
    });

    // Next button
    const nextButton = document.createElement('i');
    nextButton.className = 'bi bi-caret-right';
    if (currentPage === totalPages) {
        nextButton.classList.add('disabled');
    }
    nextButton.addEventListener('click', async () => {
        if (currentPage < totalPages) {
            currentPage++;
            await loadMatchedStudents();
        }
    });

    // Page number display
    const pageNumberDisplay = document.createElement('span');
    pageNumberDisplay.className = 'page-number';
    pageNumberDisplay.textContent = `Page ${currentPage} of ${totalPages}`;

    paginationControls.appendChild(prevButton);
    paginationControls.appendChild(pageNumberDisplay);
    paginationControls.appendChild(nextButton);
}

// Function to load students with matches and update pagination controls
async function loadMatchedStudents() {
    const students = await fetchMatchedStudents();
    await renderStudents(students);
    updatePaginationControls();
}

// Initialize pagination and fetching on page load
document.addEventListener('DOMContentLoaded', function() {
    loadMatchedStudents();  // Load the first page of students
});
