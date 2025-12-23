# Google Drive Upload Setup

This document explains how to set up Google Drive integration for the data contribution feature.

## Prerequisites

1. A Google Cloud Project with the Google Drive API enabled
2. A service account with Drive API access
3. A Google Drive folder where contributions will be stored

## Setup Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### 2. Create a Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details and click "Create"
4. Grant the service account the "Editor" role (or create a custom role with Drive API permissions)
5. Click "Done"

### 3. Create and Download Service Account Key

1. Click on the service account you just created
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" format
5. Download the key file
6. Save it as `service-account-key.json` in the project root (or update the path in `server.js`)

### 4. Share Google Drive Folder with Service Account

1. Open Google Drive and navigate to the folder where you want to store contributions
2. Right-click the folder and select "Share"
3. Get the email address of your service account (found in the JSON key file under `client_email`)
4. Add the service account email as a user with "Editor" permissions
5. Copy the folder ID from the URL (the long string after `/folders/`)

### 5. Configure Environment Variables

Create or update your `.env` file with:

```
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=service-account-key.json
```

Or if you prefer to use a different path for the key file:

```
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=/path/to/your/service-account-key.json
```

### 6. Install Dependencies

Run:
```bash
npm install
```

This will install the required packages including `googleapis` and `multer`.

### 7. Start the Server

Make sure the server is running:
```bash
npm start
```

The server should start on port 3000 (or the port specified in the PORT environment variable).

## Testing

1. Navigate to the contribute data page: `http://localhost:4000/contribute-data/`
2. Select some files to upload
3. Click "Submit"
4. Check your Google Drive folder - a new timestamped folder should be created with the uploaded files

## Troubleshooting

### "Google Drive folder ID not configured"
- Make sure `GOOGLE_DRIVE_FOLDER_ID` is set in your `.env` file

### "Google Drive API not initialized"
- Make sure `service-account-key.json` exists and is in the correct location
- Verify the service account has been granted access to the Google Drive folder

### "Permission denied" errors
- Ensure the service account email has been added as an editor to the Google Drive folder
- Check that the service account has the necessary permissions in Google Cloud Console

### Files not uploading
- Check server logs for detailed error messages
- Verify the Google Drive API is enabled in your Google Cloud project
- Ensure the service account key file is valid JSON

## Security Notes

- Never commit `service-account-key.json` to version control
- The `.gitignore` file has been updated to exclude service account keys
- Keep your `.env` file secure and never commit it
- Consider using environment variables in your production deployment instead of a key file

