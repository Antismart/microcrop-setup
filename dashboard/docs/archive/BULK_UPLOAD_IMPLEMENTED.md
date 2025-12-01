# Bulk Upload Implementation Summary

## Work Completed
1.  **Updated Imports**: Added `useBulkUploadFarmers` to the imports from `@/hooks/use-data` and `Loader2` from `lucide-react`.
2.  **Initialized Hook**: Added `const bulkUploadMutation = useBulkUploadFarmers()` to the component.
3.  **Implemented Handler**: Updated `handleUploadSubmit` to call `bulkUploadMutation.mutateAsync(selectedFile)`.
4.  **Updated UI**: Modified the "Upload" button in the dialog to:
    *   Show a loading spinner (`Loader2`) and "Uploading..." text when `isPending`.
    *   Disable the button while uploading or if no file is selected.

## Verification
-   The "Bulk Upload" dialog now functions correctly.
-   Selecting a file and clicking "Upload" triggers the backend API call via the hook.
-   Success/Error notifications are handled automatically by the `useBulkUploadFarmers` hook (as defined in `use-data.ts`).
-   The farmers list will automatically refresh upon successful upload due to `queryClient.invalidateQueries`.
