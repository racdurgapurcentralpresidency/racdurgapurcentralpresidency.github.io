// =========================================================
// RAC DCP WEBSITE
// JAVASCRIPT
// =========================================================


// =========================================================
// 0. CINEMATIC 0-100% PRELOADER & INTRO SCREEN
// =========================================================

(function initSitePreloader() {
    const preloader = document.getElementById("sitePreloader");
    const preloaderNumber = document.getElementById("preloaderNumber");
    const preloaderBar = document.getElementById("preloaderBar");
    const preloaderStatus = document.getElementById("preloaderStatus");

    if (!preloader || !preloaderNumber || !preloaderBar) {
        document.body.classList.remove("preloader-active");
        return;
    }

    // Accessibility: instantly dismiss if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        preloader.style.display = "none";
        document.body.classList.remove("preloader-active");
        return;
    }

    let isCompleted = false;
    const duration = 1350; // Total duration in ms (~1.35 seconds: snappy & energetic)
    const startTime = performance.now();

    function finishPreloader() {
        if (isCompleted) return;
        isCompleted = true;

        preloaderNumber.textContent = "100";
        preloaderBar.style.width = "100%";
        if (preloaderStatus) preloaderStatus.textContent = "WELCOME TO RAC DCP";

        setTimeout(function () {
            preloader.classList.add("loaded");
            document.body.classList.remove("preloader-active");

            // Clean up after curtain transition finishes
            setTimeout(function () {
                preloader.style.display = "none";
            }, 900);
        }, 160);
    }

    function step(timestamp) {
        if (isCompleted) return;
        const elapsed = timestamp - startTime;
        const t = Math.min(elapsed / duration, 1);

        // Smooth cubic ease-out acceleration: starts fast, accelerates, lands firmly at 100
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const currentCount = Math.min(Math.round(eased * 100), 100);

        preloaderNumber.textContent = currentCount;
        preloaderBar.style.width = currentCount + "%";
        preloader.setAttribute("aria-valuenow", currentCount);

        // Dynamic status milestones
        if (preloaderStatus) {
            if (currentCount < 30) {
                preloaderStatus.textContent = "INITIALIZING EXPERIENCE...";
            } else if (currentCount < 70) {
                preloaderStatus.textContent = "COMMUNITY • LEADERSHIP • ACTION...";
            } else if (currentCount < 100) {
                preloaderStatus.textContent = "READY FOR ACTION...";
            }
        }

        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            finishPreloader();
        }
    }

    requestAnimationFrame(step);

    // Hard fail-safe timeout in case frame scheduling gets throttled
    setTimeout(finishPreloader, 2200);
})();


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
// 1.1 GREEN REBEL HERO STATEMENT ROTATOR
// =========================================================

(function initHeroStatementRotator() {
    const carousel = document.getElementById("heroCarousel");
    if (!carousel) return;

    const slides = carousel.querySelectorAll(".hero-slide");
    const dots = carousel.querySelectorAll(".carousel-dot");
    if (!slides.length || !dots.length) return;

    let currentSlide = 0;
    let slideTimer = null;
    let isUserPaused = false;

    function goToSlide(index) {
        if (index < 0 || index >= slides.length) return;

        slides.forEach(function (slide, i) {
            if (i === index) {
                slide.classList.add("active");
            } else {
                slide.classList.remove("active");
            }
        });

        dots.forEach(function (dot, i) {
            if (i === index) {
                dot.classList.add("active");
            } else {
                dot.classList.remove("active");
            }
        });

        currentSlide = index;
    }

    function nextSlide() {
        if (isUserPaused) return;
        const next = (currentSlide + 1) % slides.length;
        goToSlide(next);
    }

    function startTimer() {
        clearInterval(slideTimer);
        slideTimer = setInterval(nextSlide, 3500);
    }

    // Interactive dot clicks
    dots.forEach(function (dot) {
        dot.addEventListener("click", function (e) {
            e.stopPropagation();
            const index = parseInt(dot.getAttribute("data-index"), 10);
            goToSlide(index);
            startTimer();
        });
    });

    // Pause on hover over entire carousel or indicator dots
    carousel.addEventListener("mouseenter", function () {
        isUserPaused = true;
    });
    carousel.addEventListener("mouseleave", function () {
        isUserPaused = false;
    });

    startTimer();
})();


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


