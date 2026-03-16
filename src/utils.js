function validateEnv() {
  const required = [
    "GITHUB_TOKEN",
    "GITHUB_WEBHOOK_SECRET",
    "GEMINI_API_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error("\nCopy .env.example to .env and fill in the values.");
    process.exit(1);
  }

  console.log("✅ Environment variables validated");
}

function buildPrompt({ prTitle, prBody, baseBranch, headBranch, author, files }) {
  const filesSummary = files
    .map((f) => `**${f.filename}** (${f.status}, +${f.additions}/-${f.deletions} lines)`)
    .join("\n");

  const filesWithDiffs = files
    .map((f) => {
      if (!f.patch) return `### ${f.filename}\n*(Binary file or no diff available)*`;
      return `### ${f.filename}
Status: ${f.status} | +${f.additions} additions | -${f.deletions} deletions

\`\`\`diff
${f.patch}
\`\`\``;
    })
    .join("\n\n---\n\n");

  return `# Pull Request Review Request

## PR Details
- **Title:** ${prTitle}
- **Author:** @${author}
- **Branch:** \`${headBranch}\` → \`${baseBranch}\`
- **Description:** ${prBody || "*(no description provided)*"}

## Changed Files (${files.length} total)
${filesSummary}

---

## Diffs

${filesWithDiffs}

---

Please provide a thorough code review of the above changes.`;
}

function formatReviewComment({ aiResponse, prTitle, author, fileCount }) {
  const now = new Date().toUTCString();

  const header = `## 🤖 AI Code Review

> **PR:** ${prTitle}  
> **Reviewed:** ${fileCount} file(s) · ${now}  
> **Reviewer:** AI Assistant (powered by Gemini)

---

`;

  const footer = `

---
<sub>This review was generated automatically. Always use human judgment before merging.</sub>`;

  return header + aiResponse + footer;
}

function detectLanguage(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const langMap = {
    js: "JavaScript", ts: "TypeScript", jsx: "React/JSX", tsx: "React/TSX",
    py: "Python", rb: "Ruby", go: "Go", java: "Java", cs: "C#",
    cpp: "C++", c: "C", php: "PHP", swift: "Swift", kt: "Kotlin",
    rs: "Rust", sql: "SQL", sh: "Shell", yaml: "YAML", yml: "YAML",
    json: "JSON", md: "Markdown",
  };
  return langMap[ext] || "Unknown";
}

module.exports = { validateEnv, buildPrompt, formatReviewComment, detectLanguage };