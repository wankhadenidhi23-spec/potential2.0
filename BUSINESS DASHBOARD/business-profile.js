/* =========================================================
   POTEntial - BUSINESS PROFILE
   ========================================================= */


/* -----------------------------
   SUPABASE CLIENT
----------------------------- */

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* -----------------------------
   GLOBAL VARIABLES
----------------------------- */

let currentUser = null;
let currentBusiness = null;

let selectedPhotoFile = null;
let currentPhotoUrl = null;


/* -----------------------------
   HELPER
----------------------------- */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(message, type = "success") {

    const messageBox =
        $("profileMessage") ||
        $("message");

    if (!messageBox) return;

    if (messageBox.messageTimeout) {
        clearTimeout(messageBox.messageTimeout);
    }

    const icons = {
        success: "✓",
        error: "!",
        info: "i"
    };

    const icon = icons[type] || "i";

    messageBox.innerHTML = `
        <span class="message-icon">${icon}</span>
        <span class="message-text">${message}</span>
    `;

    messageBox.className =
        `message ${type} show`;

    messageBox.messageTimeout =
        setTimeout(() => {

            messageBox.classList.remove("show");

            setTimeout(() => {
                messageBox.innerHTML = "";
                messageBox.className = "message";
            }, 250);

        }, 4000);
}


/* =========================================================
   PHOTO MESSAGE
========================================================= */

function showPhotoMessage(message, type = "info") {

    const box = $("profilePhotoMessage");

    if (!box) return;

    box.textContent = message;

    box.className =
        `photo-message ${type} show`;

    setTimeout(() => {
        box.classList.remove("show");
    }, 4000);
}


/* =========================================================
   ERROR BOX
========================================================= */

function showErrorBox(message) {

    const errorBox = $("errorBox");

    if (!errorBox) return;

    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}


/* =========================================================
   LOAD CURRENT USER
========================================================= */

async function loadCurrentUser() {

    try {

        const {
            data: { user },
            error
        } = await supabaseClient.auth.getUser();


        if (error) {

            console.error(
                "Auth error:",
                error
            );

            window.location.href = "auth.html";

            return false;
        }


        if (!user) {

            window.location.href = "auth.html";

            return false;
        }


        currentUser = user;

        console.log(
            "Logged-in user ID:",
            currentUser.id
        );

        return true;

    } catch (error) {

        console.error(
            "loadCurrentUser() error:",
            error
        );

        window.location.href = "auth.html";

        return false;
    }
}


/* =========================================================
   LOAD BUSINESS INFORMATION
========================================================= */

async function loadBusinessProfile() {

    const loadingBox = $("loadingBox");
    const profileForm = $("profileForm");
    const errorBox = $("errorBox");


    try {

        /* Show loading */

        if (loadingBox) {
            loadingBox.classList.remove("hidden");
        }

        if (profileForm) {
            profileForm.classList.add("hidden");
        }

        if (errorBox) {
            errorBox.classList.add("hidden");
            errorBox.textContent = "";
        }


        /* ---------------------------------------------
           GET BUSINESS FROM SUPABASE

           businesses.owner_id =
           logged-in user id
        --------------------------------------------- */

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
            .eq("owner_id", currentUser.id)
            .maybeSingle();


        /* ---------------------------------------------
           DATABASE ERROR
        --------------------------------------------- */

        if (error) {

            console.error(
                "Business database error:",
                error
            );

            if (loadingBox) {
                loadingBox.classList.add("hidden");
            }

            showErrorBox(
                "Unable to load business information: " +
                error.message
            );

            return false;
        }


        /* ---------------------------------------------
           NO BUSINESS FOUND
        --------------------------------------------- */

        if (!business) {

            console.error(
                "No business found for owner_id:",
                currentUser.id
            );

            if (loadingBox) {
                loadingBox.classList.add("hidden");
            }

            showErrorBox(
                "Business profile not found for this account."
            );

            return false;
        }


        /* ---------------------------------------------
           STORE BUSINESS DATA
        --------------------------------------------- */

        currentBusiness = business;


        console.log(
            "Business information loaded:",
            currentBusiness
        );


        /* =================================================
           BUSINESS INFORMATION → FORM
        ================================================= */

        if ($("businessName")) {

            $("businessName").value =
                business.business_name || "";
        }


        if ($("businessType")) {

            $("businessType").value =
                business.business_type || "";
        }


        if ($("city")) {

            $("city").value =
                business.city || "";
        }


        if ($("phone")) {

            $("phone").value =
                business.phone || "";
        }


        /* =================================================
           HEADER BUSINESS NAME
        ================================================= */

        if ($("businessNameTop")) {

            $("businessNameTop").textContent =
                business.business_name ||
                "Business";
        }


        /* =================================================
           HERO BUSINESS NAME
        ================================================= */

        if ($("heroBusinessName")) {

            $("heroBusinessName").textContent =
                business.business_name ||
                "Your Business";
        }


        /* =================================================
           BUSINESS INITIAL
        ================================================= */

        updateBusinessInitial(
            business.business_name
        );


        /* =================================================
           LOAD PROFILE PHOTO
           
           IMPORTANT:
           Photo is loaded ONLY from browser localStorage.
           Nothing is loaded from Supabase Storage.
        ================================================= */

        loadProfilePhoto();


        /* =================================================
           PROFILE COMPLETION
        ================================================= */

        updateProfileCompletion();


        /* =================================================
           HIDE LOADING
        ================================================= */

        if (loadingBox) {
            loadingBox.classList.add("hidden");
        }


        /* =================================================
           SHOW FORM
        ================================================= */

        if (profileForm) {
            profileForm.classList.remove("hidden");
        }


        if (errorBox) {
            errorBox.classList.add("hidden");
        }


        return true;


    } catch (error) {

        console.error(
            "loadBusinessProfile() error:",
            error
        );


        if (loadingBox) {
            loadingBox.classList.add("hidden");
        }


        showErrorBox(
            "Unable to load business information: " +
            error.message
        );


        return false;
    }
}


