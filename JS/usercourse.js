$(document).ready(function() {
    let currentIndex = 0;
    const tilesPerPage = 1;
    const $packageContainer = $('.package-container');

    function renderPackages(packages) {
        $packageContainer.empty();
        packages.forEach(pkg => {
            const packageHtml = `
                <div class="package-tiles">
                    <button class="info" type="button" id="infoButton"><i class="bi bi-info-circle"></i></button>
                    <form class="package-body">
                        <div class="package-text">
                            <h2>${pkg.title}</h2>
                            <span>Tuition Fee: &#8369;${pkg.fee}</span>
                            <h3>${pkg.description}</h3>
                        </div>
                        <div class="package-footer">
                            <button class="enroll-now-button" type="submit">Enroll Now</button>
                        </div>
                    </form>
                </div>`;
            $packageContainer.append(packageHtml);
        });
        showTiles(currentIndex);
    }

    function showTiles(index) {
        $('.package-tiles').removeClass('active').hide();
        $('.package-tiles').slice(index, index + tilesPerPage).addClass('active').show();
        
        $('.left-arrow').css('visibility', currentIndex === 0 ? 'hidden' : 'visible');
        $('.right-arrow').css('visibility', currentIndex + tilesPerPage >= packages.length ? 'hidden' : 'visible');
    }

    $('.right-arrow').click(function() {
        if (currentIndex + tilesPerPage < packages.length) {
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
    renderPackages(packages);

    // Handle info button click
    $(document).on('click', '.info', function() {
        $('#infoModal').modal('show');
    });

    // Handle close button click
    $('.modal .close').click(function() {
        $('#infoModal').modal('hide');
    });
});
