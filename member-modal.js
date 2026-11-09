/**
 * ============================================================================
 * RAC DCP — MEMBER PROFILE MODAL & ROTARY AREAS OF FOCUS PIE CHART
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 *   1. Intercepts clicks and keyboard activation (Enter / Space) on all member
 *      and volunteer cards (.board-card and .people-card) on index.html.
 *   2. Extracts member metadata (HTML5 data-* attributes) including roles,
 *      tenure, district council posts, honors/awards, and participation numbers
 *      across Rotary's 7 Areas of Focus.
 *   3. Populates the responsive 3D "Green Rebel" profile modal (#memberProfileModal)
 *      with strict visual hierarchy:
 *         BOARD OF DIRECTORS / CLUB MEMBER / VOLUNTEER
 *         Member Name
 *         Club Post
 *         District Post : Current year only (if present)
 *   4. Dynamically computes the live Rotaract Movement Tenure (Years, Months, Days)
 *      from the member/volunteer join date up to the current calendar day, naturally
 *      advancing by 1 day every single day!
 *   5. Dynamically hides/removes sections that have no data:
 *         - Past Designations & Service History (hidden if empty)
 *         - District Council Designations (hidden if empty)
 *         - Awards, Citations & Honors (hidden if empty)
 *   6. Renders a native, ultra-responsive SVG Donut & Pie Chart (matching the
 *      project pie charts from pie-chart.js) showing only areas with participation
 *      values > 0, complete with smooth arc expansion animations, animated counter,
 *      and interactive center hub & companion cards.
 *   7. Provides full WCAG accessibility: backdrop dismiss, close button, Escape key
 *      listener, focus trap, and background body scroll-locking.
 * ============================================================================
 */

