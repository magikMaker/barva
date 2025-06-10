#!/usr/bin/env node

/**
 * Script to create a GitHub release for the current version.
 * This script automates the process of creating a new GitHub release based on the version in package.json.
 * It extracts repository information from git, reads the current version, and creates a release on GitHub.
 *
 * @module release-github
 * @author magikMaker
 * @version 1.0.0
 *
 * Usage: node scripts/release-github.mjs [releaseNotes]
 *
 * Note: Requires GITHUB_TOKEN environment variable to be set with a token
 * that has permission to create releases.
 */

import { Octokit } from '@octokit/rest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * The file path of the current module
 * @constant {string} __filename
 */
const __filename = fileURLToPath(import.meta.url);

/**
 * The directory path of the current module
 * @constant {string} __dirname
 */
const __dirname = path.dirname(__filename);

/**
 * Extracts the repository owner and name from the git remote URL.
 * This function parses the git remote URL to extract the owner and repository name.
 * It supports both HTTPS and SSH remote URL formats.
 *
 * @function getRepoInfo
 * @returns {{ owner: string, repo: string }} An object containing the repository owner and name
 * @throws {Error} If unable to parse repository info from git remote URL or if git command fails
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
 * Gets the current version from package.json.
 * This function reads the package.json file from the project root and extracts the version.
 *
 * @function getVersion
 * @returns {string} The current version string from package.json
 * @throws {Error} If unable to read or parse package.json
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
 * Main function to create a GitHub release.
 * This function performs the following steps:
 * 1. Checks for the required GitHub token
 * 2. Gets repository information and current version
 * 3. Creates a new release on GitHub with the specified tag and release notes
 *
 * @function createRelease
 * @async
 * @returns {Promise<void>} A promise that resolves when the release is created
 * @throws {Error} If GitHub token is missing or if there's an error creating the release
 */
async function createRelease() {
  /**
   * GitHub authentication token from environment variables
   * @type {string|undefined}
   */
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }

  /**
   * Initialized Octokit instance with authentication
   * @type {Octokit}
   */
  const octokit = new Octokit({
    auth: token
  });

  /**
   * Repository information containing owner and repo name
   * @type {{ owner: string, repo: string }}
   */
  const repoInfo = getRepoInfo();

  /**
   * Current version from package.json
   * @type {string}
   */
  const version = getVersion();

  /**
   * Tag name for the release, prefixed with 'v'
   * @type {string}
   */
  const tagName = `v${version}`;

  /**
   * Release notes from command line argument or default text
   * @type {string}
   */
  const releaseNotes = process.argv[2] ||
    `Release version ${version}`;

  try {
    console.log(`Creating GitHub release for ${tagName}...`);

    /**
     * The created GitHub release response
     * @type {import('@octokit/rest').Octokit.Response<import('@octokit/rest').Octokit.ReposCreateReleaseResponse>}
     */
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

/**
 * Execute the createRelease function and handle any uncaught errors
 * @listens Promise.catch
 */
createRelease().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
