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
