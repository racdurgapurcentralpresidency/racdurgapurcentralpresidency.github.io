// ============================================================================
// RAC DCP WEBSITE — CORE JAVASCRIPT LOGIC (script.js)
// ============================================================================
// 
// WHAT THIS FILE DOES:
// This is the primary JavaScript file for the Rotaract Club of Durgapur Central
// Presidency website. It manages core site interactions:
//   0. Cinematic Preloader & 0-100% Intro Counter (with fast-boot on mobile).
//   1. Responsive Navigation Bar, Hamburger Menu, & Accordion Dropdowns.
//   1.1 Hero Section Statement Carousel / Rotator.
//   2. Animated Number Counters (counting up project, member, and impact stats).
//   3. Staggered 3D Scroll Reveal for cards and section headings.
//   4. Dynamic Copyright Year in the footer.
//   5. Navigation Bar shadow activation upon scrolling.
//   6. Photo Gallery category filtering.
//   7. Full-screen Photo Gallery Lightbox viewer (with arrow keys and touch support).
//   8. Award & Achievement Lightbox viewer.
//   - People / Team tab switching with URL hash deep-linking (#members, #rotary).
//   - Quick notification panel toggle.
//   9. Circular Back-to-Top Dial & Scroll Progress Ring.
//   10. Interactive 3D Card Tilt & Mouse Glare (desktop fallback when motion.js is off).
//   11. Scroll Velocity Card Pitch Physics (desktop fallback).
//   12. Floating Section Minimap & Scroll Spy (highlights active section as you scroll).
// ============================================================================


// ============================================================================
// 0. CINEMATIC 0-100% PRELOADER & INTRO SCREEN
// ============================================================================
// Shows a branded 0-100% loading counter while assets load, then lifts the curtain.
// Includes intelligent speed-ups:
//   - Instantly dismissed if user prefers reduced motion.
//   - Remembers if visitor already saw the intro in this session (sessionStorage).
//   - Ultra-fast 150ms on low-end phones, 420ms on mobile, 1600ms on desktop.
// ============================================================================

(function initSitePreloader() {
    const preloader = document.getElementById("sitePreloader");
    const preloaderNumber = document.getElementById("preloaderNumber");
    const preloaderBar = document.getElementById("preloaderBar");
    const preloaderStatus = document.getElementById("preloaderStatus");

    // If preloader elements don't exist on this page, exit immediately
    if (!preloader || !preloaderNumber || !preloaderBar) {
        document.body.classList.remove("preloader-active");
        return;
    }

    // Fast-boot check 1: If user enabled reduced-motion or fast-boot class
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.classList.contains("racdcp-fast-boot")) {
        preloader.style.display = "none";
        document.body.classList.remove("preloader-active");
        return;
    }

    // Fast-boot check 2: Skip preloader if visitor already saw it during this browser session
    try {
        if (sessionStorage.getItem("racdcp-intro-seen")) {
            preloader.style.display = "none";
            document.body.classList.remove("preloader-active");
            return;
        }
    } catch (e) {}

    // Mark as seen so refreshing or opening internal links won't show it again
    try {
        sessionStorage.setItem("racdcp-intro-seen", "1");
    } catch (e) {}

    // Device tier detection for optimal user experience:
    const isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isLowEndDevice = (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
                           (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
                           (navigator.connection && (navigator.connection.saveData || /2g|3g/.test(navigator.connection.effectiveType)));

    // Choose animation duration based on device power
    const duration = isLowEndDevice ? 150 : (isMobile ? 420 : 1600);
    const holdDelay = isMobile ? 50 : 150;
    const cleanupDelay = isMobile ? 400 : 900;

    let isCompleted = false;
    const startTime = performance.now();

    /**
     * Finish Preloader Animation
     * Snaps counter to 100%, plays fade-out transition, and removes lock on <body>
     */
    function finishPreloader() {
        if (isCompleted) return;
        isCompleted = true;

        preloaderNumber.textContent = "100";
        preloaderBar.style.width = "100%";
        if (preloaderStatus) preloaderStatus.textContent = "WELCOME TO RAC DCP";

        setTimeout(function () {
            preloader.classList.add("loaded");
            document.body.classList.remove("preloader-active");

            setTimeout(function () {
                preloader.style.display = "none";
            }, cleanupDelay);
        }, holdDelay);
    }

    // When the whole page finishes loading, accelerate to 100%
    if (document.readyState === "complete") {
        setTimeout(finishPreloader, Math.min(duration, 350));
    } else {
        window.addEventListener("load", function () {
            setTimeout(finishPreloader, Math.min(duration, 350));
        }, { once: true });
    }

    /**
     * Animation Step Loop: Counts up smoothly from 0 to 100
     */
    function step(timestamp) {
        if (isCompleted) return;
        const elapsed = timestamp - startTime;
        const t = Math.min(elapsed / duration, 1);

        // Smooth cubic easing curve
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const currentCount = Math.min(Math.round(eased * 100), 100);

        preloaderNumber.textContent = currentCount;
        preloaderBar.style.width = currentCount + "%";
        preloader.setAttribute("aria-valuenow", currentCount);

        // Update motivational status text at different stages
        if (preloaderStatus) {
            if (currentCount < 30) {
                preloaderStatus.textContent = "INITIALIZING EXPERIENCE...";
            } else if (currentCount < 70) {
                preloaderStatus.textContent = "CONNECTING YOUTH & COMMUNITY...";
            } else if (currentCount < 95) {
                preloaderStatus.textContent = "TOGETHER WE SERVE...";
            } else {
                preloaderStatus.textContent = "WELCOME TO RAC DCP";
            }
        }

        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            finishPreloader();
        }
    }

    requestAnimationFrame(step);

    // Safety timeout: Never keep the user waiting longer than 3 seconds
    setTimeout(finishPreloader, isMobile ? 1200 : 3000);
})();


