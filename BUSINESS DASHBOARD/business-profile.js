/*
=========================================================
POTential BUSINESS PROFILE
=========================================================
*/

document.addEventListener("DOMContentLoaded", function () {

    const profileForm = document.getElementById("profileForm");
    const loadingBox = document.getElementById("loadingBox");
    const errorBox = document.getElementById("errorBox");
    const profileMessage = document.getElementById("profileMessage");
    const saveBtn = document.getElementById("saveBtn");
    const saveText = document.getElementById("saveText");

    let currentUser = null;
    let currentBusiness = null;
    let supabaseClient = null;

    function showError(text) {
        errorBox.textContent = text;
        errorBox.classList.remove("hidden");
        loadingBox.classList.add("hidden");
        profileForm.classList.add("hidden");
    }

    function showMessage(text, type = "") {
        profileMessage.textContent = text;
        profileMessage.className = "message " + type;
    }

    function updateHeader(name) {
        const businessName = name || "Business";

        document.getElementById("businessNameTop").textContent = businessName;
        document.getElementById("heroBusinessName").textContent = businessName;
        document.getElementById("profileAvatar").textContent =
            businessName.charAt(0).toUpperCase();
    }

    async function loadBusiness() {
        try {

            if (typeof SUPABASE_URL === "undefined" ||
                typeof SUPABASE_ANON_KEY === "undefined") {

                showError("Supabase config nahi mil raha. supabase-config.js check karo.");
                return;
            }

            if (!window.supabase || !window.supabase.createClient) {
                showError("Supabase library load nahi hui.");
                return;
            }

            supabaseClient = window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY
            );

            console.log("Supabase Connected");

            const {
                data: { user },
                error: authError
            } = await supabaseClient.auth.getUser();

            if (authError) {
                showError(authError.message);
                return;
            }

            if (!user) {
                window.location.href = "../auth.html";
                return;
            }

            currentUser = user;

            const { data: business, error } = await supabaseClient
                .from("businesses")
                .select("id, owner_id, business_name, business_type, city, phone")
                .eq("owner_id", user.id)
                .maybeSingle();

            if (error) {
                showError(error.message);
                return;
            }

            if (!business) {
                showError("Business profile nahi mili.");
                return;
            }

            currentBusiness = business;

            document.getElementById("businessName").value = business.business_name || "";
            document.getElementById("businessType").value = business.business_type || "";
            document.getElementById("city").value = business.city || "";
            document.getElementById("phone").value = business.phone || "";

            updateHeader(business.business_name);

            loadingBox.classList.add("hidden");
            errorBox.classList.add("hidden");
            profileForm.classList.remove("hidden");
            await loadBusinessVerification(user.id);

        } catch (err) {
            console.error(err);
            showError(err.message);
        }
    }



    async function loadBusinessVerification(userId) {
        const statusEl = document.getElementById("businessVerificationStatus");
        const messageEl = document.getElementById("businessVerificationMessage");

        const { data, error } = await supabaseClient
            .from("verification_documents")
            .select("id, document_type, status, rejection_reason, uploaded_at")
            .eq("user_id", userId)
            .eq("role", "business")
            .order("uploaded_at", { ascending: false })
            .limit(1);

        if (error) {
            console.error("Verification loading error:", error);
            statusEl.textContent = "Unable to load status";
            return;
        }

        const record = data && data.length ? data[0] : null;
        if (!record) {
            statusEl.textContent = "Not submitted";
            statusEl.className = "verification-status";
            return;
        }

        const status = record.status || "pending";
        statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        statusEl.className = "verification-status " + status;

        if (status === "rejected" && record.rejection_reason) {
            messageEl.textContent = "Rejected: " + record.rejection_reason;
            messageEl.style.color = "#991b1b";
        } else if (status === "approved") {
            messageEl.textContent = "✓ Your business document has been approved.";
            messageEl.style.color = "#166534";
        } else {
            messageEl.textContent = "Your document is waiting for admin review.";
            messageEl.style.color = "#92400e";
        }
    }

    async function uploadBusinessVerification() {
        const fileInput = document.getElementById("businessVerificationFile");
        const button = document.getElementById("businessVerificationUploadBtn");
        const messageEl = document.getElementById("businessVerificationMessage");
        const file = fileInput.files[0];

        if (!file) {
            messageEl.textContent = "Please select a business document first.";
            messageEl.style.color = "#991b1b";
            return;
        }

        const allowed = ["application/pdf", "image/jpeg", "image/png"];
        if (!allowed.includes(file.type)) {
            messageEl.textContent = "Only PDF, JPG or PNG files are allowed.";
            messageEl.style.color = "#991b1b";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            messageEl.textContent = "File must be 5 MB or smaller.";
            messageEl.style.color = "#991b1b";
            return;
        }

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            messageEl.textContent = "Please login again.";
            messageEl.style.color = "#991b1b";
            return;
        }

        button.disabled = true;
        button.textContent = "Uploading...";
        messageEl.textContent = "";

        const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "bin";
        const filePath = `business/${user.id}/${crypto.randomUUID()}-business-proof.${extension}`;

        try {
            const { error: uploadError } = await supabaseClient.storage
                .from("verification-documents")
                .upload(filePath, file, { contentType: file.type, upsert: false });

            if (uploadError) throw uploadError;

            const { error: insertError } = await supabaseClient
                .from("verification_documents")
                .insert({
                    user_id: user.id,
                    role: "business",
                    document_type: "business_proof",
                    file_path: filePath,
                    status: "pending"
                });

            if (insertError) {
                await supabaseClient.storage.from("verification-documents").remove([filePath]);
                throw insertError;
            }

            messageEl.textContent = "✓ Business proof uploaded. Waiting for admin approval.";
            messageEl.style.color = "#166534";
            fileInput.value = "";
            await loadBusinessVerification(user.id);
        } catch (error) {
            console.error("Verification upload error:", error);
            messageEl.textContent = error.message || "Upload failed.";
            messageEl.style.color = "#991b1b";
        } finally {
            button.disabled = false;
            button.textContent = "Upload Business Proof";
        }
    }

    document.getElementById("businessVerificationUploadBtn")
        .addEventListener("click", uploadBusinessVerification);

    profileForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        if (!currentBusiness || !currentUser) {
            showMessage("Business profile load nahi hui.", "error");
            return;
        }

        const business_name = document.getElementById("businessName").value.trim();
        const business_type = document.getElementById("businessType").value.trim();
        const city = document.getElementById("city").value.trim();
        const phone = document.getElementById("phone").value.trim();

        if (!business_name) {
            showMessage("Business Name required hai.", "error");
            return;
        }

        saveBtn.disabled = true;
        saveText.textContent = "Saving...";

        const { error } = await supabaseClient
            .from("businesses")
            .update({
                business_name,
                business_type,
                city,
                phone
            })
            .eq("owner_id", currentUser.id);

        saveBtn.disabled = false;
        saveText.textContent = "Save Changes";

        if (error) {
            showMessage(error.message, "error");
            return;
        }

        currentBusiness.business_name = business_name;
        currentBusiness.business_type = business_type;
        currentBusiness.city = city;
        currentBusiness.phone = phone;

        updateHeader(business_name);

        showMessage("✓ Changes successfully save ho gaye!", "success");
    });

    document.getElementById("logoutBtn").addEventListener("click", async function () {

        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }

        window.location.href = "../auth.html";
    });

    loadBusiness();
});