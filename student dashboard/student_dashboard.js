// ==========================================
// SUPABASE CONFIGURATION
// ==========================================

const SUPABASE_URL = "https://epedptuewukgferdpzjq.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_PpDvDuEQDqNirED5FNEZsA_p7wHVl8s";


// ==========================================
// CREATE SUPABASE CLIENT
// ==========================================

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


// ==========================================
// PAGE LOAD
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("Student Dashboard JS loaded");

    loadJobs();

});


// ==========================================
// LOAD JOBS
// ==========================================

async function loadJobs() {

    const opportunityGrid =
        document.querySelector(".opportunity-grid");

    if (!opportunityGrid) {

        console.error(
            "Opportunity grid not found"
        );

        return;
    }


    opportunityGrid.innerHTML = `
        <p>Loading opportunities...</p>
    `;


    const { data: jobs, error } =
        await supabaseClient
            .from("jobs")
            .select("*")
            .eq("status", "open")
            .order("created_at", {
                ascending: false
            });


    if (error) {

        console.error(
            "Error loading jobs:",
            error
        );

        opportunityGrid.innerHTML = `
            <p>
                Unable to load opportunities.
            </p>
        `;

        return;
    }


    console.log(
        "Jobs received from Supabase:",
        jobs
    );


    if (!jobs || jobs.length === 0) {

        opportunityGrid.innerHTML = `
            <p>
                No opportunities available.
            </p>
        `;

        return;
    }


    opportunityGrid.innerHTML = "";


    // Show first 3 jobs on dashboard

    const recommendedJobs =
        jobs.slice(0, 3);


    recommendedJobs.forEach(job => {

        const card =
            document.createElement("div");

        card.className =
            "opportunity-card";


        card.innerHTML = `

            <span class="tag">
                ${job.job_type || "Opportunity"}
            </span>

            <h3>
                ${job.title || "Untitled Job"}
            </h3>

            <p>
                ${job.description || "No description available"}
            </p>

            <p>
                📍 ${job.location || "Location not specified"}
            </p>

            <p>
                💰 ${job.salary || "Salary not specified"}
            </p>

            <p>
                🕐 ${job.availability || "Not specified"}
            </p>

            <button
                onclick="viewOpportunity('${job.id}')">
                View Details
            </button>

        `;


        opportunityGrid.appendChild(card);

    });

}


// ==========================================
// VIEW OPPORTUNITY
// ==========================================

function viewOpportunity(jobId) {

    localStorage.setItem(
        "selectedJobId",
        jobId
    );

    window.location.href =
        "opportunity-details.html";
}