// ============================================================================
// 1. MOBILE NAVIGATION & DROPDOWNS
// ============================================================================
// Controls:
//   - The mobile hamburger button (☰ to ✕).
//   - Sliding the mobile navigation drawer in and out.
//   - Expanding and collapsing multi-level dropdown menus on mobile and desktop.
//   - Closing menus automatically when clicking outside or pressing Escape.
// ============================================================================

const menuToggle = document.querySelector(".menu-toggle");
const navMenu = document.querySelector(".nav-menu");

if (menuToggle && navMenu) {

    // Toggle mobile menu drawer open/closed
    menuToggle.addEventListener("click", function () {
        navMenu.classList.toggle("active");

        if (navMenu.classList.contains("active")) {
            menuToggle.textContent = "✕"; // Show close icon
        } else {
            menuToggle.textContent = "☰"; // Show hamburger icon
            // Close any open mobile dropdowns
            document.querySelectorAll(".nav-item.has-dropdown.is-open").forEach(function (item) {
                item.classList.remove("is-open");
                const toggle = item.querySelector(".nav-dropdown-toggle");
                if (toggle) toggle.setAttribute("aria-expanded", "false");
            });
        }
    });

    // Close mobile menu automatically whenever a visitor clicks any navigation link
    const navLeafLinks = navMenu.querySelectorAll("a:not(.nav-dropdown-toggle)");

    navLeafLinks.forEach(function (link) {
        link.addEventListener("click", function () {
            navMenu.classList.remove("active");
            menuToggle.textContent = "☰";

            document.querySelectorAll(".nav-item.has-dropdown.is-open").forEach(function (item) {
                item.classList.remove("is-open");
                const toggle = item.querySelector(".nav-dropdown-toggle");
                if (toggle) toggle.setAttribute("aria-expanded", "false");
            });
        });
    });

    // Close menu when clicking the "Join Us" button
    const navCtaBtn = document.querySelector(".nav-cta-btn");
    if (navCtaBtn) {
        navCtaBtn.addEventListener("click", function () {
            navMenu.classList.remove("active");
            menuToggle.textContent = "☰";
            document.querySelectorAll(".nav-item.has-dropdown.is-open").forEach(function (item) {
                item.classList.remove("is-open");
                const toggle = item.querySelector(".nav-dropdown-toggle");
                if (toggle) toggle.setAttribute("aria-expanded", "false");
            });
        });
    }
}

