/* =========================================================
   POTENTIAL LANDING PAGE
   ========================================================= */


/* ================= NAVBAR ================= */

const navbar = document.querySelector(".navbar");

window.addEventListener("scroll", () => {

    if (window.scrollY > 20) {
        navbar.classList.add("is-scrolled");
    } else {
        navbar.classList.remove("is-scrolled");
    }

});



/* ================= MOBILE MENU ================= */

const hamburger =
    document.getElementById("hamburger");

const mobileMenu =
    document.getElementById("mobileMenu");


if (hamburger && mobileMenu) {

    hamburger.addEventListener("click", () => {

        hamburger.classList.toggle("is-active");

        mobileMenu.classList.toggle("is-open");

    });


    mobileMenu
        .querySelectorAll("a")
        .forEach(link => {

            link.addEventListener("click", () => {

                hamburger.classList.remove("is-active");

                mobileMenu.classList.remove("is-open");

            });

        });

}



/* ================= SCROLL REVEAL ================= */

const revealElements =
    document.querySelectorAll(
        ".feature-card, .step, .opportunity-card, .trust-badge"
    );


if ("IntersectionObserver" in window) {

    const observer =
        new IntersectionObserver(
            entries => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add(
                            "is-visible"
                        );

                        observer.unobserve(
                            entry.target
                        );

                    }

                });

            },
            {
                threshold: 0.12
            }
        );


    revealElements.forEach(element => {

        element.classList.add("reveal");

        observer.observe(element);

    });

}



/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
    "https://epedptuewukgferdpzjq.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_PpDvDuEQDqNirED5FNEZsA_p7wHVl8s";


let supabaseClient = null;


function initializeSupabase() {

    if (
        typeof window.supabase === "undefined"
    ) {

        console.error(
            "Supabase library was not loaded."
        );

        return null;

    }


    if (
        SUPABASE_URL === "YOUR_SUPABASE_URL" ||
        SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY"
    ) {

        console.error(
            "Add your Supabase URL and anon/publishable key."
        );

        return null;

    }


    return window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

}


supabaseClient =
    initializeSupabase();



/* =========================================================
   LOAD FEATURED BUSINESSES
   ========================================================= */

async function loadBusinesses() {

    const businessGrid =
        document.getElementById(
            "businessGrid"
        );


    if (!businessGrid) {
        return;
    }


    if (!supabaseClient) {

        businessGrid.innerHTML = `
            <div class="opportunity-empty">
                Unable to connect to the database.
            </div>
        `;

        return;

    }


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("businesses")

            .select(
                "id, business_name, business_type, city"
            )

            .order(
                "created_at",
                {
                    ascending: false
                }
            )

            .limit(6);


        if (error) {

            console.error(
                "Supabase error:",
                error
            );

            throw error;

        }


        if (!data || data.length === 0) {

            businessGrid.innerHTML = `
                <div class="opportunity-empty">
                    No businesses registered yet.
                </div>
            `;

            return;

        }


        businessGrid.innerHTML =
            data
                .map(
                    business =>
                        createBusinessCard(
                            business
                        )
                )
                .join("");


        /* Add reveal animation */

        businessGrid
            .querySelectorAll(
                ".opportunity-card"
            )
            .forEach(card => {

                card.classList.add(
                    "reveal"
                );

                setTimeout(() => {

                    card.classList.add(
                        "is-visible"
                    );

                }, 50);

            });


    } catch (error) {

        console.error(
            "Could not load businesses:",
            error
        );


        businessGrid.innerHTML = `
            <div class="opportunity-empty">
                Unable to load businesses right now.
            </div>
        `;

    }

}



/* =========================================================
   BUSINESS CARD
   ========================================================= */

function createBusinessCard(business) {

    const name =
        escapeHTML(
            business.business_name ||
            "Business"
        );


    const type =
        escapeHTML(
            business.business_type ||
            "Local Business"
        );


    const city =
        escapeHTML(
            business.city ||
            "Location not provided"
        );


    return `

        <article
            class="opportunity-card"
        >

            <div class="opportunity-card__top">

                <span
                    class="opportunity-card__badge"
                >
                    ${type}
                </span>

            </div>


            <h3>
                ${name}
            </h3>


            <p
                class="opportunity-card__business"
            >
                ${type}
            </p>


            <p
                class="opportunity-card__meta"
            >
                📍 ${city}
            </p>

        </article>

    `;

}



/* =========================================================
   SECURITY
   ========================================================= */

function escapeHTML(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}



/* =========================================================
   START
   ========================================================= */

loadBusinesses();