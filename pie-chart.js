/**
 * ============================================================================
 * RAC DCP — ROTARY AVENUE DONUT & PIE CHART CONTROLLER
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * This script creates and controls the interactive circular donut chart 
 * showcasing the club's projects across Rotary's 4 Avenues of Service:
 *   1. Community Service
 *   2. Club Service
 *   3. Professional Development
 *   4. International Service
 * 
 * HOW IT WORKS (STEP-BY-STEP):
 * 1. Reads project counts, percentages, and colors directly from HTML data attributes.
 * 2. Uses SVG geometry math to calculate arc lengths for each colored slice.
 * 3. Waits until the chart scrolls into the user's view (using IntersectionObserver).
 * 4. Animates each segment smoothly expanding clockwise from the 12 o'clock position.
 * 5. Simultaneously runs a smooth number counter that counts up to the total projects.
 * 6. Adds two-way interactive hover effects: hovering a card highlights its pie segment,
 *    and hovering a pie segment updates the center circle with full project details!
 * 7. Supports keyboard accessibility (Tab, Enter, Space) for users without a mouse.
 * ============================================================================
 */

(function () {
    'use strict';

    // ------------------------------------------------------------------------
    // SVG CIRCLE MATH CONSTANTS
    // ------------------------------------------------------------------------
    // The SVG circle element inside our HTML has a radius (r) of 80 pixels.
    // The circumference formula is: 2 * π * r.
    // 2 * Math.PI * 80 ≈ 502.655 pixels.
    // We use this circumference value with SVG's "stroke-dasharray" property
    // to draw circular slices of exact percentages!
    var CIRCUMFERENCE = 2 * Math.PI * 80;

    /**
     * Easing Function: easeOutCubic
     * 
     * Why we use it:
     * Instead of numbers increasing at a robotic, linear speed, this math curve
     * makes animations start fast and gently coast to a stop, feeling very smooth.
     * 
     * @param {number} t - Current progress between 0.0 (start) and 1.0 (end)
     * @returns {number} Eased progress value
     */
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * Animated Number Counter
     * 
     * Smoothly counts a number upward from 0 to target (e.g., from 0 to 45 projects).
     * 
     * @param {HTMLElement} el - The HTML text element where the number is displayed
     * @param {number} target - The final target number to count up to
     * @param {number} duration - How long the counting animation takes (in milliseconds)
     */
    function animateNumber(el, target, duration) {
        if (!el) return;
        var start = 0;
        var startTime = null;
        var dur = duration || 1200; // Default to 1.2 seconds if not specified

        function frame(now) {
            // Record the timestamp when animation begins
            if (!startTime) startTime = now;
            var elapsed = now - startTime;
            
            // Calculate progress between 0 and 1
            var progress = Math.min(elapsed / dur, 1);
            var ease = easeOutCubic(progress);
            
            // Interpolate current value based on eased progress
            var current = Math.round(start + (target - start) * ease);
            el.textContent = current;

            // Continue animation until 100% complete
            if (progress < 1) {
                requestAnimationFrame(frame);
            } else {
                // Ensure exact final number is displayed at the end
                el.textContent = target;
            }
        }

        // Start the browser animation loop
        requestAnimationFrame(frame);
    }

    /**
     * Initialize a single Avenue Chart component
     * 
     * Finds all relevant elements inside the chart container, calculates
     * angles and dash lengths, and binds hover/click/keyboard event handlers.
     * 
     * @param {HTMLElement} wrapper - The outer .avenue-chart-wrapper element
     */
    function initChart(wrapper) {
        if (!wrapper) return;

        // 1. Gather all interactive DOM elements inside this chart
        var cards = Array.prototype.slice.call(wrapper.querySelectorAll('.avenue-stat-card'));
        var segments = Array.prototype.slice.call(wrapper.querySelectorAll('.donut-segment'));
        var centerEl = wrapper.querySelector('.avenue-donut-center');
        var defaultCountEl = wrapper.querySelector('.center-number');
        var hoverIconEl = wrapper.querySelector('.hover-icon');
        var hoverNumberEl = wrapper.querySelector('.hover-number');
        var hoverLabelEl = wrapper.querySelector('.hover-label');
        var hoverPercentEl = wrapper.querySelector('.hover-percent');

        // 2. Read data from the HTML cards (data-avenue, data-count, data-color, etc.)
        var data = {};
        var total = 0;

        cards.forEach(function (card) {
            var key = card.getAttribute('data-avenue');
            var count = parseInt(card.getAttribute('data-count'), 10) || 0;
            var percent = parseFloat(card.getAttribute('data-percent')) || 0;
            var color = card.getAttribute('data-color') || '#10b981';
            var icon = card.getAttribute('data-icon') || '✦';
            var title = card.getAttribute('data-title') || key;

            total += count; // Accumulate sum of all projects
            data[key] = {
                key: key,
                count: count,
                percent: percent,
                color: color,
                icon: icon,
                title: title,
                card: card
            };
        });

        // 3. Compute SVG angles and stroke-dash lengths for each segment
        // In SVG, 0 degrees is typically at 3 o'clock. We start at -90 degrees
        // so the first slice begins neatly at 12 o'clock (the top of the circle).
        var currentAngle = -90;
        var segmentData = [];

        segments.forEach(function (seg) {
            var key = seg.getAttribute('data-avenue');
            var item = data[key];
            if (!item) return;

            // Calculate percentage of the whole circle this avenue represents
            var pct = total > 0 ? (item.count / total) : 0;
            var strokeLen = pct * CIRCUMFERENCE; // Length along circumference in pixels
            
            // Add a tiny gap between segments so they don't blend into one another
            var gap = (total > item.count && item.count > 0) ? 3.5 : 0;
            var netDash = Math.max(0, strokeLen - gap);

            // Store calculated values on the SVG element for easy access
            seg.setAttribute('data-target-dash', netDash);
            seg.setAttribute('data-dash-space', CIRCUMFERENCE - netDash);
            seg.setAttribute('data-angle', currentAngle);
            
            // Set rotation origin to the SVG center (120px, 120px)
            seg.style.transformOrigin = '120px 120px';
            seg.style.transform = 'rotate(' + currentAngle + 'deg)';

            // Initially collapse the stroke length to 0 so it can animate in smoothly
            seg.style.strokeDasharray = '0 ' + CIRCUMFERENCE;

            segmentData.push({
                segment: seg,
                netDash: netDash,
                angle: currentAngle,
                item: item
            });

            // Advance the angle clockwise for the next segment
            currentAngle += pct * 360;
        });

        /**
         * Highlight an Avenue
         * 
         * Triggered when the user hovers or focuses on either an SVG slice or a legend card.
         * Dims all other items, highlights the selected item, and morphs the center circle.
         */
        function activateAvenue(key) {
            var item = data[key];
            if (!item) return;

            // Highlight the active SVG segment, dim all others
            segments.forEach(function (seg) {
                if (seg.getAttribute('data-avenue') === key) {
                    seg.classList.add('active');
                    seg.classList.remove('dimmed');
                } else {
                    seg.classList.remove('active');
                    seg.classList.add('dimmed');
                }
            });

            // Highlight the corresponding avenue card
            cards.forEach(function (c) {
                if (c.getAttribute('data-avenue') === key) {
                    c.classList.add('active');
                } else {
                    c.classList.remove('active');
                }
            });

            // Morph the center hub to show detailed stats for this avenue
            if (centerEl) {
                centerEl.classList.add('is-hovered');
                if (hoverIconEl) hoverIconEl.textContent = item.icon;
                if (hoverNumberEl) {
                    hoverNumberEl.textContent = item.count;
                    hoverNumberEl.style.color = item.color;
                }
                if (hoverLabelEl) hoverLabelEl.textContent = item.title;
                if (hoverPercentEl) {
                    hoverPercentEl.textContent = item.percent + '% Share';
                    hoverPercentEl.style.background = item.color;
                }
            }
        }

        /**
         * Reset / Deactivate Avenue Highlight
         * 
         * Restores all segments and cards to normal and shows the total project count in the center.
         */
        function deactivateAvenue() {
            segments.forEach(function (seg) {
                seg.classList.remove('active');
                seg.classList.remove('dimmed');
            });
            cards.forEach(function (c) {
                c.classList.remove('active');
            });
            if (centerEl) {
                centerEl.classList.remove('is-hovered');
            }
        }

        // 4. Attach mouse and keyboard events to SVG segments
        segments.forEach(function (seg) {
            var key = seg.getAttribute('data-avenue');

            seg.addEventListener('mouseenter', function () {
                activateAvenue(key);
            });
            seg.addEventListener('mouseleave', function () {
                deactivateAvenue();
            });
            seg.addEventListener('focus', function () {
                activateAvenue(key);
            });
            seg.addEventListener('blur', function () {
                deactivateAvenue();
            });
        });

        // 5. Attach mouse and keyboard events to legend cards
        cards.forEach(function (card) {
            var key = card.getAttribute('data-avenue');

            card.addEventListener('mouseenter', function () {
                activateAvenue(key);
            });
            card.addEventListener('mouseleave', function () {
                deactivateAvenue();
            });
            card.addEventListener('focus', function () {
                activateAvenue(key);
            });
            card.addEventListener('blur', function () {
                deactivateAvenue();
            });
            // Allow keyboard users to toggle selection using Enter or Space
            card.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (card.classList.contains('active')) {
                        deactivateAvenue();
                    } else {
                        activateAvenue(key);
                    }
                }
            });
        });

        // 6. Intro animation sequence
        var animated = false;

        function runAnimation() {
            if (animated) return; // Only run once
            animated = true;

            // Step 1: Animate SVG Donut segments with a staggered cascade
            // Each segment begins expanding 90ms after the previous one
            segmentData.forEach(function (sd, idx) {
                setTimeout(function () {
                    sd.segment.style.strokeDasharray = sd.netDash + ' ' + (CIRCUMFERENCE - sd.netDash);
                }, idx * 90);
            });

            // Step 2: Animate horizontal progress bars inside the legend cards
            cards.forEach(function (card, idx) {
                var fill = card.querySelector('.stat-card-bar-fill');
                var targetWidth = fill ? fill.getAttribute('data-target-width') : null;
                if (fill && targetWidth) {
                    setTimeout(function () {
                        fill.style.width = targetWidth;
                    }, 120 + idx * 80);
                }
            });

            // Step 3: Count up total project number in center circle
            if (defaultCountEl) {
                var centerTarget = parseInt(defaultCountEl.getAttribute('data-target'), 10) || total;
                animateNumber(defaultCountEl, centerTarget, 1200);
            }

            // Step 4: Count up project numbers on each avenue card
            cards.forEach(function (card) {
                var numEl = card.querySelector('.stat-number');
                if (numEl) {
                    var cardTarget = parseInt(numEl.getAttribute('data-target'), 10) || 0;
                    animateNumber(numEl, cardTarget, 1100);
                }
            });
        }

        // 7. Trigger animation when scrolled into view (IntersectionObserver)
        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    // When at least 15% of the chart is visible on screen, start the animation
                    if (entry.isIntersecting) {
                        runAnimation();
                        observer.unobserve(wrapper); // Stop observing once triggered
                    }
                });
            }, {
                threshold: 0.15,
                rootMargin: '0px 0px -40px 0px'
            });

            observer.observe(wrapper);
        } else {
            // Fallback for older browsers: run animation immediately
            runAnimation();
        }
    }

    /**
     * Boot function: Finds every avenue chart on the page and initializes it
     */
    function boot() {
        var charts = document.querySelectorAll('.avenue-chart-wrapper');
        charts.forEach(function (chart) {
            initChart(chart);
        });
    }

    // Run as soon as the DOM document is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
