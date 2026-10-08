// =========================================================
// POTential - Business Profile
// =========================================================


// =========================================================
// SUPABASE CLIENT
// =========================================================

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


// =========================================================
// GLOBAL VARIABLES
// =========================================================

let currentUser = null;
let currentBusiness = null;


// =========================================================
// HELPER
// =========================================================

function $(id) {
    return document.getElementById(id);
}


// =========================================================
// MESSAGE
// =========================================================

function showMessage(message, type = "success") {

    const messageBox = $("message");

    if (!messageBox) {
        return;
    }

    messageBox.textContent = message;
    messageBox.className = `message ${type}`;

    setTimeout(() => {

        messageBox.textContent = "";
        messageBox.className = "message";

    }, 4000);
}


// =========================================================
// UPDATE HEADER
// =========================================================

function updateHeader(businessName) {

    const headerName = $("businessNameTop");

    if (headerName) {

        headerName.textContent =
            businessName || "Business";
    }
}


// =========================================================
// LOAD LOGGED-IN USER
// =========================================================

async function loadCurrentUser() {

    try {

        const {
            data: { user },
            error
        } = await supabaseClient.auth.getUser();

        if (error) {

            console.error(
                "User error:",
                error
            );

            throw error;
        }

        if (!user) {

            window.location.href = "auth.html";

            return null;
        }

        currentUser = user;

        console.log(
            "Logged-in user:",
            currentUser.id
        );

        return user;

    } catch (error) {

        console.error(
            "loadCurrentUser() error:",
            error
        );

        showMessage(
            "Unable to verify logged-in user.",
            "error"
        );

        return null;
    }
}


// =========================================================
// LOAD BUSINESS PROFILE
// =========================================================

async function loadBusinessProfile() {

    if (!currentUser) {

        console.error(
            "Current user is not available."
        );

        return;
    }

    try {

        const {
            data: business,
            error
        } = await supabaseClient
            .from("businesses")
            .select(`
                id,
                owner_id,
                business_name,
                business_type,
                city,
                phone
            `)
            .eq(
                "owner_id",
                currentUser.id
            )
            .maybeSingle();


        // =================================================
        // DATABASE ERROR
        // =================================================

        if (error) {

            console.error(
                "Business profile load error:",
                error
            );

            showMessage(
                "Business profile load nahi ho paya: " +
                error.message,
                "error"
            );

            return;
        }


        // =================================================
        // BUSINESS NOT FOUND
        // =================================================

        if (!business) {

            console.error(
                "No business found for owner_id:",
                currentUser.id
            );

            showMessage(
                "Business profile nahi mila.",
                "error"
            );

            return;
        }


        // =================================================
        // STORE BUSINESS
        // =================================================

        currentBusiness = business;


        // =================================================
        // FILL BUSINESS NAME
        // =================================================

        const businessNameInput =
            $("businessName");

        if (businessNameInput) {

            businessNameInput.value =
                business.business_name || "";
        }


        // =================================================
        // FILL BUSINESS TYPE
        // =================================================

        const businessTypeInput =
            $("businessType");

        if (businessTypeInput) {

            businessTypeInput.value =
                business.business_type || "";
        }


        // =================================================
        // FILL CITY
        // =================================================

        const cityInput =
            $("city");

        if (cityInput) {

            cityInput.value =
                business.city || "";
        }


        // =================================================
        // FILL PHONE
        // =================================================

        const phoneInput =
            $("phone");

        if (phoneInput) {

            phoneInput.value =
                business.phone || "";
        }


        // =================================================
        // UPDATE HEADER
        // =================================================

        updateHeader(
            business.business_name
        );


        // =================================================
        // UPDATE PROFILE COMPLETION
        // =================================================

        updateProfileCompletion();


        console.log(
            "Business profile loaded successfully:",
            business
        );

    } catch (error) {

        console.error(
            "loadBusinessProfile() error:",
            error
        );

        showMessage(
            "Business profile load nahi ho paya: " +
            error.message,
            "error"
        );
    }
}


// =========================================================
// UPDATE PROFILE COMPLETION
// =========================================================

function updateProfileCompletion() {

    if (!currentBusiness) {
        return;
    }


    const fields = [

        currentBusiness.business_name,

        currentBusiness.business_type,

        currentBusiness.city,

        currentBusiness.phone

    ];


    const completed =
        fields.filter(
            value =>
                value &&
                value.toString().trim() !== ""
        ).length;


    const percentage =
        Math.round(
            (completed / fields.length) * 100
        );


    // =====================================================
    // PROGRESS BAR
    // =====================================================

    const progressBar =
        $("profileProgress");

    if (progressBar) {

        progressBar.style.width =
            `${percentage}%`;
    }


    // =====================================================
    // PROGRESS TEXT
    // =====================================================

    const progressText =
        $("profileProgressText");

    if (progressText) {

        progressText.textContent =
            `${percentage}% Complete`;
    }
}


// =========================================================
// SAVE BUSINESS PROFILE
// =========================================================

