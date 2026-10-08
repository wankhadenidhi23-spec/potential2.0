async function updateApplicationStatus(
    applicationId,
    newStatus
) {

    /* =====================================================
       CHECK BUSINESS
    ===================================================== */

    if (!currentBusiness) {

        alert(
            "Business information not loaded."
        );

        return;
    }


    /* =====================================================
       CHECK STATUS
    ===================================================== */

    if (
        !["accepted", "rejected"]
            .includes(newStatus)
    ) {

        return;
    }


    /* =====================================================
       CONFIRM ACTION
    ===================================================== */

    const message =
        newStatus === "accepted"
            ? "Are you sure you want to accept this student?"
            : "Are you sure you want to reject this student?";


    if (!confirm(message)) {

        return;
    }


    try {

        /* =================================================
           SECURITY CHECK

           Make sure the application belongs to a job
           owned by the currently logged-in business.

           RLS should ALSO enforce this in Supabase.
        ================================================= */

        const {
            data: application,
            error: applicationError
        } = await supabaseClient

            .from("applications")

            .select(`
                id,
                job_id,
                jobs!inner(
                    business_id
                )
            `)

            .eq(
                "id",
                applicationId
            )

            .eq(
                "jobs.business_id",
                currentBusiness.id
            )

            .maybeSingle();


        if (applicationError) {

            throw applicationError;
        }


        /* =================================================
           APPLICATION NOT FOUND / NOT AUTHORIZED
        ================================================= */

        if (!application) {

            throw new Error(
                "You are not authorized to update this application."
            );
        }


        /* =================================================
           UPDATE APPLICATION STATUS
        ================================================= */

        const {
            error
        } = await supabaseClient

            .from("applications")

            .update({
                status: newStatus
            })

            .eq(
                "id",
                applicationId
            );


        if (error) {

            throw error;
        }


        /* =================================================
           RELOAD APPLICATIONS
        ================================================= */

        if (
            typeof loadApplications === "function"
        ) {

            await loadApplications();

        }


        /* =================================================
           SUCCESS MESSAGE
        ================================================= */

        showMessage(

            newStatus === "accepted"

                ? "Student accepted successfully."

                : "Student rejected successfully.",

            "success"

        );


    } catch (error) {

        console.error(
            "Application status update error:",
            error
        );


        showMessage(

            error.message ||
            "Unable to update application.",

            "error"

        );

    }

}