/* =========================================================
   BUSINESS INITIAL
========================================================= */

function updateBusinessInitial(name) {

    const initial =
        name &&
        name.trim()
            ? name.trim().charAt(0).toUpperCase()
            : "B";


    if ($("profilePhotoInitial")) {

        $("profilePhotoInitial").textContent =
            initial;
    }
}


/* =========================================================
   BROWSER PHOTO STORAGE KEY
========================================================= */

function getPhotoStorageKey() {

    if (!currentUser) {
        return null;
    }

    return `potential_business_profile_photo_${currentUser.id}`;
}


/* =========================================================
   LOAD PROFILE PHOTO
   FROM BROWSER ONLY
========================================================= */

function loadProfilePhoto() {

    const key =
        getPhotoStorageKey();


    if (!key) {
        return;
    }


    try {

        const savedPhoto =
            localStorage.getItem(key);


        if (savedPhoto) {

            currentPhotoUrl =
                savedPhoto;

            showProfilePhoto(
                savedPhoto
            );

        } else {

            currentPhotoUrl = null;

            showPhotoPlaceholder();
        }


        updateProfileCompletion();


    } catch (error) {

        console.error(
            "Browser photo load error:",
            error
        );

        currentPhotoUrl = null;

        showPhotoPlaceholder();
    }
}


/* =========================================================
   SHOW PROFILE PHOTO
========================================================= */

function showProfilePhoto(url) {

    if (!url) {

        showPhotoPlaceholder();

        return;
    }


    /* Main image */

    const preview =
        $("profilePhotoPreview");


    if (preview) {

        preview.src = url;

        preview.classList.remove("hidden");

        preview.style.display = "block";
    }


    /* Placeholder */

    const placeholder =
        $("profilePhotoPlaceholder");


    if (placeholder) {

        placeholder.classList.add("hidden");

        placeholder.style.display = "none";
    }


    /* Hero avatar */

    const avatar =
        $("profileAvatar");


    if (avatar) {

        if (avatar.tagName === "IMG") {

            avatar.src = url;

            avatar.classList.remove("hidden");

        } else {

            avatar.style.backgroundImage =
                `url("${url}")`;

            avatar.style.backgroundSize =
                "cover";

            avatar.style.backgroundPosition =
                "center";

            avatar.textContent = "";
        }
    }
}


/* =========================================================
   SHOW PHOTO PLACEHOLDER
========================================================= */

function showPhotoPlaceholder() {

    const preview =
        $("profilePhotoPreview");


    if (preview) {

        preview.removeAttribute("src");

        preview.classList.add("hidden");

        preview.style.display = "none";
    }


    const placeholder =
        $("profilePhotoPlaceholder");


    if (placeholder) {

        placeholder.classList.remove("hidden");

        placeholder.style.display = "";
    }


    const avatar =
        $("profileAvatar");


    if (avatar) {

        avatar.style.backgroundImage = "";

        updateBusinessInitial(
            currentBusiness
                ? currentBusiness.business_name
                : "Business"
        );
    }
}


/* =========================================================
   OPEN PHOTO SELECTOR
========================================================= */

function openPhotoSelector() {

    const fileInput =
        $("profilePhotoFile");


    if (!fileInput) {

        console.error(
            "profilePhotoFile not found."
        );

        return;
    }


    fileInput.click();
}


/* =========================================================
   PHOTO SELECTED
========================================================= */

