$(document).ready(function() {
    let currentIndex = 0;
    const tilesPerPage = 1;
    const $tiles = $('.package-tiles');

    function showTiles(index) {
        $tiles.removeClass('active').hide();
        for (let i = index; i < index + tilesPerPage; i++) {
            $tiles.eq(i).addClass('active').show();
        }
        
        // Set the visibility of the arrow buttons based on the current index
        if (currentIndex === 0) {
            $('.left-arrow').css('visibility', 'hidden');
        } else {
            $('.left-arrow').css('visibility', 'visible');
        }

        if (currentIndex + tilesPerPage >= $tiles.length) {
            $('.right-arrow').css('visibility', 'hidden');
        } else {
            $('.right-arrow').css('visibility', 'visible');
        }
    }

    $('.right-arrow').click(function() {
        if (currentIndex + tilesPerPage < $tiles.length) {
            currentIndex += tilesPerPage;
            showTiles(currentIndex);
        }
    });

    $('.left-arrow').click(function() {
        if (currentIndex - tilesPerPage >= 0) {
            currentIndex -= tilesPerPage;
            showTiles(currentIndex);
        }
    });

    // Initialize the first set of tiles and update arrow buttons visibility
    showTiles(currentIndex);

    // Handle info button click
    $('.info').click(function() {
        $('#infoModal').modal('show');
    });

    // Handle close button click
    $('.modal .close').click(function() {
        $('#infoModal').modal('hide');
    });
});
