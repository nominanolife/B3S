// Show the feedback form when the "Give Feedback" button is clicked
document.getElementById('giveFeedbackBtn').addEventListener('click', function () {
    // Hide the current left-info content
    document.querySelector('.rating-container').style.display = 'none';
    document.querySelector('.left-info-header').style.display = 'none';

    // Show the feedback form
    document.querySelector('.feedback-form').style.display = 'block';
});

// Show the left-info content again when the "Close Feedback" button is clicked
document.getElementById('closeFeedbackBtn').addEventListener('click', function () {
    // Hide the feedback form
    document.querySelector('.feedback-form').style.display = 'none';

    // Show the left-info content
    document.querySelector('.rating-container').style.display = 'flex';
    document.querySelector('.left-info-header').style.display = 'block';
});

// Handle star rating click
const stars = document.querySelectorAll('.stars-rating i');
let rating = 0;

stars.forEach(star => {
    star.addEventListener('click', function() {
        rating = this.getAttribute('data-value');
        updateStars(rating);
    });

    star.addEventListener('mouseover', function() {
        updateStars(this.getAttribute('data-value'));
    });

    star.addEventListener('mouseout', function() {
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
