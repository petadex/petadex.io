/**
 * Session utility for tracking search history in localStorage
 *
 * Stores job_ids from searches performed in this browser session.
 */

const SEARCH_HISTORY_KEY = 'petadex_search_job_ids';
const MAX_STORED_JOBS = 100;

/**
 * Get all stored job_ids for this session
 * @returns {string[]} Array of job_ids
 */
export function getStoredJobIds() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Add a job_id to the stored search history
 * @param {string} jobId - The job ID to store
 */
export function addJobId(jobId) {
  if (typeof window === 'undefined' || !jobId) {
    return;
  }

  try {
    const jobIds = getStoredJobIds();
    // Add to beginning (most recent first)
    if (!jobIds.includes(jobId)) {
      jobIds.unshift(jobId);
      // Limit stored jobs
      if (jobIds.length > MAX_STORED_JOBS) {
        jobIds.pop();
      }
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(jobIds));
    }
  } catch {
    // Ignore localStorage errors
  }
}