// Dropdown interactions (mobile accordion tap & desktop keyboard/click-away)
(function initNavDropdowns() {
    const navItems = document.querySelectorAll(".nav-item.has-dropdown");

    navItems.forEach(function (item) {
        const toggle = item.querySelector(".nav-dropdown-toggle");
        const dropdown = item.querySelector(".nav-dropdown");
        if (!toggle || !dropdown) return;

        // Toggle dropdown on click (mobile accordion tap & desktop click)
        toggle.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = item.classList.contains("is-open");

            // Close other open dropdowns first (accordion behavior)
            navItems.forEach(function (other) {
                if (other !== item) {
                    other.classList.remove("is-open");
                    const otherToggle = other.querySelector(".nav-dropdown-toggle");
                    if (otherToggle) otherToggle.setAttribute("aria-expanded", "false");
                }
            });

            if (isOpen) {
                item.classList.remove("is-open");
                toggle.setAttribute("aria-expanded", "false");
            } else {
                item.classList.add("is-open");
                toggle.setAttribute("aria-expanded", "true");
            }
        });

        // Close dropdown and handle navigation smoothly without redundant page reloads
        dropdown.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function (e) {
                const href = link.getAttribute("href") || "";
                const currentPath = window.location.pathname;
                const currentFile = currentPath.split("/").pop() || "index.html";

                item.classList.remove("is-open");
                toggle.setAttribute("aria-expanded", "false");

                // Parse destination file and hash anchor (e.g. "index.html#about")
                const hashIndex = href.indexOf("#");
                const destFile = (hashIndex >= 0 ? href.substring(0, hashIndex) : href).trim();
                const hash = hashIndex >= 0 ? href.substring(hashIndex + 1) : "";

                const isCurrentPage = (!destFile || destFile === currentFile || destFile === currentPath || (currentFile === "index.html" && destFile === ""));

                if (isCurrentPage) {
                    if (hash) {
                        const targetEl = document.getElementById(hash);
                        if (targetEl) {
                            e.preventDefault();
                            targetEl.scrollIntoView({ behavior: "smooth" });
                            try { history.pushState(null, "", "#" + hash); } catch (_) {}
                            return;
                        }
                    } else {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        return;
                    }
                }
            });
        });

        // Keyboard navigation for dropdowns (Enter or Space or Down Arrow opens, Escape closes)
        toggle.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
                if (!item.classList.contains("is-open")) {
                    e.preventDefault();
                    item.classList.add("is-open");
                    toggle.setAttribute("aria-expanded", "true");
                    const firstItem = dropdown.querySelector("a");
                    if (firstItem) firstItem.focus();
                }
            } else if (e.key === "Escape") {
                item.classList.remove("is-open");
                toggle.setAttribute("aria-expanded", "false");
                toggle.focus();
            }
        });

        item.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                item.classList.remove("is-open");
                toggle.setAttribute("aria-expanded", "false");
                toggle.focus();
            }
        });
    });

    // Close any open dropdowns when clicking anywhere outside
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".nav-item.has-dropdown")) {
            navItems.forEach(function (item) {
                item.classList.remove("is-open");
                const toggle = item.querySelector(".nav-dropdown-toggle");
                if (toggle) toggle.setAttribute("aria-expanded", "false");
            });
        }
    });
})();


// ============================================================================
// 1.1 HERO STATEMENT ROTATOR
// ============================================================================
// Cycles through the club's motto statements in the hero banner every 3.5s.
// Pauses automatically when the user hovers their mouse so it's easy to read!
// ============================================================================

(function initHeroStatementRotator() {
    const carousel = document.getElementById("heroCarousel");
    if (!carousel) return;

    const slides = carousel.querySelectorAll(".hero-slide");
    const dots = carousel.querySelectorAll(".carousel-dot");
    if (!slides.length || !dots.length) return;

    let currentSlide = 0;
    let slideTimer = null;
    let isUserPaused = false;

    /**
     * Switch to a specific slide index
     */
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

    /**
     * Advance to the next slide in sequence
     */
    function nextSlide() {
        if (isUserPaused) return;
        const next = (currentSlide + 1) % slides.length;
        goToSlide(next);
    }

    function startTimer() {
        clearInterval(slideTimer);
        slideTimer = setInterval(nextSlide, 3500); // Rotate every 3.5 seconds
    }

    // Dot indicators: Clicking any dot jumps straight to that slide
    dots.forEach(function (dot) {
        dot.addEventListener("click", function (e) {
            e.stopPropagation();
            const index = parseInt(dot.getAttribute("data-index"), 10);
            goToSlide(index);
            startTimer(); // Reset the timer
        });
    });

    // Pause rotation on mouse hover so visitors can read comfortably
    carousel.addEventListener("mouseenter", function () {
        isUserPaused = true;
    });
    carousel.addEventListener("mouseleave", function () {
        isUserPaused = false;
    });

    startTimer();
})();


