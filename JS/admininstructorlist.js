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
