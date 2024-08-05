const firebaseConfig = {
    apiKey: "AIzaSyBflGD3TVFhlOeUBUPaX3uJTuB-KEgd0ow",
    authDomain: "authentication-d6496.firebaseapp.com",
    projectId: "authentication-d6496",
    storageBucket: "authentication-d6496.appspot.com",
    messagingSenderId: "195867894399",
    appId: "1:195867894399:web:596fb109d308aea8b6154a"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Function to fetch and display applicants
async function fetchApplicants() {
    const contentElement = document.querySelector('.applicant-list');

    try {
        const querySnapshot = await db.collection('applicants').get();
        let applicantsHTML = '';

        querySnapshot.forEach((doc) => {
            const applicant = doc.data();
            if (applicant.role === 'applicant') {
                const personalInfo = applicant.personalInfo;
                const firstName = personalInfo ? personalInfo.first : 'N/A';
                const lastName = personalInfo ? personalInfo.last : 'N/A';

                applicantsHTML += `
                <tr class="table-row">
                    <td class="table-row-content">${firstName} ${lastName}</td>
                    <td class="table-row-content">${applicant.email}</td>
                    <td class="table-row-content">${applicant.phoneNumber}</td>
                    <td class="table-row-content"><i class="bi bi-three-dots"></i></td>
                </tr>
                `;
            }
        });

        contentElement.innerHTML = applicantsHTML;

    } catch (error) {
        console.error("Error fetching applicants: ", error);
    }
}

// Call the function to fetch and display applicants
fetchApplicants();