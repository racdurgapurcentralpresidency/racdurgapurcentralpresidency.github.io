// =========================================================
// RAC DCP WEBSITE
// JAVASCRIPT
// =========================================================


// =========================================================
// 1. MOBILE NAVIGATION
// =========================================================

const menuToggle = document.querySelector(".menu-toggle");
const navMenu = document.querySelector(".nav-menu");

if (menuToggle && navMenu) {

    menuToggle.addEventListener("click", function () {

        navMenu.classList.toggle("active");

        if (navMenu.classList.contains("active")) {
            menuToggle.textContent = "✕";
        } else {
            menuToggle.textContent = "☰";
        }

    });


    // Close mobile menu after clicking a navigation link

    const navLinks = navMenu.querySelectorAll("a");

    navLinks.forEach(function (link) {

        link.addEventListener("click", function () {

            navMenu.classList.remove("active");

            menuToggle.textContent = "☰";

        });

    });

}


// =========================================================
// 2. ANIMATED IMPACT COUNTERS
// =========================================================

const counters = document.querySelectorAll(".impact-number");

const counterObserver = new IntersectionObserver(

    function (entries, observer) {

        entries.forEach(function (entry) {

            if (!entry.isIntersecting) {
                return;
            }

            const counter = entry.target;

            const target =
                parseInt(counter.getAttribute("data-target"));

            let current = 0;

            const duration = 1500;

            const startTime = performance.now();


            function updateCounter(currentTime) {

                const elapsed = currentTime - startTime;

                const progress =
                    Math.min(elapsed / duration, 1);


                // Smooth easing

                const easedProgress =
                    1 - Math.pow(1 - progress, 3);


                current =
                    Math.floor(target * easedProgress);


                counter.textContent =
                    current.toLocaleString();


                if (progress < 1) {

                    requestAnimationFrame(updateCounter);

                } else {

                    counter.textContent =
                        target.toLocaleString();

                }

            }


            requestAnimationFrame(updateCounter);

            observer.unobserve(counter);

        });

    },

    {
        threshold: 0.5
    }

);


counters.forEach(function (counter) {

    counterObserver.observe(counter);

});


// =========================================================
// 3. SCROLL REVEAL ANIMATION
// =========================================================

const revealElements = document.querySelectorAll(
    ".project-card, .achievement-card, " +
    ".contact-card, .event-card, .publication-card"
);


revealElements.forEach(function (element) {

    element.style.opacity = "0";

    element.style.transform = "translateY(25px)";

    element.style.transition =
        "opacity 0.6s ease, transform 0.6s ease";

});


const revealObserver = new IntersectionObserver(

    function (entries, observer) {

        entries.forEach(function (entry) {

            if (!entry.isIntersecting) {
                return;
            }

            entry.target.style.opacity = "1";

            entry.target.style.transform =
                "translateY(0)";

            observer.unobserve(entry.target);

        });

    },

    {
        threshold: 0.12
    }

);


revealElements.forEach(function (element) {

    revealObserver.observe(element);

});


// =========================================================
// 4. CURRENT YEAR IN FOOTER
// =========================================================

const footerYear =
    document.querySelector(".footer-bottom p");

if (footerYear) {

    const currentYear =
        new Date().getFullYear();

    footerYear.innerHTML =
        footerYear.innerHTML.replace(
            "2026",
            currentYear
        );

}


// =========================================================
// 5. NAVBAR SHADOW ON SCROLL
// =========================================================

const navbar =
    document.querySelector(".navbar");


window.addEventListener("scroll", function () {

    if (!navbar) {
        return;
    }

    if (window.scrollY > 20) {

        navbar.style.boxShadow =
            "0 8px 25px rgba(0, 0, 0, 0.08)";

    } else {

        navbar.style.boxShadow = "none";

    }

});

// =========================================================
// 6. GALLERY FILTERS
// =========================================================

const galleryFilters =
    document.querySelectorAll(".gallery-filter");

const galleryItems =
    document.querySelectorAll(".gallery-item");


galleryFilters.forEach(function (filterButton) {

    filterButton.addEventListener("click", function () {

        const filter =
            filterButton.getAttribute("data-filter");


        // Update active button

        galleryFilters.forEach(function (button) {

            button.classList.remove("active");

        });

        filterButton.classList.add("active");


        // Filter gallery items

        galleryItems.forEach(function (item) {

            if (
                filter === "all" ||
                item.classList.contains(filter)
            ) {

                item.classList.remove("hidden");

            } else {

                item.classList.add("hidden");

            }

        });

    });

});


// =========================================================
// 7. GALLERY LIGHTBOX
// =========================================================

const lightbox = document.createElement("div");

lightbox.className = "gallery-lightbox";

lightbox.innerHTML = `
    <button class="lightbox-close" type="button" aria-label="Close">
        &times;
    </button>

    <button class="lightbox-prev" type="button" aria-label="Previous">
        &#10094;
    </button>

    <div class="lightbox-content">
        <img src="" alt="">
    </div>

    <button class="lightbox-next" type="button" aria-label="Next">
        &#10095;
    </button>
`;

document.body.appendChild(lightbox);


const lightboxImage =
    lightbox.querySelector(".lightbox-content img");

const lightboxClose =
    lightbox.querySelector(".lightbox-close");

const lightboxPrev =
    lightbox.querySelector(".lightbox-prev");

const lightboxNext =
    lightbox.querySelector(".lightbox-next");


let currentGalleryIndex = 0;


// =========================================================
// GET VISIBLE GALLERY ITEMS
// =========================================================

function getVisibleGalleryItems() {

    return Array.from(
        document.querySelectorAll(".gallery-item:not(.hidden)")
    );

}


