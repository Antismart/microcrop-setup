# Error Handling Improvements

## Changes
Updated `dashboard/src/services/auth.service.ts` to include proper error handling in `resetPassword` and `newPassword` methods.

## Details
-   Wrapped API calls in `try/catch` blocks.
-   Added logic to extract error messages from the backend response (`error.response.data.error` or `error.response.data.message`).
-   This ensures that when the frontend component catches the error, `err.message` contains the actual reason for failure (e.g., "Email not found") rather than a generic "Request failed" message.

## Impact
-   **Forgot Password Page**: Users will now see specific error messages if their request fails.
-   **New Password Page**: (Future implementation) Will also benefit from consistent error reporting.
