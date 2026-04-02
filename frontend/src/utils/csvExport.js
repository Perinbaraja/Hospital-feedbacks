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
        const isPos = cat.reviewType === 'Positive';
        const rawTags = [
            ...(isPos ? [
                ...((Array.isArray(cat.positive_feedback) ? cat.positive_feedback : [])),
                ...((Array.isArray(cat.positive_issues) ? cat.positive_issues : [])),
                ...((Array.isArray(cat.issue) ? cat.issue : []))
            ] : [
                ...((Array.isArray(cat.negative_feedback) ? cat.negative_feedback : [])),
                ...((Array.isArray(cat.negative_issues) ? cat.negative_issues : [])),
                ...((Array.isArray(cat.issue) ? cat.issue : []))
            ])
        ];
        const uniqueTags = [...new Set(rawTags)].filter(t => t && String(t).trim() !== '');
        const issue = uniqueTags.length > 0 ? uniqueTags.join(" | ") : (cat.issue && Array.isArray(cat.issue) ? cat.issue.join(" | ") : (cat.issue || "N/A"));
        const ratingSlug = cat.feedback || cat.rating || "N/A";
        const rating = ratingSlug === 'completely_satisfied' ? 'COMPLETELY' : 
                      ratingSlug === 'partially_satisfied' ? 'PARTIALLY' :
                      ratingSlug === 'not_satisfied' ? 'NOT SATISFIED' : ratingSlug.toUpperCase();
        const comments = (cat.note || cat.customText || fb.comments || "").replace(/,/g, ";"); // Clean commas
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