function handlePhotoSelection(event) {

    const file =
        event.target.files &&
        event.target.files[0];


    if (!file) {
        return;
    }


    /* File type */

    if (!file.type.startsWith("image/")) {

        showPhotoMessage(
            "Please select a valid image.",
            "error"
        );

        event.target.value = "";

        return;
    }


    /* Maximum 2 MB */

    const maxSize =
        2 * 1024 * 1024;


    if (file.size > maxSize) {

        showPhotoMessage(
            "Image size must be less than 2 MB.",
            "error"
        );

        event.target.value = "";

        return;
    }


    selectedPhotoFile = file;


    /* Convert image to Base64 */

    const reader =
        new FileReader();


    reader.onload = function () {

        currentPhotoUrl =
            reader.result;


        /* Show preview */

        showProfilePhoto(
            currentPhotoUrl
        );


        updateProfileCompletion();


        showPhotoMessage(
            "Photo selected. Click Upload Photo.",
            "info"
        );
    };


    reader.onerror = function () {

        showPhotoMessage(
            "Unable to read the selected photo.",
            "error"
        );
    };


    reader.readAsDataURL(file);
}


/* =========================================================
   SAVE PROFILE PHOTO
   BROWSER ONLY

   IMPORTANT:
   NO SUPABASE STORAGE
   NO SQL
   NO DATABASE COLUMN
========================================================= */

function uploadProfilePhoto() {

    if (!selectedPhotoFile) {

        showPhotoMessage(
            "Please select a photo first.",
            "error"
        );

        return;
    }


    if (!currentPhotoUrl) {

        showPhotoMessage(
            "Photo preview is not available.",
            "error"
        );

        return;
    }


    const key =
        getPhotoStorageKey();


    if (!key) {

        showPhotoMessage(
            "User information is not available.",
            "error"
        );

        return;
    }


    try {

        /* ---------------------------------------------
           SAVE ONLY IN BROWSER

           Nothing is sent to Supabase.
        --------------------------------------------- */

        localStorage.setItem(
            key,
            currentPhotoUrl
        );


        /* Photo successfully saved */

        selectedPhotoFile = null;


        const fileInput =
            $("profilePhotoFile");


        if (fileInput) {

            fileInput.value = "";
        }


        const uploadButton =
            $("uploadPhotoBtn");


        if (uploadButton) {

            uploadButton.disabled = true;

            uploadButton.textContent =
                "Upload Photo";
        }


        updateProfileCompletion();


        showPhotoMessage(
            "✓ Profile photo saved successfully.",
            "success"
        );


        console.log(
            "Profile photo saved in browser localStorage."
        );


    } catch (error) {

        console.error(
            "Browser photo save error:",
            error
        );


        showPhotoMessage(
            "Unable to save photo in this browser.",
            "error"
        );
    }
}


/* =========================================================
   SAVE BUSINESS INFORMATION
========================================================= */