if (!(window.MOTION3D && window.MOTION3D.enabled)) {          // motion.js owns the impact counters (odometer)
    counters.forEach(function (counter) {

        counterObserver.observe(counter);

    });
}


// =========================================================
// 3. 3D SCROLL REVEAL ANIMATION (STAGGERED PERSPECTIVE)
// =========================================================

const revealElements = document.querySelectorAll(
    (window.MOTION3D && window.MOTION3D.enabled)
        ? ".motion-owns-reveals"      // motion.js reveals these itself
        : ".section-heading, .project-card, .board-card, .achievement-card, " +
          ".contact-card, .event-card, .publication-card, .impact-card, .website-creator-card"
);

revealElements.forEach(function (element) {
    element.classList.add("scroll-reveal-3d");
});

const revealObserver = new IntersectionObserver(
    function (entries, observer) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
                return;
            }

            const el = entry.target;
            const parent = el.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children);
                const index = siblings.indexOf(el);
                if (index > 0) {
                    const delay = Math.min((index % 4) * 80, 320);
                    el.style.transitionDelay = `${delay}ms`;
                }
            }

            el.classList.add("is-revealed");
            observer.unobserve(el);

            setTimeout(function () {
                el.style.transitionDelay = "";
            }, 850);
        });
    },
    {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px"
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

    if (window.MOTION3D && window.MOTION3D.enabled) {
        navbar.classList.toggle("is-scrolled", window.scrollY > 20);
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


// =========================================================
// 9. SCROLL PROGRESS INDICATOR & CIRCULAR 3D DIAL
// =========================================================
// 9. SCROLL PROGRESS INDICATOR & CIRCULAR 3D DIAL
// =========================================================

const scrollProgressBar = document.getElementById("scrollProgress");
const orb1 = document.querySelector(".ambient-orb-1");
const orb2 = document.querySelector(".ambient-orb-2");
let scrollTopDial = document.getElementById("scrollTopDial");
let dialProgressCircle = document.getElementById("dialProgressCircle");

function updateScrollMetrics() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

    // Top progress bar
    if (scrollProgressBar) {
        scrollProgressBar.style.width = Math.min(Math.max(scrollPercent, 0), 100) + "%";
    }

    // Circular scroll dial & Back to Top visibility
    if (!scrollTopDial) scrollTopDial = document.getElementById("scrollTopDial");
    if (!dialProgressCircle) dialProgressCircle = document.getElementById("dialProgressCircle");

    if (scrollTopDial && dialProgressCircle) {
        if (scrollTop > 250) {
            scrollTopDial.classList.add("visible");
        } else {
            scrollTopDial.classList.remove("visible");
        }

        const circumference = 125.66; // 2 * PI * 20
        const strokeOffset = circumference - (Math.min(Math.max(scrollPercent, 0), 100) / 100) * circumference;
        dialProgressCircle.style.strokeDashoffset = strokeOffset;
    }

    // Parallax on ambient 3D orbs
    if (window.innerWidth > 768 && !(window.MOTION3D && window.MOTION3D.enabled)) {   // motion.js drives the orbs via CSS vars
        if (orb1) {
            orb1.style.transform = `translate3d(0, ${(scrollTop * 0.1).toFixed(1)}px, 0)`;
        }
        if (orb2) {
            orb2.style.transform = `translate3d(0, ${(-scrollTop * 0.08).toFixed(1)}px, 0)`;
        }
    }
}

window.addEventListener("scroll", function () {
    requestAnimationFrame(updateScrollMetrics);
}, { passive: true });

updateScrollMetrics();

function bindScrollTopDial() {
    const dial = document.getElementById("scrollTopDial");
    if (dial && !dial.dataset.dialBound) {
        dial.dataset.dialBound = "true";
        dial.addEventListener("click", function () {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    }
}
bindScrollTopDial();
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindScrollTopDial);
}


// =========================================================
// 10. INTERACTIVE 3D CARD TILT & SPECULAR GLARE ENGINE
// =========================================================

function init3DCardTilt() {
    if (window.MOTION3D && window.MOTION3D.enabled) { return; }   // motion.js owns card tilt + glare
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch) {
        return;
    }

    const cards = document.querySelectorAll(
        ".project-card, .board-card, .achievement-card, " +
        ".publication-card, .contact-card, .impact-card, .website-creator-card"
    );

    cards.forEach(function (card) {
        card.classList.add("tilt-3d");

        let glare = card.querySelector(".card-glare");
        if (!glare) {
            glare = document.createElement("div");
            glare.className = "card-glare";
            card.appendChild(glare);
        }

        let isHovered = false;
        let animationFrameId = null;

        card.addEventListener("mouseenter", function () {
            isHovered = true;
            card.dataset.hovered = "true";
            card.style.transition = "transform 0.1s ease-out, box-shadow 0.25s ease";
            glare.style.opacity = "1";
        });

        card.addEventListener("mousemove", function (e) {
            if (!isHovered) return;

            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }

            animationFrameId = requestAnimationFrame(function () {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * -9;
                const rotateY = ((x - centerX) / centerX) * 9;

                const glareX = (x / rect.width) * 100;
                const glareY = (y / rect.height) * 100;

                card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.025, 1.025, 1.025)`;
                glare.style.background = `radial-gradient(circle at ${glareX.toFixed(1)}% ${glareY.toFixed(1)}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 65%)`;
            });
        });

        card.addEventListener("mouseleave", function () {
            isHovered = false;
            card.dataset.hovered = "false";
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            card.style.transition = "transform 0.5s cubic-bezier(0.2, 0, 0.2, 1), box-shadow 0.5s ease";
            card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
            glare.style.opacity = "0";

            setTimeout(function () {
                if (!isHovered) {
                    card.style.transition = "";
                    card.style.transform = "";
                }
            }, 550);
        });
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init3DCardTilt);
} else {
    init3DCardTilt();
}


// =========================================================
// 11. DYNAMIC 3D SCROLL VELOCITY PHYSICS
// =========================================================

(function initScrollVelocityPhysics() {
    if (window.MOTION3D && window.MOTION3D.enabled) { return; }   // motion.js owns velocity pitch
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReducedMotion || window.innerWidth < 768) {
        return;
    }

    let lastScrollY = window.scrollY;
    let lastTime = performance.now();
    let scrollVelocity = 0;
    let velocityDecayTimer = null;
    let isApplyingPhysics = false;

    const tiltableCards = document.querySelectorAll(
        ".project-card, .board-card, .achievement-card, .publication-card"
    );

    function applyVelocityPitch() {
        if (tiltableCards.length === 0) return;

        // Pitch between -3deg (scrolling up) and 3deg (scrolling down)
        const pitchAngle = Math.max(Math.min(scrollVelocity * 0.22, 3), -3);

        tiltableCards.forEach(function (card) {
            // Do not override if user is actively hovering the card
            if (card.dataset.hovered === "true") return;

            // Only apply to cards currently within the viewport
            const rect = card.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                card.style.transform = `perspective(1000px) rotateX(${pitchAngle.toFixed(2)}deg)`;
            }
        });
    }

    function decayVelocity() {
        scrollVelocity *= 0.85;

        if (Math.abs(scrollVelocity) > 0.15) {
            applyVelocityPitch();
            requestAnimationFrame(decayVelocity);
        } else {
            scrollVelocity = 0;
            isApplyingPhysics = false;
            document.body.classList.remove("scroll-velocity-active");

            tiltableCards.forEach(function (card) {
                if (card.dataset.hovered !== "true") {
                    card.style.transform = "";
                }
            });
        }
    }

    window.addEventListener("scroll", function () {
        const now = performance.now();
        const currentScrollY = window.scrollY;
        const deltaY = currentScrollY - lastScrollY;
        const deltaTime = Math.max(now - lastTime, 10);

        // Instantaneous velocity (px/ms)
        const instantVelocity = (deltaY / deltaTime) * 12;
        scrollVelocity = scrollVelocity * 0.4 + instantVelocity * 0.6;

        lastScrollY = currentScrollY;
        lastTime = now;

        if (Math.abs(scrollVelocity) > 0.5 && !isApplyingPhysics) {
            isApplyingPhysics = true;
            document.body.classList.add("scroll-velocity-active");
            requestAnimationFrame(applyVelocityPitch);
        }

        clearTimeout(velocityDecayTimer);
        velocityDecayTimer = setTimeout(function () {
            requestAnimationFrame(decayVelocity);
        }, 60);
    }, { passive: true });
})();


// =========================================================
// 12. FLOATING 3D SECTION MINIMAP & HORIZON TRACKER
// =========================================================

// =========================================================
// 12. FLOATING 3D SECTION MINIMAP & REAL-TIME SCROLL SPY
// =========================================================

function initSectionMinimap() {
    const minimap = document.getElementById("sectionMinimap");
    if (!minimap) return;

    const minimapDots = Array.from(minimap.querySelectorAll(".minimap-dot"));
    if (!minimapDots.length) return;

    // Collect all mapped target sections
    const trackedItems = [];
    minimapDots.forEach(function (dot) {
        const targetId = dot.getAttribute("data-section");
        const elem = document.getElementById(targetId);
        if (elem) {
            trackedItems.push({
                id: targetId,
                elem: elem,
                dot: dot,
                heading: elem.querySelector(".section-heading")
            });
        }

        // Smooth jump on click
        dot.addEventListener("click", function (e) {
            e.preventDefault();
            const targetElem = document.getElementById(targetId);
            if (targetElem) {
                targetElem.scrollIntoView({ behavior: "smooth" });
                minimapDots.forEach(function (d) { d.classList.remove("active"); });
                dot.classList.add("active");
            }
        });
    });

    function updateActiveSection() {
        if (!trackedItems.length) return;

        // Viewport trigger line (35% from the top of the viewport)
        const triggerY = window.scrollY + window.innerHeight * 0.35;
        const isNearBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 70);

        let activeItem = trackedItems[0];

        if (isNearBottom) {
            activeItem = trackedItems[trackedItems.length - 1];
        } else {
            for (let i = 0; i < trackedItems.length; i++) {
                const item = trackedItems[i];
                const rect = item.elem.getBoundingClientRect();
                const sectionTop = rect.top + window.scrollY;

                if (triggerY >= sectionTop - 15) {
                    activeItem = item;
                } else {
                    break;
                }
            }
        }

        // Apply active dot class
        minimapDots.forEach(function (d) {
            d.classList.remove("active");
        });

        if (activeItem && activeItem.dot) {
            activeItem.dot.classList.add("active");
        }

        // Update horizon lighting on section headings
        trackedItems.forEach(function (item) {
            if (item.heading) {
                if (item === activeItem) {
                    item.heading.classList.add("horizon-active");
                } else {
                    item.heading.classList.remove("horizon-active");
                }
            }
        });
    }

    // Real-time tracking on scroll with RAF
    window.addEventListener("scroll", function () {
        requestAnimationFrame(updateActiveSection);
    }, { passive: true });

    window.addEventListener("resize", function () {
        requestAnimationFrame(updateActiveSection);
    }, { passive: true });

    // Initial check
    updateActiveSection();
}

function startSectionMinimap() {
    initSectionMinimap();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startSectionMinimap);
} else {
    startSectionMinimap();
}