// ============================================================================
// 2. ANIMATED IMPACT NUMBER COUNTERS
// ============================================================================
// Counts numbers upward when scrolled into view (e.g. 1500+ Lives Impacted).
// Note: When motion.js is active on high-end desktops, it uses 3D rolling odometers.
// This block serves as the rock-solid fallback for all devices!
// ============================================================================

const counters = document.querySelectorAll(".impact-number");

const counterObserver = new IntersectionObserver(
    function (entries, observer) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
                return;
            }

            const counter = entry.target;
            const target = parseInt(counter.getAttribute("data-target"));
            let current = 0;
            const duration = 1500; // 1.5 seconds animation
            const startTime = performance.now();

            function updateCounter(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Smooth cubic deceleration easing curve
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                current = Math.floor(target * easedProgress);
                counter.textContent = current.toLocaleString();

                if (progress < 1) {
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target.toLocaleString();
                }
            }

            requestAnimationFrame(updateCounter);
            observer.unobserve(counter); // Run counter animation only once
        });
    },
    {
        threshold: 0.5 // Trigger when 50% of the counter box is visible
    }
);

// Only activate fallback counter if motion.js is not handling odometers
if (!(window.MOTION3D && window.MOTION3D.enabled)) {
    counters.forEach(function (counter) {
        counterObserver.observe(counter);
    });
}


// ============================================================================
// 3. 3D SCROLL REVEAL ANIMATIONS (STAGGERED PERSPECTIVE)
// ============================================================================
// When elements scroll into view, they glide up into position with a subtle
// staggered delay (e.g. card 1 appears, then card 2 80ms later, etc.).
// ============================================================================

const revealElements = document.querySelectorAll(
    (window.MOTION3D && window.MOTION3D.enabled)
        ? ".motion-owns-reveals"
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
                    // Stagger delay between sibling cards
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


// ============================================================================
// 4. CURRENT YEAR IN FOOTER
// ============================================================================
// Keeps the copyright year up to date automatically
// ============================================================================

const footerYear = document.querySelector(".footer-bottom p");

if (footerYear) {
    const currentYear = new Date().getFullYear();
    footerYear.innerHTML = footerYear.innerHTML.replace("2026", currentYear);
}


// ============================================================================
// 5. NAVBAR SHADOW ON SCROLL
// ============================================================================
// Adds a subtle drop shadow to the navigation bar as soon as the user scrolls
// down more than 20 pixels, separating it cleanly from page content.
// ============================================================================

const navbar = document.querySelector(".navbar");

let navScrollTicking = false;
window.addEventListener("scroll", function () {
    if (!navbar || navScrollTicking) {
        return;
    }
    navScrollTicking = true;
    requestAnimationFrame(function () {
        const isScrolled = window.scrollY > 20;
        if (window.MOTION3D && window.MOTION3D.enabled) {
            navbar.classList.toggle("is-scrolled", isScrolled);
        } else {
            navbar.classList.toggle("is-scrolled", isScrolled);
            if (!isScrolled) {
                navbar.style.boxShadow = "none";
            } else {
                navbar.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.08)";
            }
        }
        navScrollTicking = false;
    });
}, { passive: true });


// ============================================================================
// 6. PHOTO GALLERY FILTERS
// ============================================================================
// Filters photo gallery items by tag (All, Events, Projects, Community, etc.)
// ============================================================================

const galleryFilters = document.querySelectorAll(".gallery-filter");
const galleryItems = document.querySelectorAll(".gallery-item");

if (galleryFilters.length && galleryItems.length) {
    galleryFilters.forEach(function (filterButton) {
        filterButton.addEventListener("click", function () {
            const filter = filterButton.getAttribute("data-filter");

            // Update active state on filter buttons
            galleryFilters.forEach(function (button) {
                button.classList.remove("active");
            });
            filterButton.classList.add("active");

            // Show or hide matching gallery photos
            galleryItems.forEach(function (item) {
                if (filter === "all" || item.classList.contains(filter)) {
                    item.classList.remove("hidden");
                } else {
                    item.classList.add("hidden");
                }
            });
        });
    });
}


// ============================================================================
// 7. FULLSCREEN GALLERY LIGHTBOX
// ============================================================================
// Generates the lightbox overlay dynamically in JavaScript.
// Supports Previous / Next buttons, keyboard navigation (Left/Right arrow keys,
// Escape to close), and outside backdrop clicks.
// ============================================================================