(function () {
    'use strict';

    // Rotary's 7 Global Areas of Focus Configuration
    var FOCUS_AREAS = [
        { key: 'peace', label: 'Peacebuilding', full: 'Peacebuilding & Conflict Prevention', icon: '🕊️', color: '#0284c7', grad: 'url(#mpmGradPeace)' },
        { key: 'health', label: 'Disease Prevention', full: 'Disease Prevention & Treatment', icon: '🩺', color: '#ef4444', grad: 'url(#mpmGradHealth)' },
        { key: 'water', label: 'Water & Sanitation', full: 'Water, Sanitation & Hygiene', icon: '💧', color: '#06b6d4', grad: 'url(#mpmGradWater)' },
        { key: 'maternal', label: 'Maternal & Child Health', full: 'Maternal & Child Health', icon: '👶', color: '#f59e0b', grad: 'url(#mpmGradMaternal)' },
        { key: 'education', label: 'Basic Education', full: 'Basic Education & Literacy', icon: '📚', color: '#8b5cf6', grad: 'url(#mpmGradEducation)' },
        { key: 'economy', label: 'Economic Development', full: 'Community Economic Development', icon: '💼', color: '#10b981', grad: 'url(#mpmGradEconomy)' },
        { key: 'environment', label: 'Environment', full: 'Supporting the Environment', icon: '🌱', color: '#16a34a', grad: 'url(#mpmGradEnvironment)' }
    ];

    // SVG Circle Circumference (r = 80) => 2 * π * 80 ≈ 502.655
    var CIRCUMFERENCE = 2 * Math.PI * 80;

    var lastFocusedCard = null;

    /**
     * Easing Function: easeOutCubic
     */
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * Smoothly counts a number from 0 to target
     */
    function animateNumber(el, target, duration) {
        if (!el) return;
        var start = 0;
        var startTime = null;
        var dur = duration || 850;

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

    /**
     * Safely decodes HTML entity strings (e.g. &amp;, &ndash;)
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
     * Calculates exact years, months, and days elapsed between startDate and today
     * Automatically increases by 1 day every calendar day!
     */
    function getMovementTenure(startDate) {
        if (!startDate || isNaN(startDate.getTime())) return null;

        var today = new Date();
        // Use midnight today to prevent time-of-day discrepancy
        var end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        var start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

        if (end < start) {
            return { years: 0, months: 0, days: 0 };
        }

        var startYear = start.getFullYear();
        var startMonth = start.getMonth(); // 0-indexed
        var startDay = start.getDate();

        var endYear = end.getFullYear();
        var endMonth = end.getMonth();
        var endDay = end.getDate();

        var years = endYear - startYear;
        var months = endMonth - startMonth;
        var days = endDay - startDay;

        if (days < 0) {
            // Borrow days from previous month
            var prevMonthDays = new Date(endYear, endMonth, 0).getDate();
            days += prevMonthDays;
            months--;
        }

        if (months < 0) {
            months += 12;
            years--;
        }

        return {
            years: Math.max(0, years),
            months: Math.max(0, months),
            days: Math.max(0, days)
        };
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
        var nameEl = document.getElementById('mpmName');
        var roleEl = document.getElementById('mpmRole');

        // District Post in Header (Current Year Only)
        var districtPostEl = document.getElementById('mpmDistrictPost');
        var districtRoleEl = document.getElementById('mpmDistrictRole');

        // Rotaract Movement Tenure Elements
        var tenureYearsEl = document.getElementById('mpmTenureYears');
        var tenureYearsLabelEl = document.getElementById('mpmTenureYearsLabel');
        var tenureMonthsEl = document.getElementById('mpmTenureMonths');
        var tenureMonthsLabelEl = document.getElementById('mpmTenureMonthsLabel');
        var tenureDaysEl = document.getElementById('mpmTenureDays');
        var tenureDaysLabelEl = document.getElementById('mpmTenureDaysLabel');
        var tenureSubEl = document.getElementById('mpmTenureSub');

        // Stats elements & boxes
        var sinceEl = document.getElementById('mpmSince');
        var totalEventsEl = document.getElementById('mpmTotalEvents');

        var pastRolesBox = document.getElementById('mpmPastRolesBox');
        var pastRolesContainer = document.getElementById('mpmPastRoles');

        var pastDistrictBox = document.getElementById('mpmPastDistrictBox');
        var pastDistrictContainer = document.getElementById('mpmPastDistrictRoles');

        var awardsBox = document.getElementById('mpmAwardsBox');
        var awardsContainer = document.getElementById('mpmAwards');

        // Pie Chart elements
        var pieContainer = document.getElementById('mpmPieContainer');
        var donutSegmentsEl = document.getElementById('mpmDonutSegments');
        var donutCenterEl = document.getElementById('mpmDonutCenter');
        var centerNumberEl = document.getElementById('mpmCenterNumber');
        var hoverIconEl = document.getElementById('mpmHoverIcon');
        var hoverNumberEl = document.getElementById('mpmHoverNumber');
        var hoverLabelEl = document.getElementById('mpmHoverLabel');
        var hoverPercentEl = document.getElementById('mpmHoverPercent');
        var focusListEl = document.getElementById('mpmFocusList');
        var zeroStateEl = document.getElementById('mpmZeroState');

        /**
         * Renders the interactive SVG Donut & Pie Chart with companion cards
         */
        function renderPieChart(activeAreas, totalEvents) {
            if (!donutSegmentsEl || !focusListEl) return;

            donutSegmentsEl.innerHTML = '';
            focusListEl.innerHTML = '';
            if (donutCenterEl) {
                donutCenterEl.classList.remove('is-hovered');
            }

            // Animate center total number
            animateNumber(centerNumberEl, totalEvents, 850);

            var currentAngle = -90; // Start at 12 o'clock
            var elementsMap = {};

            activeAreas.forEach(function (item) {
                var area = item.area;
                var count = item.count;
                var pct = count / totalEvents;
                var percentStr = (pct * 100).toFixed(1);
                var strokeLen = pct * CIRCUMFERENCE;
                var gap = (activeAreas.length > 1) ? 3.5 : 0;
                var netDash = Math.max(0, strokeLen - gap);

                // 1. Create SVG Donut Segment
                var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('class', 'mpm-donut-segment');
                circle.setAttribute('cx', '120');
                circle.setAttribute('cy', '120');
                circle.setAttribute('r', '80');
                circle.setAttribute('fill', 'none');
                circle.setAttribute('stroke', area.grad);
                circle.setAttribute('stroke-width', '26');
                circle.setAttribute('tabindex', '0');
                circle.setAttribute('role', 'button');
                circle.setAttribute('aria-label', area.full + ': ' + count + (count === 1 ? ' event, ' : ' events, ') + percentStr + '%');
                circle.setAttribute('data-area', area.key);
                circle.style.transformOrigin = '120px 120px';
                circle.style.transform = 'rotate(' + currentAngle + 'deg)';
                circle.style.strokeDasharray = '0 ' + CIRCUMFERENCE;

                donutSegmentsEl.appendChild(circle);

                // 2. Create Companion Card
                var card = document.createElement('div');
                card.className = 'mpm-focus-card';
                card.setAttribute('data-area', area.key);
                card.setAttribute('tabindex', '0');
                card.setAttribute('role', 'button');
                card.setAttribute('aria-label', area.full + ': ' + count + (count === 1 ? ' event, ' : ' events, ') + percentStr + '%');
                card.innerHTML =
                    '<div class="mpm-fc-icon" style="background: ' + area.color + '18; color: ' + area.color + ';">' + area.icon + '</div>' +
                    '<div class="mpm-fc-info">' +
                        '<span class="mpm-fc-title">' + area.label + '</span>' +
                        '<span class="mpm-fc-count">' + count + (count === 1 ? ' Event' : ' Events') + '</span>' +
                    '</div>' +
                    '<span class="mpm-fc-pill" style="background: ' + area.color + ';">' + percentStr + '%</span>';

                focusListEl.appendChild(card);

                elementsMap[area.key] = {
                    segment: circle,
                    card: card,
                    area: area,
                    count: count,
                    percentStr: percentStr,
                    netDash: netDash
                };

                // Advance angle clockwise
                currentAngle += pct * 360;

                // Smooth expansion animation
                requestAnimationFrame(function () {
                    circle.style.strokeDasharray = netDash + ' ' + (CIRCUMFERENCE - netDash);
                });
            });

            // 3. Setup Two-Way Interactive Hover & Focus Handlers
            function activateArea(key) {
                var data = elementsMap[key];
                if (!data) return;

                if (donutCenterEl) {
                    donutCenterEl.classList.add('is-hovered');
                    if (hoverIconEl) hoverIconEl.textContent = data.area.icon;
                    if (hoverNumberEl) hoverNumberEl.textContent = data.count;
                    if (hoverLabelEl) hoverLabelEl.textContent = data.area.label;
                    if (hoverPercentEl) {
                        hoverPercentEl.textContent = data.percentStr + '%';
                        hoverPercentEl.style.backgroundColor = data.area.color;
                    }
                }

                Object.keys(elementsMap).forEach(function (k) {
                    var el = elementsMap[k];
                    if (k === key) {
                        el.segment.classList.add('active');
                        el.segment.classList.remove('dimmed');
                        el.card.classList.add('active');
                        el.card.classList.remove('dimmed');
                    } else {
                        el.segment.classList.remove('active');
                        el.segment.classList.add('dimmed');
                        el.card.classList.remove('active');
                        el.card.classList.add('dimmed');
                    }
                });
            }

            function resetArea() {
                if (donutCenterEl) {
                    donutCenterEl.classList.remove('is-hovered');
                }
                Object.keys(elementsMap).forEach(function (k) {
                    var el = elementsMap[k];
                    el.segment.classList.remove('active', 'dimmed');
                    el.card.classList.remove('active', 'dimmed');
                });
            }

            Object.keys(elementsMap).forEach(function (k) {
                var item = elementsMap[k];

                // Segment interactions
                item.segment.addEventListener('mouseenter', function () { activateArea(k); });
                item.segment.addEventListener('mouseleave', resetArea);
                item.segment.addEventListener('focus', function () { activateArea(k); });
                item.segment.addEventListener('blur', resetArea);

                // Card interactions
                item.card.addEventListener('mouseenter', function () { activateArea(k); });
                item.card.addEventListener('mouseleave', resetArea);
                item.card.addEventListener('focus', function () { activateArea(k); });
                item.card.addEventListener('blur', resetArea);
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
            var rawDistrictRole = decodeHtml(card.getAttribute('data-district-role') || '');
            var rawPastDistrictRoles = decodeHtml(card.getAttribute('data-past-district-roles') || '');
            var since = decodeHtml(card.getAttribute('data-since') || '—');
            var pastRolesStr = card.getAttribute('data-past-roles') || '';
            var awardsStr = card.getAttribute('data-awards') || '';
            var joinDateAttr = card.getAttribute('data-join-date');

            // Category classification
            var isVolunteer = card.closest('#volunteers') !== null || role.toLowerCase().indexOf('volunteer') !== -1;
            var isMember = card.closest('#members') !== null || role.toLowerCase() === 'member';
            var badgeText = isVolunteer ? 'Volunteer' : (isMember ? 'Club Member' : 'Board of Directors');

            // Extract Active Focus Areas (ONLY count > 0)
            var activeAreas = [];
            var totalEvents = 0;

            FOCUS_AREAS.forEach(function (area) {
                var count = parseInt(card.getAttribute('data-' + area.key), 10) || 0;
                if (count > 0) {
                    totalEvents += count;
                    activeAreas.push({
                        area: area,
                        count: count
                    });
                }
            });

            // Separate Current Year District Post vs Past District Posts
            var currentDistrictRole = '';
            var pastDistrictRoles = [];

            if (rawPastDistrictRoles.trim()) {
                pastDistrictRoles = parseList(rawPastDistrictRoles);
                currentDistrictRole = rawDistrictRole.trim();
            } else if (rawDistrictRole.trim()) {
                var allDistRoles = parseList(rawDistrictRole);
                allDistRoles.forEach(function (distItem) {
                    if (distItem.indexOf('2026-27') !== -1 || distItem.indexOf('2026–27') !== -1) {
                        currentDistrictRole = distItem;
                    } else {
                        pastDistrictRoles.push(distItem);
                    }
                });
                if (!currentDistrictRole && allDistRoles.length > 0) {
                    currentDistrictRole = allDistRoles[0];
                }
            }

            // Avatar image
            var img = card.querySelector('img');
            var avatarSrc = img ? img.src : '';
            var avatarAlt = img ? img.alt : name;

            // 1. Populate Header
            if (avatarEl) {
                avatarEl.src = avatarSrc;
                avatarEl.alt = avatarAlt;
            }
            if (badgeEl) badgeEl.textContent = badgeText;
            if (nameEl) nameEl.textContent = name;
            if (roleEl) roleEl.textContent = role;

            // District Post : Current year only
            if (districtPostEl && districtRoleEl) {
                if (currentDistrictRole.trim()) {
                    districtRoleEl.textContent = currentDistrictRole.trim();
                    districtPostEl.style.display = 'inline-flex';
                } else {
                    districtPostEl.style.display = 'none';
                }
            }

            // 2. Compute and Display Rotaract Movement Tenure (Days advance live every day!)
            var startDate = null;
            if (joinDateAttr && joinDateAttr.trim()) {
                var parts = joinDateAttr.trim().split('-');
                if (parts.length === 3) {
                    startDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                }
            }

            if (!startDate || isNaN(startDate.getTime())) {
                if (since.indexOf('2023') !== -1) {
                    startDate = new Date(2023, 9, 12); // Oct 12, 2023 (Club Charter date)
                } else if (since.indexOf('2024') !== -1) {
                    startDate = new Date(2024, 6, 1);  // July 1, 2024 (RY 2024-25)
                } else if (since.indexOf('2025') !== -1) {
                    startDate = new Date(2025, 6, 1);  // July 1, 2025 (RY 2025-26)
                } else if (since.indexOf('2026') !== -1) {
                    startDate = new Date(2026, 6, 1);  // July 1, 2026 (RY 2026-27)
                } else {
                    startDate = new Date(2023, 9, 12);
                }
            }

            var tenure = getMovementTenure(startDate);
            if (tenure) {
                animateNumber(tenureYearsEl, tenure.years, 650);
                animateNumber(tenureMonthsEl, tenure.months, 700);
                animateNumber(tenureDaysEl, tenure.days, 800);

                if (tenureYearsLabelEl) tenureYearsLabelEl.textContent = tenure.years === 1 ? 'Year' : 'Years';
                if (tenureMonthsLabelEl) tenureMonthsLabelEl.textContent = tenure.months === 1 ? 'Month' : 'Months';
                if (tenureDaysLabelEl) tenureDaysLabelEl.textContent = tenure.days === 1 ? 'Day' : 'Days';
                if (tenureSubEl) {
                    tenureSubEl.textContent = isVolunteer ? 'Volunteer Service Journey' : 'Active Movement Journey';
                }
            }

            // 3. Quick Stats: Member Since & Total Events
            if (sinceEl) sinceEl.textContent = since;
            if (totalEventsEl) {
                totalEventsEl.textContent = totalEvents + (totalEvents === 1 ? ' Event' : ' Events');
            }

            // 4. Past Club Designations & Service History (Remove section if empty)
            var pastRoles = parseList(pastRolesStr);
            if (pastRolesBox && pastRolesContainer) {
                if (pastRoles.length > 0) {
                    pastRolesBox.style.display = '';
                    pastRolesContainer.innerHTML = '';
                    pastRoles.forEach(function (roleItem) {
                        var pill = document.createElement('span');
                        pill.className = 'mpm-pill mpm-pill-role';
                        pill.textContent = roleItem;
                        pastRolesContainer.appendChild(pill);
                    });
                } else {
                    pastRolesBox.style.display = 'none';
                }
            }

            // 5. District Council Designations (Remove section if empty)
            if (pastDistrictBox && pastDistrictContainer) {
                if (pastDistrictRoles.length > 0) {
                    pastDistrictBox.style.display = '';
                    pastDistrictContainer.innerHTML = '';
                    pastDistrictRoles.forEach(function (distItem) {
                        var pill = document.createElement('span');
                        pill.className = 'mpm-pill mpm-pill-district';
                        pill.textContent = distItem;
                        pastDistrictContainer.appendChild(pill);
                    });
                } else {
                    pastDistrictBox.style.display = 'none';
                }
            }

            // 6. Awards, Citations & Honors (Remove section if empty)
            var awards = parseList(awardsStr);
            if (awardsBox && awardsContainer) {
                if (awards.length > 0) {
                    awardsBox.style.display = '';
                    awardsContainer.innerHTML = '';
                    awards.forEach(function (awardItem) {
                        var pill = document.createElement('span');
                        pill.className = 'mpm-pill mpm-pill-award';
                        pill.innerHTML = '<span class="mpm-award-icon" aria-hidden="true">🏆</span> ' + awardItem;
                        awardsContainer.appendChild(pill);
                    });
                } else {
                    awardsBox.style.display = 'none';
                }
            }

            // 7. Rotary Areas of Focus Interactive Pie Chart
            if (totalEvents > 0 && activeAreas.length > 0) {
                if (pieContainer) pieContainer.style.display = '';
                if (zeroStateEl) zeroStateEl.style.display = 'none';
                requestAnimationFrame(function () {
                    renderPieChart(activeAreas, totalEvents);
                });
            } else {
                if (pieContainer) pieContainer.style.display = 'none';
                if (zeroStateEl) zeroStateEl.style.display = 'flex';
                if (centerNumberEl) centerNumberEl.textContent = '0';
            }

            // Show Modal and lock background scroll
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('lightbox-open');

            // Focus Close Button for accessibility
            if (closeBtn) {
                setTimeout(function () {
                    closeBtn.focus();
                }, 80);
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
            card.addEventListener('click', function (e) {
                if (e.target.closest('a')) return;
                openMemberModal(card);
            });

            card.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.keyCode === 13 || e.key === ' ' || e.keyCode === 32) {
                    if (e.target.closest('a')) return;
                    e.preventDefault();
                    openMemberModal(card);
                }
            });
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMemberModal);
    } else {
        initMemberModal();
    }
})();
