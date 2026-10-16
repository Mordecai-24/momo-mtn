/* ==========================================================
   MoMo MTN - main.js
   1. Data
   2. Helpers
   3. Mobile menu
   4. Countries (select + list)
   5. Eligibility checker
   6. Loan calculator
   7. Testimonials
   ========================================================== */

/* ---------- 1. Data ---------- */

const COUNTRIES = [
    { code: "GH", name: "Ghana",         dial: "+233" },
    { code: "UG", name: "Uganda",        dial: "+256" },
    { code: "ZM", name: "Zambia",        dial: "+260" },
    { code: "CM", name: "Cameroon",      dial: "+237" },
    { code: "CI", name: "Côte d'Ivoire", dial: "+225" },
    { code: "GN", name: "Guinea",        dial: "+224" },
    { code: "BJ", name: "Benin",         dial: "+229" },
    { code: "SS", name: "South Sudan",   dial: "+211" }
];

// Eligibility rules live in one object so they are easy to change.
const RULES = {
    minAge: 18,
    minAccountMonths: 3,
    minMonthlyVolume: 50,
    minLoan: 20,
    maxLoan: 1000,
    limitMultiplier: 1.5 // loan limit = monthly activity x 1.5, capped at maxLoan
};

/* ---------- 2. Helpers ---------- */

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function byId(id) {
    return document.getElementById(id);
}

// Builds an element safely. textContent means user input can never inject HTML.
function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
}

/* ---------- 3. Mobile menu ---------- */

function initMobileMenu() {
    const toggle = byId("menu-toggle");
    const nav = byId("primary-nav");

    function setOpen(isOpen) {
        nav.classList.toggle("nav--open", isOpen);
        toggle.setAttribute("aria-expanded", String(isOpen));
    }

    toggle.addEventListener("click", () => {
        setOpen(!nav.classList.contains("nav--open"));
    });

    // Close the menu after choosing a link
    nav.addEventListener("click", (event) => {
        if (event.target.closest("a")) setOpen(false);
    });
}

/* ---------- 4. Countries ---------- */

function initCountries() {
    const select = byId("country");
    const list = byId("countries-list");

    COUNTRIES.forEach((country) => {
        const option = createElement("option", "", country.name);
        option.value = country.code;
        select.appendChild(option);

        const item = createElement("li", "countries__item");
        item.appendChild(createElement("span", "countries__code", country.code));
        item.appendChild(document.createTextNode(country.name));
        list.appendChild(item);
    });
}

/* ---------- 5. Eligibility checker ---------- */

function initEligibility() {
    const form = byId("eligibility-form");
    const countrySelect = byId("country");
    const phoneInput = byId("phone");

    // Show the right dial code once a country is chosen
    countrySelect.addEventListener("change", () => {
        const country = COUNTRIES.find((c) => c.code === countrySelect.value);
        phoneInput.placeholder = country ? `${country.dial} 000 000 000` : "Select a country first";
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        clearErrors(form);

        const data = readForm(form);
        const errors = validate(data);

        if (Object.keys(errors).length > 0) {
            showErrors(errors);
            return;
        }

        renderResult(assess(data), data);
    });
}

function readForm(form) {
    const values = new FormData(form);
    return {
        fullName: String(values.get("fullName")).trim(),
        country: String(values.get("country")),
        phone: String(values.get("phone")).trim(),
        age: Number(values.get("age")),
        accountAge: Number(values.get("accountAge")),
        monthlyVolume: Number(values.get("monthlyVolume")),
        requestedAmount: Number(values.get("requestedAmount")),
        consent: form.elements.consent.checked,
        hasAge: String(values.get("age")).trim() !== "",
        hasAccountAge: String(values.get("accountAge")).trim() !== "",
        hasVolume: String(values.get("monthlyVolume")).trim() !== "",
        hasAmount: String(values.get("requestedAmount")).trim() !== ""
    };
}