if (document.querySelector(".gallery-item")) {
    const lightbox = document.createElement("div");
    lightbox.className = "gallery-lightbox";
    lightbox.innerHTML = `
        <button class="lightbox-close" type="button" aria-label="Close">&times;</button>
        <button class="lightbox-prev" type="button" aria-label="Previous">&#10094;</button>
        <div class="lightbox-content"><img src="" alt=""></div>
        <button class="lightbox-next" type="button" aria-label="Next">&#10095;</button>
    `;
    document.body.appendChild(lightbox);

    const lightboxImage = lightbox.querySelector(".lightbox-content img");
    const lightboxClose = lightbox.querySelector(".lightbox-close");
    const lightboxPrev = lightbox.querySelector(".lightbox-prev");
    const lightboxNext = lightbox.querySelector(".lightbox-next");

    let currentGalleryIndex = 0;

    /**
     * Get array of all gallery photos that are currently visible (not hidden by filter)
     */
    function getVisibleGalleryItems() {
        return Array.from(document.querySelectorAll(".gallery-item:not(.hidden)"));
    }

    /**
     * Display a specific image in the lightbox
     */
    function showLightboxImage(index) {
        const visibleItems = getVisibleGalleryItems();
        if (!visibleItems.length) return;
        currentGalleryIndex = index;
        const image = visibleItems[currentGalleryIndex].querySelector("img");
        if (!image) return;
        lightboxImage.src = image.src;
        lightboxImage.alt = image.alt;
    }

    /**
     * Open the lightbox
     */
    function openLightbox(index) {
        showLightboxImage(index);
        lightbox.classList.add("active");
        document.body.classList.add("lightbox-open");
    }

    /**
     * Close the lightbox
     */
    function closeLightbox() {
        lightbox.classList.remove("active");
        document.body.classList.remove("lightbox-open");
    }

    /**
     * View previous photo
     */
    function showPreviousImage() {
        const visibleItems = getVisibleGalleryItems();
        if (!visibleItems.length) return;
        currentGalleryIndex = (currentGalleryIndex - 1 + visibleItems.length) % visibleItems.length;
        showLightboxImage(currentGalleryIndex);
    }

    /**
     * View next photo
     */
    function showNextImage() {
        const visibleItems = getVisibleGalleryItems();
        if (!visibleItems.length) return;
        currentGalleryIndex = (currentGalleryIndex + 1) % visibleItems.length;
        showLightboxImage(currentGalleryIndex);
    }

    // Attach click events to all gallery items
    document.querySelectorAll(".gallery-item").forEach(function (item) {
        item.addEventListener("click", function () {
            const visibleItems = getVisibleGalleryItems();
            const visibleIndex = visibleItems.indexOf(item);
            if (visibleIndex !== -1) {
                openLightbox(visibleIndex);
            }
        });
    });

    // Control buttons
    lightboxClose.addEventListener("click", function (event) {
        event.stopPropagation();
        closeLightbox();
    });

    lightboxPrev.addEventListener("click", function (event) {
        event.stopPropagation();
        showPreviousImage();
    });

    lightboxNext.addEventListener("click", function (event) {
        event.stopPropagation();
        showNextImage();
    });

    // Click outside photo to close
    lightbox.addEventListener("click", function (event) {
        if (event.target === lightbox) {
            closeLightbox();
        }
    });

    // Keyboard controls (Escape, Left Arrow, Right Arrow)
    document.addEventListener("keydown", function (event) {
        if (!lightbox.classList.contains("active")) return;
        if (event.key === "Escape") closeLightbox();
        if (event.key === "ArrowLeft") showPreviousImage();
        if (event.key === "ArrowRight") showNextImage();
    });
}


// ============================================================================
// 8. ACHIEVEMENT & AWARD LIGHTBOX
// ============================================================================
// Displays awards and certificates in a clean, full-screen view upon clicking.
// ============================================================================

const achievementImages = document.querySelectorAll(".achievement-image img");
const achievementLightbox = document.createElement("div");
achievementLightbox.className = "achievement-lightbox";
achievementLightbox.innerHTML = `
    <button class="achievement-lightbox-close" type="button" aria-label="Close">&times;</button>
    <div class="achievement-lightbox-content"><img src="" alt=""></div>
`;
document.body.appendChild(achievementLightbox);

