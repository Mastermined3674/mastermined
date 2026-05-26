# How to put MasterMined online — Step by step

This is your guide. Read each step carefully. Do not skip any.

You will need:
- A computer
- An email address
- About 20 to 30 minutes
- Internet

You do NOT need to install anything on your computer.

---

## Before you start

You should have downloaded a file called `mastermined.zip` from Claude.
Unzip it on your computer (just double-click it). You will see a folder called `mastermined` with files inside it.

Keep this folder somewhere you can find it. The Desktop is fine.

---

## Step 1 — Make a GitHub account

GitHub is a free website where your app's code will live.

1. Open a new browser tab.
2. Go to: **https://github.com/signup**
3. Type in your email and click the green Continue button.
4. Make a password. Click Continue.
5. Pick a username (any name you like — nobody using your app will see it).
6. GitHub may ask you a puzzle question to prove you are a human. Solve it.
7. GitHub will send a code to your email. Open your email, find the code, type it on the GitHub page.
8. When GitHub asks "How will you primarily use GitHub?" — just click "Continue" or "Skip personalization" at the bottom. Any answer is fine.

You are now logged into GitHub. You will see a page with a lot of options. That's okay. Keep that tab open and move to Step 2.

---

## Step 2 — Make a place for your app on GitHub

1. Look at the top-right of the GitHub page. You will see a small **+** (plus) icon. Click it.
2. A small menu will drop down. Click **New repository**.
3. You will see a form.
   - In the box that says **"Repository name"**, type: `mastermined`
   - Leave the **"Description"** box empty (or write anything you like).
   - Below that, you will see **Public** and **Private** options. Make sure **Public** is selected (it has a green dot on the left when selected). This is required for the free deployment service to work.
   - **DO NOT** check any of the other boxes ("Add a README file", "Add .gitignore", "Choose a license"). Leave all of them unchecked.
4. Scroll down and click the green **Create repository** button.

You will land on a new page that looks mostly empty. Good.

---

## Step 3 — Put your files onto GitHub

On the empty page from Step 2, look for a line of blue text that says **"uploading an existing file"**. It's in the middle of the page, in a section with code-looking text.

1. Click **"uploading an existing file"**.
2. You will see a big box that says "Drag files here to add them to your repository, or choose your files".
3. **Open the `mastermined` folder on your computer** (the one you unzipped earlier).
4. Inside that folder, you will see many files (like `package.json`, `README.md`, `index.html`, and folders like `src`).
5. **IMPORTANT**: If you see a folder named `node_modules` inside, IGNORE it — do not upload it. (You probably won't see this folder, but just in case.)
6. Select ALL the other files and folders. (On Windows: click the first item, hold Shift, click the last item. On Mac: press Cmd+A.)
7. Drag the selected files and folders into the big box on the GitHub page.

You will see GitHub processing the files. Wait. This may take 1 to 3 minutes depending on your internet speed. A progress bar will show.

When it's done, scroll all the way down on the GitHub page.

8. You will see a section called **"Commit changes"**. Leave everything as it is.
9. Click the green **Commit changes** button at the bottom.

GitHub will think for a moment and then take you back to your repository page. You should now see all your files listed (like `src`, `package.json`, etc).

You are done with GitHub.

---

## Step 4 — Make a Vercel account

Vercel is a free service that will take your code from GitHub and turn it into a real website.

1. Open a new browser tab.
2. Go to: **https://vercel.com/signup**
3. Click the big black button that says **Continue with GitHub**.
4. A popup will appear asking GitHub to give Vercel permission. Click the green **Authorize Vercel** button at the bottom of that popup.
5. Vercel may ask for your name or a few details. Fill them in — any answer is fine — and continue.
6. If Vercel asks "What's the name of your team?", you can type anything (like your name) and continue.
7. If Vercel asks to "Invite Team Members", skip it.

You are now logged into Vercel.

---

## Step 5 — Tell Vercel to deploy your app

1. After signing up, Vercel will probably show you a page that says "Import a Git Repository" or shows your GitHub repositories. If not, look at the top of the page and click your account name, then look for an **Add New** or **Import Project** button.
2. You should see your `mastermined` repository in the list. (If you don't see it, click **Adjust GitHub App Permissions** or **Configure GitHub** and follow prompts to give Vercel access. Pick "All repositories" for the simplest path.)
3. Click the **Import** button next to `mastermined`.
4. Vercel will show a page with a lot of settings. **DO NOT CHANGE ANY OF THEM.** They are correct by default. Just look at them and leave them alone.
5. Scroll down and click the big black **Deploy** button.

Vercel will now build your app. You will see a screen with logs scrolling. This takes 1 to 3 minutes.

Wait. Don't close the tab.

When it's done, you will see a **celebration screen** with confetti and a big screenshot of your app. You'll see a URL near the top — something like `mastermined-xyz123.vercel.app`.

**That is your app. It is now online.**

---

## Step 6 — Open your app and test it

1. On the celebration screen, click the big screenshot of your app. (Or click the URL.)
2. Your app will open in a new tab.
3. Bookmark this tab in your browser. This is how you will open the app every day.

Try adding a candidate, a client, a job. Make sure everything works.

---

## Important things to remember

**Your app's URL never changes.** Always come back to the same URL. Bookmark it.

**Your data lives in your browser.** This means:
- If you use Chrome on your laptop, you have one set of data.
- If you open the same URL in Safari on your phone, you'll see an empty app with no data.
- If you clear your browser's history/cookies, your data is GONE.

**Back up your data weekly.** In the app, go to **Settings → Backup & restore → Download backup**. Save the file to your Google Drive or somewhere safe. If anything goes wrong, you can restore from this file.

**If you want to use the app on a different device**, here's the trick:
- On the device with data, download a backup.
- Email or transfer the backup file to the new device.
- On the new device, open your app URL, go to Settings, and click Restore from backup.
- Both devices are still NOT in sync — they just have the same starting point.

---

## When you want to add features later

You will come back to Claude and say what you want changed. Claude will give you new code. You will:
1. Go to your GitHub repository.
2. Find the file that changed (Claude will tell you which).
3. Click the file, then click the pencil icon at the top-right to edit.
4. Replace the file contents with the new code.
5. Scroll down and click Commit changes.
6. Vercel will automatically rebuild your app in about 1 minute.
7. Refresh your app — the new version is live. **Your data is untouched.**

Don't worry about this now. Just know it's possible.

---

## If you get stuck

The most common problems and what to do:

**"I can't find the upload area on GitHub"**
Your repository page has tabs at the top: Code, Issues, Pull requests, etc. Make sure you're on the "Code" tab. The upload link is on the empty repo welcome message.

**"Vercel says 'No Git Repository found'"**
You need to give Vercel permission to see your repository. On Vercel, look for "Configure GitHub App" or "Adjust GitHub App Permissions" and grant access to your `mastermined` repository.

**"My app shows a blank page"**
Wait 2 more minutes — Vercel might still be building. If still blank after 5 minutes, take a screenshot of the Vercel build logs and send to Claude.

**"I made a typo in the GitHub repository name"**
That's okay. You can delete the repository (Settings → Danger Zone → Delete) and start over. It's free.

**Anything else**
Take a screenshot of what you see on screen and send it to Claude in a new message. Claude will tell you what to click next.

---

You can do this. Take it slowly. Don't rush. Read each step before clicking.
EOF