// Returns an object like { "phone": "Enter a valid phone number." }
// Only checks that the form is filled in correctly. Eligibility rules come later.
function validate(data) {
    const errors = {};

    if (data.fullName.length < 2) {
        errors["full-name"] = "Enter your full name.";
    }
    if (!data.country) {
        errors["country"] = "Select your country.";
    }
    if (!/^\+?[0-9\s-]{8,16}$/.test(data.phone)) {
        errors["phone"] = "Enter a valid phone number, for example +233 24 000 0000.";
    }
    if (!data.hasAge || !Number.isInteger(data.age) || data.age < 1 || data.age > 120) {
        errors["age"] = "Enter your age as a whole number.";
    }
    if (!data.hasAccountAge || data.accountAge < 0) {
        errors["account-age"] = "Enter how many months you have used MoMo (0 or more).";
    }
    if (!data.hasVolume || data.monthlyVolume < 0) {
        errors["monthly-volume"] = "Enter your average monthly MoMo activity in USD.";
    }
    if (!data.hasAmount || data.requestedAmount < RULES.minLoan || data.requestedAmount > RULES.maxLoan) {
        errors["requested-amount"] =
            `Enter an amount between ${currency.format(RULES.minLoan)} and ${currency.format(RULES.maxLoan)}.`;
    }
    if (!data.consent) {
        errors["consent"] = "Please confirm your details are correct.";
    }

    return errors;
}

function showErrors(errors) {
    let firstField = null;

    Object.entries(errors).forEach(([fieldId, message]) => {
        const field = byId(fieldId);
        byId(`${fieldId}-error`).textContent = message;
        field.setAttribute("aria-invalid", "true");
        if (!firstField) firstField = field;
    });

    firstField.focus();
}

function clearErrors(form) {
    form.querySelectorAll(".field__error").forEach((el) => (el.textContent = ""));
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
}

// Applies the business rules and returns a plain result object.
function assess(data) {
    const reasons = [];

    if (data.age < RULES.minAge) {
        reasons.push(`You must be at least ${RULES.minAge} years old.`);
    }
    if (data.accountAge < RULES.minAccountMonths) {
        reasons.push(`Your MoMo account must be at least ${RULES.minAccountMonths} months old.`);
    }
    if (data.monthlyVolume < RULES.minMonthlyVolume) {
        reasons.push(`Your average monthly MoMo activity must be at least ${currency.format(RULES.minMonthlyVolume)}.`);
    }

    if (reasons.length > 0) {
        return { status: "declined", reasons, limit: 0, approved: 0 };
    }

    // Round the limit down to the nearest $10 so it looks clean
    const rawLimit = Math.min(RULES.maxLoan, data.monthlyVolume * RULES.limitMultiplier);
    const limit = Math.max(RULES.minLoan, Math.floor(rawLimit / 10) * 10);

    if (data.requestedAmount <= limit) {
        return { status: "approved", reasons: [], limit, approved: data.requestedAmount };
    }
    return { status: "partial", reasons: [], limit, approved: limit };
}

