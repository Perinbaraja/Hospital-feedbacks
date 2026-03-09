export const exportToCSV = (data, filename) => {
    if (!data || !data.length) return;

    const headers = [
        "Date",
        "Patient Name",
        "Email",
        "Department",
        "Review Type",
        "Issue",
        "Experience",
        "Comments",
        "Status",
        "Assigned To"
    ].join(",");

    const rows = data.map(fb => {
        const cat = fb.categories?.[0] || {};
        const date = new Date(fb.createdAt).toLocaleDateString();
        const patient = fb.patientName || "Anonymous";
        const email = fb.patientEmail || "N/A";
        const dept = cat.department || "N/A";
        const type = cat.reviewType || "N/A";
        const issue = Array.isArray(cat.issue) ? cat.issue.join(" | ") : (cat.issue || "N/A");
        const rating = cat.rating || "N/A";
        const comments = fb.comments ? fb.comments.replace(/,/g, ";") : ""; // Clean commas
        const status = fb.status || "Pending";
        const assigned = fb.assignedTo || "Unassigned";

        return [
            `"${date}"`,
            `"${patient}"`,
            `"${email}"`,
            `"${dept}"`,
            `"${type}"`,
            `"${issue}"`,
            `"${rating}"`,
            `"${comments}"`,
            `"${status}"`,
            `"${assigned}"`
        ].join(",");
    });

    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
