// =========================================================
// POTential - Business Profile
// =========================================================

const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

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

    if (!messageBox) return;

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
        headerName.textContent = businessName || "Business";
    }
}

// =========================================================
// LOAD LOGGED-IN USER
// =========================================================

async function loadCurrentUser() {

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();

    if (error) {
        console.error("User error:", error);
        throw error;
    }

    if (!user) {
        window.location.href = "auth.html";
        return null;
    }

    currentUser = user;

    return user;
}

// =========================================================
// LOAD BUSINESS PROFILE
// =========================================================

async function loadBusinessProfile() {

    if (!currentUser) return;

    // =====================================================
    // SUPABASE READ
    // Existing businesses table is used.
    // Business is matched using owner_id.
    // =====================================================

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
            phone,
            profile_photo_url
        `)
        .eq("owner_id", currentUser.id)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("Business profile load error:", error);
        showMessage("Business profile load nahi ho paya.", "error");
        return;
    }

    if (!business) {
        showMessage("Business profile nahi mila.", "error");
        return;
    }

    currentBusiness = business;

    // =====================================================
    // FILL FORM
    // =====================================================

    if ($("businessName")) {
        $("businessName").value = business.business_name || "";
    }

    if ($("businessType")) {
        $("businessType").value = business.business_type || "";
    }

    if ($("city")) {
        $("city").value = business.city || "";
    }

    if ($("phone")) {
        $("phone").value = business.phone || "";
    }

    // =====================================================
    // UPDATE HEADER
    // =====================================================

    updateHeader(business.business_name);

    // =====================================================
    // LOAD PROFILE PHOTO
    // =====================================================

    if (business.profile_photo_url) {
        const profilePhoto = $("profilePhoto");

        if (profilePhoto) {
            profilePhoto.src = business.profile_photo_url;
            profilePhoto.style.display = "block";
        }
    }

    // =====================================================
    // UPDATE PROFILE COMPLETION
    // =====================================================

    updateProfileCompletion();
}

// =========================================================
// UPDATE PROFILE COMPLETION
// =========================================================

function updateProfileCompletion() {

    if (!currentBusiness) return;

    const fields = [
        currentBusiness.business_name,
        currentBusiness.business_type,
        currentBusiness.city,
        currentBusiness.phone
    ];

    const completed = fields.filter(
        value => value && value.toString().trim() !== ""
    ).length;

    const percentage = Math.round(
        (completed / fields.length) * 100
    );

    const progressBar = $("profileProgress");
    const progressText = $("profileProgressText");

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }

    if (progressText) {
        progressText.textContent = `${percentage}% Complete`;
    }
}

// =========================================================
// SAVE BUSINESS PROFILE
// =========================================================

async function saveBusinessProfile(event) {

    event.preventDefault();

    if (!currentUser || !currentBusiness) {
        showMessage("Business profile load nahi hua.", "error");
        return;
    }

    const businessName =
        $("businessName")?.value.trim() || "";

    const businessType =
        $("businessType")?.value.trim() || "";

    const city =
        $("city")?.value.trim() || "";

    const phone =
        $("phone")?.value.trim() || "";

    // =====================================================
    // BASIC VALIDATION
    // =====================================================

    if (!businessName) {
        showMessage("Please enter business name.", "error");
        $("businessName")?.focus();
        return;
    }

    if (!businessType) {
        showMessage("Please enter business type.", "error");
        $("businessType")?.focus();
        return;
    }

    if (!city) {
        showMessage("Please enter city.", "error");
        $("city")?.focus();
        return;
    }

    if (!phone) {
        showMessage("Please enter phone number.", "error");
        $("phone")?.focus();
        return;
    }

    const saveButton =
        $("saveProfileBtn") ||
        $("saveBtn") ||
        $("saveChangesBtn");

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
    }

    try {

        // =================================================
        // SUPABASE WRITE
        // Update the SAME business row.
        // owner_id is also checked for security.
        // =================================================

        const {
            data: updatedBusiness,
            error
        } = await supabaseClient
            .from("businesses")
            .update({
                business_name: businessName,
                business_type: businessType,
                city: city,
                phone: phone
            })
            .eq("id", currentBusiness.id)
            .eq("owner_id", currentUser.id)
            .select(`
                id,
                owner_id,
                business_name,
                business_type,
                city,
                phone,
                profile_photo_url
            `)
            .single();

        if (error) {
            console.error("Business profile update error:", error);
            throw error;
        }

        // =================================================
        // CONFIRM SUPABASE ACTUALLY RETURNED THE ROW
        // =================================================

        if (!updatedBusiness) {
            throw new Error(
                "Business profile update nahi hua."
            );
        }

        // =================================================
        // UPDATE LOCAL DATA
        // =================================================

        currentBusiness = updatedBusiness;

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

        updateHeader(updatedBusiness.business_name);

        // =================================================
        // UPDATE COMPLETION
        // =================================================

        updateProfileCompletion();

        showMessage(
            "✓ Changes successfully save ho gaye!",
            "success"
        );

    } catch (error) {

        console.error("Save profile error:", error);

        showMessage(
            error.message ||
            "Profile save nahi ho paya.",
            "error"
        );

    } finally {

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save Changes";
        }
    }
}

// =========================================================
// PROFILE PHOTO UPLOAD
// =========================================================

async function uploadProfilePhoto(event) {

    const file = event.target.files?.[0];

    if (!file || !currentBusiness || !currentUser) {
        return;
    }

    // =====================================================
    // FILE VALIDATION
    // =====================================================

    if (!file.type.startsWith("image/")) {
        showMessage(
            "Please select a valid image file.",
            "error"
        );

        event.target.value = "";
        return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
        showMessage(
            "Image size 5MB se kam honi chahiye.",
            "error"
        );

        event.target.value = "";
        return;
    }

    const uploadButton = $("uploadPhotoBtn");

    if (uploadButton) {
        uploadButton.disabled = true;
        uploadButton.textContent = "Uploading...";
    }

    try {

        const fileExtension =
            file.name.split(".").pop().toLowerCase();

        const fileName =
            `${currentUser.id}_${Date.now()}.${fileExtension}`;

        const filePath =
            `business-profiles/${fileName}`;

        // =================================================
        // SUPABASE STORAGE UPLOAD
        // =================================================

        const {
            error: uploadError
        } = await supabaseClient.storage
            .from("business-profiles")
            .upload(
                filePath,
                file,
                {
                    upsert: true,
                    contentType: file.type
                }
            );

        if (uploadError) {
            throw uploadError;
        }

        // =================================================
        // GET PUBLIC URL
        // =================================================

        const {
            data: publicUrlData
        } = supabaseClient.storage
            .from("business-profiles")
            .getPublicUrl(filePath);

        const publicUrl =
            publicUrlData?.publicUrl;

        if (!publicUrl) {
            throw new Error(
                "Profile photo URL generate nahi hua."
            );
        }

        // =================================================
        // SUPABASE WRITE
        // Save photo URL in businesses table.
        // =================================================

        const {
            data: updatedBusiness,
            error: updateError
        } = await supabaseClient
            .from("businesses")
            .update({
                profile_photo_url: publicUrl
            })
            .eq("id", currentBusiness.id)
            .eq("owner_id", currentUser.id)
            .select(`
                id,
                owner_id,
                business_name,
                business_type,
                city,
                phone,
                profile_photo_url
            `)
            .single();

        if (updateError) {
            throw updateError;
        }

        if (!updatedBusiness) {
            throw new Error(
                "Profile photo database me save nahi hui."
            );
        }

        currentBusiness = updatedBusiness;

        // =================================================
        // SHOW PHOTO
        // =================================================

        const profilePhoto = $("profilePhoto");

        if (profilePhoto) {
            profilePhoto.src =
                updatedBusiness.profile_photo_url;
            profilePhoto.style.display = "block";
        }

        showMessage(
            "✓ Profile photo successfully updated!",
            "success"
        );

    } catch (error) {

        console.error("Profile photo upload error:", error);

        showMessage(
            error.message ||
            "Profile photo upload nahi ho payi.",
            "error"
        );

    } finally {

        if (uploadButton) {
            uploadButton.disabled = false;
            uploadButton.textContent = "Upload Photo";
        }

        event.target.value = "";
    }
}

// =========================================================
// LOGOUT
// =========================================================

async function logout() {

    try {

        const { error } =
            await supabaseClient.auth.signOut();

        if (error) {
            throw error;
        }

        window.location.href = "auth.html";

    } catch (error) {

        console.error("Logout error:", error);

        showMessage(
            "Logout nahi ho paya.",
            "error"
        );
    }
}

// =========================================================
// INITIALIZE PROFILE PAGE
// =========================================================

async function startBusinessProfile() {

    try {

        const user = await loadCurrentUser();

        if (!user) return;

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

document.addEventListener("DOMContentLoaded", () => {

    // Save profile
    const profileForm =
        $("businessProfileForm") ||
        $("profileForm");

    if (profileForm) {
        profileForm.addEventListener(
            "submit",
            saveBusinessProfile
        );
    }

    // Profile photo
    const photoInput =
        $("profilePhotoInput") ||
        $("photoInput");

    if (photoInput) {
        photoInput.addEventListener(
            "change",
            uploadProfilePhoto
        );
    }

    // Logout buttons
    const logoutBtn = $("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener(
            "click",
            logout
        );
    }

    const sidebarLogout =
        $("sidebarLogout");

    if (sidebarLogout) {
        sidebarLogout.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                logout();
            }
        );
    }

    // Start page
    startBusinessProfile();
});