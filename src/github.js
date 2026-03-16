const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const MAX_FILES = parseInt(process.env.MAX_FILES_PER_REVIEW || "20");
const MAX_DIFF_LINES = parseInt(process.env.MAX_DIFF_LINES || "500");

/**
 * Fetches the list of changed files and their diffs for a pull request.
 * Respects the MAX_FILES and MAX_DIFF_LINES limits to keep costs manageable.
 */
async function getPullRequestDiff({ owner, repo, pullNumber }) {
  console.log(`  📂 Fetching files for PR #${pullNumber}...`);

  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: MAX_FILES,
  });

  const processedFiles = files
    .filter((f) => f.status !== "removed") // Skip deleted files
    .map((file) => {
      const patch = file.patch || "";
      const lines = patch.split("\n");

      // Truncate very long diffs to stay within token limits
      const truncated = lines.length > MAX_DIFF_LINES;
      const finalPatch = truncated
        ? lines.slice(0, MAX_DIFF_LINES).join("\n") +
          `\n... [diff truncated — ${lines.length - MAX_DIFF_LINES} more lines]`
        : patch;

      return {
        filename: file.filename,
        status: file.status,         // added | modified | renamed
        additions: file.additions,
        deletions: file.deletions,
        patch: finalPatch,
      };
    });

  console.log(`  ✅ Fetched ${processedFiles.length} file(s)`);
  return processedFiles;
}

/**
 * Fetches basic metadata for a PR (title, body, branch names).
 */
async function getPullRequestInfo({ owner, repo, pullNumber }) {
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });

  return {
    title: pr.title,
    body: pr.body,
    author: pr.user.login,
    baseBranch: pr.base.ref,
    headBranch: pr.head.ref,
    commits: pr.commits,
    changedFiles: pr.changed_files,
    additions: pr.additions,
    deletions: pr.deletions,
  };
}

/**
 * Posts a review comment on the pull request.
 * Uses the COMMENT event type (not APPROVE or REQUEST_CHANGES)
 * to avoid blocking the PR.
 */
async function postReviewComment({ owner, repo, pullNumber, body }) {
  console.log(`  💬 Posting review comment on PR #${pullNumber}...`);

  await octokit.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    body,
    event: "COMMENT", // Non-blocking review
  });

  console.log(`  ✅ Review posted successfully`);
}

/**
 * Posts a simple issue comment (used for error notifications).
 */
async function postIssueComment({ owner, repo, pullNumber, body }) {
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body,
  });
}

module.exports = {
  getPullRequestDiff,
  getPullRequestInfo,
  postReviewComment,
  postIssueComment,
};