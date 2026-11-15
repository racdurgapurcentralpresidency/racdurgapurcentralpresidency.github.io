/**
 * ============================================================================
 * RAC DCP CARE CONNECT — MASTER JAVASCRIPT CONTROLLER
 * Community Assistance & Collaboration Platform
 * Rotaract Club of Durgapur Central Presidency | RI District 3240
 * ============================================================================
 * 
 * Features:
 * 1. Synchronous & Real-Time Theme Toggle (Light / Dark) synced with main site.
 * 2. Mobile Navigation Drawer & Smooth Scrolling.
 * 3. Category Filter Tabs & Quick Pre-selection from Showcase Cards.
 * 4. Multi-Step Form Wizard (Steps 1 to 4) with Dynamic Branching:
 *    - Option A: Request Assistance
 *    - Option B: Collaborate With Us
 * 5. Layered Anti-Spam & Fraud Prevention:
 *    - Layer 1: Client-side field validations & minimum character limits.
 *    - Layer 2: Honeypot trap & Dynamic Math Security Challenge.
 *    - Layer 3: Submission rate-limiting (max 3 submissions per hour).
 *    - Layer 4: Client-side Heuristic Risk-Scoring Engine (0 - 100).
 * 6. Reference ID Generator (CCD-YYYY-XXXX format) with one-click copy.
 * 7. Dispatcher with Google Apps Script Web App integration & graceful staging mode.
 * 8. FAQ Accordion & Legal Dialog Modals (Privacy & Terms).
 */