function renderResult(result, data) {
    const output = byId("eligibility-result");
    const firstName = data.fullName.split(" ")[0];

    output.className = `eligibility__output eligibility__output--${result.status}`;
    output.replaceChildren();

    if (result.status === "declined") {
        output.appendChild(createElement("h3", "result__title", "You do not qualify yet"));
        output.appendChild(createElement("p", "result__text",
            `${firstName}, based on your answers we cannot offer a loan right now. Here is why:`));

        const list = createElement("ul", "result__list");
        result.reasons.forEach((reason) => list.appendChild(createElement("li", "", reason)));
        output.appendChild(list);

        output.appendChild(createElement("p", "result__text",
            "You can check again whenever your details change."));
    } else {
        const isFull = result.status === "approved";

        output.appendChild(createElement("h3", "result__title",
            isFull ? `Good news, ${firstName}. You are eligible` : `${firstName}, you are eligible for less`));
        output.appendChild(createElement("p", "result__text",
            isFull
                ? "You can borrow the amount you asked for."
                : `You asked for ${currency.format(data.requestedAmount)}, but your current limit is ${currency.format(result.limit)}.`));
        output.appendChild(createElement("p", "result__amount", currency.format(result.approved)));

        const list = createElement("ul", "result__list");
        list.appendChild(createElement("li", "", `Your estimated limit is ${currency.format(result.limit)}.`));
        list.appendChild(createElement("li", "", "This is an estimate. Final approval depends on verification."));
        output.appendChild(list);

        const actions = createElement("div", "result__actions");
        const button = createElement("button", "button button--outline", "See my monthly repayment");
        button.type = "button";
        button.addEventListener("click", () => sendToCalculator(result.approved));
        actions.appendChild(button);
        output.appendChild(actions);
    }

    // Bring the result into view on small screens where it sits below the form
    output.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ---------- 6. Loan calculator ---------- */

// Standard loan formula: M = P * r / (1 - (1 + r)^-n)
// P = amount, r = monthly rate, n = number of months
function calculateRepayment(amount, months, annualRate) {
    const monthlyRate = annualRate / 100 / 12;
    const monthly = monthlyRate === 0
        ? amount / months
        : (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
    const total = monthly * months;
    return { monthly, total, interest: total - amount };
}

function initCalculator() {
    const form = byId("calculator-form");
    form.addEventListener("input", updateCalculator);
    form.addEventListener("submit", (event) => event.preventDefault());
    updateCalculator();
}

function updateCalculator() {
    const amount = Number(byId("calc-amount").value);
    const months = Number(byId("calc-period").value);
    const rate = Number(byId("calc-rate").value);

    const isValid = amount > 0 && months > 0 && rate >= 0;
    const result = isValid ? calculateRepayment(amount, months, rate) : { monthly: 0, total: 0, interest: 0 };

    byId("calc-monthly").textContent = currency.format(result.monthly);
    byId("calc-total").textContent = currency.format(result.total);
    byId("calc-interest").textContent = currency.format(result.interest);
}

function sendToCalculator(amount) {
    byId("calc-amount").value = amount;
    updateCalculator();
    byId("calculator").scrollIntoView({ behavior: "smooth" });
}

/* ---------- 7. Testimonials ---------- */

function initTestimonials() {
    const slides = document.querySelectorAll(".testimonial");
    const dotsContainer = byId("testimonials-dots");
    const carousel = byId("testimonials-carousel");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let current = 0;
    let timer = null;

    const dots = Array.from(slides).map((_, index) => {
        const dot = createElement("button", "testimonials__dot");
        dot.type = "button";
        dot.setAttribute("aria-label", `Show testimonial ${index + 1}`);
        dot.addEventListener("click", () => show(index));
        dotsContainer.appendChild(dot);
        return dot;
    });

    function show(index) {
        current = index;
        slides.forEach((slide, i) => (slide.hidden = i !== index));
        dots.forEach((dot, i) => dot.classList.toggle("testimonials__dot--active", i === index));
    }

    function start() {
        if (reduceMotion) return; // do not auto-rotate for people who asked for less motion
        stop();
        timer = setInterval(() => show((current + 1) % slides.length), 6000);
    }

    function stop() {
        clearInterval(timer);
    }

    carousel.addEventListener("mouseenter", stop);
    carousel.addEventListener("mouseleave", start);
    carousel.addEventListener("focusin", stop);
    carousel.addEventListener("focusout", start);

    show(0);
    start();
}

/* ---------- Start everything ---------- */

document.addEventListener("DOMContentLoaded", () => {
    byId("year").textContent = new Date().getFullYear();
    initMobileMenu();
    initCountries();
    initEligibility();
    initCalculator();
    initTestimonials();
});