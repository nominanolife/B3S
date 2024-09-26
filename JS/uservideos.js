document.getElementById('toggle-button').addEventListener('click', function () {
    const lessonList = document.querySelector('.lesson-list');
    const toggleButtonIcon = document.getElementById('toggle-button');

    // Check if the lesson list is currently shown or hidden
    if (!lessonList.classList.contains('show')) {
        lessonList.classList.add('show'); // Show the lesson list
        toggleButtonIcon.classList.remove('bi-chevron-left'); // Change to right icon
        toggleButtonIcon.classList.add('bi-chevron-right');
    } else {
        lessonList.classList.remove('show'); // Hide the lesson list
        toggleButtonIcon.classList.remove('bi-chevron-right'); // Change to left icon
        toggleButtonIcon.classList.add('bi-chevron-left');
    }
});