(function () {
    'use strict';

    /* =========================================================================
       CONFIGURATION & BACKEND INTEGRATION
       ========================================================================= */
    const CONFIG = {
        // Replace with your published Google Apps Script Web App URL once deployed.
        // If left empty or placeholder, the system runs safely in Staging / Demo mode.
        BACKEND_URL: 'https://script.google.com/macros/s/AKfycbws2UTYy2IoMNSsWF-0BkC37E93SZF6yqwVGUfz1P5gbvp0N0Me9UnykHZ3VzF0AzUyGg/exec', // e.g., 'https://script.google.com/macros/s/AKfycb.../exec'
        CURRENT_YEAR: new Date().getFullYear() || 2026,
        MAX_HOURLY_SUBMISSIONS: 3,
        STORAGE_KEY_SUBMISSIONS: 'racdcp_cc_submissions',
        STORAGE_KEY_RATE_LIMIT: 'racdcp_cc_rate_limit',
        STORAGE_THEME_KEY: 'racdcp-theme',
        STORAGE_LANG_KEY: 'racdcp_care_connect_lang'
    };

    /* =========================================================================
       DOM SELECTORS & CACHE
       ========================================================================= */
    const DOM = {
        // Theme & Navigation
        html: document.documentElement,
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        mobileMenuBtn: document.getElementById('mobile-menu-btn'),
        navMenu: document.getElementById('primary-nav-menu'),

        // Category Filter
        categoryTabs: document.querySelectorAll('.category-tab-btn'),
        categoryCards: document.querySelectorAll('.category-card'),
        quickActionButtons: document.querySelectorAll('[data-intent]'),

        // Wizard Steps
        wizardForm: document.getElementById('care-connect-form'),
        wizardProgressFill: document.getElementById('wizard-progress-fill'),
        stepIndicators: [
            document.getElementById('step-ind-1'),
            document.getElementById('step-ind-2'),
            document.getElementById('step-ind-3'),
            document.getElementById('step-ind-4')
        ],
        stepPanels: [
            document.getElementById('wizard-step-1'),
            document.getElementById('wizard-step-2'),
            document.getElementById('wizard-step-3'),
            document.getElementById('wizard-step-4')
        ],
        btnPrev: document.getElementById('btn-wizard-prev'),
        btnNext: document.getElementById('btn-wizard-next'),
        btnSubmit: document.getElementById('btn-wizard-submit'),
        btnRestart: document.getElementById('btn-wizard-restart'),

        // Intent Cards
        cardAssistance: document.getElementById('intent-card-assistance'),
        cardCollab: document.getElementById('intent-card-collab'),
        gridAssistance: document.getElementById('category-grid-assistance'),
        gridCollab: document.getElementById('category-grid-collab'),

        // Form Branches
        branchAssistance: document.getElementById('branch-assistance-fields'),
        branchCollab: document.getElementById('branch-collab-fields'),

        // Assistance Inputs
        astName: document.getElementById('ast-name'),
        astPhone: document.getElementById('ast-phone'),
        astEmail: document.getElementById('ast-email'),
        astApplicantType: document.getElementById('ast-applicant-type'),
        astCity: document.getElementById('ast-city'),
        astDistrict: document.getElementById('ast-district'),
        astBeneficiaries: document.getElementById('ast-beneficiaries'),
        astTimeline: document.getElementById('ast-timeline'),
        astDesc: document.getElementById('ast-description'),
        astCharCount: document.getElementById('ast-char-count'),

        // Collaboration Inputs
        colOrgName: document.getElementById('col-org-name'),
        colOrgType: document.getElementById('col-org-type'),
        colContactName: document.getElementById('col-contact-name'),
        colPhone: document.getElementById('col-phone'),
        colEmail: document.getElementById('col-email'),
        colWebsite: document.getElementById('col-website'),
        colLocation: document.getElementById('col-location'),
        colTimeline: document.getElementById('col-timeline'),
        colDesc: document.getElementById('col-description'),
        colResources: document.getElementById('col-resources'),
        colCharCount: document.getElementById('col-char-count'),

        // Security & Review
        reviewSummary: document.getElementById('review-card-summary'),
        mathText: document.getElementById('math-challenge-text'),
        mathInput: document.getElementById('math-security-answer'),
        mathRefreshBtn: document.getElementById('math-refresh-btn'),
        mathError: document.getElementById('math-error-msg'),
        honeypotField: document.getElementById('cc_honeypot_field'),
        consentCheck: document.getElementById('user-consent-check'),
        consentError: document.getElementById('consent-error-msg'),

        // Confirmation Screen
        confirmRefId: document.getElementById('confirmation-ref-id'),
        copyRefBtn: document.getElementById('copy-ref-btn'),
        backendStatusText: document.getElementById('backend-status-text'),

        // FAQ & Modals
        faqItems: document.querySelectorAll('.faq-item'),
        openPrivacyBtn: document.getElementById('open-privacy-modal'),
        closePrivacyBtn: document.getElementById('close-privacy-modal'),
        privacyModal: document.getElementById('privacy-modal'),
        openTermsBtn: document.getElementById('open-terms-modal'),
        closeTermsBtn: document.getElementById('close-terms-modal'),
        termsModal: document.getElementById('terms-modal')
    };

    /* =========================================================================
       APPLICATION STATE
       ========================================================================= */
    const state = {
        currentStep: 1,
        selectedIntent: 'assistance', // 'assistance' | 'collaboration'
        selectedCategory: 'Education Support',
        mathAnswer: 0,
        formStartTime: Date.now(),
        lastGeneratedRef: ''
    };

    /* =========================================================================
       1. THEME CONTROLLER (SYNCED WITH MAIN SITE)
       ========================================================================= */
    function initTheme() {
        let currentTheme = localStorage.getItem(CONFIG.STORAGE_THEME_KEY);
        if (!currentTheme) {
            currentTheme = DOM.html.getAttribute('data-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        }
        applyTheme(currentTheme);

        if (DOM.themeToggleBtn) {
            DOM.themeToggleBtn.addEventListener('click', function () {
                const active = DOM.html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                applyTheme(active);
                localStorage.setItem(CONFIG.STORAGE_THEME_KEY, active);
            });
        }
    }

    function applyTheme(theme) {
        DOM.html.setAttribute('data-theme', theme);
    }

    /* =========================================================================
       2. MOBILE MENU & SMOOTH SCROLLING
       ========================================================================= */
    function initNavigation() {
        if (DOM.mobileMenuBtn && DOM.navMenu) {
            DOM.mobileMenuBtn.addEventListener('click', function () {
                const isOpen = DOM.navMenu.classList.toggle('mobile-open');
                DOM.mobileMenuBtn.setAttribute('aria-expanded', isOpen);
            });

            // Close mobile menu when clicking outside or clicking any nav link
            document.addEventListener('click', function (e) {
                if (!DOM.mobileMenuBtn.contains(e.target) && !DOM.navMenu.contains(e.target)) {
                    DOM.navMenu.classList.remove('mobile-open');
                    DOM.mobileMenuBtn.setAttribute('aria-expanded', 'false');
                }
            });

            const links = DOM.navMenu.querySelectorAll('.nav-link, .mobile-drawer-site-link, .mobile-drawer-cta-btn');
            links.forEach(function (link) {
                link.addEventListener('click', function () {
                    DOM.navMenu.classList.remove('mobile-open');
                    DOM.mobileMenuBtn.setAttribute('aria-expanded', 'false');
                });
            });
        }
    }

    /* =========================================================================
       3. CATEGORY SHOWCASE FILTERING & QUICK SELECTION
       ========================================================================= */
    function initCategoryFilter() {
        // Tab switching
        DOM.categoryTabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                DOM.categoryTabs.forEach(function (t) {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');

                const filter = tab.getAttribute('data-filter');
                DOM.categoryCards.forEach(function (card) {
                    const group = card.getAttribute('data-group');
                    if (filter === 'all' || group === filter || (filter === 'assistance' && group === 'assistance') || (filter === 'collaboration' && group === 'collaboration')) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });

        // Quick action buttons in sections 2, 3, 4
        DOM.quickActionButtons.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                const intent = btn.getAttribute('data-intent');
                const category = btn.getAttribute('data-category');

                if (intent) {
                    setIntent(intent);
                }

                if (category) {
                    preselectCategoryByNameOrSlug(category);
                }

                // Scroll to request system wizard smoothly (instant jump on low-spec)
                const wizardSection = document.getElementById('request-system');
                if (wizardSection) {
                    const isLowEnd = document.documentElement.classList.contains('low-spec');
                    wizardSection.scrollIntoView({ behavior: isLowEnd ? 'auto' : 'smooth', block: 'start' });
                }
            });
        });

        // Hero CTA buttons
        const heroAssistanceBtn = document.getElementById('hero-btn-assistance');
        const heroCollabBtn = document.getElementById('hero-btn-collab');

        if (heroAssistanceBtn) {
            heroAssistanceBtn.addEventListener('click', function () {
                setIntent('assistance');
                const isLowEnd = document.documentElement.classList.contains('low-spec');
                document.getElementById('request-system').scrollIntoView({ behavior: isLowEnd ? 'auto' : 'smooth' });
            });
        }

        if (heroCollabBtn) {
            heroCollabBtn.addEventListener('click', function () {
                setIntent('collaboration');
                const isLowEnd = document.documentElement.classList.contains('low-spec');
                document.getElementById('request-system').scrollIntoView({ behavior: isLowEnd ? 'auto' : 'smooth' });
            });
        }
    }

    function preselectCategoryByNameOrSlug(slugOrName) {
        const slugMap = {
            'education-support': 'Education Support',
            'food-essentials': 'Food & Basic Essentials',
            'medical-healthcare': 'Medical & Healthcare Support',
            'community-welfare': 'Community Welfare',
            'disability-support': 'Disability & Special Needs',
            'environmental-support': 'Environmental Support',
            'ngo-collab': 'NGO Collaboration',
            'institutional-partnership': 'Institutional Partnership',
            'csr-partnership': 'CSR & Corporate Partnership',
            'volunteering': 'Volunteering',
            'resource-contribution': 'Resource Contribution',
            'awareness-campaigns': 'Awareness Campaigns',
            'other-assistance': 'Other Assistance'
        };

        const targetName = slugMap[slugOrName] || slugOrName;
        const activeGrid = state.selectedIntent === 'assistance' ? DOM.gridAssistance : DOM.gridCollab;
        const radioLabels = activeGrid.querySelectorAll('.category-radio-item');

        radioLabels.forEach(function (label) {
            const input = label.querySelector('input[type="radio"]');
            if (input && input.value.toLowerCase().includes(targetName.toLowerCase().slice(0, 10))) {
                input.checked = true;
                highlightRadio(label, activeGrid);
                state.selectedCategory = input.value;
            }
        });
    }

    /* =========================================================================
       4. MULTI-STEP WIZARD CONTROLLER
       ========================================================================= */
    function initWizard() {
        // Intent card click handlers
        if (DOM.cardAssistance) {
            DOM.cardAssistance.addEventListener('click', function () {
                setIntent('assistance');
            });
            DOM.cardAssistance.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIntent('assistance');
                }
            });
        }

        if (DOM.cardCollab) {
            DOM.cardCollab.addEventListener('click', function () {
                setIntent('collaboration');
            });
            DOM.cardCollab.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIntent('collaboration');
                }
            });
        }

        // Category radio button changes
        bindRadioGrid(DOM.gridAssistance);
        bindRadioGrid(DOM.gridCollab);

        // Character counter bindings
        if (DOM.astDesc && DOM.astCharCount) {
            DOM.astDesc.addEventListener('input', function () {
                DOM.astCharCount.textContent = DOM.astDesc.value.length + ' chars';
                if (DOM.astDesc.value.length >= 20) {
                    DOM.astDesc.classList.remove('invalid');
                }
            });
        }

        if (DOM.colDesc && DOM.colCharCount) {
            DOM.colDesc.addEventListener('input', function () {
                DOM.colCharCount.textContent = DOM.colDesc.value.length + ' chars';
                if (DOM.colDesc.value.length >= 20) {
                    DOM.colDesc.classList.remove('invalid');
                }
            });
        }

        // Wizard navigation buttons
        if (DOM.btnNext) {
            DOM.btnNext.addEventListener('click', handleNextStep);
        }

        if (DOM.btnPrev) {
            DOM.btnPrev.addEventListener('click', handlePrevStep);
        }

        if (DOM.wizardForm) {
            DOM.wizardForm.addEventListener('submit', handleFormSubmit);
        }

        if (DOM.btnRestart) {
            DOM.btnRestart.addEventListener('click', resetWizard);
        }

        // Math challenge refresh
        if (DOM.mathRefreshBtn) {
            DOM.mathRefreshBtn.addEventListener('click', generateMathChallenge);
        }

        // Copy reference ID
        if (DOM.copyRefBtn) {
            DOM.copyRefBtn.addEventListener('click', copyReferenceId);
        }

        // Generate first math challenge
        generateMathChallenge();
    }

    function setIntent(intent) {
        state.selectedIntent = intent;
        if (intent === 'assistance') {
            DOM.cardAssistance.classList.add('selected');
            DOM.cardAssistance.setAttribute('aria-pressed', 'true');
            DOM.cardCollab.classList.remove('selected');
            DOM.cardCollab.setAttribute('aria-pressed', 'false');

            DOM.gridAssistance.style.display = 'grid';
            DOM.gridCollab.style.display = 'none';

            DOM.branchAssistance.style.display = 'block';
            DOM.branchCollab.style.display = 'none';

            const activeInput = DOM.gridAssistance.querySelector('input[type="radio"]:checked');
            if (activeInput) state.selectedCategory = activeInput.value;
        } else {
            DOM.cardCollab.classList.add('selected');
            DOM.cardCollab.setAttribute('aria-pressed', 'true');
            DOM.cardAssistance.classList.remove('selected');
            DOM.cardAssistance.setAttribute('aria-pressed', 'false');

            DOM.gridCollab.style.display = 'grid';
            DOM.gridAssistance.style.display = 'none';

            DOM.branchCollab.style.display = 'block';
            DOM.branchAssistance.style.display = 'none';

            const activeInput = DOM.gridCollab.querySelector('input[type="radio"]:checked');
            if (activeInput) state.selectedCategory = activeInput.value;
        }
    }

    function bindRadioGrid(grid) {
        if (!grid) return;
        const labels = grid.querySelectorAll('.category-radio-item');
        labels.forEach(function (label) {
            label.addEventListener('click', function () {
                highlightRadio(label, grid);
                const input = label.querySelector('input[type="radio"]');
                if (input) {
                    input.checked = true;
                    state.selectedCategory = input.value;
                }
            });
        });
    }

    function highlightRadio(selectedLabel, parentGrid) {
        parentGrid.querySelectorAll('.category-radio-item').forEach(function (item) {
            item.classList.remove('selected');
        });
        selectedLabel.classList.add('selected');
    }

    /* Step Navigation */
    function goToStep(stepNumber) {
        state.currentStep = stepNumber;

        // Update progress bar
        const progressPercentages = [25, 50, 75, 100];
        if (DOM.wizardProgressFill) {
            DOM.wizardProgressFill.style.width = progressPercentages[stepNumber - 1] + '%';
        }

        // Update step indicators
        DOM.stepIndicators.forEach(function (ind, index) {
            ind.classList.remove('active', 'completed');
            if (index + 1 === stepNumber) {
                ind.classList.add('active');
            } else if (index + 1 < stepNumber) {
                ind.classList.add('completed');
            }
        });

        // Switch panels
        DOM.stepPanels.forEach(function (panel, index) {
            if (index + 1 === stepNumber) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });

        // Configure footer buttons
        if (stepNumber === 1) {
            DOM.btnPrev.style.display = 'none';
            DOM.btnNext.style.display = 'inline-flex';
            DOM.btnSubmit.style.display = 'none';
            DOM.btnRestart.style.display = 'none';
        } else if (stepNumber === 2) {
            DOM.btnPrev.style.display = 'inline-flex';
            DOM.btnNext.style.display = 'inline-flex';
            DOM.btnSubmit.style.display = 'none';
            DOM.btnRestart.style.display = 'none';
        } else if (stepNumber === 3) {
            DOM.btnPrev.style.display = 'inline-flex';
            DOM.btnNext.style.display = 'none';
            DOM.btnSubmit.style.display = 'inline-flex';
            DOM.btnRestart.style.display = 'none';
            buildReviewSummary();
        } else if (stepNumber === 4) {
            DOM.btnPrev.style.display = 'none';
            DOM.btnNext.style.display = 'none';
            DOM.btnSubmit.style.display = 'none';
            DOM.btnRestart.style.display = 'inline-flex';
        }

        // Scroll wizard into view smoothly (instant on low-spec)
        const container = document.getElementById('wizard-container');
        if (container) {
            const isLowEnd = document.documentElement.classList.contains('low-spec');
            container.scrollIntoView({ behavior: isLowEnd ? 'auto' : 'smooth', block: 'nearest' });
        }
    }

    function handleNextStep() {
        if (state.currentStep === 1) {
            goToStep(2);
        } else if (state.currentStep === 2) {
            if (validateStepTwo()) {
                goToStep(3);
            }
        }
    }

    function handlePrevStep() {
        if (state.currentStep > 1 && state.currentStep < 4) {
            goToStep(state.currentStep - 1);
        }
    }

    /* =========================================================================
       5. VALIDATION ENGINE (LAYER 1)
       ========================================================================= */
    function validateStepTwo() {
        let isValid = true;
        const phoneRegex = /^[6-9]\d{9}$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (state.selectedIntent === 'assistance') {
            // Name
            if (!DOM.astName.value.trim()) {
                markInvalid(DOM.astName);
                isValid = false;
            } else {
                markValid(DOM.astName);
            }

            // Phone
            const phoneVal = DOM.astPhone.value.trim().replace(/\D/g, '');
            if (!phoneRegex.test(phoneVal)) {
                markInvalid(DOM.astPhone);
                isValid = false;
            } else {
                markValid(DOM.astPhone);
            }

            // Email (optional, validate format if entered)
            if (DOM.astEmail.value.trim() && !emailRegex.test(DOM.astEmail.value.trim())) {
                markInvalid(DOM.astEmail);
                isValid = false;
            } else {
                markValid(DOM.astEmail);
            }

            // City
            if (!DOM.astCity.value.trim()) {
                markInvalid(DOM.astCity);
                isValid = false;
            } else {
                markValid(DOM.astCity);
            }

            // District
            if (!DOM.astDistrict.value.trim()) {
                markInvalid(DOM.astDistrict);
                isValid = false;
            } else {
                markValid(DOM.astDistrict);
            }

            // Description (min 20 characters)
            if (!DOM.astDesc.value.trim() || DOM.astDesc.value.trim().length < 20) {
                markInvalid(DOM.astDesc);
                isValid = false;
            } else {
                markValid(DOM.astDesc);
            }

        } else {
            // Collaboration Branch
            // Org Name
            if (!DOM.colOrgName.value.trim()) {
                markInvalid(DOM.colOrgName);
                isValid = false;
            } else {
                markValid(DOM.colOrgName);
            }

            // Contact Name
            if (!DOM.colContactName.value.trim()) {
                markInvalid(DOM.colContactName);
                isValid = false;
            } else {
                markValid(DOM.colContactName);
            }

            // Phone
            const colPhoneVal = DOM.colPhone.value.trim().replace(/\D/g, '');
            if (!phoneRegex.test(colPhoneVal)) {
                markInvalid(DOM.colPhone);
                isValid = false;
            } else {
                markValid(DOM.colPhone);
            }

            // Email (required for collaboration)
            if (!DOM.colEmail.value.trim() || !emailRegex.test(DOM.colEmail.value.trim())) {
                markInvalid(DOM.colEmail);
                isValid = false;
            } else {
                markValid(DOM.colEmail);
            }

            // Location
            if (!DOM.colLocation.value.trim()) {
                markInvalid(DOM.colLocation);
                isValid = false;
            } else {
                markValid(DOM.colLocation);
            }

            // Description (min 20 characters)
            if (!DOM.colDesc.value.trim() || DOM.colDesc.value.trim().length < 20) {
                markInvalid(DOM.colDesc);
                isValid = false;
            } else {
                markValid(DOM.colDesc);
            }
        }

        return isValid;
    }

    function markInvalid(input) {
        input.classList.add('invalid');
        input.focus();
    }

    function markValid(input) {
        input.classList.remove('invalid');
    }

    /* Build Step 3 Review Card Summary */
    function buildReviewSummary() {
        if (!DOM.reviewSummary) return;

        let rows = '';
        if (state.selectedIntent === 'assistance') {
            rows += createReviewRow('Connection Type', 'Request Assistance (Community Aid)');
            rows += createReviewRow('Category', state.selectedCategory);
            rows += createReviewRow('Full Name', DOM.astName.value.trim());
            rows += createReviewRow('Mobile Number', DOM.astPhone.value.trim());
            if (DOM.astEmail.value.trim()) {
                rows += createReviewRow('Email Address', DOM.astEmail.value.trim());
            }
            rows += createReviewRow('Applicant Type', DOM.astApplicantType.value);
            rows += createReviewRow('Location', DOM.astCity.value.trim() + ', ' + DOM.astDistrict.value.trim());
            if (DOM.astBeneficiaries.value) {
                rows += createReviewRow('People Benefited', DOM.astBeneficiaries.value + ' (approx)');
            }
            rows += createReviewRow('Timeline Urgency', DOM.astTimeline.value);
            rows += createReviewRow('Description', DOM.astDesc.value.trim());
        } else {
            rows += createReviewRow('Connection Type', 'Collaborate With Us (Partnership)');
            rows += createReviewRow('Collaboration Category', state.selectedCategory);
            rows += createReviewRow('Organisation / Entity', DOM.colOrgName.value.trim());
            rows += createReviewRow('Organisation Type', DOM.colOrgType.value);
            rows += createReviewRow('Contact Person', DOM.colContactName.value.trim());
            rows += createReviewRow('Mobile Number', DOM.colPhone.value.trim());
            rows += createReviewRow('Official Email', DOM.colEmail.value.trim());
            if (DOM.colWebsite.value.trim()) {
                rows += createReviewRow('Website / Profile', DOM.colWebsite.value.trim());
            }
            rows += createReviewRow('Headquarter Location', DOM.colLocation.value.trim());
            rows += createReviewRow('Proposed Timeline', DOM.colTimeline.value);
            rows += createReviewRow('Proposal Description', DOM.colDesc.value.trim());
            if (DOM.colResources.value.trim()) {
                rows += createReviewRow('Resources Offered', DOM.colResources.value.trim());
            }
        }

        DOM.reviewSummary.innerHTML = rows;
    }

    function createReviewRow(label, value) {
        return `
            <div class="review-row">
                <div class="review-label">${escapeHtml(label)}</div>
                <div class="review-value">${escapeHtml(value)}</div>
            </div>
        `;
    }

    /* =========================================================================
       6. ANTI-SPAM & FRAUD PREVENTION (LAYERS 2, 3, & 4)
       ========================================================================= */
    function generateMathChallenge() {
        const a = Math.floor(Math.random() * 9) + 3; // 3 to 11
        const b = Math.floor(Math.random() * 8) + 2; // 2 to 9
        state.mathAnswer = a + b;
        if (DOM.mathText) {
            DOM.mathText.textContent = `${a} + ${b} = ?`;
        }
        if (DOM.mathInput) {
            DOM.mathInput.value = '';
            DOM.mathInput.classList.remove('invalid');
        }
        if (DOM.mathError) {
            DOM.mathError.style.display = 'none';
        }
    }

    function verifyMathChallenge() {
        const entered = parseInt(DOM.mathInput.value, 10);
        if (isNaN(entered) || entered !== state.mathAnswer) {
            DOM.mathInput.classList.add('invalid');
            DOM.mathError.style.display = 'block';
            return false;
        }
        DOM.mathInput.classList.remove('invalid');
        DOM.mathError.style.display = 'none';
        return true;
    }

    function checkHoneypot() {
        // If the invisible honeypot field has been filled, it is almost certainly a bot.
        if (DOM.honeypotField && DOM.honeypotField.value.trim().length > 0) {
            return false;
        }
        return true;
    }

    function checkRateLimit() {
        try {
            const now = Date.now();
            const oneHourAgo = now - (60 * 60 * 1000);
            const history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY_RATE_LIMIT) || '[]');
            const recent = history.filter(ts => ts > oneHourAgo);

            if (recent.length >= CONFIG.MAX_HOURLY_SUBMISSIONS) {
                return false;
            }
            recent.push(now);
            localStorage.setItem(CONFIG.STORAGE_KEY_RATE_LIMIT, JSON.stringify(recent));
            return true;
        } catch (e) {
            return true; // Graceful fallback
        }
    }

    /**
     * Enhanced Client-side Heuristic Risk-Scoring & Multilingual Content Moderation Engine
     * Assigns a score from 0 (very safe) to 100 (high risk of spam/abuse)
     * Detects bad words and slangs across English, Hindi (Devanagari + Hinglish), and Bengali (Bengali + Banglish).
     * Per policy: Submissions are NEVER dropped or deleted; they are preserved and flagged for manual review.
     */
    function computeRiskScore(payload, isHoneypotTriggered) {
        let score = 0;
        const flags = [];

        // 1. Honeypot check (preserves bot requests marked as spam)
        if (isHoneypotTriggered) {
            score += 95;
            flags.push('HONEYPOT_BOT_TRAP_TRIGGERED');
        }

        // 2. Time-to-submit check (bots fill in < 4 seconds)
        const secondsElapsed = (Date.now() - state.formStartTime) / 1000;
        if (secondsElapsed < 4) {
            score += 40;
            flags.push('RAPID_SUBMISSION_BOT_PATTERN');
        } else if (secondsElapsed > 20) {
            flags.push('GENUINE_HUMAN_PACE');
        }

        const combinedText = ((payload.description || '') + ' ' + (payload.org_name || '') + ' ' + (payload.name || '') + ' ' + (payload.resources_offered || '')).toLowerCase();

        // 3. Multilingual Bad Words & Slangs Filter
        // A. English Profanity & Harassment
        const enAbusiveRegexes = [
            /\b(fuck|fucking|fucked|fucker|fck|f\*ck|f\*\*k)\b/i,
            /\b(bitch|bitches|b\*tch|b\!tch)\b/i,
            /\b(shit|bullshit|sh\*t)\b/i,
            /\b(asshole|arsehole|bastard|cunt|dick|dickhead|pussy|motherfucker|motherfucking)\b/i,
            /\b(cock|cocksucker|wanker|prick|whore|slut|faggot|fag|nigger|nigga|retard)\b/i,
            /\b(kill\s+yourself|go\s+die)\b/i
        ];
        enAbusiveRegexes.forEach(rx => {
            if (rx.test(combinedText)) {
                score += 85;
                if (!flags.includes('ABUSIVE_LANG_EN')) flags.push('ABUSIVE_LANG_EN');
            }
        });

        // B. Hindi Profanity (Devanagari Script & Hinglish Transliteration)
        const hiDevWords = [
            'मादरचोद', 'मादरचোদ', 'भोसड़ी', 'भोसडी', 'भोसड़ीके', 'भोसडीके', 'गांडू', 'गांडु',
            'चूतिया', 'चूतिये', 'चूत', 'लौड़ा', 'लौडे', 'लौड़े', 'लौडा', 'रांड', 'रंडी',
            'हरामी', 'कमीने', 'कमीना', 'दल्ले', 'दल्ला', 'छिछोरे', 'टट्टी', 'झांट', 'झाटू',
            'कुतिया', 'बहनचोद', 'बेटीचोद', 'लंड', 'बकचोद', 'मादरजात'
        ];
        hiDevWords.forEach(w => {
            if (combinedText.includes(w)) {
                score += 90;
                if (!flags.includes('ABUSIVE_LANG_HI_DEV')) flags.push('ABUSIVE_LANG_HI_DEV');
            }
        });
        if (/(?:^|[^\u0900-\u097F])(गांड|कुत्ता|साले|साला)(?:$|[^\u0900-\u097F])/i.test(combinedText)) {
            score += 80;
            if (!flags.includes('ABUSIVE_LANG_HI_DEV')) flags.push('ABUSIVE_LANG_HI_DEV');
        }

        const hiHinglishRegexes = [
            /\b(madarchod|madarchot|bhosdike|bhosadike|bhosdi|bhosada|bhenchod|behenchod|banchod)\b/i,
            /\b(gaand|gandu|gaandu|chutiya|chutiye|chutya|lauda|loda|lavda|chut|choot|randi|raand)\b/i,
            /\b(harami|kamine|kamina|dalle|dalla|tatti|jhaant|jhant|bakchod|madarjaat|bkl|mkc|bsdk|tmkc)\b/i,
            /\b(teri\s+maa\s+ki|tere\s+baap\s+ka|maa\s+ki\s+chut|chod\s+dunga)\b/i
        ];
        hiHinglishRegexes.forEach(rx => {
            if (rx.test(combinedText)) {
                score += 85;
                if (!flags.includes('ABUSIVE_LANG_HI_ROMAN')) flags.push('ABUSIVE_LANG_HI_ROMAN');
            }
        });

        // C. Bengali Profanity (Bengali Script & Banglish Transliteration)
        const bnScriptWords = [
            'মাদারচোদ', 'মাডারচোদ', 'বোকাচোদা', 'চোদা', 'চোদনা', 'চুদি', 'চুদা',
            'খানকি', 'খানকির', 'মাগী', 'মাগির', 'ভোদাই', 'বালছাল', 'গাঁড়ু', 'গাঁড়',
            'গাড়মারানি', 'হারামজাদা', 'হারামখোর', 'শুয়োরের বাচ্চা', 'বেশ্যা', 'নটী',
            'লেবড়া', 'কুত্তার বাচ্চা', 'পোদমারানি', 'বেজন্মা', 'চোদানির'
        ];
        bnScriptWords.forEach(w => {
            if (combinedText.includes(w)) {
                score += 90;
                if (!flags.includes('ABUSIVE_LANG_BN_SCRIPT')) flags.push('ABUSIVE_LANG_BN_SCRIPT');
            }
        });
        if (/(?:^|[^\u0980-\u09FF])(বাল|কুত্তা|কুত্তি|শালা|শালি|পোদ|খচ্চর)(?:$|[^\u0980-\u09FF])/i.test(combinedText)) {
            score += 80;
            if (!flags.includes('ABUSIVE_LANG_BN_SCRIPT')) flags.push('ABUSIVE_LANG_BN_SCRIPT');
        }

        const bnBanglishRegexes = [
            /\b(madarchod|bokachoda|boka\s+choda|choda|chudi|chodna|khanki|khankir\s+pola|khankir\s+chele)\b/i,
            /\b(magir\s+pola|bhodai|balchal|bal\s+chhal|gaadmarani|haramzada|haramkhor)\b/i,
            /\b(shukorer\s+bachha|suorer\s+baccha|kuttar\s+bachha|podmarani|bejonma|chodanir)\b/i
        ];
        bnBanglishRegexes.forEach(rx => {
            if (rx.test(combinedText)) {
                score += 85;
                if (!flags.includes('ABUSIVE_LANG_BN_ROMAN')) flags.push('ABUSIVE_LANG_BN_ROMAN');
            }
        });

        // 4. Commercial spam / SEO / Casino solicitation
        const spamKeywords = [
            'seo', 'ranking', 'guest post', 'casino', 'viagra', 'crypto',
            'forex', 'backlink', 'traffic boost', 'earn money fast', 'loan without collateral',
            'free bitcoin', 'escort service', 'call girls', 'sex video'
        ];
        let keywordHits = 0;
        spamKeywords.forEach(kw => {
            if (combinedText.includes(kw)) keywordHits++;
        });
        if (keywordHits > 0) {
            score += (keywordHits * 25);
            flags.push('SPAM_SOLICITATION_KEYWORDS');
        }

        // 5. Repeated character sequences (e.g. "asdfasdfasdf", "aaaaaaaaaa")
        if (/(.)\1{5,}/.test(payload.description || '')) {
            score += 35;
            flags.push('REPETITIVE_CHAR_SEQUENCE');
        }

        // 6. Duplicate phone/email in local storage cache
        try {
            const priorSubmissions = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY_SUBMISSIONS) || '[]');
            const duplicate = priorSubmissions.find(sub => sub.phone === payload.phone && sub.category === payload.category);
            if (duplicate) {
                score += 25;
                flags.push('DUPLICATE_PHONE_AND_CATEGORY_LOGGED');
            }
        } catch (e) { }

        // Cap score between 0 and 100
        const finalScore = Math.min(Math.max(score, 0), 100);
        return { score: finalScore, flags: flags };
    }

    /* =========================================================================
       7. SUBMISSION HANDLER & REFERENCE ID GENERATOR
       ========================================================================= */
    function generateReferenceId() {
        const year = CONFIG.CURRENT_YEAR;
        // Generate pseudo-random 4-digit serial
        const randomSerial = String(Math.floor(1000 + Math.random() * 9000));
        return `CCD-${year}-${randomSerial}`;
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        // 1. Check honeypot (Preserves suspected bot submissions flagged for manual review)
        const isHoneypotTriggered = !checkHoneypot();
        if (isHoneypotTriggered) {
            console.warn('[CARE CONNECT] Honeypot triggered. Preserving submission as flagged bot spam for manual review.');
        }

        // 2. Verify Math Security Challenge
        if (!verifyMathChallenge()) {
            return;
        }

        // 3. Check Consent
        if (!DOM.consentCheck.checked) {
            DOM.consentError.style.display = 'block';
            DOM.consentCheck.focus();
            return;
        } else {
            DOM.consentError.style.display = 'none';
        }

        // 4. Check Rate Limit
        if (!checkRateLimit()) {
            alert('Submission limit reached: You have submitted multiple requests recently. Please wait a while before sending another.');
            return;
        }

        // 5. Build submission payload
        const refId = generateReferenceId();
        state.lastGeneratedRef = refId;

        const payload = {
            reference_id: refId,
            timestamp: new Date().toISOString(),
            formatted_date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            intent: state.selectedIntent,
            category: state.selectedCategory,
            name: state.selectedIntent === 'assistance' ? DOM.astName.value.trim() : DOM.colContactName.value.trim(),
            phone: state.selectedIntent === 'assistance' ? DOM.astPhone.value.trim() : DOM.colPhone.value.trim(),
            email: state.selectedIntent === 'assistance' ? DOM.astEmail.value.trim() : DOM.colEmail.value.trim(),
            location: state.selectedIntent === 'assistance' ? (DOM.astCity.value.trim() + ', ' + DOM.astDistrict.value.trim()) : DOM.colLocation.value.trim(),
            description: state.selectedIntent === 'assistance' ? DOM.astDesc.value.trim() : DOM.colDesc.value.trim(),
            timeline: state.selectedIntent === 'assistance' ? DOM.astTimeline.value : DOM.colTimeline.value,
            beneficiaries: state.selectedIntent === 'assistance' ? (DOM.astBeneficiaries.value || 'N/A') : 'N/A',
            applicant_type: state.selectedIntent === 'assistance' ? DOM.astApplicantType.value : 'N/A',
            org_name: state.selectedIntent === 'collaboration' ? DOM.colOrgName.value.trim() : 'N/A',
            org_type: state.selectedIntent === 'collaboration' ? DOM.colOrgType.value : 'N/A',
            org_website: state.selectedIntent === 'collaboration' ? (DOM.colWebsite.value.trim() || 'N/A') : 'N/A',
            resources_offered: state.selectedIntent === 'collaboration' ? (DOM.colResources.value.trim() || 'N/A') : 'N/A',
            status: 'Pending Review'
        };

        // 6. Compute Risk Assessment & Multilingual Moderation
        const riskAnalysis = computeRiskScore(payload, isHoneypotTriggered);
        payload.risk_score = riskAnalysis.score;
        payload.risk_flags = riskAnalysis.flags.join(', ') || 'CLEAN';

        // If flagged as abusive or bot/spam, quarantine for manual review without deleting
        const isFlagged = (
            riskAnalysis.score >= 60 ||
            riskAnalysis.flags.some(f => f.includes('ABUSIVE') || f.includes('HONEYPOT') || f.includes('SPAM'))
        );
        if (isFlagged) {
            payload.status = 'Flagged: Spam / Abusive';
            payload.review_status = 'Flagged: Spam / Abusive';
        }

        // 7. Store payload in client-side persistence registry
        storeLocalSubmission(payload);

        // 8. Dispatch to Google Apps Script Backend
        dispatchSubmission(payload, refId);
    }

    function storeLocalSubmission(payload) {
        try {
            const list = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY_SUBMISSIONS) || '[]');
            list.unshift(payload);
            // Keep last 50 submissions locally
            if (list.length > 50) list.pop();
            localStorage.setItem(CONFIG.STORAGE_KEY_SUBMISSIONS, JSON.stringify(list));
        } catch (e) {
            console.error('[CARE CONNECT] LocalStorage write error:', e);
        }
    }

    async function dispatchSubmission(payload, refId) {
        // Show loading state on button
        const submitBtnText = DOM.btnSubmit.innerHTML;
        DOM.btnSubmit.disabled = true;
        DOM.btnSubmit.innerHTML = '<span>Submitting Securely...</span>';

        if (CONFIG.BACKEND_URL && CONFIG.BACKEND_URL.startsWith('https://script.google.com/')) {
            try {
                // Post to Google Apps Script Web App
                await fetch(CONFIG.BACKEND_URL, {
                    method: 'POST',
                    mode: 'no-cors', // Standard Google Apps Script cross-origin submission
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (DOM.backendStatusText) {
                    DOM.backendStatusText.textContent = 'Your request has been dispatched directly to the official RAC DCP Community Board Google Sheet and email alerts.';
                }
            } catch (err) {
                console.warn('[CARE CONNECT] Network dispatch failed; saved locally in staging mode.', err);
                if (DOM.backendStatusText) {
                    DOM.backendStatusText.textContent = 'Request recorded in secure local staging mode. Please note your Reference ID.';
                }
            }
        } else {
            // Demonstration / Staging Simulation Mode
            if (DOM.backendStatusText) {
                DOM.backendStatusText.innerHTML = `<strong>Staging Mode Active:</strong> Submission registered locally in browser registry. To send directly to your Google Sheet, paste your Web App URL into <code>care-connect/js/script.js</code> (CONFIG.BACKEND_URL).`;
            }
        }

        DOM.btnSubmit.disabled = false;
        DOM.btnSubmit.innerHTML = submitBtnText;

        showConfirmationScreen(refId);
    }

    function showConfirmationScreen(refId) {
        if (DOM.confirmRefId) {
            DOM.confirmRefId.textContent = refId;
        }
        goToStep(4);
    }

    function copyReferenceId() {
        if (!state.lastGeneratedRef) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(state.lastGeneratedRef).then(function () {
                const originalText = DOM.copyRefBtn.textContent;
                DOM.copyRefBtn.textContent = 'Copied! ✓';
                DOM.copyRefBtn.style.background = 'var(--emerald)';
                setTimeout(function () {
                    DOM.copyRefBtn.textContent = originalText;
                    DOM.copyRefBtn.style.background = '';
                }, 2000);
            });
        } else {
            prompt('Copy your Reference ID:', state.lastGeneratedRef);
        }
    }

    function resetWizard() {
        if (DOM.wizardForm) DOM.wizardForm.reset();
        generateMathChallenge();
        state.formStartTime = Date.now();
        setIntent('assistance');
        goToStep(1);
    }

    /* =========================================================================
       8. FAQ ACCORDION CONTROLLER
       ========================================================================= */
    function initFaq() {
        DOM.faqItems.forEach(function (item) {
            const btn = item.querySelector('.faq-question-btn');
            if (btn) {
                btn.addEventListener('click', function () {
                    const isOpen = item.classList.contains('open');
                    // Close all
                    DOM.faqItems.forEach(function (i) { i.classList.remove('open'); });
                    // Toggle current
                    if (!isOpen) {
                        item.classList.add('open');
                    }
                });
            }
        });
    }

    /* =========================================================================
       9. ACCESSIBLE MODALS (PRIVACY POLICY & TERMS)
       ========================================================================= */
    function initModals() {
        // Privacy Modal
        if (DOM.openPrivacyBtn && DOM.privacyModal && DOM.closePrivacyBtn) {
            DOM.openPrivacyBtn.addEventListener('click', function (e) {
                e.preventDefault();
                openModal(DOM.privacyModal);
            });
            DOM.closePrivacyBtn.addEventListener('click', function () {
                closeModal(DOM.privacyModal);
            });
        }

        // Terms Modal
        if (DOM.openTermsBtn && DOM.termsModal && DOM.closeTermsBtn) {
            DOM.openTermsBtn.addEventListener('click', function (e) {
                e.preventDefault();
                openModal(DOM.termsModal);
            });
            DOM.closeTermsBtn.addEventListener('click', function () {
                closeModal(DOM.termsModal);
            });
        }

        // Close on background backdrop click
        [DOM.privacyModal, DOM.termsModal].forEach(function (modal) {
            if (modal) {
                modal.addEventListener('click', function (e) {
                    if (e.target === modal) {
                        closeModal(modal);
                    }
                });
            }
        });

        // Close on Esc key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeModal(DOM.privacyModal);
                closeModal(DOM.termsModal);
            }
        });
    }

    function openModal(modal) {
        if (modal) {
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modal) {
        if (modal) {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    /* Utility: Safe HTML Escape */
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /* =========================================================================
       8. MULTILINGUAL TRANSLATION SYSTEM (ENGLISH, BENGALI & HINDI)
       ========================================================================= */
    const TRANSLATIONS = {
        en: {
            code: 'EN',
            label: 'English',
            'nav.about': 'About Us',
            'nav.who': 'Who Can Connect',
            'nav.portal': 'Request Portal',
            'nav.mainSite': 'Main Site',
            'nav.connectNow': 'Connect Now',
            'hero.badge': 'Official Community Gateway • RI District 3240',
            'hero.title': 'Your Voice.<br><span>Our Commitment.</span>',
            'hero.subtitle': 'A Bridge Between Those Who Need Help and Those Who Can Help.',
            'hero.desc': 'Whether you are an individual seeking assistance, an organisation looking for collaboration, or someone willing to contribute to the community, RAC DCP CARE CONNECT provides a transparent, dedicated channel to reach out to us.',
            'hero.btnAssistance': 'REQUEST ASSISTANCE',
            'hero.btnCollab': 'COLLABORATE WITH US',
            'hero.notice': '<strong>Notice:</strong> RAC DCP is a volunteer-led youth community service organisation. All requests are subject to review, ground verification, and the availability of resources. Submission does not imply an automatic guarantee of financial or physical assistance.',
            'hero.networkTitle': 'Rotaract Action Network',
            'hero.pillar1.title': 'Service Above Self',
            'hero.pillar1.desc': 'Rooted in Rotary ideals of selfless, ethical community upliftment.',
            'hero.pillar2.title': 'Youth Leadership',
            'hero.pillar2.desc': 'Passionate young leaders driving grassroot ground operations.',
            'hero.pillar3.title': 'Thorough Review',
            'hero.pillar3.desc': 'Structured verification ensures genuine assistance reaches those in need.',
            'hero.pillar4.title': 'Resource Synergy',
            'hero.pillar4.desc': 'Connecting donors, NGOs, institutions, and CSR partners seamlessly.',
            'audiences.eyebrow': 'Open For All',
            'audiences.title': 'Who Can <span>Connect With Us?</span>',
            'audiences.desc': 'Our platform welcomes citizens, grassroots nonprofits, academic institutions, and enterprise leaders who share our commitment to transformative social impact.',
            'audiences.card1.title': 'Individuals & Families',
            'audiences.card1.desc': 'Underprivileged citizens, families facing temporary hardships, students seeking study aids, or patients needing guidance.',
            'audiences.card1.cta': 'Seek Support &rarr;',
            'audiences.card2.title': 'NGOs & Non-Profits',
            'audiences.card2.desc': 'Charitable trusts, community groups, and registered NGOs looking for co-organized projects or youth volunteer deployment.',
            'audiences.card2.cta': 'Partner With Us &rarr;',
            'audiences.card3.title': 'Schools & Institutions',
            'audiences.card3.desc': 'Educational institutions, colleges, and vocational centers aiming to organize social awareness or student development initiatives.',
            'audiences.card3.cta': 'Propose Tie-Up &rarr;',
            'audiences.card4.title': 'Companies & Businesses',
            'audiences.card4.desc': 'Corporate entities, local businesses, and CSR directors seeking verified grassroots implementation of community funds.',
            'audiences.card4.cta': 'Explore CSR Synergy &rarr;',
            'cat.eyebrow': 'Avenues of Impact',
            'cat.title': 'What Can You <span>Approach Us For?</span>',
            'cat.desc': 'Explore our diverse community impact categories. Filter by your goal and select any area to begin your request.',
            'cat.filterAll': 'All 13 Focus Areas',
            'cat.filterAssistance': 'Direct Assistance',
            'cat.filterCollab': 'Collaborations & Partnerships',
            'how.eyebrow': 'Clear & Transparent',
            'how.title': 'How <span>CARE CONNECT Works</span>',
            'how.desc': 'A clear, 4-step process designed to ensure fair verification, structured planning, and transparent community delivery.',
            'how.step1.title': 'Tell Us About Your Requirement',
            'how.step1.desc': 'Fill out our structured multi-step form with your contact information, exact requirements, location, and relevant details.',
            'how.step2.title': 'Submit & Receive Reference ID',
            'how.step2.desc': 'Once submitted, your request is logged and you receive a unique Care Connect Reference ID (e.g. CCD-2026-0001) for future reference.',
            'how.step3.title': 'Our Team Reviews & Verifies',
            'how.step3.desc': 'Our team will review your submission as soon as possible. The time required may vary depending on the nature of the request, verification requirements and volunteer availability.',
            'how.step4.title': 'We Connect & Coordinate',
            'how.step4.desc': 'If feasible, our directors contact you via phone or WhatsApp to coordinate direct assistance or structure an impactful partnership.',
            'about.tag': 'Operating Organization',
            'about.title': 'Rotaract Club of Durgapur Central Presidency',
            'about.desc': 'Chartered on 12th October 2023 under Rotary International District 3240, RAC DCP is a youth leadership and community service organisation based in Durgapur, West Bengal. We believe in taking real, measurable action—from medical camps and environmental stewardship to youth empowerment and literacy drives. CARE CONNECT is our official public gateway, connecting grassroots community needs with meaningful assistance and NGO collaboration.',
            'about.btnMain': 'Visit Main Club Website',
            'wizard.eyebrow': 'Connect With Us',
            'wizard.title': 'Interactive <span>Request Portal</span>',
            'wizard.desc': 'Follow the guided steps below. Whether you require community assistance or wish to partner with us, our system adapts dynamically to your goal.',
            'wizard.step1': 'Purpose',
            'wizard.step2': 'Details',
            'wizard.step3': 'Review & Verify',
            'wizard.step4': 'Confirmation',
            'wizard.q1': 'How would you like to connect with RAC DCP?',
            'wizard.q1.sub': 'Select whether you are seeking community assistance or proposing a collaboration or partnership.',
            'wizard.intentA.title': 'REQUEST ASSISTANCE',
            'wizard.intentA.sub': 'For individuals, families, students, or patients in need of educational, medical, relief, or disability aid.',
            'wizard.intentB.title': 'COLLABORATE WITH US',
            'wizard.intentB.sub': 'For NGOs, schools, companies, volunteers, and donors proposing partnerships or offering resources.',
            'wizard.catLabel': 'Select the most appropriate category <span class="required-star">*</span>',
            'faq.q1': 'Who is eligible to request community assistance?',
            'faq.a1': 'Individuals, families, community representatives, NGOs, educational institutions, hospitals, companies and other organisations may approach RAC DCP. Requests will be assessed based on their nature, location, relevance, feasibility and available resources. Priority may be given to initiatives within our operational reach.',
            'faq.q2': 'How long does it take for a submission to be reviewed?',
            'faq.a2': 'Our team will review your submission as soon as possible. The time required may vary depending on the nature of the request, verification requirements and volunteer availability. Where feasible, our directors reach out directly to coordinate next steps or ground visits.',
            'faq.q3': 'Does RAC DCP charge any fee for processing requests?',
            'faq.a3': '<strong>Never.</strong> The Rotaract Club of Durgapur Central Presidency is a non-profit humanitarian youth organisation under Rotary International. We never charge any processing fee, commission, or charge from applicants or partners. Beware of anyone claiming to represent RAC DCP who asks for money.',
            'faq.q4': 'Can companies and institutions partner with RAC DCP for CSR?',
            'faq.a4': 'Yes! We actively collaborate with corporates, industrial units, educational institutes, and registered trusts for CSR drives, campus health programs, environmental plantations, and youth skill workshops. We provide structured execution plans, photo-documented reports, and volunteer mobilization.',
            'faq.q5': 'What is RAC DCP\'s verification and anti-scam policy?',
            'faq.a5': 'To protect our community and ensure genuine assistance reaches those in need, our directors conduct background screening. We never ask for bank PINs, passwords, or Aadhaar numbers. <strong>Submissions containing demonstrably false information, impersonation, malicious links or automated spam may be restricted, rejected or referred to the appropriate authorities where warranted.</strong>',
            'footer.location': '<strong>Location:</strong> Durgapur, Kolkata, Naihati, West Bengal, India'
        },
        bn: {
            code: 'BN',
            label: 'বাংলা',
            'nav.about': 'আমাদের সম্পর্কে',
            'nav.who': 'কারা যোগাযোগ করতে পারেন',
            'nav.portal': 'অনুরোধ পোর্টাল',
            'nav.mainSite': 'প্রধান ওয়েবসাইট',
            'nav.connectNow': 'এখনই যুক্ত হন',
            'hero.badge': 'অফিশিয়াল কমিউনিটি গেটওয়ে • রোটারি জেলা ৩২৪০',
            'hero.title': 'আপনার কণ্ঠস্বর।<br><span>আমাদের অঙ্গীকার।</span>',
            'hero.subtitle': 'যাদের সাহায্য প্রয়োজন এবং যারা সাহায্য করতে পারেন—তাদের মধ্যে এক বিশ্বস্ত সেতুবন্ধন।',
            'hero.desc': 'আপনি যদি কোনো ব্যক্তি হন যার সাহায্যের প্রয়োজন, সহযোগিতার সন্ধানকারী কোনো সংগঠন, কিংবা সমাজে অবদান রাখতে ইচ্ছুক কোনো নাগরিক—RAC DCP CARE CONNECT আপনাকে আমাদের কাছে পৌঁছানোর একটি স্বচ্ছ ও নিবেদিত মাধ্যম প্রদান করে।',
            'hero.btnAssistance': 'সাহায্যের আবেদন',
            'hero.btnCollab': 'আমাদের সাথে সহযোগিতা করুন',
            'hero.notice': '<strong>বিজ্ঞপ্তি:</strong> RAC DCP একটি যুব নেতৃত্বাধীন স্বেচ্ছাসেবী সমাজসেবা সংগঠন। সমস্ত অনুরোধ পুঙ্খানুপুঙ্খ পর্যালোচনা, ক্ষেত্র যাচাই এবং সম্পদের প্রাপ্যতার ওপর নির্ভরশীল। আবেদন জমা দেওয়া সরাসরি আর্থিক বা শারীরিক সহায়তার নিশ্চয়তা দেয় না।',
            'hero.networkTitle': 'রোটার‌্যাক্ট অ্যাকশন নেটওয়ার্ক',
            'hero.pillar1.title': 'স্বার্থের ঊর্ধ্বে সেবা',
            'hero.pillar1.desc': 'নিঃস্বার্থ ও নীতিভিত্তিক সমাজকল্যাণে রোটারির মূল আদর্শে প্রতিষ্ঠিত।',
            'hero.pillar2.title': 'যুব নেতৃত্ব',
            'hero.pillar2.desc': 'উদ্যমী তরুণ নেতাদের পরিচালনায় তৃণমূল পর্যায়ের সমাজসেবামূলক কর্মকাণ্ড।',
            'hero.pillar3.title': 'পুঙ্খানুপুঙ্খ যাচাইকরণ',
            'hero.pillar3.desc': 'সুনির্দিষ্ট যাচাই পদ্ধতির মাধ্যমে নিশ্চিত করা হয় যাতে প্রকৃত অভাবীর কাছেই সাহায্য পৌঁছায়।',
            'hero.pillar4.title': 'সমন্বিত সম্পদ ও সহযোগিতা',
            'hero.pillar4.desc': 'দাতা, এনজিও, শিক্ষাপ্রতিষ্ঠান ও কর্পোরেট সিএসআর অংশীদারদের সুদৃঢ় সমন্বয়।',
            'audiences.eyebrow': 'সবার জন্য উন্মুক্ত',
            'audiences.title': 'কারা আমাদের সাথে <span>যোগাযোগ করতে পারেন?</span>',
            'audiences.desc': 'আমাদের প্ল্যাটফর্ম সমাজের সকল স্তরের নাগরিক, তৃণমূলের অলাভজনক সংস্থা, শিক্ষাপ্রতিষ্ঠান ও সামাজিক দায়বদ্ধতাসম্পন্ন সংস্থাকে স্বাগত জানায়।',
            'audiences.card1.title': 'ব্যক্তি ও পরিবারবর্গ',
            'audiences.card1.desc': 'সুবিধাবঞ্চিত নাগরিক, আকস্মিক সংকটে পড়া পরিবার, পড়াশোনার সহায়তাপ্রার্থী শিক্ষার্থী বা স্বাস্থ্য সহায়তাপ্রার্থী মানুষ।',
            'audiences.card1.cta': 'সাহায্যের আবেদন করুন &rarr;',
            'audiences.card2.title': 'এনজিও ও অলাভজনক সংস্থা',
            'audiences.card2.desc': 'যৌথ সমাজকল্যাণ প্রকল্প বা তরুণ স্বেচ্ছাসেবকদের সহযোগিতায় কাজ করতে আগ্রহী নিবন্ধিত দাতব্য সংস্থা ও ট্রাস্ট।',
            'audiences.card2.cta': 'যৌথ উদ্যোগ প্রস্তাব করুন &rarr;',
            'audiences.card3.title': 'বিদ্যালয় ও শিক্ষাপ্রতিষ্ঠান',
            'audiences.card3.desc': 'ছাত্র-যুব নেতৃত্ব বিকাশ, স্বাস্থ্য ও সামাজিক সচেতনতামূলক কর্মশালা এবং ক্যাম্পাস ড্রাইভ আয়োজনে আগ্রহী প্রতিষ্ঠান।',
            'audiences.card3.cta': 'ক্যাম্পাস উদ্যোগ যুক্ত করুন &rarr;',
            'audiences.card4.title': 'কর্পোরেট ও সিএসআর অংশীদার',
            'audiences.card4.desc': 'কর্পোরেট সামাজিক দায়বদ্ধতা (CSR) তহবিল ও সরাসরি কমিউনিটি উন্নয়ন প্রকল্প বাস্তবায়নে অংশীদারিত্ব।',
            'audiences.card4.cta': 'সিএসআর উদ্যোগ আলোচনা করুন &rarr;',
            'cat.eyebrow': 'বহুমুখী সমাজসেবা',
            'cat.title': 'কোন কোন বিষয়ে <span>আমাদের কাছে আসতে পারেন?</span>',
            'cat.desc': 'আমাদের প্রত্যক্ষ সমাজসেবামূলক সহায়তা এবং প্রাতিষ্ঠানিক সহযোগিতার বিভিন্ন ক্ষেত্র দেখে নিন।',
            'cat.filterAll': 'সমস্ত ১৩টি কার্যক্ষেত্র',
            'cat.filterAssistance': 'সরাসরি সাহায্য',
            'cat.filterCollab': 'সহযোগিতা ও অংশীদারিত্ব',
            'how.eyebrow': 'সহজ ও স্বচ্ছ প্রক্রিয়া',
            'how.title': 'কীভাবে কাজ করে <span>CARE CONNECT</span>',
            'how.desc': 'ন্যায্য যাচাইকরণ, সুশৃঙ্খল পরিকল্পনা এবং স্বচ্ছ সেবা প্রদান নিশ্চিত করতে ৪-ধাপের প্রক্রিয়া।',
            'how.step1.title': '১. আপনার প্রয়োজনীয়তা জানান',
            'how.step1.desc': 'আমাদের ইন্টারঅ্যাক্টিভ ফর্মের মাধ্যমে আপনার যোগাযোগের তথ্য, সুনির্দিষ্ট প্রয়োজন ও সংশ্লিষ্ট বিবরণ পূরণ করুন।',
            'how.step2.title': '২. জমা দিন ও রেফারেন্স আইডি নিন',
            'how.step2.desc': 'জমা দেওয়ার সাথে সাথে আপনার আবেদন নথিভুক্ত হবে এবং ভবিষ্যতে যোগাযোগের জন্য একটি অনন্য রেফারেন্স আইডি (যেমন CCD-2026-0001) পাবেন।',
            'how.step3.title': '৩. পর্যালোচনা ও মাঠপর্যায়ে যাচাই',
            'how.step3.desc': 'আমাদের দল যত দ্রুত সম্ভব আপনার আবেদনটি পর্যালোচনা করবে। অনুরোধের প্রকৃতি, যাচাইকরণের প্রয়োজনীয়তা এবং স্বেচ্ছাসেবকদের প্রাপ্যতার ওপর নির্ভর করে প্রয়োজনীয় সময় পরিবর্তিত হতে পারে।',
            'how.step4.title': '৪. যোগাযোগ ও সমন্বয়',
            'how.step4.desc': 'সম্ভব হলে, সরাসরি সাহায্য সমন্বয় বা অংশীদারিত্ব গড়ে তোলার জন্য আমাদের পরিচালকরা আপনার সাথে যোগাযোগ করবেন।',
            'about.tag': 'পরিচালনাকারী সংগঠন',
            'about.title': 'রোটার‌্যাক্ট ক্লাব অব দুর্গাপুর সেন্ট্রাল প্রেসিডেন্সি',
            'about.desc': '১২ই অক্টোবর ২০২৩ তারিখে রোটারি আন্তর্জাতিক জেলা ৩২৪০-এর অধীনে চার্টারপ্রাপ্ত, RAC DCP দুর্গাপুরের এক শীর্ষস্থানীয় যুব নেতৃত্ব ও সমাজকল্যাণমূলক সংস্থা। আমরা বাস্তব ও পরিমাপযোগ্য সমাজসেবায় বিশ্বাস করি—চিকিৎসা শিবির, পরিবেশ সংরক্ষণ থেকে শুরু করে যুব ক্ষমতায়ন ও সাক্ষরতা অভিযান পর্যন্ত। CARE CONNECT হলো সাধারণ মানুষের প্রয়োজন ও অর্থপূর্ণ সমাজসেবার মধ্যে এক মজবুত সেতুবন্ধন।',
            'about.btnMain': 'মূল ক্লাবের ওয়েবসাইটে যান',
            'wizard.eyebrow': 'যোগাযোগ করুন',
            'wizard.title': 'ইন্টারঅ্যাক্টিভ <span>অনুরোধ পোর্টাল</span>',
            'wizard.desc': 'নিচের ধাপগুলো অনুসরণ করুন। আপনার লক্ষ্য অনুযায়ী ফর্মটি স্বয়ংক্রিয়ভাবে পরিবর্তিত হবে।',
            'wizard.step1': 'উদ্দেশ্য',
            'wizard.step2': 'বিবরণ',
            'wizard.step3': 'পুনর্বিবেচনা',
            'wizard.step4': 'নিশ্চিতকরণ',
            'wizard.q1': 'আপনি কীভাবে RAC DCP-র সাথে যোগাযোগ করতে চান?',
            'wizard.q1.sub': 'আপনি কি সামাজিক সহায়তা খুঁজছেন নাকি কোনো সহযোগিতা বা অংশীদারিত্বের প্রস্তাব করছেন, তা নির্বাচন করুন।',
            'wizard.intentA.title': 'সাহায্যের আবেদন',
            'wizard.intentA.sub': 'শিক্ষাগত, চিকিৎসা, ত্রাণ বা প্রতিবন্ধী সহায়তার জন্য ব্যক্তি, পরিবার বা শিক্ষার্থীদের উদ্দেশ্যে।',
            'wizard.intentB.title': 'আমাদের সাথে সহযোগিতা',
            'wizard.intentB.sub': 'অংশীদারিত্ব প্রস্তাবকারী এনজিও, শিক্ষাপ্রতিষ্ঠান, কোম্পানি, স্বেচ্ছাসেবী ও দাতাদের উদ্দেশ্যে।',
            'wizard.catLabel': 'উপযুক্ত বিভাগটি নির্বাচন করুন <span class="required-star">*</span>',
            'faq.q1': 'কারা সামাজিক সহায়তার জন্য আবেদন করতে পারেন?',
            'faq.a1': 'ব্যক্তি, পরিবার, সামাজিক প্রতিনিধি, এনজিও, শিক্ষাপ্রতিষ্ঠান, হাসপাতাল, কোম্পানি এবং অন্যান্য প্রতিষ্ঠান RAC DCP-র সাথে যোগাযোগ করতে পারেন। অনুরোধগুলি তাদের প্রকৃতি, অবস্থান, প্রাসঙ্গিকতা, সম্ভাব্যতা এবং উপলব্ধ সম্পদের ভিত্তিতে মূল্যায়ন করা হবে। আমাদের পরিচালন এলাকার আওতাধীন উদ্যোগগুলিকে অগ্রাধিকার দেওয়া হতে পারে।',
            'faq.q2': 'একটি আবেদন পর্যালোচনা করতে কত সময় লাগে?',
            'faq.a2': 'আমাদের দল যত দ্রুত সম্ভব আপনার আবেদনটি পর্যালোচনা করবে। অনুরোধের প্রকৃতি, যাচাইকরণের প্রয়োজনীয়তা এবং স্বেচ্ছাসেবকদের প্রাপ্যতার ওপর নির্ভর করে প্রয়োজনীয় সময় পরিবর্তিত হতে পারে। সম্ভব হলে, আমাদের পরিচালকরা পরবর্তী পদক্ষেপ বা মাঠপর্যায়ে পরিদর্শনের জন্য সরাসরি যোগাযোগ করবেন।',
            'faq.q3': 'RAC DCP কি অনুরোধ প্রক্রিয়াকরণের জন্য কোনো ফি নেয়?',
            'faq.a3': '<strong>কখনোই নয়।</strong> রোটার‌্যাক্ট ক্লাব অব দুর্গাপুর সেন্ট্রাল প্রেসিডেন্সি রোটারি ইন্টারন্যাশনালের অধীনে একটি অলাভজনক মানবহিতৈষী যুব সংগঠন। আমরা আবেদনকারী বা অংশীদারদের কাছ থেকে কখনো কোনো প্রসেসিং ফি বা কমিশন নিই না। RAC DCP-র নামে কেউ অর্থ দাবি করলে সতর্ক থাকুন।',
            'faq.q4': 'কোম্পানি বা প্রতিষ্ঠানগুলো কি CSR-এর জন্য RAC DCP-র সাথে যুক্ত হতে পারে?',
            'faq.a4': 'হ্যাঁ! আমরা সিএসআর ড্রাইভ, ক্যাম্পাস স্বাস্থ্য কর্মসূচি, বৃক্ষরোপণ এবং যুব দক্ষতা কর্মশালার জন্য কর্পোরেট ও নিবন্ধিত ট্রাস্টের সাথে যৌথভাবে কাজ করি। আমরা সুসংগঠিত পরিকল্পনা এবং সচিত্র অডিট রিপোর্ট সরবরাহ করি।',
            'faq.q5': 'RAC DCP-র যাচাইকরণ ও জালিয়াতি বিরোধী নীতি কী?',
            'faq.a5': 'সমাজকে সুরক্ষিত রাখতে এবং প্রকৃত অভাবীদের কাছেই সহায়তা পৌঁছানো নিশ্চিত করতে সমস্ত আবেদনের পটভূমি যাচাই করা হয়। আমরা কখনো কোনো ফি, পাসওয়ার্ড, আধার নম্বর বা ব্যাংক বিশদ চাই না। <strong>প্রমাণযোগ্য মিথ্যা তথ্য, ছদ্মবেশ ধারণ, ক্ষতিকারক লিঙ্ক বা স্বয়ংক্রিয় স্প্যাম সংবলিত আবেদনগুলি সীমাবদ্ধ, প্রত্যাখ্যান বা ক্ষেত্রবিশেষে যথাযথ কর্তৃপক্ষের নিকট প্রেরণ করা হতে পারে।</strong>',
            'footer.location': '<strong>অবস্থান:</strong> দুর্গাপুর, কলকাতা, নৈহাটি, পশ্চিমবঙ্গ, ভারত'
        },
        hi: {
            code: 'HI',
            label: 'हिन्दी',
            'nav.about': 'हमारे बारे में',
            'nav.who': 'कौन जुड़ सकता है',
            'nav.portal': 'अनुरोध पोर्टल',
            'nav.mainSite': 'मुख्य वेबसाइट',
            'nav.connectNow': 'अभी जुड़ें',
            'hero.badge': 'आधिकारिक समुदाय प्रवेशद्वार • रोटरी जिला 3240',
            'hero.title': 'आपकी आवाज़।<br><span>हमारा संकल्प।</span>',
            'hero.subtitle': 'जिन्हें मदद की ज़रूरत है और जो मदद कर सकते हैं—उनके बीच एक सेतु।',
            'hero.desc': 'चाहे आप मदद चाहने वाले व्यक्ति हों, सहयोग की तलाश में कोई संस्था हों, या समाज में योगदान देने के इच्छुक नागरिक—RAC DCP CARE CONNECT हम तक पहुँचने का एक पारदर्शी और समर्पित माध्यम प्रदान करता है।',
            'hero.btnAssistance': 'मदद के लिए अनुरोध',
            'hero.btnCollab': 'हमारे साथ सहयोग करें',
            'hero.notice': '<strong>सूचना:</strong> RAC DCP एक युवा नेतृत्व वाला स्वयंसेवी सामाजिक सेवा संगठन है। सभी अनुरोध समीक्षा, ज़मीनी सत्यापन और संसाधनों की उपलब्धता के अधीन हैं। सबमिशन से वित्तीय या प्रत्यक्ष सहायता की स्वतः गारंटी नहीं मिलती है।',
            'hero.networkTitle': 'रोटारैक्ट एक्शन नेटवर्क',
            'hero.pillar1.title': 'स्वार्थ से ऊपर सेवा',
            'hero.pillar1.desc': 'निःस्वार्थ और नैतिक सामुदायिक उत्थान के रोटरी आदर्शों में निहित।',
            'hero.pillar2.title': 'युवा नेतृत्व',
            'hero.pillar2.desc': 'ज़मीनी स्तर पर सामाजिक बदलाव लाने वाले उत्साही युवा नेता।',
            'hero.pillar3.title': 'गहन सत्यापन',
            'hero.pillar3.desc': 'संरचित सत्यापन सुनिश्चित करता है कि वास्तविक मदद ज़रूरतमंदों तक ही पहुंचे।',
            'hero.pillar4.title': 'संसाधन तालमेल',
            'hero.pillar4.desc': 'दाताओं, एनजीओ, संस्थानों और कॉर्पोरेट सीएसआर भागीदारों को जोड़ना।',
            'audiences.eyebrow': 'सभी के लिए खुला',
            'audiences.title': 'हमसे <span>कौन जुड़ सकता है?</span>',
            'audiences.desc': 'हमारा मंच नागरिकों, गैर-सरकारी संगठनों, शैक्षणिक संस्थानों और सामाजिक रूप से जागरूक व्यवसायों का स्वागत करता है।',
            'audiences.card1.title': 'व्यक्ति और परिवार',
            'audiences.card1.desc': 'ज़रूरतमंद नागरिक, संकटग्रस्त परिवार, शिक्षा में सहायता चाहने वाले छात्र या स्वास्थ्य मार्गदर्शन चाहने वाले लोग।',
            'audiences.card1.cta': 'मदद के लिए संपर्क करें &rarr;',
            'audiences.card2.title': 'एनजीओ और गैर-लाभकारी संगठन',
            'audiences.card2.desc': 'संयुक्त सामुदायिक परियोजनाओं और युवा स्वयंसेवकों की सहायता चाहने वाले पंजीकृत ट्रस्ट और संस्थाएं।',
            'audiences.card2.cta': 'संयुक्त परियोजना प्रस्तावित करें &rarr;',
            'audiences.card3.title': 'विद्यालय और शैक्षणिक संस्थान',
            'audiences.card3.desc': 'छात्र नेतृत्व विकास, स्वास्थ्य एवं सामाजिक जागरूकता सत्र आयोजित करने के इच्छुक स्कूल व कॉलेज।',
            'audiences.card3.cta': 'कैंपस पहल जोड़ें &rarr;',
            'audiences.card4.title': 'कंपनियाँ और सीएसआर भागीदार',
            'audiences.card4.desc': 'कॉर्पोरेट सामाजिक दायित्व (CSR) परियोजनाओं को ज़मीनी स्तर पर प्रभावी ढंग से निष्पादित करने वाले भागीदार।',
            'audiences.card4.cta': 'सीएसआर पहल पर चर्चा करें &rarr;',
            'cat.eyebrow': 'विविध कार्यक्षेत्र',
            'cat.title': 'आप किन विषयों के लिए <span>हमसे संपर्क कर सकते हैं?</span>',
            'cat.desc': 'हमारे प्रत्यक्ष सामुदायिक सहायता कार्यक्रमों और संस्थागत सहयोग के अवसरों को देखें।',
            'cat.filterAll': 'सभी 13 कार्यक्षेत्र',
            'cat.filterAssistance': 'प्रत्यक्ष सहायता',
            'cat.filterCollab': 'सहयोग और साझेदारी',
            'how.eyebrow': 'सरल और पारदर्शी प्रक्रिया',
            'how.title': 'कैसे काम करता है <span>CARE CONNECT</span>',
            'how.desc': 'उचित सत्यापन, सुव्यवस्थित योजना और पारदर्शी सहायता सुनिश्चित करने वाली 4-चरणीय प्रक्रिया।',
            'how.step1.title': '1. अपनी आवश्यकता बताएं',
            'how.step1.desc': 'हमारे संरचित फॉर्म में अपनी संपर्क जानकारी, विशिष्ट आवश्यकता और विवरण भरें।',
            'how.step2.title': '2. सबमिट करें और संदर्भ आईडी प्राप्त करें',
            'how.step2.desc': 'सबमिट करने पर आपका अनुरोध दर्ज हो जाएगा और भविष्य के संदर्भ के लिए आपको एक विशिष्ट रेफरेंस आईडी (जैसे CCD-2026-0001) मिलेगी।',
            'how.step3.title': '3. हमारी टीम समीक्षा और सत्यापन करेगी',
            'how.step3.desc': 'हमारी टीम यथाशीघ्र आपके सबमिशन की समीक्षा करेगी। अनुरोध की प्रकृति, सत्यापन आवश्यकताओं और स्वयंसेवी उपलब्धता के आधार पर आवश्यक समय भिन्न हो सकता है।',
            'how.step4.title': '4. हम संपर्क और समन्वय करेंगे',
            'how.step4.desc': 'यदि संभव हो, तो हमारे निदेशक प्रत्यक्ष सहायता या साझेदारी के समन्वय हेतु फोन या व्हाट्सएप पर संपर्क करेंगे।',
            'about.tag': 'संचालक संगठन',
            'about.title': 'रोटारैक्ट क्लब ऑफ दुर्गापुर सेंट्रल प्रेसीडेंसी',
            'about.desc': '12 अक्टूबर 2023 को रोटरी इंटरनेशनल डिस्ट्रिक्ट 3240 के तहत चार्टर्ड, RAC DCP दुर्गापुर में एक अग्रणी युवा नेतृत्व और सामाजिक कल्याण संगठन है। हम वास्तविक और ठोस सेवा कार्यों में विश्वास करते हैं—चिकित्सा शिविरों और पर्यावरण संरक्षण से लेकर युवा सशक्तिकरण और साक्षरता तक। CARE CONNECT ज़रूरतमंदों और सेवाभावियों के बीच एक आधिकारिक माध्यम है।',
            'about.btnMain': 'मुख्य क्लब वेबसाइट देखें',
            'wizard.eyebrow': 'हमसे जुड़ें',
            'wizard.title': 'इंटरैक्टिव <span>अनुरोध पोर्टल</span>',
            'wizard.desc': 'नीचे दिए गए चरणों का पालन करें। आपकी आवश्यकता के अनुसार फॉर्म स्वतः अनुकूलित हो जाएगा।',
            'wizard.step1': 'उद्देश्य',
            'wizard.step2': 'विवरण',
            'wizard.step3': 'समीक्षा',
            'wizard.step4': 'पुष्टि',
            'wizard.q1': 'आप RAC DCP से कैसे जुड़ना चाहते हैं?',
            'wizard.q1.sub': 'चुनें कि क्या आप सहायता मांग रहे हैं या किसी सहयोग / साझेदारी का प्रस्ताव कर रहे हैं।',
            'wizard.intentA.title': 'मदद के लिए अनुरोध',
            'wizard.intentA.sub': 'शैक्षिक, चिकित्सा, भोजन, राहत या दिव्यांगता सहायता के लिए व्यक्तियों, परिवारों या छात्रों हेतु।',
            'wizard.intentB.title': 'हमारे साथ सहयोग करें',
            'wizard.intentB.sub': 'साझेदारी या संसाधन सहयोग का प्रस्ताव देने वाले एनजीओ, संस्थानों, कंपनियों और स्वयंसेवकों हेतु।',
            'wizard.catLabel': 'सबसे उपयुक्त श्रेणी का चयन करें <span class="required-star">*</span>',
            'faq.q1': 'सामुदायिक सहायता के लिए कौन पात्र है?',
            'faq.a1': 'व्यक्ति, परिवार, सामुदायिक प्रतिनिधि, एनजीओ, शैक्षणिक संस्थान, अस्पताल, कंपनियाँ और अन्य संगठन RAC DCP से संपर्क कर सकते हैं। अनुरोधों का मूल्यांकन उनकी प्रकृति, स्थान, प्रासंगिकता, साध्यता और उपलब्ध संसाधनों के आधार पर किया जाएगा। हमारी परिचालन पहुंच के भीतर की पहलों को प्राथमिकता दी जा सकती है।',
            'faq.q2': 'अनुरोध की समीक्षा में कितना समय लगता है?',
            'faq.a2': 'हमारी टीम यथाशीघ्र आपके सबमिशन की समीक्षा करेगी। अनुरोध की प्रकृति, सत्यापन आवश्यकताओं और स्वयंसेवी उपलब्धता के आधार पर आवश्यक समय भिन्न हो सकता है। जहाँ संभव हो, हमारे निदेशक अगले कदमों या ज़मीनी निरीक्षण के समन्वय हेतु सीधे संपर्क करेंगे।',
            'faq.q3': 'क्या RAC DCP अनुरोध प्रसंस्करण के लिए कोई शुल्क लेता है?',
            'faq.a3': '<strong>कभी नहीं।</strong> रोटारैक्ट क्लब ऑफ दुर्गापुर सेंट्रल प्रेसीडेंसी रोटरी इंटरनेशनल के तहत एक गैर-लाभकारी मानवीय युवा संगठन है। हम आवेदकों या भागीदारों से कभी भी कोई शुल्क या कमीशन नहीं लेते हैं। RAC DCP के नाम पर पैसे मांगने वालों से सावधान रहें।',
            'faq.q4': 'क्या कंपनियाँ और संस्थान CSR के लिए RAC DCP के साथ साझेदारी कर सकते हैं?',
            'faq.a4': 'हाँ! हम सीएसआर अभियानों, स्वास्थ्य कार्यक्रमों, वृक्षारोपण और युवा कौशल कार्यशालाओं के लिए कॉर्पोरेट्स और पंजीकृत ट्रस्टों के साथ सक्रिय रूप से सहयोग करते हैं। हम संरचित योजनाएँ और फोटो-दस्तावेजी रिपोर्ट प्रदान करते हैं।',
            'faq.q5': 'RAC DCP की सत्यापन और धोखाधड़ी-रोधी नीति क्या है?',
            'faq.a5': 'समुदाय की सुरक्षा और वास्तविक ज़रूरतमंदों तक मदद पहुंचाना सुनिश्चित करने के लिए सभी सबमिशन की जांच की जाती है। हम कभी भी कोई शुल्क, पासवर्ड, आधार संख्या या बैंक विवरण नहीं मांगते हैं। <strong>प्रमाणित रूप से गलत जानकारी, प्रतिरूपण, दुर्भावनापूर्ण लिंक या स्वचालित स्पैम वाले सबमिशन को प्रतिबंधित, अस्वीकार या आवश्यकतानुसार उचित अधिकारियों को संदर्भित किया जा सकता है।</strong>',
            'footer.location': '<strong>स्थान:</strong> दुर्गापुर, कोलकाता, नैहाटी, पश्चिम बंगाल, भारत'
        }
    };

    function applyLanguage(lang) {
        if (!TRANSLATIONS[lang]) lang = 'en';
        localStorage.setItem(CONFIG.STORAGE_LANG_KEY, lang);
        document.documentElement.setAttribute('lang', lang);

        // Update active indicators
        var activeLangText = document.getElementById('activeLangText');
        if (activeLangText) {
            activeLangText.textContent = TRANSLATIONS[lang].code;
        }

        document.querySelectorAll('.lang-menu-item').forEach(function (item) {
            if (item.dataset.lang === lang) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        document.querySelectorAll('.mobile-lang-pill').forEach(function (pill) {
            if (pill.dataset.lang === lang) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });

        // Translate data-i18n elements
        var dict = TRANSLATIONS[lang];
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (dict[key]) {
                el.innerHTML = dict[key];
            }
        });
    }

    function initLanguage() {
        var langDropdown = document.getElementById('langSelectorDropdown');
        var langSelectBtn = document.getElementById('langSelectBtn');

        if (langSelectBtn && langDropdown) {
            langSelectBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                var isOpen = langDropdown.classList.toggle('open');
                langSelectBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            });

            document.addEventListener('click', function (e) {
                if (!langDropdown.contains(e.target)) {
                    langDropdown.classList.remove('open');
                    langSelectBtn.setAttribute('aria-expanded', 'false');
                }
            });
        }

        // Handle language option clicks
        document.querySelectorAll('.lang-menu-item, .mobile-lang-pill').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var lang = btn.dataset.lang;
                applyLanguage(lang);
                if (langDropdown) {
                    langDropdown.classList.remove('open');
                    if (langSelectBtn) langSelectBtn.setAttribute('aria-expanded', 'false');
                }
            });
        });

        // Apply saved or default language
        var saved = localStorage.getItem(CONFIG.STORAGE_LANG_KEY) || 'en';
        applyLanguage(saved);
    }

    /* =========================================================================
       INITIALIZE ON DOM READY
       ========================================================================= */
    document.addEventListener('DOMContentLoaded', function () {
        initTheme();
        initNavigation();
        initCategoryFilter();
        initWizard();
        initFaq();
        initModals();
        initLanguage();
    });

})();
