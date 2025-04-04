#!/usr/bin/env node

/**
 * Script to create a GitHub release for the current version
 * Usage:  node scripts/release-github.mjs [releaseNotes]
 *
 * Note: Requires GITHUB_TOKEN environment variable to be set with a token
 * that has permission to create releases.
 */

import { Octokit } from '@octokit/rest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extracts the repository owner and name from the git remote URL
 * @returns {{ owner: string, repo: string }} Repository owner and name
 */
function getRepoInfo() {
  try {
    // Get the git remote URL
    const remoteUrl = execSync('git remote get-url origin')
      .toString()
      .trim();

    // Parse the repository owner and name from the URL
    // Handles both HTTPS and SSH remote URLs
    let match;
    if (remoteUrl.startsWith('https')) {
      // Format: https://github.com/owner/repo.git
      match = remoteUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
    } else {
      // Format: git@github.com:owner/repo.git
      match = remoteUrl.match(/github\.com:([^/]+)\/([^/.]+)/);
    }

    if (!match) {
      throw new Error('Unable to parse repository info from git remote URL');
    }

    return {
      owner: match[1],
      repo: match[2]
    };
  } catch (error) {
    console.error('Error getting repository info:', error.message);
    process.exit(1);
  }
}

/**
 * Gets the current version from package.json
 * @returns {string} The current version
 */
function getVersion() {
  try {
    const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.error('Error reading package.json:', error.message);
    process.exit(1);
  }
}

/**
 * Main function to create a GitHub release
 */
async function createRelease() {
  // Check for GitHub token
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }

  // Initialize Octokit with the token
  const octokit = new Octokit({
    auth: token
  });

  // Get repository information
  const repoInfo = getRepoInfo();
  const version = getVersion();
  const tagName = `v${version}`;

  // Get custom release notes from command line or use default
  const releaseNotes = process.argv[2] ||
    `Release version ${version}`;

  try {
    console.log(`Creating GitHub release for ${tagName}...`);

    // Create the release
    const release = await octokit.repos.createRelease({
      ...repoInfo,
      tag_name: tagName,
      name: `Release ${version}`,
      body: releaseNotes,
      draft: false,
      prerelease: false
    });

    console.log(`✅ GitHub release created successfully: ${release.data.html_url}`);
  } catch (error) {
    console.error('Error creating GitHub release:',
      error.response?.data?.message || error.message);
    process.exit(1);
  }
}

createRelease().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
