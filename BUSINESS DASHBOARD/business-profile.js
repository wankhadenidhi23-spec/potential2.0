/*
=========================================================
POTential BUSINESS PROFILE
Professional Business Profile + Verification
=========================================================
*/


document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       BASIC ELEMENTS
    ===================================================== */

    const profileForm =
        document.getElementById("profileForm");

    const loadingBox =
        document.getElementById("loadingBox");

    const errorBox =
        document.getElementById("errorBox");

    const profileMessage =
        document.getElementById("profileMessage");

    const saveBtn =
        document.getElementById("saveBtn");

    const saveText =
        document.getElementById("saveText");


    /* =====================================================
       STATE
    ===================================================== */

    let currentUser = null;

    let currentBusiness = null;

    let supabaseClient = null;


    /* =====================================================
       HELPERS
    ===================================================== */

    function showError(text) {

        errorBox.textContent = text;

        errorBox.classList.remove("hidden");

        loadingBox.classList.add("hidden");

        profileForm.classList.add("hidden");
    }


    function showMessage(text, type = "") {

        profileMessage.textContent = text;

        profileMessage.className =
            "message " + type;
    }


    function updateHeader(name) {

        const businessName =
            name || "Business";


        document.getElementById(
            "businessNameTop"
        ).textContent = businessName;


        document.getElementById(
            "heroBusinessName"
        ).textContent = businessName;


        const initial =
            businessName
                .charAt(0)
                .toUpperCase();


        document.getElementById(
            "profileAvatar"
        ).textContent = initial;


        document.getElementById(
            "profilePhotoInitial"
        ).textContent = initial;
    }


    function setMessage(element, text, color) {

        if (!element) return;

        element.textContent = text;

        element.style.color = color;
    }


    /* =====================================================
       LOAD BUSINESS
       SUPABASE READ
    ===================================================== */

    async function loadBusiness() {

        try {

            /* ---------------------------------------------
               Check Supabase Config
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
               Check Supabase Library
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


            console.log(
                "Supabase Connected"
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

                showError(
                    authError.message
                );

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
                    .eq(
                        "owner_id",
                        user.id
                    )
                    .maybeSingle();


            if (error) {

                showError(
                    error.message
                );

                return;
            }


            if (!business) {

                showError(
                    "Business profile nahi mili."
                );

                return;
            }


            currentBusiness =
                business;


            /* ---------------------------------------------
               Fill Existing Form
            --------------------------------------------- */

            document.getElementById(
                "businessName"
            ).value =
                business.business_name || "";


            document.getElementById(
                "businessType"
            ).value =
                business.business_type || "";


            document.getElementById(
                "city"
            ).value =
                business.city || "";


            document.getElementById(
                "phone"
            ).value =
                business.phone || "";


            /* ---------------------------------------------
               Update Header
            --------------------------------------------- */

            updateHeader(
                business.business_name
            );


            /* ---------------------------------------------
               Load Profile Photo
            --------------------------------------------- */

            loadProfilePhoto(
                business.profile_photo_url
            );


            /* ---------------------------------------------
               Show Form
            --------------------------------------------- */

            loadingBox.classList.add(
                "hidden"
            );

            errorBox.classList.add(
                "hidden"
            );

            profileForm.classList.remove(
                "hidden"
            );


            /* ---------------------------------------------
               Load Verification
            --------------------------------------------- */

            await loadBusinessVerification(
                user.id
            );


            /* ---------------------------------------------
               Update Profile Strength
            --------------------------------------------- */

            updateProfileCompletion();


        } catch (err) {

            console.error(err);

            showError(
                err.message ||
                "Something went wrong."
            );
        }
    }


    /* =====================================================
       PROFILE PHOTO
    ===================================================== */

    function loadProfilePhoto(photoUrl) {

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


        if (photoUrl) {

            preview.src = photoUrl;

            preview.classList.remove(
                "hidden"
            );

            placeholder.classList.add(
                "hidden"
            );

        } else {

            preview.src = "";

            preview.classList.add(
                "hidden"
            );

            placeholder.classList.remove(
                "hidden"
            );
        }
    }


    /* =====================================================
       SELECT PROFILE PHOTO
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


    if (selectPhotoBtn) {

        selectPhotoBtn.addEventListener(
            "click",
            function () {

                profilePhotoFile.click();

            }
        );
    }


    if (changePhotoBtn) {

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


                const objectUrl =
                    URL.createObjectURL(
                        file
                    );


                const preview =
                    document.getElementById(
                        "profilePhotoPreview"
                    );

                const placeholder =
                    document.getElementById(
                        "profilePhotoPlaceholder"
                    );


                preview.src =
                    objectUrl;

                preview.classList.remove(
                    "hidden"
                );

                placeholder.classList.add(
                    "hidden"
                );


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


        message.textContent =
            text;


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

        const file =
            profilePhotoFile.files[0];


        const message =
            document.getElementById(
                "profilePhotoMessage"
            );


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


        if (!currentUser) {

            showPhotoMessage(
                "Please login again.",
                "error"
            );

            return;
        }


        uploadPhotoBtn.disabled =
            true;

        uploadPhotoBtn.textContent =
            "Uploading...";


        try {

            const extension =
                file.name
                    .split(".")
                    .pop()
                    .toLowerCase();


            const filePath =
                `business-profiles/${currentUser.id}/profile-${Date.now()}.${extension}`;


            /* ---------------------------------------------
               SUPABASE STORAGE WRITE

               IMPORTANT:
               This uses the existing
               "verification-documents" bucket.

               If you prefer a separate profile-images
               bucket, change the bucket name here.
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

                            upsert: true
                        }
                    );


            if (uploadError) {

                throw uploadError;
            }


            /* ---------------------------------------------
               Get Public URL
            --------------------------------------------- */

            const {
                data: publicData
            } =
                supabaseClient.storage
                    .from(
                        "verification-documents"
                    )
                    .getPublicUrl(
                        filePath
                    );


            const publicUrl =
                publicData.publicUrl;


            if (!publicUrl) {

                throw new Error(
                    "Profile photo URL generate nahi hui."
                );
            }


            /* ---------------------------------------------
               SUPABASE WRITE
               Update businesses table
            --------------------------------------------- */

            const {
                error: updateError
            } =
                await supabaseClient
                    .from("businesses")
                    .update({
                        profile_photo_url:
                            publicUrl
                    })
                    .eq(
                        "owner_id",
                        currentUser.id
                    );


            if (updateError) {

                throw updateError;
            }


            currentBusiness.profile_photo_url =
                publicUrl;


            loadProfilePhoto(
                publicUrl
            );


            showPhotoMessage(
                "✓ Business profile photo uploaded successfully.",
                "success"
            );


            updateProfileCompletion();


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


    /* =====================================================
       INITIAL VERIFICATION UI
    ===================================================== */

    function resetVerificationDocumentFields() {

        identityDocumentGroup.classList.add(
            "hidden"
        );

        businessDocumentGroup.classList.add(
            "hidden"
        );

        identityDocumentType.value =
            "";

        businessDocumentType.value =
            "";

        documentNumber.value =
            "";
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


                identityDocumentGroup.classList.add(
                    "hidden"
                );

                businessDocumentGroup.classList.add(
                    "hidden"
                );


                identityDocumentType.value =
                    "";

                businessDocumentType.value =
                    "";


                if (
                    category ===
                    "identity"
                ) {

                    identityDocumentGroup.classList.remove(
                        "hidden"
                    );

                }


                if (
                    category ===
                    "business"
                ) {

                    businessDocumentGroup.classList.remove(
                        "hidden"
                    );
                }


                updateProfileCompletion();
            }
        );
    }


    /* =====================================================
       CHOOSE VERIFICATION FILE
    ===================================================== */

    if (chooseVerificationFileBtn) {

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


                selectedDocumentName.textContent =
                    file.name;


                showDocumentPreview(
                    file
                );


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


        documentImagePreview.classList.add(
            "hidden"
        );

        documentPdfPreview.classList.add(
            "hidden"
        );


        if (
            file.type ===
                "image/jpeg" ||
            file.type ===
                "image/png"
        ) {

            const objectUrl =
                URL.createObjectURL(
                    file
                );


            documentImagePreview.src =
                objectUrl;


            documentImagePreview.classList.remove(
                "hidden"
            );

        } else if (
            file.type ===
            "application/pdf"
        ) {

            documentPdfPreview.classList.remove(
                "hidden"
            );
        }
    }


    function clearDocumentPreview() {

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

                fileInput.value = "";

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


        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "verification_documents"
                )
                .select(
                    "id, document_type, status, rejection_reason, uploaded_at"
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

            console.error(
                "Verification loading error:",
                error
            );


            statusEl.textContent =
                "Unable to load status";


            return;
        }


        const record =
            data &&
            data.length
                ? data[0]
                : null;


        if (!record) {

            statusEl.textContent =
                "Not submitted";

            statusEl.className =
                "verification-status";


            messageEl.textContent =
                "";


            return;
        }


        const status =
            record.status ||
            "pending";


        statusEl.textContent =
            status
                .charAt(0)
                .toUpperCase() +
            status.slice(1);


        statusEl.className =
            "verification-status " +
            status;


        if (
            status ===
            "rejected" &&
            record.rejection_reason
        ) {

            messageEl.textContent =
                "Rejected: " +
                record.rejection_reason;

            messageEl.style.color =
                "#991b1b";

        } else if (
            status ===
            "approved"
        ) {

            messageEl.textContent =
                "✓ Your business document has been approved.";

            messageEl.style.color =
                "#166534";

        } else {

            messageEl.textContent =
                "Your document is waiting for admin review.";

            messageEl.style.color =
                "#92400e";
        }


        updateProfileCompletion();
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
            verificationCategory.value;


        if (
            category ===
            "identity"
        ) {

            return identityDocumentType.value;
        }


        if (
            category ===
            "business"
        ) {

            return businessDocumentType.value;
        }


        return "";
    }


    /* =====================================================
       DOCUMENT NUMBER BASIC VALIDATION
    ===================================================== */

    function validateDocumentNumber(
        category,
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
           PAN format
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
           Aadhaar basic format
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


        /*
           For other documents we only
           check that the value is not
           excessively long.
        */

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

        const button =
            document.getElementById(
                "businessVerificationUploadBtn"
            );


        const category =
            verificationCategory.value;


        const documentType =
            getSelectedDocumentType();


        const number =
            documentNumber.value.trim();


        const file =
            fileInput.files[0];


        /* ---------------------------------------------
           Category validation
        --------------------------------------------- */

        if (!category) {

            showVerificationMessage(
                "Please select a document category.",
                "error"
            );

            return;
        }


        /* ---------------------------------------------
           Document type validation
        --------------------------------------------- */

        if (!documentType) {

            showVerificationMessage(
                "Please select the document type.",
                "error"
            );

            return;
        }


        /* ---------------------------------------------
           Document number validation
        --------------------------------------------- */

        if (
            number &&
            !validateDocumentNumber(
                category,
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
           File validation
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
           Get User
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

        button.disabled =
            true;

        button.textContent =
            "Submitting...";


        showVerificationMessage(
            "",
            ""
        );


        try {

            /* -----------------------------------------
               Generate Storage Path
            ----------------------------------------- */

            const extension =
                file.name.includes(".")
                    ? file.name
                        .split(".")
                        .pop()
                        .toLowerCase()
                    : "bin";


            const filePath =
                `business/${user.id}/${crypto.randomUUID()}-business-proof.${extension}`;


            /* -----------------------------------------
               SUPABASE STORAGE WRITE
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
               Store Document Type
               
               We use a readable combined value
               because your existing table already
               has document_type.
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

                        file_path:
                            filePath,

                        status:
                            "pending"
                    });


            if (insertError) {

                /* -------------------------------------
                   Remove uploaded file if database
                   insert fails.
                ------------------------------------- */

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


            fileInput.value = "";

            clearDocumentPreview();


            await loadBusinessVerification(
                user.id
            );


            updateProfileCompletion();


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

            button.disabled =
                false;

            button.textContent =
                "🚀 Submit for Verification";
        }
    }


    /* =====================================================
       VERIFICATION BUTTON
    ===================================================== */

    const verificationUploadButton =
        document.getElementById(
            "businessVerificationUploadBtn"
        );


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
                            "owner_id",
                            currentUser.id
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


                updateProfileCompletion();


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


    /* =====================================================
       PROFILE COMPLETENESS
    ===================================================== */

    async function updateProfileCompletion() {

        if (!currentBusiness) {
            return;
        }


        let completed =
            0;

        const total =
            3;


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

        let verified =
            false;


        if (
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
                            ascending:
                                false
                        }
                    )
                    .limit(1);


            if (
                data &&
                data.length &&
                data[0].status ===
                "approved"
            ) {

                verified =
                    true;
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
                percentage + "%";
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

    document
        .getElementById("logoutBtn")
        .addEventListener(
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


    /* =====================================================
       START
    ===================================================== */

    loadBusiness();

});