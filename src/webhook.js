const crypto = require("crypto");
const { reviewPullRequest } = require("./reviewer");

/**
 * Validates the GitHub webhook HMAC-SHA256 signature.
 * This prevents unauthorized requests from triggering reviews.
 */
function verifySignature(req) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const signature = req.headers["x-hub-signature-256"];

  if (!signature) {
    console.warn("⚠️  Missing webhook signature header");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(req.rawBody).digest("hex");

  // Use timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * Main webhook handler.
 * Listens for pull_request events and triggers the AI reviewer.
 */
async function handleWebhook(req, res) {
  // Verify the request is genuinely from GitHub
  if (!verifySignature(req)) {
    console.error("❌ Invalid webhook signature — request rejected");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.headers["x-github-event"];
  const payload = req.body;

  console.log(`📨 Received GitHub event: ${event}`);

  // Only process pull_request events
  if (event !== "pull_request") {
    return res.status(200).json({ message: `Event '${event}' ignored` });
  }

  const { action, pull_request: pr, repository } = payload;

  // Only review when a PR is opened or new commits are pushed (synchronize)
  if (!["opened", "synchronize"].includes(action)) {
    return res.status(200).json({ message: `Action '${action}' ignored` });
  }

  console.log(
    `🔍 PR #${pr.number} "${pr.title}" in ${repository.full_name} — action: ${action}`
  );

  // Respond to GitHub immediately (webhooks expect a fast 200 response)
  res.status(200).json({ message: "Review started" });

  // Run the review asynchronously so we don't block the response
  try {
    await reviewPullRequest({
      owner: repository.owner.login,
      repo: repository.name,
      pullNumber: pr.number,
      prTitle: pr.title,
      prBody: pr.body || "",
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
      author: pr.user.login,
    });
  } catch (err) {
    console.error(`❌ Review failed for PR #${pr.number}:`, err.message);
  }
}

module.exports = { handleWebhook };