// =========================================================
// SHOW IMAGE
// =========================================================

function showLightboxImage(index) {

    const visibleItems =
        getVisibleGalleryItems();

    if (!visibleItems.length) {
        return;
    }

    currentGalleryIndex = index;

    const image =
        visibleItems[currentGalleryIndex]
            .querySelector("img");

    if (!image) {
        return;
    }

    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;

}


// =========================================================
// OPEN LIGHTBOX
// =========================================================

function openLightbox(index) {

    showLightboxImage(index);

    lightbox.classList.add("active");

    document.body.classList.add("lightbox-open");

}


// =========================================================
// CLOSE LIGHTBOX
// =========================================================

function closeLightbox() {

    lightbox.classList.remove("active");

    document.body.classList.remove("lightbox-open");

}


// =========================================================
// PREVIOUS IMAGE
// =========================================================

function showPreviousImage() {

    const visibleItems =
        getVisibleGalleryItems();

    if (!visibleItems.length) {
        return;
    }

    currentGalleryIndex =
        (
            currentGalleryIndex -
            1 +
            visibleItems.length
        ) %
        visibleItems.length;

    showLightboxImage(currentGalleryIndex);

}


// =========================================================
// NEXT IMAGE
// =========================================================

function showNextImage() {

    const visibleItems =
        getVisibleGalleryItems();

    if (!visibleItems.length) {
        return;
    }

    currentGalleryIndex =
        (
            currentGalleryIndex +
            1
        ) %
        visibleItems.length;

    showLightboxImage(currentGalleryIndex);

}


// =========================================================
// CLICK GALLERY IMAGE
// =========================================================

document.querySelectorAll(".gallery-item").forEach(
    function (item, index) {

        item.addEventListener("click", function () {

            const visibleItems =
                getVisibleGalleryItems();

            const visibleIndex =
                visibleItems.indexOf(item);

            if (visibleIndex !== -1) {

                openLightbox(visibleIndex);

            }

        });

    }
);


// =========================================================
// BUTTON CONTROLS
// =========================================================

lightboxClose.addEventListener(
    "click",
    function (event) {

        event.stopPropagation();

        closeLightbox();

    }
);


lightboxPrev.addEventListener(
    "click",
    function (event) {

        event.stopPropagation();

        showPreviousImage();

    }
);


lightboxNext.addEventListener(
    "click",
    function (event) {

        event.stopPropagation();

        showNextImage();

    }
);


// =========================================================
// CLICK BACKGROUND TO CLOSE
// =========================================================

lightbox.addEventListener(
    "click",
    function (event) {

        if (event.target === lightbox) {

            closeLightbox();

        }

    }
);


// =========================================================
// KEYBOARD CONTROLS
// =========================================================

document.addEventListener(
    "keydown",
    function (event) {

        if (!lightbox.classList.contains("active")) {
            return;
        }

        if (event.key === "Escape") {

            closeLightbox();

        }

        if (event.key === "ArrowLeft") {

            showPreviousImage();

        }

        if (event.key === "ArrowRight") {

            showNextImage();

        }

    }
);
// =========================================================
// 8. ACHIEVEMENT LIGHTBOX
// =========================================================

const achievementImages =
    document.querySelectorAll(".achievement-image img");


const achievementLightbox =
    document.createElement("div");

achievementLightbox.className =
    "achievement-lightbox";


achievementLightbox.innerHTML = `
    <button
        class="achievement-lightbox-close"
        type="button"
        aria-label="Close">
        &times;
    </button>

    <div class="achievement-lightbox-content">
        <img src="" alt="">
    </div>
`;


document.body.appendChild(achievementLightbox);


const achievementLightboxImage =
    achievementLightbox.querySelector(
        ".achievement-lightbox-content img"
    );


const achievementLightboxClose =
    achievementLightbox.querySelector(
        ".achievement-lightbox-close"
    );


// =========================================================
// OPEN ACHIEVEMENT LIGHTBOX
// =========================================================

achievementImages.forEach(function (image) {

    image.addEventListener("click", function () {

        achievementLightboxImage.src =
            image.src;

        achievementLightboxImage.alt =
            image.alt;

        achievementLightbox.classList.add("active");

        document.body.classList.add("lightbox-open");

    });

});


// =========================================================
// CLOSE
// =========================================================

achievementLightboxClose.addEventListener(
    "click",
    function (event) {

        event.stopPropagation();

        achievementLightbox.classList.remove("active");

        document.body.classList.remove("lightbox-open");

    }
);


// =========================================================
// CLICK BACKGROUND TO CLOSE
// =========================================================

achievementLightbox.addEventListener(
    "click",
    function (event) {

        if (event.target === achievementLightbox) {

            achievementLightbox.classList.remove("active");

            document.body.classList.remove("lightbox-open");

        }

    }
);


// =========================================================
// ESCAPE KEY
// =========================================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            !achievementLightbox.classList.contains("active")
        ) {
            return;
        }

        if (event.key === "Escape") {

            achievementLightbox.classList.remove("active");

            document.body.classList.remove("lightbox-open");

        }

    }
);
function showPeople(categoryId, button) {

    document.querySelectorAll('.people-display').forEach(function(display) {
        display.classList.remove('active');
    });

    document.querySelectorAll('.people-category').forEach(function(category) {
        category.classList.remove('active');
    });

    const selectedDisplay = document.getElementById(categoryId);

    if (selectedDisplay) {
        selectedDisplay.classList.add('active');
    }

    if (button) {
        button.classList.add('active');
    }
}
function toggleNotifications() {
    const panel = document.getElementById("notificationPanel");

    if (!panel) return;

    panel.classList.toggle("active");
}