const achievementLightboxImage = achievementLightbox.querySelector(".achievement-lightbox-content img");
const achievementLightboxClose = achievementLightbox.querySelector(".achievement-lightbox-close");

achievementImages.forEach(function (image) {
    image.addEventListener("click", function () {
        achievementLightboxImage.src = image.src;
        achievementLightboxImage.alt = image.alt;
        achievementLightbox.classList.add("active");
        document.body.classList.add("lightbox-open");
    });
});

achievementLightboxClose.addEventListener("click", function (event) {
    event.stopPropagation();
    achievementLightbox.classList.remove("active");
    document.body.classList.remove("lightbox-open");
});

achievementLightbox.addEventListener("click", function (event) {
    if (event.target === achievementLightbox) {
        achievementLightbox.classList.remove("active");
        document.body.classList.remove("lightbox-open");
    }
});

document.addEventListener("keydown", function (event) {
    if (!achievementLightbox.classList.contains("active")) return;
    if (event.key === "Escape") {
        achievementLightbox.classList.remove("active");
        document.body.classList.remove("lightbox-open");
    }
});


// ============================================================================
// PEOPLE & TEAM DISPLAY TABS
// ============================================================================
// Switches between "Board Members", "General Members", and "Rotary Leaders".
// Also automatically switches to the right tab if a visitor navigates to
// #members or #rotary directly in the browser address bar!
// ============================================================================

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

    if (!button && categoryId) {
        button = document.querySelector('.people-category[onclick*="' + categoryId + '"]');
    }

    if (button) {
        button.classList.add('active');
    }
}

