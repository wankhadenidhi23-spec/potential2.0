// =========================================================
// POTential - Business Profile
// =========================================================

// SUPABASE_URL and SUPABASE_ANON_KEY are provided by ../supabase-config.js
// Do not redeclare them here.

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
        window.location.href = "../auth.html";
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

    // Find the business belonging to the CURRENT auth user.
    let { data: businessRows, error } = await supabaseClient
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
        .limit(1);

    // Some older accounts can contain duplicate business rows.
    // Never fail the profile page because of that. Use the first matching row.
    let business = businessRows?.[0] || null;

    if (error) {
        console.error("Business profile load error:", error);
        showMessage("Could not load your business profile: " + error.message, "error");
        return;
    }

    // New-account safety: create the missing business row.
    if (!business) {

        const metadataName =
            currentUser.user_metadata?.full_name ||
            currentUser.user_metadata?.name ||
            currentUser.email?.split("@")[0] ||
            "Business";

        const { data: createdBusiness, error: createError } =
            await supabaseClient
                .from("businesses")
                .insert({
                    owner_id: currentUser.id,
                    business_name: metadataName,
                    business_type: "Not specified"
                })
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

        if (createError) {
            console.error("Business profile creation error:", createError);
            showMessage(
                "Your business profile could not be created: " + createError.message,
                "error"
            );
            return;
        }

        business = createdBusiness;
    }

    currentBusiness = business;

    // Fill form with THIS account's details.
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

    // Update both the top header and profile hero name.
    updateHeader(business.business_name);

    if ($("heroBusinessName")) {
        $("heroBusinessName").textContent =
            business.business_name || "Your Business";
    }

    // Profile photo.
    if (business.profile_photo_url) {
        const profilePhoto = $("profilePhotoPreview") || $("profilePhoto");
        if (profilePhoto) {
            profilePhoto.src = business.profile_photo_url;
            profilePhoto.style.display = "block";
        }

        const placeholder = $("profilePhotoPlaceholder");
        if (placeholder) placeholder.style.display = "none";
    }

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

        if ($("heroBusinessName")) {
            $("heroBusinessName").textContent =
                updatedBusiness.business_name || "Your Business";
        }

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

        const profilePhoto = $("profilePhotoPreview") || $("profilePhoto");

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
// BUSINESS VERIFICATION
// Uses the existing verification system:
// Table  : verification_documents
// Bucket : verification-documents
// =========================================================

const VERIFICATION_BUCKET = "verification-documents";

function setVerificationMessage(message, type = "success") {
    const box = $("businessVerificationMessage");
    if (!box) return;

    box.textContent = message || "";
    box.className = `verification-message ${type}`;
}

function updateVerificationStatusUI(status) {
    const statusBox = $("businessVerificationStatus");
    const uploadButton = $("businessVerificationUploadBtn");

    const normalized = String(status || "not_submitted").toLowerCase();

    if (statusBox) {
        statusBox.textContent =
            normalized === "approved" ? "Approved" :
            normalized === "pending" ? "Pending Review" :
            normalized === "rejected" ? "Rejected" :
            "Not submitted";

        statusBox.className = `verification-status ${normalized}`;
    }

    // A pending/approved document should not be submitted repeatedly.
    // Rejected and not-submitted accounts can upload again.
    if (uploadButton) {
        uploadButton.disabled =
            normalized === "pending" || normalized === "approved";

        uploadButton.textContent =
            normalized === "rejected"
                ? "🔄 Resubmit for Verification"
                : "🚀 Submit for Verification";
    }
}

async function loadVerificationStatus() {

    if (!currentUser) return "not_submitted";

    const { data, error } = await supabaseClient
        .from("verification_documents")
        .select("id, document_type, file_path, status, rejection_reason, uploaded_at")
        .eq("user_id", currentUser.id)
        .eq("role", "business")
        .order("uploaded_at", { ascending: false })
        .limit(1);

    if (error) {
        console.error("Verification status error:", error);
        updateVerificationStatusUI("not_submitted");
        return "not_submitted";
    }

    const latest = data?.[0] || null;
    const status = String(latest?.status || "not_submitted").toLowerCase();

    updateVerificationStatusUI(status);

    if (status === "rejected" && latest?.rejection_reason) {
        setVerificationMessage(
            `Your previous document was rejected: ${latest.rejection_reason}`,
            "error"
        );
    }

    return status;
}

