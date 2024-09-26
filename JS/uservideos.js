document.getElementById('toggle-button').addEventListener('click', function () {
    const lessonList = document.querySelector('.lesson-list');
    const toggleButtonIcon = document.getElementById('toggle-button');

    if (!lessonList.classList.contains('show')) {
        lessonList.classList.add('show');
        toggleButtonIcon.classList.remove('bi-chevron-left');
        toggleButtonIcon.classList.add('bi-chevron-right');
    } else {
        lessonList.classList.remove('show');
        toggleButtonIcon.classList.remove('bi-chevron-right');
        toggleButtonIcon.classList.add('bi-chevron-left');
    }
});

// Toggle for chat content
document.getElementById('toggle-chat').addEventListener('click', function () {
    const chatContent = document.querySelector('.chat-content');
    const toggleChatIcon = document.getElementById('toggle-chat');

    if (!chatContent.classList.contains('show')) {
        chatContent.classList.add('show');
        toggleChatIcon.classList.remove('bi-chevron-up');
        toggleChatIcon.classList.add('bi-chevron-down');
    } else {
        chatContent.classList.remove('show');
        toggleChatIcon.classList.remove('bi-chevron-down');
        toggleChatIcon.classList.add('bi-chevron-up');
    }
});