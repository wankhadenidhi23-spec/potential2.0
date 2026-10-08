/*
=========================================================
POTEntial BUSINESS PROFILE
Professional Business Profile + Verification
=========================================================
*/

document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       BASIC ELEMENTS
    ===================================================== */

    const profileForm = document.getElementById("profileForm");
    const loadingBox = document.getElementById("loadingBox");
    const errorBox = document.getElementById("errorBox");
    const profileMessage = document.getElementById("profileMessage");
    const saveBtn = document.getElementById("saveBtn");
    const saveText = document.getElementById("saveText");

    /* =====================================================
       STATE
    ===================================================== */

    let currentUser = null;
    let currentBusiness = null;
    let supabaseClient = null;

    let currentVerificationRecord = null;

    let profilePhotoObjectUrl = null;
    let documentObjectUrl = null;

    /* =====================================================
       HELPERS
    ===================================================== */

    function showError(text) {

        if (errorBox) {
            errorBox.textContent = text;
            errorBox.classList.remove("hidden");
        }

        if (loadingBox) {
            loadingBox.classList.add("hidden");
        }

        if (profileForm) {
            profileForm.classList.add("hidden");
        }
    }


    function showMessage(text, type = "") {

        if (!profileMessage) return;

        profileMessage.textContent = text;
        profileMessage.className = "message " + type;
    }


    function updateHeader(name) {

        const businessName = name || "Business";

        const businessNameTop =
            document.getElementById("businessNameTop");

        const heroBusinessName =
            document.getElementById("heroBusinessName");

        const profileAvatar =
            document.getElementById("profileAvatar");

        const profilePhotoInitial =
            document.getElementById("profilePhotoInitial");

        if (businessNameTop) {
            businessNameTop.textContent = businessName;
        }

        if (heroBusinessName) {
            heroBusinessName.textContent = businessName;
        }

        const initial =
            businessName.charAt(0).toUpperCase();

        if (profileAvatar) {
            profileAvatar.textContent = initial;
        }

        if (profilePhotoInitial) {
            profilePhotoInitial.textContent = initial;
        }
    }


    function setMessage(element, text, color) {

        if (!element) return;

        element.textContent = text;

        if (color) {
            element.style.color = color;
        }
    }


    function getFileExtension(fileName) {

        if (!fileName || !fileName.includes(".")) {
            return "bin";
        }

        return fileName
            .split(".")
            .pop()
            .toLowerCase();
    }


    function createSafeFileId() {

        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {
            return window.crypto.randomUUID();
        }

        return (
            Date.now().toString() +
            "-" +
            Math.random().toString(36).substring(2)
        );
    }


    function getFileNameFromPath(path) {

        if (!path) {
            return "Saved document";
        }

        const parts = path.split("/");

        return parts[parts.length - 1] || "Saved document";
    }


    /* =====================================================
       LOAD BUSINESS
       SUPABASE READ
       Existing businesses table
    ===================================================== */

    async function loadBusiness() {

        try {

            /* ---------------------------------------------
               Supabase Config
            --------------------------------------------- */

            if (
                typeof SUPABASE_URL === "undefined" ||
                typeof SUPABASE_ANON_KEY === "undefined"
            ) {

                showError(
                    "Supabase config nahi mil raha. supabase-config.js check karo."
                );

                return;
            }


            /* ---------------------------------------------
               Supabase Library
            --------------------------------------------- */

            if (
                !window.supabase ||
                !window.supabase.createClient
            ) {

                showError(
                    "Supabase library load nahi hui."
                );

                return;
            }


            /* ---------------------------------------------
               Create Supabase Client
            --------------------------------------------- */

            supabaseClient =
                window.supabase.createClient(
                    SUPABASE_URL,
                    SUPABASE_ANON_KEY
                );


            /* ---------------------------------------------
               Get Logged-in User
            --------------------------------------------- */

            const {
                data: { user },
                error: authError
            } =
                await supabaseClient.auth.getUser();


            if (authError) {

                showError(authError.message);

                return;
            }


            if (!user) {

                window.location.href =
                    "../auth.html";

                return;
            }


            currentUser = user;


            /* ---------------------------------------------
               SUPABASE READ
               Existing businesses table
            --------------------------------------------- */

            const {
                data: business,
                error
            } =
                await supabaseClient
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
                    .eq("owner_id", user.id)
                    .limit(1)
                    .maybeSingle();


            if (error) {

                showError(error.message);

                return;
            }


            if (!business) {

                showError(
                    "Business profile nahi mili."
                );

                return;
            }


            currentBusiness = business;


            /* ---------------------------------------------
               Fill Business Form
            --------------------------------------------- */

            const businessName =
                document.getElementById("businessName");

            const businessType =
                document.getElementById("businessType");

            const city =
                document.getElementById("city");

            const phone =
                document.getElementById("phone");


            if (businessName) {
                businessName.value =
                    business.business_name || "";
            }

            if (businessType) {
                businessType.value =
                    business.business_type || "";
            }

            if (city) {
                city.value =
                    business.city || "";
            }

            if (phone) {
                phone.value =
                    business.phone || "";
            }


            /* ---------------------------------------------
               Update Header
            --------------------------------------------- */

            updateHeader(
                business.business_name
            );


            /* ---------------------------------------------
               Load Profile Photo
            --------------------------------------------- */

            await loadProfilePhoto(
                business.profile_photo_url
            );


            /* ---------------------------------------------
               Show Profile Form
            --------------------------------------------- */

            if (loadingBox) {
                loadingBox.classList.add("hidden");
            }

            if (errorBox) {
                errorBox.classList.add("hidden");
            }

            if (profileForm) {
                profileForm.classList.remove("hidden");
            }


            /* ---------------------------------------------
               Load Existing Verification
            --------------------------------------------- */

            await loadBusinessVerification(
                user.id
            );


            /* ---------------------------------------------
               Update Completion
            --------------------------------------------- */

            await updateProfileCompletion();


        } catch (err) {

            console.error(
                "Business profile load error:",
                err
            );

            showError(
                err.message ||
                "Something went wrong while loading business profile."
            );
        }
    }


    /* =====================================================
       PROFILE PHOTO
       SUPABASE STORAGE READ
    ===================================================== */

    async function loadProfilePhoto(photoValue) {

        const preview =
            document.getElementById(
                "profilePhotoPreview"
            );

        const placeholder =
            document.getElementById(
                "profilePhotoPlaceholder"
            );


        if (!preview || !placeholder) {
            return;
        }


        if (!photoValue) {

            preview.src = "";

            preview.classList.add("hidden");

            placeholder.classList.remove("hidden");

            return;
        }


        try {

            /*
            Old records may contain a complete URL.
            New records contain a Storage path.
            */

            let imageUrl = photoValue;


            if (
                !photoValue.startsWith("http://") &&
                !photoValue.startsWith("https://")
            ) {

                const {
                    data,
                    error
                } =
                    await supabaseClient.storage
                        .from("verification-documents")
                        .createSignedUrl(
                            photoValue,
                            3600
                        );


                if (error) {
                    throw error;
                }


                imageUrl =
                    data &&
                    data.signedUrl
                        ? data.signedUrl
                        : "";
            }


            if (!imageUrl) {
                throw new Error(
                    "Profile photo URL generate nahi hui."
                );
            }


            preview.src = imageUrl;

            preview.classList.remove("hidden");

            placeholder.classList.add("hidden");


        } catch (error) {

            console.error(
                "Profile photo load error:",
                error
            );

            preview.src = "";

            preview.classList.add("hidden");

            placeholder.classList.remove("hidden");
        }
    }


    /* =====================================================
       PROFILE PHOTO BUTTONS
    ===================================================== */

    const selectPhotoBtn =
        document.getElementById(
            "selectPhotoBtn"
        );

    const changePhotoBtn =
        document.getElementById(
            "changePhotoBtn"
        );

    const profilePhotoFile =
        document.getElementById(
            "profilePhotoFile"
        );


    if (selectPhotoBtn && profilePhotoFile) {

        selectPhotoBtn.addEventListener(
            "click",
            function () {

                profilePhotoFile.click();

            }
        );
    }


    if (changePhotoBtn && profilePhotoFile) {

        changePhotoBtn.addEventListener(
            "click",
            function () {

                profilePhotoFile.click();

            }
        );
    }


    /* =====================================================
       PROFILE PHOTO PREVIEW
    ===================================================== */

    if (profilePhotoFile) {

        profilePhotoFile.addEventListener(
            "change",
            function () {

                const file =
                    this.files[0];


                if (!file) {
                    return;
                }


                const allowedTypes = [
                    "image/jpeg",
                    "image/png",
                    "image/webp"
                ];


                if (
                    !allowedTypes.includes(
                        file.type
                    )
                ) {

                    showPhotoMessage(
                        "Only JPG, PNG or WEBP images are allowed.",
                        "error"
                    );

                    this.value = "";

                    return;
                }


                if (
                    file.size >
                    2 * 1024 * 1024
                ) {

                    showPhotoMessage(
                        "Profile photo must be 2 MB or smaller.",
                        "error"
                    );

                    this.value = "";

                    return;
                }


                if (profilePhotoObjectUrl) {

                    URL.revokeObjectURL(
                        profilePhotoObjectUrl
                    );
                }


                profilePhotoObjectUrl =
                    URL.createObjectURL(file);


                const preview =
                    document.getElementById(
                        "profilePhotoPreview"
                    );

                const placeholder =
                    document.getElementById(
                        "profilePhotoPlaceholder"
                    );


                if (preview) {

                    preview.src =
                        profilePhotoObjectUrl;

                    preview.classList.remove(
                        "hidden"
                    );
                }


                if (placeholder) {

                    placeholder.classList.add(
                        "hidden"
                    );
                }


                showPhotoMessage(
                    "Photo selected. Click Upload Photo to save it.",
                    "success"
                );
            }
        );
    }


    function showPhotoMessage(
        text,
        type
    ) {

        const message =
            document.getElementById(
                "profilePhotoMessage"
            );


        if (!message) return;


        message.textContent = text;


        if (type === "success") {

            message.style.color =
                "#16845b";

        } else {

            message.style.color =
                "#d34f67";
        }
    }


    /* =====================================================
       UPLOAD PROFILE PHOTO
       SUPABASE STORAGE WRITE
       SUPABASE businesses UPDATE
    ===================================================== */

    const uploadPhotoBtn =
        document.getElementById(
            "uploadPhotoBtn"
        );


    if (uploadPhotoBtn) {

        uploadPhotoBtn.addEventListener(
            "click",
            uploadProfilePhoto
        );
    }


    async function uploadProfilePhoto() {

        if (!profilePhotoFile) {
            return;
        }


        const file =
            profilePhotoFile.files[0];


        if (!file) {

            showPhotoMessage(
                "Please choose a profile photo first.",
                "error"
            );

            return;
        }


        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];


        if (
            !allowedTypes.includes(
                file.type
            )
        ) {

            showPhotoMessage(
                "Only JPG, PNG or WEBP images are allowed.",
                "error"
            );

            return;
        }


        if (
            file.size >
            2 * 1024 * 1024
        ) {

            showPhotoMessage(
                "Profile photo must be 2 MB or smaller.",
                "error"
            );

            return;
        }


        if (
            !currentUser ||
            !currentBusiness ||
            !supabaseClient
        ) {

            showPhotoMessage(
                "Please login again.",
                "error"
            );

            return;
        }


        uploadPhotoBtn.disabled = true;

        uploadPhotoBtn.textContent =
            "Uploading...";


        try {

            const extension =
                getFileExtension(
                    file.name
                );


            /*
            Profile photo uses a separate folder
            inside the existing storage bucket.

            Verification documents remain in:
            business/<user-id>/...

            Profile photos remain in:
            business-profiles/<user-id>/...
            */

            const filePath =
                `business-profiles/${currentUser.id}/profile-${Date.now()}.${extension}`;


            /* ---------------------------------------------
               SUPABASE STORAGE WRITE
            --------------------------------------------- */

            const {
                error: uploadError
            } =
                await supabaseClient.storage
                    .from(
                        "verification-documents"
                    )
                    .upload(
                        filePath,
                        file,
                        {
                            contentType:
                                file.type,

                            upsert:
                                false
                        }
                    );


            if (uploadError) {
                throw uploadError;
            }


            /*
            We save the Storage path in the existing
            profile_photo_url column.

            The value is later converted into a
            signed URL when the profile loads.
            */

            const {
                error: updateError
            } =
                await supabaseClient
                    .from("businesses")
                    .update({
                        profile_photo_url:
                            filePath
                    })
                    .eq(
                        "id",
                        currentBusiness.id
                    );


            if (updateError) {

                /*
                Roll back uploaded image if
                businesses update fails.
                */

                await supabaseClient.storage
                    .from(
                        "verification-documents"
                    )
                    .remove([
                        filePath
                    ]);

                throw updateError;
            }


            currentBusiness.profile_photo_url =
                filePath;


            await loadProfilePhoto(
                filePath
            );


            profilePhotoFile.value = "";


            showPhotoMessage(
                "✓ Business profile photo uploaded successfully.",
                "success"
            );


            await updateProfileCompletion();


        } catch (error) {

            console.error(
                "Profile photo upload error:",
                error
            );


            showPhotoMessage(
                error.message ||
                "Profile photo upload failed.",
                "error"
            );

        } finally {

            uploadPhotoBtn.disabled =
                false;

            uploadPhotoBtn.textContent =
                "Upload Photo";
        }
    }


    /* =====================================================
       VERIFICATION ELEMENTS
    ===================================================== */

    const verificationCategory =
        document.getElementById(
            "verificationCategory"
        );

    const identityDocumentGroup =
        document.getElementById(
            "identityDocumentGroup"
        );

    const businessDocumentGroup =
        document.getElementById(
            "businessDocumentGroup"
        );

    const identityDocumentType =
        document.getElementById(
            "identityDocumentType"
        );

    const businessDocumentType =
        document.getElementById(
            "businessDocumentType"
        );

    const documentNumber =
        document.getElementById(
            "documentNumber"
        );

    const fileInput =
        document.getElementById(
            "businessVerificationFile"
        );

    const chooseVerificationFileBtn =
        document.getElementById(
            "chooseVerificationFileBtn"
        );

    const selectedDocumentName =
        document.getElementById(
            "selectedDocumentName"
        );

    const documentPreview =
        document.getElementById(
            "documentPreview"
        );

    const documentImagePreview =
        document.getElementById(
            "documentImagePreview"
        );

    const documentPdfPreview =
        document.getElementById(
            "documentPdfPreview"
        );

    const removeDocumentBtn =
        document.getElementById(
            "removeDocumentBtn"
        );

    const verificationUploadButton =
        document.getElementById(
            "businessVerificationUploadBtn"
        );


    /* =====================================================
       VERIFICATION STATE
    ===================================================== */

    function setVerificationStatus(
        status
    ) {

        const statusEl =
            document.getElementById(
                "businessVerificationStatus"
            );

        if (!statusEl) {
            return;
        }


        const cleanStatus =
            status || "not submitted";


        if (
            cleanStatus ===
            "not_submitted"
        ) {

            statusEl.textContent =
                "Not submitted";

            statusEl.className =
                "verification-status";

            return;
        }


        statusEl.textContent =
            cleanStatus
                .charAt(0)
                .toUpperCase() +
            cleanStatus.slice(1);

        statusEl.className =
            "verification-status " +
            cleanStatus;
    }


    function resetVerificationDocumentFields() {

        if (identityDocumentGroup) {

            identityDocumentGroup.classList.add(
                "hidden"
            );
        }


        if (businessDocumentGroup) {

            businessDocumentGroup.classList.add(
                "hidden"
            );
        }


        if (identityDocumentType) {
            identityDocumentType.value = "";
        }


        if (businessDocumentType) {
            businessDocumentType.value = "";
        }


        if (documentNumber) {
            documentNumber.value = "";
        }
    }


    resetVerificationDocumentFields();


    /* =====================================================
       CATEGORY CHANGE
    ===================================================== */

    if (verificationCategory) {

        verificationCategory.addEventListener(
            "change",
            function () {

                const category =
                    this.value;


                if (identityDocumentGroup) {

                    identityDocumentGroup.classList.add(
                        "hidden"
                    );
                }


                if (businessDocumentGroup) {

                    businessDocumentGroup.classList.add(
                        "hidden"
                    );
                }


                if (identityDocumentType) {
                    identityDocumentType.value = "";
                }


                if (businessDocumentType) {
                    businessDocumentType.value = "";
                }


                if (
                    category ===
                    "identity"
                ) {

                    if (identityDocumentGroup) {

                        identityDocumentGroup.classList.remove(
                            "hidden"
                        );
                    }
                }


                if (
                    category ===
                    "business"
                ) {

                    if (businessDocumentGroup) {

                        businessDocumentGroup.classList.remove(
                            "hidden"
                        );
                    }
                }

            }
        );
    }


    /* =====================================================
       CHOOSE VERIFICATION FILE
    ===================================================== */

    if (
        chooseVerificationFileBtn &&
        fileInput
    ) {

        chooseVerificationFileBtn.addEventListener(
            "click",
            function () {

                fileInput.click();

            }
        );
    }


    /* =====================================================
       VERIFICATION FILE CHANGE
    ===================================================== */

    if (fileInput) {

        fileInput.addEventListener(
            "change",
            function () {

                const file =
                    this.files[0];


                if (!file) {

                    clearDocumentPreview();

                    return;
                }


                const allowed = [
                    "application/pdf",
                    "image/jpeg",
                    "image/png"
                ];


                if (
                    !allowed.includes(
                        file.type
                    )
                ) {

                    showVerificationMessage(
                        "Only PDF, JPG or PNG files are allowed.",
                        "error"
                    );

                    this.value = "";

                    clearDocumentPreview();

                    return;
                }


                if (
                    file.size >
                    5 * 1024 * 1024
                ) {

                    showVerificationMessage(
                        "File must be 5 MB or smaller.",
                        "error"
                    );

                    this.value = "";

                    clearDocumentPreview();

                    return;
                }


                if (selectedDocumentName) {

                    selectedDocumentName.textContent =
                        file.name;
                }


                showDocumentPreview(file);


                showVerificationMessage(
                    "Document selected. Check the preview before submitting.",
                    "success"
                );
            }
        );
    }


    /* =====================================================
       DOCUMENT PREVIEW
    ===================================================== */

    function showDocumentPreview(file) {

        if (!documentPreview) {
            return;
        }


        documentPreview.classList.remove(
            "hidden"
        );


        if (documentImagePreview) {

            documentImagePreview.classList.add(
                "hidden"
            );

            documentImagePreview.src = "";
        }


        if (documentPdfPreview) {

            documentPdfPreview.classList.add(
                "hidden"
            );
        }


        if (
            file.type === "image/jpeg" ||
            file.type === "image/png"
        ) {

            if (documentObjectUrl) {

                URL.revokeObjectURL(
                    documentObjectUrl
                );
            }


            documentObjectUrl =
                URL.createObjectURL(file);


            if (documentImagePreview) {

                documentImagePreview.src =
                    documentObjectUrl;

                documentImagePreview.classList.remove(
                    "hidden"
                );
            }

        } else if (
            file.type ===
            "application/pdf"
        ) {

            if (documentPdfPreview) {

                documentPdfPreview.classList.remove(
                    "hidden"
                );

                documentPdfPreview.textContent =
                    "📄 PDF document selected";
            }
        }
    }


    function clearDocumentPreview() {

        if (documentObjectUrl) {

            URL.revokeObjectURL(
                documentObjectUrl
            );

            documentObjectUrl = null;
        }


        if (documentPreview) {

            documentPreview.classList.add(
                "hidden"
            );
        }


        if (documentImagePreview) {

            documentImagePreview.src = "";

            documentImagePreview.classList.add(
                "hidden"
            );
        }


        if (documentPdfPreview) {

            documentPdfPreview.classList.add(
                "hidden"
            );

            documentPdfPreview.textContent =
                "📄 PDF document selected";
        }


        if (selectedDocumentName) {

            selectedDocumentName.textContent =
                "No document selected";
        }
    }


    if (removeDocumentBtn) {

        removeDocumentBtn.addEventListener(
            "click",
            function () {

                if (fileInput) {
                    fileInput.value = "";
                }

                clearDocumentPreview();

                showVerificationMessage(
                    "Document removed.",
                    "success"
                );
            }
        );
    }


    /* =====================================================
       LOAD EXISTING VERIFICATION
       SUPABASE READ
    ===================================================== */

    async function loadBusinessVerification(
        userId
    ) {

        const statusEl =
            document.getElementById(
                "businessVerificationStatus"
            );

        const messageEl =
            document.getElementById(
                "businessVerificationMessage"
            );


        if (!supabaseClient) {
            return;
        }


        try {

            const {
                data,
                error
            } =
                await supabaseClient
                    .from(
                        "verification_documents"
                    )
                    .select(
                        `
                        id,
                        document_type,
                        document_number,
                        file_path,
                        status,
                        rejection_reason,
                        uploaded_at
                        `
                    )
                    .eq(
                        "user_id",
                        userId
                    )
                    .eq(
                        "role",
                        "business"
                    )
                    .order(
                        "uploaded_at",
                        {
                            ascending: false
                        }
                    )
                    .limit(1);


            if (error) {
                throw error;
            }


            const record =
                data &&
                data.length
                    ? data[0]
                    : null;


            currentVerificationRecord =
                record;


            /* ---------------------------------------------
               No verification submitted
            --------------------------------------------- */

            if (!record) {

                setVerificationStatus(
                    "not_submitted"
                );


                if (messageEl) {
                    messageEl.textContent = "";
                }


                enableVerificationForm();

                return;
            }


            const status =
                record.status ||
                "pending";


            setVerificationStatus(
                status
            );


            /* ---------------------------------------------
               Restore category + document type
            --------------------------------------------- */

            restoreVerificationFields(
                record.document_type
            );


            /* ---------------------------------------------
               Restore document number
            --------------------------------------------- */

            if (documentNumber) {

                documentNumber.value =
                    record.document_number || "";
            }


            /* ---------------------------------------------
               Restore saved document name/preview
            --------------------------------------------- */

            if (record.file_path) {

                await loadSavedVerificationPreview(
                    record.file_path
                );
            }


            /* ---------------------------------------------
               Status message
            --------------------------------------------- */

            if (status === "rejected") {

                if (messageEl) {

                    if (record.rejection_reason) {

                        messageEl.textContent =
                            "Rejected: " +
                            record.rejection_reason;

                    } else {

                        messageEl.textContent =
                            "Your verification was rejected. Please submit an updated document.";
                    }

                    messageEl.style.color =
                        "#991b1b";
                }


                enableVerificationForm();

            } else if (
                status === "approved"
            ) {

                if (messageEl) {

                    messageEl.textContent =
                        "✓ Your business document has been approved.";

                    messageEl.style.color =
                        "#166534";
                }


                disableVerificationForm(
                    "Your business verification is approved."
                );

            } else {

                if (messageEl) {

                    messageEl.textContent =
                        "Your document is waiting for admin review.";

                    messageEl.style.color =
                        "#92400e";
                }


                disableVerificationForm(
                    "Verification is pending admin approval."
                );
            }


        } catch (error) {

            console.error(
                "Verification loading error:",
                error
            );


            if (statusEl) {

                statusEl.textContent =
                    "Unable to load status";

                statusEl.className =
                    "verification-status";
            }


            if (messageEl) {

                messageEl.textContent =
                    error.message ||
                    "Unable to load verification status.";

                messageEl.style.color =
                    "#991b1b";
            }
        }
    }


    /* =====================================================
       RESTORE VERIFICATION FIELDS
    ===================================================== */

    function restoreVerificationFields(
        storedDocumentType
    ) {

        if (!storedDocumentType) {
            return;
        }


        let category = "";
        let type = "";


        if (
            storedDocumentType.startsWith(
                "identity_"
            )
        ) {

            category = "identity";

            type =
                storedDocumentType.replace(
                    "identity_",
                    ""
                );

        } else if (
            storedDocumentType.startsWith(
                "business_"
            )
        ) {

            category = "business";

            type =
                storedDocumentType.replace(
                    "business_",
                    ""
                );

        } else {

            /*
            Backward compatibility for an older
            record where document_type may contain
            only the document name.
            */

            type = storedDocumentType;

            const identityTypes = [
                "aadhaar",
                "pan",
                "voter_id",
                "driving_license",
                "passport"
            ];

            if (
                identityTypes.includes(type)
            ) {

                category = "identity";

            } else {

                category = "business";
            }
        }


        if (verificationCategory) {

            verificationCategory.value =
                category;

            verificationCategory.dispatchEvent(
                new Event("change")
            );
        }


        if (
            category === "identity" &&
            identityDocumentType
        ) {

            identityDocumentType.value =
                type;

        } else if (
            category === "business" &&
            businessDocumentType
        ) {

            businessDocumentType.value =
                type;
        }
    }


    /* =====================================================
       LOAD SAVED VERIFICATION PREVIEW
       SUPABASE STORAGE READ
    ===================================================== */

    async function loadSavedVerificationPreview(
        filePath
    ) {

        if (!filePath) {
            return;
        }


        if (selectedDocumentName) {

            selectedDocumentName.textContent =
                getFileNameFromPath(filePath);
        }


        if (!documentPreview) {
            return;
        }


        try {

            const {
                data,
                error
            } =
                await supabaseClient.storage
                    .from(
                        "verification-documents"
                    )
                    .createSignedUrl(
                        filePath,
                        3600
                    );


            if (error) {
                throw error;
            }


            const signedUrl =
                data &&
                data.signedUrl
                    ? data.signedUrl
                    : "";


            if (!signedUrl) {
                throw new Error(
                    "Saved document URL generate nahi hui."
                );
            }


            documentPreview.classList.remove(
                "hidden"
            );


            const extension =
                getFileExtension(
                    filePath
                );


            if (
                extension === "jpg" ||
                extension === "jpeg" ||
                extension === "png"
            ) {

                if (documentImagePreview) {

                    documentImagePreview.src =
                        signedUrl;

                    documentImagePreview.classList.remove(
                        "hidden"
                    );
                }


                if (documentPdfPreview) {

                    documentPdfPreview.classList.add(
                        "hidden"
                    );
                }

            } else if (
                extension === "pdf"
            ) {

                if (documentImagePreview) {

                    documentImagePreview.classList.add(
                        "hidden"
                    );

                    documentImagePreview.src = "";
                }


                if (documentPdfPreview) {

                    documentPdfPreview.classList.remove(
                        "hidden"
                    );

                    documentPdfPreview.textContent =
                        "📄 Saved PDF document — verification document already submitted.";
                }
            }


        } catch (error) {

            console.error(
                "Saved document preview error:",
                error
            );


            /*
            Even if preview cannot be generated,
            the saved document name remains visible.
            */

            documentPreview.classList.remove(
                "hidden"
            );


            if (documentImagePreview) {

                documentImagePreview.classList.add(
                    "hidden"
                );
            }


            if (documentPdfPreview) {

                documentPdfPreview.classList.remove(
                    "hidden"
                );

                documentPdfPreview.textContent =
                    "📄 Saved verification document";
            }
        }
    }


    /* =====================================================
       ENABLE VERIFICATION FORM
    ===================================================== */

    function enableVerificationForm() {

        if (verificationCategory) {
            verificationCategory.disabled = false;
        }

        if (identityDocumentType) {
            identityDocumentType.disabled = false;
        }

        if (businessDocumentType) {
            businessDocumentType.disabled = false;
        }

        if (documentNumber) {
            documentNumber.disabled = false;
        }

        if (fileInput) {
            fileInput.disabled = false;
        }

        if (chooseVerificationFileBtn) {
            chooseVerificationFileBtn.disabled = false;
        }

        if (verificationUploadButton) {
            verificationUploadButton.disabled = false;
            verificationUploadButton.textContent =
                "🚀 Submit for Verification";
        }
    }


    /* =====================================================
       DISABLE VERIFICATION FORM
    ===================================================== */

    function disableVerificationForm(
        message
    ) {

        if (verificationCategory) {
            verificationCategory.disabled = true;
        }

        if (identityDocumentType) {
            identityDocumentType.disabled = true;
        }

        if (businessDocumentType) {
            businessDocumentType.disabled = true;
        }

        if (documentNumber) {
            documentNumber.disabled = true;
        }

        if (fileInput) {
            fileInput.disabled = true;
        }

        if (chooseVerificationFileBtn) {
            chooseVerificationFileBtn.disabled = true;
        }

        if (verificationUploadButton) {
            verificationUploadButton.disabled = true;
            verificationUploadButton.textContent =
                message;
        }
    }


    /* =====================================================
       SHOW VERIFICATION MESSAGE
    ===================================================== */

    function showVerificationMessage(
        text,
        type = ""
    ) {

        const messageEl =
            document.getElementById(
                "businessVerificationMessage"
            );


        if (!messageEl) return;


        messageEl.textContent =
            text;


        if (type === "success") {

            messageEl.style.color =
                "#166534";

        } else if (
            type === "error"
        ) {

            messageEl.style.color =
                "#991b1b";

        } else {

            messageEl.style.color =
                "#92400e";
        }
    }


    /* =====================================================
       GET SELECTED DOCUMENT TYPE
    ===================================================== */

    function getSelectedDocumentType() {

        const category =
            verificationCategory
                ? verificationCategory.value
                : "";


        if (
            category ===
            "identity"
        ) {

            return identityDocumentType
                ? identityDocumentType.value
                : "";
        }


        if (
            category ===
            "business"
        ) {

            return businessDocumentType
                ? businessDocumentType.value
                : "";
        }


        return "";
    }


    /* =====================================================
       DOCUMENT NUMBER VALIDATION
    ===================================================== */

    function validateDocumentNumber(
        documentType,
        number
    ) {

        if (!number) {
            return true;
        }


        const value =
            number
                .trim()
                .toUpperCase();


        /* ---------------------------------------------
           PAN
           Example: ABCDE1234F
        --------------------------------------------- */

        if (
            documentType ===
            "pan"
        ) {

            const panPattern =
                /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

            return panPattern.test(
                value
            );
        }


        /* ---------------------------------------------
           Aadhaar
           12 digits
        --------------------------------------------- */

        if (
            documentType ===
            "aadhaar"
        ) {

            const aadhaarPattern =
                /^[0-9]{12}$/;

            return aadhaarPattern.test(
                value.replace(
                    /\s/g,
                    ""
                )
            );
        }


        /* ---------------------------------------------
           Other documents
        --------------------------------------------- */

        return (
            value.length <= 100
        );
    }


    /* =====================================================
       UPLOAD BUSINESS VERIFICATION
       SUPABASE STORAGE WRITE
       verification_documents INSERT
    ===================================================== */

    async function uploadBusinessVerification() {

        if (
            !supabaseClient ||
            !currentUser
        ) {

            showVerificationMessage(
                "Please login again.",
                "error"
            );

            return;
        }


        /*
        Re-check current verification status
        before allowing another submission.
        */

        if (
            currentVerificationRecord &&
            (
                currentVerificationRecord.status ===
                    "pending" ||
                currentVerificationRecord.status ===
                    "approved"
            )
        ) {

            showVerificationMessage(
                currentVerificationRecord.status === "pending"
                    ? "Your verification is already pending admin approval."
                    : "Your business is already verified.",
                "error"
            );

            return;
        }


        const button =
            verificationUploadButton;


        const category =
            verificationCategory
                ? verificationCategory.value
                : "";


        const documentType =
            getSelectedDocumentType();


        const number =
            documentNumber
                ? documentNumber.value.trim()
                : "";


        const file =
            fileInput
                ? fileInput.files[0]
                : null;


        /* ---------------------------------------------
           Category
        --------------------------------------------- */

        if (!category) {

            showVerificationMessage(
                "Please select a document category.",
                "error"
            );

            return;
        }


        /* ---------------------------------------------
           Document type
        --------------------------------------------- */

        if (!documentType) {

            showVerificationMessage(
                "Please select the document type.",
                "error"
            );

            return;
        }


        /* ---------------------------------------------
           Document number
        --------------------------------------------- */

        if (
            number &&
            !validateDocumentNumber(
                documentType,
                number
            )
        ) {

            if (
                documentType ===
                "pan"
            ) {

                showVerificationMessage(
                    "Please enter a valid PAN format, for example ABCDE1234F.",
                    "error"
                );

            } else if (
                documentType ===
                "aadhaar"
            ) {

                showVerificationMessage(
                    "Aadhaar number should contain 12 digits.",
                    "error"
                );

            } else {

                showVerificationMessage(
                    "Please check the document number.",
                    "error"
                );
            }


            return;
        }


        /* ---------------------------------------------
           File
        --------------------------------------------- */

        if (!file) {

            showVerificationMessage(
                "Please select a verification document first.",
                "error"
            );

            return;
        }


        const allowed = [
            "application/pdf",
            "image/jpeg",
            "image/png"
        ];


        if (
            !allowed.includes(
                file.type
            )
        ) {

            showVerificationMessage(
                "Only PDF, JPG or PNG files are allowed.",
                "error"
            );

            return;
        }


        if (
            file.size >
            5 * 1024 * 1024
        ) {

            showVerificationMessage(
                "File must be 5 MB or smaller.",
                "error"
            );

            return;
        }


        /* ---------------------------------------------
           Get current user
        --------------------------------------------- */

        const {
            data: {
                user
            },
            error: userError
        } =
            await supabaseClient.auth.getUser();


        if (
            userError ||
            !user
        ) {

            showVerificationMessage(
                "Please login again.",
                "error"
            );

            return;
        }


        /* ---------------------------------------------
           Button state
        --------------------------------------------- */

        if (button) {

            button.disabled = true;

            button.textContent =
                "Submitting...";
        }


        try {

            /* -----------------------------------------
               Storage path
            ----------------------------------------- */

            const extension =
                getFileExtension(
                    file.name
                );


            const filePath =
                `business/${user.id}/${createSafeFileId()}-business-proof.${extension}`;


            /* -----------------------------------------
               SUPABASE STORAGE WRITE
               Private verification-documents bucket
            ----------------------------------------- */

            const {
                error: uploadError
            } =
                await supabaseClient.storage
                    .from(
                        "verification-documents"
                    )
                    .upload(
                        filePath,
                        file,
                        {
                            contentType:
                                file.type,

                            upsert:
                                false
                        }
                    );


            if (uploadError) {
                throw uploadError;
            }


            /* -----------------------------------------
               Stored document type
            ----------------------------------------- */

            let storedDocumentType =
                documentType;


            if (
                category ===
                "identity"
            ) {

                storedDocumentType =
                    "identity_" +
                    documentType;

            } else {

                storedDocumentType =
                    "business_" +
                    documentType;
            }


            /* -----------------------------------------
               SUPABASE WRITE
               Existing verification_documents table
            ----------------------------------------- */

            const {
                error: insertError
            } =
                await supabaseClient
                    .from(
                        "verification_documents"
                    )
                    .insert({

                        user_id:
                            user.id,

                        role:
                            "business",

                        document_type:
                            storedDocumentType,

                        document_number:
                            number || null,

                        file_path:
                            filePath,

                        status:
                            "pending"
                    });


            if (insertError) {

                /*
                Rollback storage upload
                if database insert fails.
                */

                await supabaseClient.storage
                    .from(
                        "verification-documents"
                    )
                    .remove([
                        filePath
                    ]);

                throw insertError;
            }


            /* -----------------------------------------
               Success
            ----------------------------------------- */

            showVerificationMessage(
                "✓ Document submitted successfully. Waiting for admin approval.",
                "success"
            );


            if (fileInput) {
                fileInput.value = "";
            }


            clearDocumentPreview();


            await loadBusinessVerification(
                user.id
            );


            await updateProfileCompletion();


        } catch (error) {

            console.error(
                "Verification upload error:",
                error
            );


            showVerificationMessage(
                error.message ||
                "Verification upload failed.",
                "error"
            );

        } finally {

            /*
            Only re-enable if current status is not
            pending or approved.
            */

            if (
                currentVerificationRecord &&
                (
                    currentVerificationRecord.status ===
                        "pending" ||
                    currentVerificationRecord.status ===
                        "approved"
                )
            ) {

                disableVerificationForm(
                    currentVerificationRecord.status === "pending"
                        ? "Verification is pending admin approval."
                        : "Your business is already verified."
                );

            } else if (button) {

                button.disabled = false;

                button.textContent =
                    "🚀 Submit for Verification";
            }
        }
    }


    /* =====================================================
       VERIFICATION BUTTON
    ===================================================== */

    if (verificationUploadButton) {

        verificationUploadButton.addEventListener(
            "click",
            uploadBusinessVerification
        );
    }


    /* =====================================================
       SAVE BUSINESS PROFILE
       SUPABASE WRITE
    ===================================================== */

    if (profileForm) {

        profileForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                if (
                    !currentBusiness ||
                    !currentUser
                ) {

                    showMessage(
                        "Business profile load nahi hui.",
                        "error"
                    );

                    return;
                }


                const business_name =
                    document.getElementById(
                        "businessName"
                    ).value.trim();


                const business_type =
                    document.getElementById(
                        "businessType"
                    ).value.trim();


                const city =
                    document.getElementById(
                        "city"
                    ).value.trim();


                const phone =
                    document.getElementById(
                        "phone"
                    ).value.trim();


                if (!business_name) {

                    showMessage(
                        "Business Name required hai.",
                        "error"
                    );

                    return;
                }


                saveBtn.disabled =
                    true;

                saveText.textContent =
                    "Saving...";


                try {

                    /* -----------------------------------------
                       SUPABASE WRITE
                       Existing businesses table
                    ----------------------------------------- */

                    const {
                        error
                    } =
                        await supabaseClient
                            .from(
                                "businesses"
                            )
                            .update({

                                business_name,

                                business_type,

                                city,

                                phone

                            })
                            .eq(
                                "id",
                                currentBusiness.id
                            );


                    if (error) {
                        throw error;
                    }


                    /* -----------------------------------------
                       Update local state
                    ----------------------------------------- */

                    currentBusiness.business_name =
                        business_name;

                    currentBusiness.business_type =
                        business_type;

                    currentBusiness.city =
                        city;

                    currentBusiness.phone =
                        phone;


                    updateHeader(
                        business_name
                    );


                    showMessage(
                        "✓ Changes successfully save ho gaye!",
                        "success"
                    );


                    await updateProfileCompletion();


                } catch (error) {

                    console.error(
                        "Profile update error:",
                        error
                    );


                    showMessage(
                        error.message ||
                        "Profile update failed.",
                        "error"
                    );

                } finally {

                    saveBtn.disabled =
                        false;

                    saveText.textContent =
                        "Save Changes";
                }
            }
        );
    }


    /* =====================================================
       PROFILE COMPLETION
    ===================================================== */

    async function updateProfileCompletion() {

        if (!currentBusiness) {
            return;
        }


        let completed = 0;

        const total = 3;


        /* ---------------------------------------------
           Business Information
        --------------------------------------------- */

        if (
            currentBusiness.business_name &&
            currentBusiness.business_type &&
            currentBusiness.city &&
            currentBusiness.phone
        ) {

            completed++;

            setCompletionItem(
                "completionBusiness",
                true
            );

        } else {

            setCompletionItem(
                "completionBusiness",
                false
            );
        }


        /* ---------------------------------------------
           Profile Photo
        --------------------------------------------- */

        if (
            currentBusiness.profile_photo_url
        ) {

            completed++;

            setCompletionItem(
                "completionPhoto",
                true
            );

        } else {

            setCompletionItem(
                "completionPhoto",
                false
            );
        }


        /* ---------------------------------------------
           Verification
        --------------------------------------------- */

        let verified = false;


        if (
            currentVerificationRecord &&
            currentVerificationRecord.status ===
                "approved"
        ) {

            verified = true;

        } else if (
            currentUser &&
            supabaseClient
        ) {

            const {
                data
            } =
                await supabaseClient
                    .from(
                        "verification_documents"
                    )
                    .select(
                        "status"
                    )
                    .eq(
                        "user_id",
                        currentUser.id
                    )
                    .eq(
                        "role",
                        "business"
                    )
                    .order(
                        "uploaded_at",
                        {
                            ascending: false
                        }
                    )
                    .limit(1);


            if (
                data &&
                data.length &&
                data[0].status ===
                    "approved"
            ) {

                verified = true;
            }
        }


        if (verified) {

            completed++;

            setCompletionItem(
                "completionVerification",
                true
            );

        } else {

            setCompletionItem(
                "completionVerification",
                false
            );
        }


        /* ---------------------------------------------
           Percentage
        --------------------------------------------- */

        const percentage =
            Math.round(
                (completed / total) *
                100
            );


        const text =
            document.getElementById(
                "profileCompletionText"
            );

        const percent =
            document.getElementById(
                "profileCompletionPercent"
            );

        const bar =
            document.getElementById(
                "profileCompletionBar"
            );


        if (text) {

            text.textContent =
                percentage +
                "% Complete";
        }


        if (percent) {

            percent.textContent =
                percentage +
                "%";
        }


        if (bar) {

            bar.style.width =
                percentage +
                "%";
        }
    }


    function setCompletionItem(
        id,
        completed
    ) {

        const element =
            document.getElementById(
                id
            );


        if (!element) {
            return;
        }


        if (completed) {

            element.textContent =
                "✓ " +
                getCompletionLabel(id);

            element.style.color =
                "#16845b";

            element.style.background =
                "#e8f8f0";

        } else {

            element.textContent =
                "○ " +
                getCompletionLabel(id);

            element.style.color =
                "#747994";

            element.style.background =
                "#f5f5fb";
        }
    }


    function getCompletionLabel(id) {

        if (
            id ===
            "completionBusiness"
        ) {

            return "Business Information";
        }


        if (
            id ===
            "completionPhoto"
        ) {

            return "Business Photo";
        }


        if (
            id ===
            "completionVerification"
        ) {

            return "Verification";
        }


        return "";
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    const logoutBtn =
        document.getElementById(
            "logoutBtn"
        );


    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            async function () {

                if (supabaseClient) {

                    await supabaseClient
                        .auth
                        .signOut();
                }


                window.location.href =
                    "../auth.html";
            }
        );
    }


    /* =====================================================
       START
    ===================================================== */

    loadBusiness();

});