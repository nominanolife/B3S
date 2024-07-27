// Initialize AOS
AOS.init();

// Redirect function for login options
function redirectToLogin(page) {
    window.location.href = page;
}

// Redirecting to Registration page
document.addEventListener('DOMContentLoaded', function() {
    var registerButton = document.getElementById('registerButton');
    registerButton.addEventListener('click', function() {
        redirectToLogin('reg.html');
    });
});

// Show login modal on button click
document.addEventListener('DOMContentLoaded', function() {
    var loginButton = document.getElementById('loginButton');
    loginButton.addEventListener('click', function() {
        $('#loginModal').modal('show');
    });
});

// Event listeners for buttons
document.getElementById('enrollNowBtn').addEventListener('click', function() {
    this.classList.toggle('hover');
});

document.getElementById('signUpBtn').addEventListener('click', function() {
    this.classList.toggle('hover');
});

// Pause and reset video on modal hide
$('#videoModal').on('hidden.bs.modal', function () {
    var video = document.getElementById('modalVideo');
    video.pause();
    video.currentTime = 0;
});

// Function to highlight active nav link
document.addEventListener('DOMContentLoaded', function() {
    const sections = document.querySelectorAll('#home, #about, #courses, #contact');
    const navLinks = document.querySelectorAll('.navbar-nav a');

    window.addEventListener('scroll', function() {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= sectionTop - sectionHeight / 3) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(a => {
            a.classList.remove('active');
            if (a.getAttribute('href') === '#' + current) {
                a.classList.add('active');
            }
        });
    });
});



