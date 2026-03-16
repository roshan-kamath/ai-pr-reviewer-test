# 🤖 AI Pull Request Reviewer

Ever wished you had a senior developer reviewing every PR the moment it lands — even at 2am? That's exactly what this does.

This tool automatically reviews GitHub pull requests using Google Gemini AI. The moment someone opens or updates a PR, it fetches the code diff, runs it through Gemini, and posts a structured review comment covering bugs, security, performance, and code quality. No waiting, no back-and-forth.

---

## How it works

1. A pull request is opened or updated on GitHub
2. GitHub fires a webhook to this server
3. The server fetches the changed files and diffs
4. The diff is sent to Gemini AI for analysis
5. A structured review comment is posted back to the PR — automatically

The whole thing takes about 10 seconds from PR open to review posted.

---

## What the AI reviews

Every PR gets feedback across these areas:

- **Summary** — what the PR actually does, in plain English
- **Issues Found** — bugs, security risks, and correctness problems (with severity labels)
- **Code Quality** — readability, naming, structure, DRY principles
- **Performance** — N+1 queries, unnecessary re-renders, algorithmic concerns
- **Security** — SQL injection, XSS, exposed secrets, auth issues
- **Positive Highlights** — what was done well (because good work deserves recognition)
- **Recommended Changes** — a prioritized action list

---

## Tech stack

- **Node.js + Express** — webhook server
- **GitHub Webhooks + Octokit** — PR event listening and API calls
- **Google Gemini AI** — code analysis (free tier, 1500 requests/day)
- **HMAC-SHA256** — webhook signature verification

---

## Getting started

### Prerequisites

- Node.js v18+
- A GitHub repository you control
- A free Google Gemini API key → [aistudio.google.com](https://aistudio.google.com)
- ngrok or localtunnel to expose localhost

### 1. Clone the repo
```bash
git clone https://github.com/roshan-kamath/ai-pr-reviewer-test.git
cd ai-pr-reviewer-test
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```

Open `.env` and fill in your keys:

| Variable | Where to get it |
|---|---|
| `GITHUB_TOKEN` | GitHub → Settings → Developer settings → Personal access tokens (needs `repo` scope) |
| `GITHUB_WEBHOOK_SECRET` | Any random string you choose — run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Get API Key |

### 3. Expose your local server
```bash
# Using ngrok (free account required)
npx ngrok http 3000

# Or using localtunnel (no account needed)
npx localtunnel --port 3000
```

Copy the HTTPS URL — you'll need it for the webhook.

### 4. Register the webhook on GitHub

1. Go to your repo → **Settings** → **Webhooks** → **Add webhook**
2. Set **Payload URL** to `https://your-tunnel-url/webhook`
3. Set **Content type** to `application/json`
4. Paste your `GITHUB_WEBHOOK_SECRET` into the **Secret** field
5. Under events, choose **"Let me select individual events"** → check only **Pull requests**
6. Click **Add webhook**

### 5. Start the server
```bash
npm run dev
```

You should see:
```
✅ Environment variables validated
✅ AI PR Reviewer running on port 3000
```

### 6. Open a PR and watch the magic

Create a branch, make any change, open a pull request. Within 10 seconds an AI review comment will appear on the PR.

---

## Project structure
```
ai-pr-reviewer/
├── src/
│   ├── index.js      # Express server + startup
│   ├── webhook.js    # Receives GitHub events, verifies signatures
│   ├── github.js     # Fetches diffs, posts review comments
│   ├── reviewer.js   # Orchestrates the review, calls Gemini API
│   └── utils.js      # Prompt builder, comment formatter, env validation
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Configuration

Fine-tune the reviewer in your `.env`:

| Variable | Default | What it does |
|---|---|---|
| `MAX_FILES_PER_REVIEW` | `20` | Caps how many files are reviewed per PR |
| `MAX_DIFF_LINES` | `500` | Truncates very large file diffs |

Lowering these speeds up reviews and reduces API usage on large PRs.

---

## Deploying to production

Running `npm run dev` locally works for testing, but if you want this running 24/7 on real projects, deploy it somewhere permanent:

- **Railway** — easiest, free tier available, deploy in under 5 minutes
- **Render** — connect your GitHub repo, auto-deploys on push
- **Fly.io** — `fly deploy`, generous free tier
- **Any VPS** — use PM2: `pm2 start src/index.js --name pr-reviewer`

After deploying, update your GitHub webhook URL to the production URL.

---

## Troubleshooting

**Webhook shows 401 Unauthorized**
Your `GITHUB_WEBHOOK_SECRET` in `.env` doesn't match what's set in GitHub. They need to be identical.

**Review never posts**
Check your server terminal for error messages. Most common causes: expired GitHub token, wrong Gemini model name, or the PR was opened by a bot (which can cause infinite loops — check `payload.sender.type !== 'Bot'` in `webhook.js`).

**"Model not found" error from Gemini**
Make sure the model name in `reviewer.js` is `gemini-2.0-flash`.

**Large PRs are slow or truncated**
Totally expected — Gemini has input limits. Lower `MAX_FILES_PER_REVIEW` and `MAX_DIFF_LINES` in `.env` to keep things fast.

---

## A note on security

Never commit your `.env` file. The `.gitignore` in this repo excludes it, but double-check before pushing. If a token is ever accidentally exposed, regenerate it immediately from GitHub → Settings → Developer settings → Personal access tokens.

---

Built by [Roshan Kamath](https://github.com/roshan-kamath)