// Deep-link routing for People tabs (e.g. index.html#members)
(function initPeopleHashRouting() {
    function activateFromHash() {
        const hash = window.location.hash;
        if (hash === '#members' || hash === '#volunteers' || hash === '#rotary') {
            const cat = hash.replace('#', '');
            showPeople(cat);
            const peopleSec = document.getElementById('people');
            if (peopleSec) {
                setTimeout(function () {
                    peopleSec.scrollIntoView({ behavior: 'smooth' });
                }, 80);
            }
        }
    }

    document.querySelectorAll('[data-people]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            const cat = link.getAttribute('data-people');
            const isIndex = window.location.pathname.endsWith('index.html') ||
                            window.location.pathname === '/' ||
                            window.location.pathname.endsWith('/');
            if (isIndex && cat) {
                showPeople(cat);
                const peopleSec = document.getElementById('people');
                if (peopleSec) {
                    peopleSec.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    window.addEventListener('DOMContentLoaded', activateFromHash);
    window.addEventListener('hashchange', activateFromHash);
})();

/**
 * Toggle the floating announcement notification panel
 */
function toggleNotifications() {
    const panel = document.getElementById("notificationPanel");
    if (!panel) return;
    panel.classList.toggle("active");
}


// ============================================================================
// 9. CIRCULAR SCROLL PROGRESS RING & BACK-TO-TOP DIAL
// ============================================================================
// - Measures current scroll percentage from 0% to 100%.
// - Shows the circular button once the user scrolls down more than 250px.
// - Draws an SVG stroke ring that wraps around the dial as you scroll!
// - Clicking smoothly returns you to the very top of the page.
// ============================================================================

const scrollProgressBar = document.getElementById("scrollProgress");
const orb1 = document.querySelector(".ambient-orb-1");
const orb2 = document.querySelector(".ambient-orb-2");
let scrollTopDial = document.getElementById("scrollTopDial");
let dialProgressCircle = document.getElementById("dialProgressCircle");

function updateScrollMetrics() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

    // Update top progress line
    if (scrollProgressBar) {
        scrollProgressBar.style.width = Math.min(Math.max(scrollPercent, 0), 100) + "%";
    }

    // Circular scroll dial & Back to Top visibility
    if (!scrollTopDial) scrollTopDial = document.getElementById("scrollTopDial");
    if (!dialProgressCircle) dialProgressCircle = document.getElementById("dialProgressCircle");

    if (scrollTopDial && dialProgressCircle) {
        // Show button only after scrolling past 250px
        if (scrollTop > 250) {
            scrollTopDial.classList.add("visible");
        } else {
            scrollTopDial.classList.remove("visible");
        }

        // SVG circle radius = 20, circumference = 2 * π * 20 ≈ 125.66px
        const circumference = 125.66;
        const strokeOffset = circumference - (Math.min(Math.max(scrollPercent, 0), 100) / 100) * circumference;
        dialProgressCircle.style.strokeDashoffset = strokeOffset;
    }

    // Ambient floating orbs parallax (desktop fallback)
    if (window.innerWidth > 768 && !(window.MOTION3D && window.MOTION3D.enabled)) {
        if (orb1) {
            orb1.style.transform = `translate3d(0, ${(scrollTop * 0.1).toFixed(1)}px, 0)`;
        }
        if (orb2) {
            orb2.style.transform = `translate3d(0, ${(-scrollTop * 0.08).toFixed(1)}px, 0)`;
        }
    }
}

// Throttled scroll listener using requestAnimationFrame for 60fps performance
let scrollMetricsTicking = false;
window.addEventListener("scroll", function () {
    if (!scrollMetricsTicking) {
        scrollMetricsTicking = true;
        requestAnimationFrame(function () {
            updateScrollMetrics();
            scrollMetricsTicking = false;
        });
    }
}, { passive: true });

updateScrollMetrics();

// Bind smooth scroll-to-top action on click
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


// ============================================================================
// 10. INTERACTIVE 3D CARD TILT & SPECULAR GLARE (FALLBACK ENGINE)
// ============================================================================
// When motion.js is active, motion.js handles 3D tilts with spring physics.
// If motion.js is inactive (e.g. standard desktop), this provides smooth
// interactive mouse-tracking card tilts and light reflections!
// ============================================================================

function init3DCardTilt() {
    if (window.MOTION3D && window.MOTION3D.enabled) { return; } // motion.js owns card tilt
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch) {
        return; // Don't run mouse tilt on touch screens
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

                // Tilt angles based on mouse distance from center (-9 deg to +9 deg)
                const rotateX = ((y - centerY) / centerY) * -9;
                const rotateY = ((x - centerX) / centerX) * 9;

                // Position light reflection over mouse coordinates
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
            // Smoothly restore card to flat upright state
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


// ============================================================================
// 11. DYNAMIC 3D SCROLL VELOCITY PHYSICS (FALLBACK ENGINE)
// ============================================================================
// When scrolling quickly, cards tilt slightly backward or forward depending
// on scroll direction, giving a tangible physical feel.
// ============================================================================

(function initScrollVelocityPhysics() {
    if (window.MOTION3D && window.MOTION3D.enabled) { return; } // motion.js owns velocity physics
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isLowEnd = isReducedMotion ||
                     (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
                     (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
                     window.innerWidth < 1024;
    if (isLowEnd) {
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
        const pitchAngle = Math.max(Math.min(scrollVelocity * 0.22, 3), -3);

        tiltableCards.forEach(function (card) {
            if (card.dataset.hovered === "true") return; // Don't override hovered cards
            const rect = card.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                card.style.transform = `perspective(1000px) rotateX(${pitchAngle.toFixed(2)}deg)`;
            }
        });
    }

    function decayVelocity() {
        scrollVelocity *= 0.85; // Coast to a stop

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


// ============================================================================
// 12. FLOATING SECTION MINIMAP & REAL-TIME SCROLL SPY
// ============================================================================
// Highlights the current section on the right-hand minimap as you scroll down.
// Clicking any dot smoothly scrolls straight to that section.
// ============================================================================

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

    /**
     * Determine which section is currently active based on scroll position
     */
    function updateActiveSection() {
        if (!trackedItems.length) return;
        // On mobile and tablets, section minimap is hidden with display:none.
        // Skip layout recalculations to guarantee 60fps scrolling on phones.
        if (window.innerWidth <= 1024) return;

        // Viewport trigger line (35% from the top of the viewport)
        const triggerY = window.scrollY + window.innerHeight * 0.35;
        const isNearBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 70);

        let activeItem = trackedItems[0];

        if (isNearBottom) {
            activeItem = trackedItems[trackedItems.length - 1]; // Bottom section when at page end
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

        // Apply active class to the corresponding dot
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

    // Throttled real-time tracking on scroll
    let minimapTicking = false;
    window.addEventListener("scroll", function () {
        if (!minimapTicking) {
            minimapTicking = true;
            requestAnimationFrame(function () {
                updateActiveSection();
                minimapTicking = false;
            });
        }
    }, { passive: true });

    window.addEventListener("resize", function () {
        if (!minimapTicking) {
            minimapTicking = true;
            requestAnimationFrame(function () {
                updateActiveSection();
                minimapTicking = false;
            });
        }
    }, { passive: true });

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
