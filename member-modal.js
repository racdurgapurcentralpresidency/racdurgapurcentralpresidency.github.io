/**
 * ============================================================================
 * RAC DCP — MEMBER PROFILE MODAL & ROTARY AREAS OF FOCUS CHART (member-modal.js)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 *   1. Intercepts clicks and keyboard activation (Enter / Space) on all member
 *      and volunteer cards (.board-card and .people-card) on index.html.
 *   2. Extracts member metadata (HTML5 data-* attributes) including roles,
 *      tenure, honors/awards, and participation numbers across Rotary's 7 Areas
 *      of Focus.
 *   3. Populates the responsive 3D "Green Rebel" profile modal (#memberProfileModal).
 *   4. Initializes and renders an interactive Chart.js Horizontal Bar Chart
 *      visualizing the member's community impact across all 7 Rotary Areas of Focus.
 *   5. Guarantees safe chart lifecycle management: destroys previous Chart.js
 *      instances prior to re-instantiating, preventing visual overlap or memory leaks.
 *   6. Provides full WCAG accessibility: backdrop dismiss, close button, Escape key
 *      listener, focus trap, and background body scroll-locking.
 *   7. Automatically re-themes Chart.js colors on dark/light mode toggle.
 * ============================================================================
 */

(function () {
    'use strict';

    // Rotary's 7 Global Areas of Focus Configuration
    var FOCUS_AREAS = [
        { key: 'peace', label: 'Peacebuilding', full: 'Peacebuilding & Conflict Prevention', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.85)' },
        { key: 'health', label: 'Disease Prevention', full: 'Disease Prevention & Treatment', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.85)' },
        { key: 'water', label: 'Water & Sanitation', full: 'Water, Sanitation & Hygiene', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.85)' },
        { key: 'maternal', label: 'Maternal & Child Health', full: 'Maternal & Child Health', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.85)' },
        { key: 'education', label: 'Basic Education', full: 'Basic Education & Literacy', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.85)' },
        { key: 'economy', label: 'Economic Development', full: 'Community Economic Development', color: '#10b981', bg: 'rgba(16, 185, 129, 0.85)' },
        { key: 'environment', label: 'Environment', full: 'Supporting the Environment', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.85)' }
    ];

    // Chart.js instance holder
    var focusChartInstance = null;
    var lastFocusedCard = null;
    var activeMemberData = null;

    /**
     * Helper to detect active dark mode
     */
    function isDarkMode() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    /**
     * Safely decodes any HTML entity strings (e.g. &amp;, &ndash;)
     */
    function decodeHtml(str) {
        if (!str) return '';
        var txt = document.createElement('textarea');
        txt.innerHTML = str;
        return txt.value;
    }

    /**
     * Splits comma-separated strings while preserving nested parenthetical strings
     */
    function parseList(rawStr) {
        if (!rawStr || !rawStr.trim()) return [];
        var str = decodeHtml(rawStr);
        // Split by comma followed by optional whitespace, ignoring commas inside brackets/parentheses
        var results = [];
        var buffer = '';
        var depth = 0;

        for (var i = 0; i < str.length; i++) {
            var char = str[i];
            if (char === '(' || char === '[') {
                depth++;
                buffer += char;
            } else if (char === ')' || char === ']') {
                if (depth > 0) depth--;
                buffer += char;
            } else if (char === ',' && depth === 0) {
                if (buffer.trim()) results.push(buffer.trim());
                buffer = '';
            } else {
                buffer += char;
            }
        }
        if (buffer.trim()) results.push(buffer.trim());
        return results;
    }

    /**
     * Main Initialization on DOM Ready
     */
    function initMemberModal() {
        var modal = document.getElementById('memberProfileModal');
        if (!modal) return;

        var backdrop = document.getElementById('mpmBackdrop');
        var closeBtn = document.getElementById('mpmCloseBtn');

        var avatarEl = document.getElementById('mpmAvatar');
        var badgeEl = document.getElementById('mpmBadge');
        var districtBadgeEl = document.getElementById('mpmDistrictBadge');
        var nameEl = document.getElementById('mpmName');
        var roleEl = document.getElementById('mpmRole');
        var sinceEl = document.getElementById('mpmSince');
        var totalEventsEl = document.getElementById('mpmTotalEvents');
        var pastRolesContainer = document.getElementById('mpmPastRoles');
        var awardsContainer = document.getElementById('mpmAwards');
        var chartCanvas = document.getElementById('memberFocusChart');

        /**
         * Render or Update the Horizontal Bar Chart
         */
        function renderFocusChart(counts) {
            if (!chartCanvas || typeof Chart === 'undefined') return;

            // Destroy previous instance to prevent overlapping canvases
            if (focusChartInstance) {
                focusChartInstance.destroy();
                focusChartInstance = null;
            }

            var darkMode = isDarkMode();
            var maxVal = Math.max.apply(null, counts);
            var suggestedXMax = maxVal > 0 ? Math.ceil(maxVal * 1.25) : 5;

            var labels = FOCUS_AREAS.map(function (item) { return item.label; });
            var bgColors = FOCUS_AREAS.map(function (item) { return item.bg; });
            var borderColors = FOCUS_AREAS.map(function (item) { return item.color; });

            var textColor = darkMode ? '#d6e4dc' : '#172922';
            var mutedColor = darkMode ? '#9cb3a7' : '#536b60';
            var gridColor = darkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)';
            var tooltipBg = darkMode ? 'rgba(17, 33, 27, 0.96)' : 'rgba(11, 46, 33, 0.95)';

            var ctx = chartCanvas.getContext('2d');

            focusChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Impact Events',
                        data: counts,
                        backgroundColor: bgColors,
                        borderColor: borderColors,
                        borderWidth: 1.5,
                        borderRadius: 6,
                        barPercentage: 0.68,
                        categoryPercentage: 0.85
                    }]
                },
                options: {
                    indexAxis: 'y', // Renders the bar chart horizontally
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 650,
                        easing: 'easeOutQuart'
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: true,
                            backgroundColor: tooltipBg,
                            titleColor: '#ffffff',
                            titleFont: {
                                family: "'Plus Jakarta Sans', sans-serif",
                                size: 13,
                                weight: '700'
                            },
                            bodyColor: '#eafaf1',
                            bodyFont: {
                                family: "'Plus Jakarta Sans', sans-serif",
                                size: 12,
                                weight: '600'
                            },
                            borderColor: 'rgba(16, 185, 129, 0.45)',
                            borderWidth: 1,
                            padding: 10,
                            displayColors: true,
                            boxPadding: 4,
                            cornerRadius: 8,
                            callbacks: {
                                title: function (tooltipItems) {
                                    var idx = tooltipItems[0].dataIndex;
                                    return FOCUS_AREAS[idx].full;
                                },
                                label: function (context) {
                                    var count = context.parsed.x || 0;
                                    return ' Direct Involvement: ' + count + (count === 1 ? ' Event' : ' Events');
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            suggestedMax: suggestedXMax,
                            ticks: {
                                precision: 0,
                                stepSize: maxVal > 15 ? 5 : (maxVal > 8 ? 2 : 1),
                                color: mutedColor,
                                font: {
                                    family: "'Plus Jakarta Sans', sans-serif",
                                    size: 11,
                                    weight: '600'
                                }
                            },
                            grid: {
                                color: gridColor,
                                drawBorder: false
                            }
                        },
                        y: {
                            ticks: {
                                color: textColor,
                                font: {
                                    family: "'Plus Jakarta Sans', sans-serif",
                                    size: 12,
                                    weight: '700'
                                }
                            },
                            grid: {
                                display: false,
                                drawBorder: false
                            }
                        }
                    }
                }
            });
        }

        /**
         * Opens the modal with the specified card's data
         */
        function openMemberModal(card) {
            if (!card) return;
            lastFocusedCard = card;

            // Extract metadata from HTML5 data-* attributes
            var name = decodeHtml(card.getAttribute('data-name') || '');
            var role = decodeHtml(card.getAttribute('data-role') || '');
            var districtRole = decodeHtml(card.getAttribute('data-district-role') || '');
            var since = decodeHtml(card.getAttribute('data-since') || '—');
            var pastRolesStr = card.getAttribute('data-past-roles') || '';
            var awardsStr = card.getAttribute('data-awards') || '';

            // Extract counts
            var counts = FOCUS_AREAS.map(function (item) {
                return parseInt(card.getAttribute('data-' + item.key), 10) || 0;
            });

            var totalEvents = counts.reduce(function (sum, val) { return sum + val; }, 0);

            // Avatar image
            var img = card.querySelector('img');
            var avatarSrc = img ? img.src : '';
            var avatarAlt = img ? img.alt : name;

            // Determine badge category
            var isVolunteer = card.closest('#volunteers') !== null || role.toLowerCase().indexOf('volunteer') !== -1;
            var isMember = card.closest('#members') !== null || role.toLowerCase() === 'member';
            var badgeText = isVolunteer ? 'Volunteer' : (isMember ? 'Club Member' : 'Board of Directors');

            // Populate Text and Avatar
            if (avatarEl) {
                avatarEl.src = avatarSrc;
                avatarEl.alt = avatarAlt;
            }
            if (nameEl) nameEl.textContent = name;
            if (roleEl) roleEl.textContent = role;
            if (badgeEl) badgeEl.textContent = badgeText;

            // District Role Badge
            if (districtBadgeEl) {
                if (districtRole.trim()) {
                    districtBadgeEl.textContent = '★ ' + districtRole.trim();
                    districtBadgeEl.style.display = 'inline-flex';
                } else {
                    districtBadgeEl.style.display = 'none';
                }
            }

            // Quick Stats
            if (sinceEl) sinceEl.textContent = since;
            if (totalEventsEl) {
                totalEventsEl.textContent = totalEvents + (totalEvents === 1 ? ' Event' : ' Events');
            }

            // Populate Past Roles Pills
            if (pastRolesContainer) {
                pastRolesContainer.innerHTML = '';
                var pastRoles = parseList(pastRolesStr);
                if (pastRoles.length > 0) {
                    pastRoles.forEach(function (roleItem) {
                        var pill = document.createElement('span');
                        pill.className = 'mpm-pill mpm-pill-role';
                        pill.textContent = roleItem;
                        pastRolesContainer.appendChild(pill);
                    });
                } else {
                    var emptySpan = document.createElement('span');
                    emptySpan.className = 'mpm-empty-note';
                    emptySpan.textContent = 'Charter / First-tenure leader with no prior club roles.';
                    pastRolesContainer.appendChild(emptySpan);
                }
            }

            // Populate Awards Pills
            if (awardsContainer) {
                awardsContainer.innerHTML = '';
                var awards = parseList(awardsStr);
                if (awards.length > 0) {
                    awards.forEach(function (awardItem) {
                        var pill = document.createElement('span');
                        pill.className = 'mpm-pill mpm-pill-award';
                        pill.innerHTML = '<span class="mpm-award-icon" aria-hidden="true">🏆</span> ' + awardItem;
                        awardsContainer.appendChild(pill);
                    });
                } else {
                    var emptyAward = document.createElement('span');
                    emptyAward.className = 'mpm-empty-note';
                    emptyAward.textContent = 'No individual district or club citations recorded for this tenure.';
                    awardsContainer.appendChild(emptyAward);
                }
            }

            // Cache data for theme changes
            activeMemberData = counts;

            // Show Modal and lock background scroll
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('lightbox-open');

            // Render Chart after modal becomes visible (so dimensions calculate accurately)
            requestAnimationFrame(function () {
                renderFocusChart(counts);
            });

            // Focus Close Button for accessibility
            if (closeBtn) {
                setTimeout(function () {
                    closeBtn.focus();
                }, 100);
            }
        }

        /**
         * Closes the profile modal and restores focus
         */
        function closeMemberModal() {
            if (!modal.classList.contains('active')) return;

            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('lightbox-open');

            // Safely destroy chart instance on modal close
            if (focusChartInstance) {
                focusChartInstance.destroy();
                focusChartInstance = null;
            }
            activeMemberData = null;

            // Return focus to triggering card
            if (lastFocusedCard && typeof lastFocusedCard.focus === 'function') {
                lastFocusedCard.focus();
            }
        }

        // --- Event Listeners ---

        // 1. Close Button & Backdrop Clicks
        if (closeBtn) {
            closeBtn.addEventListener('click', function (e) {
                e.preventDefault();
                closeMemberModal();
            });
        }

        if (backdrop) {
            backdrop.addEventListener('click', function (e) {
                e.preventDefault();
                closeMemberModal();
            });
        }

        // 2. Keyboard Accessibility (Escape key and Tab focus trap)
        document.addEventListener('keydown', function (e) {
            if (!modal.classList.contains('active')) return;

            if (e.key === 'Escape' || e.keyCode === 27) {
                e.preventDefault();
                closeMemberModal();
                return;
            }

            // Focus trap inside modal
            if (e.key === 'Tab' || e.keyCode === 9) {
                var focusables = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (focusables.length === 0) return;

                var firstFocusable = focusables[0];
                var lastFocusable = focusables[focusables.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });

        // 3. Delegate Click and Keyboard Activation on Member Cards
        var cardSelector = '.board-card[data-name], .people-card[data-name]';
        var memberCards = document.querySelectorAll(cardSelector);

        memberCards.forEach(function (card) {
            // Pointer click
            card.addEventListener('click', function (e) {
                // Ignore click if clicking an external link inside the card
                if (e.target.closest('a')) return;
                openMemberModal(card);
            });

            // Keyboard trigger: Enter (13) or Space (32)
            card.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.keyCode === 13 || e.key === ' ' || e.keyCode === 32) {
                    if (e.target.closest('a')) return;
                    e.preventDefault();
                    openMemberModal(card);
                }
            });
        });

        // 4. Adapt to Dark/Light Theme Switching
        window.addEventListener('themechange', function () {
            if (modal.classList.contains('active') && activeMemberData) {
                renderFocusChart(activeMemberData);
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMemberModal);
    } else {
        initMemberModal();
    }
})();
