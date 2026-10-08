// ==========================================
// MY APPLICATIONS JS
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    console.log("My Applications JS loaded");

    await loadStudentName();

});


// ==========================================
// LOAD LOGGED-IN STUDENT NAME
// ==========================================

async function loadStudentName() {

    console.log("Loading student name...");

    // Get logged-in student
    const { data: { user }, error } =
        await supabaseClient.auth.getUser();

    if (error) {

        console.error("Auth error:", error);
        return;
    }

    if (!user) {

        console.error("No logged-in student found.");
        return;
    }

    console.log("Logged-in user:", user);


    // ==========================================
    // GET NAME FROM SUPABASE AUTH
    // ==========================================

    const metadata = user.user_metadata || {};

    console.log("User metadata:", metadata);


    const studentName =
        metadata.full_name ||
        metadata.name ||
        metadata.student_name ||
        metadata.username ||
        user.email?.split("@")[0] ||
        "Student";


    console.log("Student name:", studentName);


    // ==========================================
    // UPDATE NAME
    // ==========================================

    const userName =
        document.getElementById("userName");

    if (userName) {

        userName.textContent = studentName;
    }


    // ==========================================
    // UPDATE AVATAR
    // ==========================================

    const userAvatar =
        document.getElementById("userAvatar");

    if (userAvatar) {

        userAvatar.textContent =
            studentName.charAt(0).toUpperCase();
    }

}