function setupVerificationForm() {

    const category = $("verificationCategory");
    const identityGroup = $("identityDocumentGroup");
    const businessGroup = $("businessDocumentGroup");
    const identityType = $("identityDocumentType");
    const businessType = $("businessDocumentType");
    const fileInput = $("businessVerificationFile");
    const chooseButton = $("chooseVerificationFileBtn");
    const fileName = $("selectedDocumentName");
    const preview = $("documentPreview");
    const imagePreview = $("documentImagePreview");
    const pdfPreview = $("documentPdfPreview");
    const removeButton = $("removeDocumentBtn");
    const submitButton = $("businessVerificationUploadBtn");

    if (!category || !fileInput || !submitButton) return;

    function updateDocumentGroups() {
        const value = category.value;

        if (identityGroup) {
            identityGroup.style.display = value === "identity" ? "block" : "none";
        }

        if (businessGroup) {
            businessGroup.style.display = value === "business" ? "block" : "none";
        }

        if (value !== "identity" && identityType) {
            identityType.value = "";
        }

        if (value !== "business" && businessType) {
            businessType.value = "";
        }
    }

    category.addEventListener("change", updateDocumentGroups);
    updateDocumentGroups();

    if (chooseButton) {
        chooseButton.addEventListener("click", () => fileInput.click());
    }

    fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];

        if (!file) {
            if (fileName) fileName.textContent = "No document selected";
            return;
        }

        const allowed = [
            "application/pdf",
            "image/jpeg",
            "image/png"
        ];

        if (!allowed.includes(file.type)) {
            setVerificationMessage(
                "Please choose a PDF, JPG or PNG document.",
                "error"
            );
            fileInput.value = "";
            if (fileName) fileName.textContent = "No document selected";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setVerificationMessage(
                "Document must be 5 MB or smaller.",
                "error"
            );
            fileInput.value = "";
            if (fileName) fileName.textContent = "No document selected";
            return;
        }

        if (fileName) {
            fileName.textContent = file.name;
        }

        if (preview) preview.classList.remove("hidden");
        if (imagePreview) imagePreview.classList.add("hidden");
        if (pdfPreview) pdfPreview.classList.add("hidden");

        if (file.type.startsWith("image/") && imagePreview) {
            imagePreview.src = URL.createObjectURL(file);
            imagePreview.classList.remove("hidden");
        } else if (pdfPreview) {
            pdfPreview.classList.remove("hidden");
        }

        setVerificationMessage("Document selected. You can now submit it.", "success");
    });

    if (removeButton) {
        removeButton.addEventListener("click", () => {
            fileInput.value = "";
            if (fileName) fileName.textContent = "No document selected";
            if (preview) preview.classList.add("hidden");
            if (imagePreview) {
                imagePreview.src = "";
                imagePreview.classList.add("hidden");
            }
            if (pdfPreview) pdfPreview.classList.add("hidden");
            setVerificationMessage("", "success");
        });
    }

    submitButton.addEventListener("click", submitBusinessVerification);
}

async function submitBusinessVerification() {

    if (!currentUser || !currentBusiness) {
        setVerificationMessage(
            "Your business profile is not loaded. Please refresh the page and try again.",
            "error"
        );
        return;
    }

    const category = $("verificationCategory")?.value || "";
    const identityType = $("identityDocumentType")?.value || "";
    const businessType = $("businessDocumentType")?.value || "";
    const file = $("businessVerificationFile")?.files?.[0];
    const submitButton = $("businessVerificationUploadBtn");

    if (!category) {
        setVerificationMessage("Please select a document category.", "error");
        return;
    }

    const documentType =
        category === "identity" ? identityType : businessType;

    if (!documentType) {
        setVerificationMessage("Please select the document type.", "error");
        return;
    }

    if (!file) {
        setVerificationMessage("Please choose your verification document.", "error");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        setVerificationMessage("Document must be 5 MB or smaller.", "error");
        return;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Uploading...";
    }

    try {
        // Safe filename. The user ID is the first folder so storage policies
        // can restrict uploads to the logged-in user.
        const extension = (file.name.split(".").pop() || "bin").toLowerCase();
        const safeBase = file.name
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .replace(/\.+/g, ".")
            .slice(0, 80);

        const filePath = `${currentUser.id}/${Date.now()}_${safeBase || `document.${extension}`}`;

        const { error: uploadError } = await supabaseClient.storage
            .from(VERIFICATION_BUCKET)
            .upload(filePath, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type
            });

        if (uploadError) {
            throw new Error(`Document upload failed: ${uploadError.message}`);
        }

        // The existing verification_documents table used by Admin expects:
        // user_id, role, document_type, file_path, status, uploaded_at.
        const { error: recordError } = await supabaseClient
            .from("verification_documents")
            .insert({
                user_id: currentUser.id,
                role: "business",
                document_type: documentType,
                file_path: filePath,
                status: "pending"
            });

        if (recordError) {
            // Do not leave an orphaned file if the database insert fails.
            await supabaseClient.storage
                .from(VERIFICATION_BUCKET)
                .remove([filePath]);

            throw new Error(`Verification record could not be saved: ${recordError.message}`);
        }

        setVerificationMessage(
            "✓ Document submitted successfully. It is now pending admin review.",
            "success"
        );

        // Clear selected file/preview.
        const input = $("businessVerificationFile");
        if (input) input.value = "";
        if ($("selectedDocumentName")) {
            $("selectedDocumentName").textContent = "No document selected";
        }
        if ($("documentPreview")) {
            $("documentPreview").classList.add("hidden");
        }

        updateVerificationStatusUI("pending");

    } catch (error) {
        console.error("Business verification upload error:", error);
        setVerificationMessage(
            error.message || "Verification document could not be submitted.",
            "error"
        );

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "🚀 Submit for Verification";
        }
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

        window.location.href = "../auth.html";

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
        $("profilePhotoFile") ||
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

    // Business verification
    setupVerificationForm();

    // Start page
    startBusinessProfile().then(() => {
        loadVerificationStatus();
    });
});