async function saveBusinessProfile(event) {

    event.preventDefault();


    // =====================================================
    // CHECK USER + BUSINESS
    // =====================================================

    if (
        !currentUser ||
        !currentBusiness
    ) {

        showMessage(
            "Business profile load nahi hua.",
            "error"
        );

        return;
    }


    // =====================================================
    // GET FORM VALUES
    // =====================================================

    const businessName =
        $("businessName")?.value.trim() || "";

    const businessType =
        $("businessType")?.value.trim() || "";

    const city =
        $("city")?.value.trim() || "";

    const phone =
        $("phone")?.value.trim() || "";


    // =====================================================
    // VALIDATION - BUSINESS NAME
    // =====================================================

    if (!businessName) {

        showMessage(
            "Please enter business name.",
            "error"
        );

        $("businessName")?.focus();

        return;
    }


    // =====================================================
    // VALIDATION - BUSINESS TYPE
    // =====================================================

    if (!businessType) {

        showMessage(
            "Please enter business type.",
            "error"
        );

        $("businessType")?.focus();

        return;
    }


    // =====================================================
    // VALIDATION - CITY
    // =====================================================

    if (!city) {

        showMessage(
            "Please enter city.",
            "error"
        );

        $("city")?.focus();

        return;
    }


    // =====================================================
    // VALIDATION - PHONE
    // =====================================================

    if (!phone) {

        showMessage(
            "Please enter phone number.",
            "error"
        );

        $("phone")?.focus();

        return;
    }


    // =====================================================
    // PHONE VALIDATION
    // =====================================================

    const cleanPhone =
        phone.replace(/\D/g, "");

    if (cleanPhone.length < 10) {

        showMessage(
            "Please enter a valid phone number.",
            "error"
        );

        $("phone")?.focus();

        return;
    }


    // =====================================================
    // SAVE BUTTON
    // =====================================================

    const saveButton =
        $("saveProfileBtn") ||
        $("saveBtn") ||
        $("saveChangesBtn");


    if (saveButton) {

        saveButton.disabled = true;

        saveButton.textContent =
            "Saving...";
    }


    // =====================================================
    // UPDATE DATABASE
    // =====================================================

    try {

        const {
            data: updatedBusiness,
            error
        } = await supabaseClient
            .from("businesses")
            .update({

                business_name:
                    businessName,

                business_type:
                    businessType,

                city:
                    city,

                phone:
                    phone

            })
            .eq(
                "id",
                currentBusiness.id
            )
            .eq(
                "owner_id",
                currentUser.id
            )
            .select(`
                id,
                owner_id,
                business_name,
                business_type,
                city,
                phone
            `)
            .single();


        // =================================================
        // DATABASE ERROR
        // =================================================

        if (error) {

            console.error(
                "Business profile update error:",
                error
            );

            throw error;
        }


        // =================================================
        // NO UPDATED DATA
        // =================================================

        if (!updatedBusiness) {

            throw new Error(
                "Business profile update nahi hua."
            );
        }


        // =================================================
        // UPDATE GLOBAL DATA
        // =================================================

        currentBusiness =
            updatedBusiness;


        // =================================================
        // UPDATE FORM
        // =================================================

        if ($("businessName")) {

            $("businessName").value =
                updatedBusiness.business_name || "";
        }


        if ($("businessType")) {

            $("businessType").value =
                updatedBusiness.business_type || "";
        }


        if ($("city")) {

            $("city").value =
                updatedBusiness.city || "";
        }


        if ($("phone")) {

            $("phone").value =
                updatedBusiness.phone || "";
        }


        // =================================================
        // UPDATE HEADER
        // =================================================

        updateHeader(
            updatedBusiness.business_name
        );


        // =================================================
        // UPDATE COMPLETION
        // =================================================

        updateProfileCompletion();


        // =================================================
        // SUCCESS MESSAGE
        // =================================================

        showMessage(
            "✓ Changes successfully save ho gaye!",
            "success"
        );


        console.log(
            "Business profile updated successfully:",
            updatedBusiness
        );

    } catch (error) {

        console.error(
            "Save profile error:",
            error
        );

        showMessage(
            error.message ||
            "Profile save nahi ho paya.",
            "error"
        );

    } finally {

        // =================================================
        // RESTORE SAVE BUTTON
        // =================================================

        if (saveButton) {

            saveButton.disabled = false;

            saveButton.textContent =
                "Save Changes";
        }
    }
}


// =========================================================
// LOGOUT
// =========================================================

async function logout() {

    try {

        const {
            error
        } = await supabaseClient
            .auth
            .signOut();


        if (error) {

            throw error;
        }


        window.location.href =
            "auth.html";

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

        showMessage(
            "Logout nahi ho paya.",
            "error"
        );
    }
}


// =========================================================
// INITIALIZE BUSINESS PROFILE
// =========================================================

async function startBusinessProfile() {

    try {

        const user =
            await loadCurrentUser();


        if (!user) {

            return;
        }


        await loadBusinessProfile();

    } catch (error) {

        console.error(
            "Business profile initialization error:",
            error
        );

        showMessage(
            "Business profile load nahi ho paya.",
            "error"
        );
    }
}


// =========================================================
// EVENT LISTENERS
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {


        // =================================================
        // PROFILE FORM
        // =================================================

        const profileForm =
            $("businessProfileForm") ||
            $("profileForm");


        if (profileForm) {

            profileForm.addEventListener(
                "submit",
                saveBusinessProfile
            );
        }


        // =================================================
        // LOGOUT BUTTON
        // =================================================

        const logoutBtn =
            $("logoutBtn");


        if (logoutBtn) {

            logoutBtn.addEventListener(
                "click",
                logout
            );
        }


        // =================================================
        // SIDEBAR LOGOUT
        // =================================================

        const sidebarLogout =
            $("sidebarLogout");


        if (sidebarLogout) {

            sidebarLogout.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    logout();
                }
            );
        }


        // =================================================
        // START
        // =================================================

        startBusinessProfile();

    }
);