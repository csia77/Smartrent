// js/utils.js
// Shared utility functions used across the application.

/**
 * Escapes HTML special characters in a string to prevent XSS
 * when inserting user-provided data into innerHTML.
 * 
 * @param {string} str - The raw string to escape.
 * @returns {string} The escaped string safe for HTML insertion.
 */
export function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    const text = String(str);
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Validates that a value is a finite positive number.
 * Returns the parsed number, or null if invalid.
 * 
 * @param {*} value - The value to validate.
 * @returns {number|null} The parsed positive number, or null.
 */
export function parsePositiveNumber(value) {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num) || num < 0) return null;
    return num;
}

// Date locale used across all pages for consistent formatting.
export const DATE_LOCALE = "en-KE";

// Maximum image dimensions for resizing before storage.
export const PROFILE_IMAGE_MAX_DIM = 150;
export const GALLERY_IMAGE_MAX_DIM = 400;
