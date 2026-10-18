import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Middleware to enforce strict mutual exclusivity between direct file upload and image URL.
 * Rejects requests that attempt to pass both simultaneously with a 400 Bad Request error.
 *
 * @param {object} options
 * @param {string|string[]} [options.fileFields=['image', 'file']] - Expected multipart field name(s)
 * @param {string} [options.urlField='imageUrl'] - Expected body property name for URL
 * @param {boolean} [options.isMultiple=false] - Whether multiple files / URLs are accepted
 * @returns {import('express').RequestHandler}
 */
export const validateImageExclusivity = ({
  fileFields = ['image', 'file'],
  urlField = 'imageUrl',
  isMultiple = false,
} = {}) => (req, res, next) => {
  const allowedFileNames = Array.isArray(fileFields) ? fileFields : [fileFields];

  // 1. Detect if any image file was uploaded
  let hasFile = false;
  if (isMultiple) {
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      hasFile = true;
    } else if (req.files && typeof req.files === 'object') {
      hasFile = allowedFileNames.some((f) => Array.isArray(req.files[f]) && req.files[f].length > 0);
    } else if (req.file) {
      hasFile = true;
    }
  } else {
    hasFile = Boolean(req.file);
  }

  // 2. Detect if an image URL was provided in request body
  let hasUrl = false;
  const rawUrlVal = req.body?.[urlField];

  if (isMultiple) {
    if (typeof rawUrlVal === 'string') {
      const trimmed = rawUrlVal.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          hasUrl = Array.isArray(parsed) && parsed.length > 0;
          req.body[urlField] = parsed;
        } catch {
          hasUrl = trimmed.length > 0;
        }
      } else {
        hasUrl = trimmed.length > 0;
      }
    } else if (Array.isArray(rawUrlVal)) {
      hasUrl = rawUrlVal.length > 0;
    } else if (req.body?.url && typeof req.body.url === 'string' && req.body.url.trim().length > 0) {
      hasUrl = true;
    }
  } else {
    if (typeof rawUrlVal === 'string') {
      if (rawUrlVal.trim().length > 0) {
        hasUrl = true;
      } else {
        // Normalize empty string to undefined so downstream Zod schema ignores it
        req.body[urlField] = undefined;
      }
    } else if (rawUrlVal !== undefined && rawUrlVal !== null) {
      hasUrl = true;
    }
  }

  // 3. Enforce mutual exclusivity rule
  if (hasFile && hasUrl) {
    return sendError(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'Conflicting image input: Please provide either an image file upload OR an image URL, not both.',
      error: {
        code: 'IMAGE_INPUT_CONFLICT',
        details: [
          {
            field: allowedFileNames[0] || 'image',
            message: `Cannot accept both a file upload and '${urlField}'. Please select either direct file upload or image URL.`,
          },
        ],
      },
    });
  }

  next();
};

/**
 * Middleware to parse JSON string fields (like `variants`, `images`, `productIds`)
 * when sent through multipart/form-data.
 */
export const parseFormDataJsonFields = (fields = ['variants', 'images', 'productIds', 'permissions']) => (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const field of fields) {
      const val = req.body[field];
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
          try {
            req.body[field] = JSON.parse(trimmed);
          } catch {
            // Keep original string if parsing fails
          }
        }
      }
    }
  }
  next();
};
