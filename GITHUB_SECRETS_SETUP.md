# GitHub Actions Setup - Docker Hub Authentication

## Problem
The workflow is failing because GitHub Secrets `DOCKER_USERNAME` and `DOCKER_PASSWORD` are not configured.

## Solution: Add GitHub Secrets

### Step 1: Get Docker Hub Access Token

1. Go to https://hub.docker.com/settings/security
2. Click **"New Access Token"**
3. Name it: `github-actions`
4. Permissions: Select **"Read & Write"**
5. Click **"Generate"**
6. **Copy the token** (you won't see it again)

### Step 2: Add Secrets to GitHub

1. Go to your repository: https://github.com/irving1flores/homeledger
2. Click **Settings** tab
3. In left sidebar, click **Secrets and variables** → **Actions**
4. Click **"New repository secret"**

#### Secret 1: DOCKER_USERNAME
- **Name**: `DOCKER_USERNAME`
- **Value**: `irving1flores` (your Docker Hub username)
- Click **"Add secret"**

#### Secret 2: DOCKER_PASSWORD
- **Name**: `DOCKER_PASSWORD`
- **Value**: (paste the token from Step 1)
- Click **"Add secret"**

### Step 3: Verify Secrets Are Set

You should see both secrets listed under "Repository secrets":
- ✓ DOCKER_PASSWORD
- ✓ DOCKER_USERNAME

### Step 4: Re-run the Workflow

1. Go to **Actions** tab
2. Click the failed **"Build and Push Docker Image"** workflow
3. Click **"Re-run jobs"** → **"Re-run all jobs"**

The workflow should now:
- ✓ Log in to Docker Hub
- ✓ Build the image
- ✓ Push to `irving1flores/homeledger:latest`

### Troubleshooting

If it still fails:

1. **Verify token is correct:**
   ```bash
   docker login -u irving1flores
   # Paste the token when prompted for password
   ```

2. **Check GitHub Secrets are visible:**
   - Go to Settings → Secrets → Actions
   - Should show both secrets (value masked)

3. **Check workflow is using correct secret names:**
   ```yaml
   username: ${{ secrets.DOCKER_USERNAME }}
   password: ${{ secrets.DOCKER_PASSWORD }}
   ```

## What the Workflow Does

Once authenticated, on every push to `main` or tag push:

1. ✓ Builds Docker image
2. ✓ Logs in to Docker Hub
3. ✓ Tags image with branch/version/SHA
4. ✓ Pushes to `irving1flores/homeledger`
5. ✓ Updates Docker Hub README (from your repo README.md)

## Node 24 Warning

The message about Node 28/24 is just a deprecation notice - it won't block the workflow. The Node version is set by GitHub Actions runners, not your workflow.
