# Settings Page Functionality Update

## Status
The Settings page (`/dashboard/settings`) is now functional for core user operations.

## Changes
1.  **Backend Service Updates**:
    *   Updated `dashboard/src/services/auth.service.ts` to include `updateProfile` and `changePassword` methods.
    *   These methods connect to the backend API endpoints (`PUT /auth/profile` and `POST /auth/change-password`).

2.  **Frontend Integration**:
    *   Updated `dashboard/app/dashboard/settings/page.tsx` to use the real `authService` methods instead of `setTimeout` simulations.
    *   **Profile Settings**: Now sends updated First Name, Last Name, Email, and Phone to the backend.
    *   **Security Settings**: Now sends Current Password and New Password to the backend for validation and update.

## Remaining Mock Functionality
-   **Notifications**: Still uses simulated delays. Requires a backend endpoint for user preferences.
-   **Appearance**: Still uses simulated delays. These are often local-only or require a preferences endpoint.

## Verification
-   Users can now actually update their profile details.
-   Users can now securely change their password.
-   Error handling is in place to show backend validation messages (e.g., "Incorrect current password").