async function saveBusinessProfile(event) {

    if (event) {
        event.preventDefault();
    }


    if (!currentUser || !currentBusiness) {

        showMessage(
            "Business information is not loaded.",
            "error"
        );

        return;
    }


    /* Get values */

    const businessName =
        $("businessName")
            ? $("businessName").value.trim()
            : "";


    const businessType =
        $("businessType")
            ? $("businessType").value.trim()
            : "";


    const city =
        $("city")
            ? $("city").value.trim()
            : "";


    const phone =
        $("phone")
            ? $("phone").value.trim()
            : "";


    /* Validation */

    if (
        !businessName ||
        !businessType ||
        !city ||
        !phone
    ) {

        showMessage(
            "Please fill in all business information.",
            "error"
        );

        return;
    }


    /* Phone validation */

    const phoneDigits =
        phone.replace(/\D/g, "");


    if (phoneDigits.length < 10) {

        showMessage(
            "Please enter a valid phone number.",
            "error"
        );

        return;
    }


    const saveButton =
        $("saveBtn") ||
        $("saveProfileBtn") ||
        $("saveChangesBtn");


    const saveText =
        $("saveText");


    try {

        if (saveButton) {
            saveButton.disabled = true;
        }


        if (saveText) {
            saveText.textContent =
                "Saving...";
        }


        /* ---------------------------------------------
           UPDATE EXISTING BUSINESSES RECORD
        --------------------------------------------- */

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
                phone
            `)
            .single();


        if (error) {

            console.error(
                "Save business error:",
                error
            );

            showMessage(
                "Unable to save changes: " +
                error.message,
                "error"
            );

            return;
        }


        /* Update local data */

        currentBusiness =
            updatedBusiness;


        /* Update header */

        if ($("businessNameTop")) {

            $("businessNameTop").textContent =
                updatedBusiness.business_name;
        }


        if ($("heroBusinessName")) {

            $("heroBusinessName").textContent =
                updatedBusiness.business_name;
        }


        updateBusinessInitial(
            updatedBusiness.business_name
        );


        updateProfileCompletion();


        showMessage(
            "✓ Changes saved successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "saveBusinessProfile() error:",
            error
        );

        showMessage(
            "Unable to save changes: " +
            error.message,
            "error"
        );


    } finally {

        if (saveButton) {
            saveButton.disabled = false;
        }

        if (saveText) {
            saveText.textContent =
                "Save Changes";
        }
    }
}


/* =========================================================
   PROFILE COMPLETION
========================================================= */

function updateProfileCompletion() {

    if (!currentBusiness) {
        return;
    }


    const businessComplete =
        !!(
            currentBusiness.business_name &&
            currentBusiness.business_name.trim() &&

            currentBusiness.business_type &&
            currentBusiness.business_type.trim() &&

            currentBusiness.city &&
            currentBusiness.city.trim() &&

            currentBusiness.phone &&
            currentBusiness.phone.trim()
        );


    const photoComplete =
        !!currentPhotoUrl;


    let percentage = 0;


    if (businessComplete) {
        percentage += 80;
    }


    if (photoComplete) {
        percentage += 20;
    }


    /* Text */

    if ($("profileCompletionText")) {

        $("profileCompletionText").textContent =
            `${percentage}% Complete`;
    }


    if ($("profileCompletionPercent")) {

        $("profileCompletionPercent").textContent =
            `${percentage}%`;
    }


    /* Progress bar */

    if ($("profileCompletionBar")) {

        $("profileCompletionBar").style.width =
            `${percentage}%`;

        $("profileCompletionBar").setAttribute(
            "aria-valuenow",
            percentage
        );
    }


    /* Business indicator */

    if ($("completionBusiness")) {

        $("completionBusiness").classList.toggle(
            "complete",
            businessComplete
        );

        $("completionBusiness").classList.toggle(
            "incomplete",
            !businessComplete
        );
    }


    /* Photo indicator */

    if ($("completionPhoto")) {

        $("completionPhoto").classList.toggle(
            "complete",
            photoComplete
        );

        $("completionPhoto").classList.toggle(
            "incomplete",
            !photoComplete
        );
    }
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

    try {

        const {
            error
        } = await supabaseClient.auth.signOut();


        if (error) {

            console.error(
                "Logout error:",
                error
            );

            showMessage(
                "Unable to logout: " +
                error.message,
                "error"
            );

            return;
        }


        window.location.href =
            "auth.html";


    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

        window.location.href =
            "auth.html";
    }
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupEventListeners() {

    /* Business Profile form */

    const profileForm =
        $("profileForm") ||
        $("businessProfileForm");


    if (profileForm) {

        profileForm.addEventListener(
            "submit",
            saveBusinessProfile
        );
    }


    /* Select photo */

    const selectPhotoBtn =
        $("selectPhotoBtn");


    if (selectPhotoBtn) {

        selectPhotoBtn.addEventListener(
            "click",
            openPhotoSelector
        );
    }


    /* Change photo */

    const changePhotoBtn =
        $("changePhotoBtn");


    if (changePhotoBtn) {

        changePhotoBtn.addEventListener(
            "click",
            openPhotoSelector
        );
    }


    /* File input */

    const photoFile =
        $("profilePhotoFile");


    if (photoFile) {

        photoFile.addEventListener(
            "change",
            handlePhotoSelection
        );
    }


    /* Upload */

    const uploadPhotoBtn =
        $("uploadPhotoBtn");


    if (uploadPhotoBtn) {

        uploadPhotoBtn.disabled = true;

        uploadPhotoBtn.addEventListener(
            "click",
            uploadProfilePhoto
        );
    }


    /* Logout */

    const logoutButtons =
        document.querySelectorAll(
            "#logoutBtn, .logout-btn"
        );


    logoutButtons.forEach(button => {

        button.addEventListener(
            "click",
            logout
        );
    });
}


/* =========================================================
   START PAGE
========================================================= */

async function startBusinessProfile() {

    console.log(
        "Starting Business Profile..."
    );


    if ($("profileForm")) {

        $("profileForm").classList.add(
            "hidden"
        );
    }


    if ($("loadingBox")) {

        $("loadingBox").classList.remove(
            "hidden"
        );
    }


    /* Step 1 - User */

    const userLoaded =
        await loadCurrentUser();


    if (!userLoaded) {
        return;
    }


    /* Step 2 - Business information */

    await loadBusinessProfile();


    /* Step 3 - Buttons */

    setupEventListeners();


    console.log(
        "Business Profile loaded successfully."
    );
}


/* =========================================================
   DOM READY
========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        startBusinessProfile
    );

} else {

    startBusinessProfile();
}