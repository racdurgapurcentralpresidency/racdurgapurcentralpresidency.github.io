/**
 * =========================================================
 * RAC DCP — CREATIVE ANIMATED AVENUE PIE / DONUT CHART
 * =========================================================
 * Visualizes project breakdown across Rotary's 4 Avenues:
 * 1. Community Service
 * 2. Club Service
 * 3. Professional Development
 * 4. International Service
 * 
 * Features:
 * - Dynamic SVG circle dashoffset animation with easing
 * - Synchronized live number counters
 * - Interactive center hub with morphing statistics
 * - Two-way hover synchronization between pie segments and cards
 * - IntersectionObserver viewport trigger
 * - Accessible keyboard navigation
 * =========================================================
 */

(function () {
    'use strict';

    var CIRCUMFERENCE = 2 * Math.PI * 80; // r=80, ~502.655

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function animateNumber(el, target, duration) {
        if (!el) return;
        var start = 0;
        var startTime = null;
        var dur = duration || 1200;

        function frame(now) {
            if (!startTime) startTime = now;
            var elapsed = now - startTime;
            var progress = Math.min(elapsed / dur, 1);
            var ease = easeOutCubic(progress);
            var current = Math.round(start + (target - start) * ease);
            el.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(frame);
            } else {
                el.textContent = target;
            }
        }

        requestAnimationFrame(frame);
    }

    function initChart(wrapper) {
        if (!wrapper) return;

        var cards = Array.prototype.slice.call(wrapper.querySelectorAll('.avenue-stat-card'));
        var segments = Array.prototype.slice.call(wrapper.querySelectorAll('.donut-segment'));
        var centerEl = wrapper.querySelector('.avenue-donut-center');
        var defaultCountEl = wrapper.querySelector('.center-number');
        var hoverIconEl = wrapper.querySelector('.hover-icon');
        var hoverNumberEl = wrapper.querySelector('.hover-number');
        var hoverLabelEl = wrapper.querySelector('.hover-label');
        var hoverPercentEl = wrapper.querySelector('.hover-percent');

        // Build data map
        var data = {};
        var total = 0;

        cards.forEach(function (card) {
            var key = card.getAttribute('data-avenue');
            var count = parseInt(card.getAttribute('data-count'), 10) || 0;
            var percent = parseFloat(card.getAttribute('data-percent')) || 0;
            var color = card.getAttribute('data-color') || '#10b981';
            var icon = card.getAttribute('data-icon') || '✦';
            var title = card.getAttribute('data-title') || key;

            total += count;
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

        // Calculate and apply SVG segment attributes
        var currentAngle = -90; // Start at top (12 o'clock)
        var segmentData = [];

        segments.forEach(function (seg) {
            var key = seg.getAttribute('data-avenue');
            var item = data[key];
            if (!item) return;

            var pct = total > 0 ? (item.count / total) : 0;
            var strokeLen = pct * CIRCUMFERENCE;
            var gap = (total > item.count && item.count > 0) ? 3.5 : 0;
            var netDash = Math.max(0, strokeLen - gap);

            // Store for animation
            seg.setAttribute('data-target-dash', netDash);
            seg.setAttribute('data-dash-space', CIRCUMFERENCE - netDash);
            seg.setAttribute('data-angle', currentAngle);
            seg.style.transformOrigin = '120px 120px';
            seg.style.transform = 'rotate(' + currentAngle + 'deg)';

            // Initially collapsed
            seg.style.strokeDasharray = '0 ' + CIRCUMFERENCE;

            segmentData.push({
                segment: seg,
                netDash: netDash,
                angle: currentAngle,
                item: item
            });

            currentAngle += pct * 360;
        });

        // Interactive highlighting
        function activateAvenue(key) {
            var item = data[key];
            if (!item) return;

            // Highlight segment
            segments.forEach(function (seg) {
                if (seg.getAttribute('data-avenue') === key) {
                    seg.classList.add('active');
                    seg.classList.remove('dimmed');
                } else {
                    seg.classList.remove('active');
                    seg.classList.add('dimmed');
                }
            });

            // Highlight card
            cards.forEach(function (c) {
                if (c.getAttribute('data-avenue') === key) {
                    c.classList.add('active');
                } else {
                    c.classList.remove('active');
                }
            });

            // Update Center Hub
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

        // Attach event listeners to segments
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

        // Attach event listeners to legend cards
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

        // Trigger animation on viewport intersection
        var animated = false;

        function runAnimation() {
            if (animated) return;
            animated = true;

            // 1. Animate SVG Donut segments with staggered cascade
            segmentData.forEach(function (sd, idx) {
                setTimeout(function () {
                    sd.segment.style.strokeDasharray = sd.netDash + ' ' + (CIRCUMFERENCE - sd.netDash);
                }, idx * 90);
            });

            // 2. Animate Legend progress bars
            cards.forEach(function (card, idx) {
                var fill = card.querySelector('.stat-card-bar-fill');
                var targetWidth = fill ? fill.getAttribute('data-target-width') : null;
                if (fill && targetWidth) {
                    setTimeout(function () {
                        fill.style.width = targetWidth;
                    }, 120 + idx * 80);
                }
            });

            // 3. Count up center total
            if (defaultCountEl) {
                var centerTarget = parseInt(defaultCountEl.getAttribute('data-target'), 10) || total;
                animateNumber(defaultCountEl, centerTarget, 1200);
            }

            // 4. Count up each card's numbers
            cards.forEach(function (card) {
                var numEl = card.querySelector('.stat-number');
                if (numEl) {
                    var cardTarget = parseInt(numEl.getAttribute('data-target'), 10) || 0;
                    animateNumber(numEl, cardTarget, 1100);
                }
            });
        }

        // Use IntersectionObserver if available
        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        runAnimation();
                        observer.unobserve(wrapper);
                    }
                });
            }, {
                threshold: 0.15,
                rootMargin: '0px 0px -40px 0px'
            });

            observer.observe(wrapper);
        } else {
            // Fallback for older browsers
            runAnimation();
        }
    }

    function boot() {
        var charts = document.querySelectorAll('.avenue-chart-wrapper');
        charts.forEach(function (chart) {
            initChart(chart);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
