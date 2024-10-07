document.addEventListener('DOMContentLoaded', function() {
    // Attach click event listener to each "Switch Instructor" button
    document.querySelectorAll('.switch-instructor').forEach(function(item) {
        item.addEventListener('click', function() {
            // Open the modal (optional, if you want to control it manually)
            $('#assigninstructormodal').modal('show');
        });
    });
});