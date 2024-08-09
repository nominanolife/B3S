document.addEventListener('DOMContentLoaded', function () {
    const addInstructorButton = document.querySelector('.add-instructor');
    const instructorModal = new bootstrap.Modal(document.getElementById('instructorModal'));

    addInstructorButton.addEventListener('click', function () {
        instructorModal.show();
    });

    const closeModalButton = document.querySelector('.close-modal');
    closeModalButton.addEventListener('click', function () {
        instructorModal.hide();
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.button-right');
    
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            buttons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
});