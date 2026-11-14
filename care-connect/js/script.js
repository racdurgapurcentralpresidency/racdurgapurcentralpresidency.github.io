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
        BACKEND_URL: '', // e.g., 'https://script.google.com/macros/s/AKfycb.../exec'
        CURRENT_YEAR: new Date().getFullYear() || 2026,
        MAX_HOURLY_SUBMISSIONS: 3,
        STORAGE_KEY_SUBMISSIONS: 'racdcp_cc_submissions',
        STORAGE_KEY_RATE_LIMIT: 'racdcp_cc_rate_limit',
        STORAGE_THEME_KEY: 'racdcp-theme'
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
            currentTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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

            const links = DOM.navMenu.querySelectorAll('.nav-link');
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

                // Scroll to request system wizard smoothly
                const wizardSection = document.getElementById('request-system');
                if (wizardSection) {
                    wizardSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

        // Hero CTA buttons
        const heroAssistanceBtn = document.getElementById('hero-btn-assistance');
        const heroCollabBtn = document.getElementById('hero-btn-collab');

        if (heroAssistanceBtn) {
            heroAssistanceBtn.addEventListener('click', function () {
                setIntent('assistance');
                document.getElementById('request-system').scrollIntoView({ behavior: 'smooth' });
            });
        }

        if (heroCollabBtn) {
            heroCollabBtn.addEventListener('click', function () {
                setIntent('collaboration');
                document.getElementById('request-system').scrollIntoView({ behavior: 'smooth' });
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

        // Scroll wizard into view smoothly
        const container = document.getElementById('wizard-container');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
     * Client-side Heuristic Risk-Scoring Engine
     * Assigns a score from 0 (very safe) to 100 (high risk of spam/abuse)
     * and compiles actionable risk flags for the club review board.
     */
    function computeRiskScore(payload) {
        let score = 0;
        const flags = [];

        // 1. Time-to-submit check (bots fill in < 3 seconds)
        const secondsElapsed = (Date.now() - state.formStartTime) / 1000;
        if (secondsElapsed < 4) {
            score += 40;
            flags.push('RAPID_SUBMISSION_BOT_PATTERN');
        } else if (secondsElapsed > 20) {
            flags.push('GENUINE_HUMAN_PACE');
        }

        // 2. Keyword check for typical spam / SEO solicitation
        const spamKeywords = [
            'seo', 'ranking', 'guest post', 'casino', 'viagra', 'crypto',
            'forex', 'backlink', 'traffic boost', 'earn money fast', 'loan without collateral'
        ];
        const combinedText = (payload.description + ' ' + (payload.org_name || '')).toLowerCase();
        let keywordHits = 0;
        spamKeywords.forEach(kw => {
            if (combinedText.includes(kw)) keywordHits++;
        });

        if (keywordHits > 0) {
            score += (keywordHits * 30);
            flags.push('SPAM_SOLICITATION_KEYWORDS');
        }

        // 3. Repeated character sequences (e.g. "asdfasdfasdf", "aaaaaaaaaa")
        if (/(.)\1{5,}/.test(payload.description)) {
            score += 35;
            flags.push('REPETITIVE_CHAR_SEQUENCE');
        }

        // 4. Duplicate phone/email in local storage cache
        try {
            const priorSubmissions = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY_SUBMISSIONS) || '[]');
            const duplicate = priorSubmissions.find(sub => sub.phone === payload.phone && sub.category === payload.category);
            if (duplicate) {
                score += 25;
                flags.push('DUPLICATE_PHONE_AND_CATEGORY_LOGGED');
            }
        } catch (e) {}

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

        // 1. Check honeypot
        if (!checkHoneypot()) {
            console.warn('[CARE CONNECT] Honeypot triggered. Request dropped silently.');
            showConfirmationScreen(generateReferenceId(), true);
            return;
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

        // 6. Compute Risk Assessment
        const riskAnalysis = computeRiskScore(payload);
        payload.risk_score = riskAnalysis.score;
        payload.risk_flags = riskAnalysis.flags.join(', ') || 'CLEAN';

        // 7. Store payload in client-side persistence registry
        storeLocalSubmission(payload);

        // 8. Dispatch to Google Apps Script Backend (if configured)
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
       INITIALIZE ON DOM READY
       ========================================================================= */
    document.addEventListener('DOMContentLoaded', function () {
        initTheme();
        initNavigation();
        initCategoryFilter();
        initWizard();
        initFaq();
        initModals();
    });

})();
