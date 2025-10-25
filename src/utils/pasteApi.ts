/**
 * API utility for paste.rs - A simple pastebin service
 * Handles uploading text and retrieving shareable links
 * Production-grade with error handling, validation, and logging
 */

import { CONFIG, MESSAGES, VALIDATION } from "./config";
import { loggerApi } from "./logger";

const PASTE_API_URL = CONFIG.API.BASE_URL;

export interface PasteResponse {
  success: boolean;
  link?: string;
  id?: string;
  error?: string;
  statusCode?: number;
  partialUpload?: boolean;
}

/**
 * Validate text before upload
 */
function validateText(text: string): { valid: boolean; error?: string } {
  if (!text) {
    return { valid: false, error: MESSAGES.ERROR.INVALID_TEXT };
  }

  if (VALIDATION.TEXT_WHITESPACE_REGEX.test(text)) {
    return { valid: false, error: MESSAGES.ERROR.INVALID_TEXT };
  }

  if (text.length > CONFIG.API.MAX_TEXT_LENGTH) {
    return { valid: false, error: MESSAGES.ERROR.SIZE_LIMIT_EXCEEDED };
  }

  return { valid: true };
}

/**
 * Retry logic for failed requests
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = CONFIG.API.RETRY_ATTEMPTS
): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      CONFIG.API.TIMEOUT_MS
    );

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(undefined);

    if (retries > 0 && error instanceof Error && error.name === "AbortError") {
      loggerApi.warn("Request timeout, retrying...", {
        retriesLeft: retries - 1,
      });
      await new Promise((resolve) =>
        setTimeout(resolve, CONFIG.API.RETRY_DELAY_MS)
      );
      return fetchWithRetry(url, options, retries - 1);
    }

    throw error;
  }
}

/**
 * Upload text to paste.rs and get a shareable link
 * @param text - The text content to upload
 * @returns Promise with the shareable link
 */
export async function uploadToPaste(text: string): Promise<PasteResponse> {
  try {
    // Validate input
    const validation = validateText(text);
    if (!validation.valid) {
      loggerApi.warn("Text validation failed", { error: validation.error });
      return {
        success: false,
        error: validation.error,
      };
    }

    loggerApi.info("Starting paste upload", { textLength: text.length });

    const response = await fetchWithRetry(PASTE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: text,
    });

    // Status 201 (CREATED) = full upload successful
    // Status 206 (PARTIAL) = partial upload (exceeded size limit)
    if (response.status === 201 || response.status === 206) {
      const isPartial = response.status === 206;

      // The response contains the paste ID/link
      const link = response.headers.get("Location") || (await response.text());
      const pasteId = link.split("/").pop();

      if (!pasteId) {
        loggerApi.error("Failed to extract paste ID from response", { link });
        return {
          success: false,
          error: MESSAGES.ERROR.UPLOAD_FAILED,
        };
      }

      const shareLink = `${PASTE_API_URL}${pasteId}`;
      loggerApi.info("Paste uploaded successfully", {
        pasteId,
        partial: isPartial,
      });

      return {
        success: true,
        link: shareLink,
        id: pasteId,
        statusCode: response.status,
        partialUpload: isPartial,
      };
    }

    if (response.status === 429) {
      loggerApi.warn("Rate limited by paste.rs", {
        statusCode: response.status,
      });
      return {
        success: false,
        error: "Service is rate limited. Please try again later.",
        statusCode: response.status,
      };
    }

    if (response.status >= 500) {
      loggerApi.error("paste.rs server error", { statusCode: response.status });
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        statusCode: response.status,
      };
    }

    loggerApi.error("Unexpected response from paste.rs", {
      statusCode: response.status,
      statusText: response.statusText,
    });

    return {
      success: false,
      error: `${MESSAGES.ERROR.UPLOAD_FAILED} (${response.status})`,
      statusCode: response.status,
    };
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      loggerApi.error("Network error during upload", error);
      return {
        success: false,
        error: MESSAGES.ERROR.NETWORK_ERROR,
      };
    }

    if (error instanceof Error && error.name === "AbortError") {
      loggerApi.error("Upload request timed out", error);
      return {
        success: false,
        error: MESSAGES.ERROR.TIMEOUT,
      };
    }

    loggerApi.error("Unexpected error during upload", error);

    return {
      success: false,
      error: MESSAGES.ERROR.UPLOAD_FAILED,
    };
  }
}

/**
 * Get a paste by ID
 * @param id - The paste ID
 * @param format - Optional format (md, markdown, or code extension)
 * @returns Promise with the paste content
 */
export async function getPaste(id: string, format?: string): Promise<string> {
  try {
    if (!id || !id.trim()) {
      throw new Error("Paste ID is required");
    }

    const url = format
      ? `${PASTE_API_URL}${id}.${format}`
      : `${PASTE_API_URL}${id}`;
    loggerApi.info("Fetching paste", { id, format });

    const response = await fetchWithRetry(url, {
      method: "GET",
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Paste not found");
      }
      throw new Error(`Failed to fetch paste: ${response.statusText}`);
    }

    const content = await response.text();
    loggerApi.info("Paste retrieved successfully", {
      id,
      contentLength: content.length,
    });

    return content;
  } catch (error) {
    loggerApi.error("Error retrieving paste", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Error retrieving paste: ${errorMessage}`);
  }
}
