# Login Page Update Summary

## Changes
Updated `dashboard/app/auth/login/page.tsx` to remove the default "Gray, Cooperative & Admin Access" branding.

## Details
-   **Default Branding**: Changed the default branding (used when no subdomain is present, e.g., `localhost:3000`) to match the **Portal** branding (Purple, "MicroCrop Portal").
-   **UI Updates**: Removed the conditional logic that checked for `subdomain === 'portal'` or fell back to gray. Now, if it's not `network`, it defaults to the Portal style (Purple).
-   **Farmer Message**: The message "Farmers should use the mobile app" is no longer displayed on the default login screen.

## Impact
-   Visiting `localhost:3000/auth/login` will now show the "MicroCrop Portal" login screen (Purple) instead of the generic gray screen.
-   `network.localhost:3000` remains unchanged (Blue).
