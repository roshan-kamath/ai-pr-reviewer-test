const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
  getPullRequestDiff,
  postReviewComment,
  postIssueComment,
} = require("./github");
const { buildPrompt, formatReviewComment } = require("./utils");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Main review orchestrator.
 * Fetches the diff, sends it to Gemini, and posts the result back to GitHub.
 */
async function reviewPullRequest({
  owner,
  repo,
  pullNumber,
  prTitle,
  prBody,
  baseBranch,
  headBranch,
  author,
}) {
  console.log(`\n🤖 Starting AI review for PR #${pullNumber}...`);

  // 1. Fetch changed files
  let files;
  try {
    files = await getPullRequestDiff({ owner, repo, pullNumber });
  } catch (err) {
    console.error("  ❌ Failed to fetch diff:", err.message);
    throw err;
  }

  if (files.length === 0) {
    console.log("  ℹ️  No reviewable files found — skipping");
    return;
  }

  // 2. Build the prompt
  const prompt = buildPrompt({
    prTitle,
    prBody,
    baseBranch,
    headBranch,
    author,
    files,
  });

  // 3. Call Gemini API
  let aiResponse;
  try {
    console.log(`  🧠 Sending ${files.length} file(s) to Gemini for analysis...`);
    aiResponse = await callGemini(prompt);
    console.log("  ✅ Gemini analysis complete");
  } catch (err) {
    console.error("  ❌ Gemini API error:", err.message);

    await postIssueComment({
      owner,
      repo,
      pullNumber,
      body: `> ⚠️ **AI Review Error**\n> The automated review could not be completed: \`${err.message}\``,
    });
    throw err;
  }

  // 4. Format and post the review comment
  const commentBody = formatReviewComment({
    aiResponse,
    prTitle,
    author,
    fileCount: files.length,
  });

  await postReviewComment({ owner, repo, pullNumber, body: commentBody });

  console.log(`✅ Review complete for PR #${pullNumber}\n`);
}

/**
 * Calls Google Gemini 1.5 Flash (free tier).
 * Uses a system instruction + user prompt structure.
 */
async function callGemini(userPrompt) {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash", // Free tier model
    systemInstruction: `You are an expert code reviewer with deep knowledge of software engineering best practices, security, and performance optimization.

Your job is to review GitHub pull request diffs and provide constructive, actionable feedback.

Structure your review in these sections:
## Summary
A 2-3 sentence overview of what the PR does and its overall quality.

## Issues Found
List any bugs, security vulnerabilities, or correctness problems. Use severity labels:
- 🔴 **Critical** — must fix before merging (bugs, security issues)
- 🟡 **Warning** — should fix (potential issues, bad patterns)
- 🔵 **Suggestion** — optional improvements (style, readability)

If no issues are found, say "No issues found ✅".

## Code Quality
Comment on readability, naming conventions, code structure, DRY principles, and best practices.

## Performance
Note any performance concerns or optimizations. Skip if not applicable.

## Security
Flag any security concerns: SQL injection, XSS, exposed secrets, etc. Skip if not applicable.

## Positive Highlights
Point out 1-3 things done well.

## Recommended Changes
A numbered list of the most important changes, ordered by priority.

Guidelines:
- Be specific and cite file names when possible
- Be constructive, not harsh
- Keep feedback concise and actionable`,
  });

  const result = await model.generateContent(userPrompt);
  return result.response.text();
}

module.exports = { reviewPullRequest };