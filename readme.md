# REFUGE Restrooms - Full Stack Javascript Rewrite

This is a rewrite of the [REFUGE Restrooms](https://github.com/RefugeRestrooms/refugerestrooms) application to use full-stack Node/Javascript.  This implementation uses the Meteor.js tech stack and a MongoDB backend, supports API access to the original database, and can hydrate a MongoDB copy of the database.  It supports geospatial $near operators; as well as compiling to both Android and iOS via Cordova.  This rewrite was vibe-coded, so caveat emptor and code quality checks are encouraged.  

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [Meteor.js](https://www.meteor.com/developers/install) (v3.0 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (v4.4 or higher)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/refuge-restrooms-meteor.git
   cd refuge-restrooms-meteor
   ```

2. **Install Meteor (if not already installed):**
   ```bash
   curl https://install.meteor.com/ | sh
   ```

3. **Install dependencies:**
   ```bash
   meteor npm install
   ```

4. **Set up configuration:**
   
   Copy the example settings file:
   ```bash
   cp configs/settings.json settings.json
   ```
   
   Edit `settings.json` with your API keys and configuration (see Configuration section below).

5. **Set up environment variables** (optional, alternative to settings.json):
   ```bash
   export GOOGLE_MAPS_API_KEY="your_server_side_api_key"
   export GOOGLE_MAPS_PUBLIC_API_KEY="your_client_side_api_key"
   export RECAPTCHA_SECRET_KEY="your_recaptcha_secret"
   export ENABLE_HYDRATION="true"
   ```

### Running the Application

1. **Development mode:**
   ```bash
   meteor run --settings settings.json
   ```
   
   The app will be available at `http://localhost:3000`

2. **With Google Maps:**
   ```bash
   meteor run --production --settings settings.json
   ```

3. **Production mode:**
   ```bash
   meteor run --production --settings settings.json
   ```


4. **With custom MongoDB:**
   ```bash
   MONGO_URL="mongodb://localhost:27017/refuge" meteor run --settings settings.json
   ```

### Initial Setup

1. **Create test data** (development only):
   - Navigate to `http://localhost:3000/restrooms`
   - Click the "Add Test Data" button in the debug panel
   - This will create 20 sample restrooms for testing

2. **Set up admin user:**
   - Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables before first run
   - Or create an admin user manually in the MongoDB users collection

3. **Access admin panel:**
   - Navigate to `http://localhost:3000/admin`
   - Configure hydration settings and manage the application

### Testing the Maps

1. **Test map functionality:**
   - Navigate to `http://localhost:3000/map-test`
   - This page tests basic Google Maps integration
   - If you see errors, check your API key configuration

### Building for Production

1. **Build the application:**
   ```bash
   meteor build ../output --settings settings.json
   ```

2. **Deploy to Meteor Galaxy:**
   ```bash
   meteor deploy your-app-name.meteorapp.com --settings settings.json
   ```

### Mobile Development

1. **Add mobile platforms:**
   ```bash
   meteor add-platform ios
   meteor add-platform android
   ```

2. **Run on device:**
   ```bash
   meteor run ios --settings settings.json
   meteor run android --settings settings.json
   ```

## Overview

The database hydration feature allows the app to gradually build up its local MongoDB database by fetching data from the production REFUGE Restrooms API. When users search for restrooms, the app will not only display results from the local database but will also fetch and display results from the production API. If hydration is enabled, these production results will be saved to the local database for future use.

## Configuration

### Settings.json

The application can be configured using the `settings.json` file:

```json
{
  "public": {
    "recaptchaSiteKey": "YOUR_RECAPTCHA_SITE_KEY",
    "googleMaps": {
      "publicApiKey": "YOUR_GOOGLE_MAPS_PUBLIC_API_KEY"
    },
    "contactEmail": "refugerestrooms@gmail.com",
    "production": {
      "apiUrl": "https://www.refugerestrooms.org/api/v1",
      "originUrl": "https://www.refugerestrooms.org"
    },
    "useProductionAPI": true
  },
  "private": {
    "recaptchaSecretKey": "YOUR_RECAPTCHA_SECRET_KEY",
    "googleMaps": {
      "apiKey": "YOUR_GOOGLE_MAPS_SERVER_API_KEY"
    },
    "email": {
      "smtp": "smtps://username:password@smtp.example.com:465",
      "from": "noreply@refugerestrooms.org",
      "adminEmail": "admin@refugerestrooms.org"
    },
    "adminUsers": [
      "admin@refugerestrooms.org"
    ],
    "enableHydration": true
  }
}
```

**Key Configuration Options:**

- `public.googleMaps.publicApiKey`: Client-side Google Maps API key for map display
- `private.googleMaps.apiKey`: Server-side Google Maps API key for geocoding
- `public.recaptchaSiteKey` / `private.recaptchaSecretKey`: reCAPTCHA keys for form protection
- `production.apiUrl`: The base URL for the production API endpoints
- `production.originUrl`: The origin URL of the production website
- `useProductionAPI`: Whether to fetch results from the production API
- `enableHydration`: Whether to save production results to the local database

### Environment Variables

You can configure the application using environment variables:

**Hydration Settings:**
- `ENABLE_HYDRATION`: Set to "true" or "false" to enable or disable hydration
- `USE_PRODUCTION_API`: Set to "true" or "false" to enable or disable fetching from production API

**Google Maps Integration:**
- `GOOGLE_MAPS_API_KEY`: Server-side Google Maps API key for geocoding operations
- `GOOGLE_MAPS_PUBLIC_API_KEY`: Client-side Google Maps API key for map display (should have restricted permissions)

**Security:**
- `RECAPTCHA_SECRET_KEY`: reCAPTCHA secret key for form validation
- `ADMIN_EMAIL`: Email address for the initial admin user
- `ADMIN_PASSWORD`: Password for the initial admin user

**Email Configuration:**
- `MAIL_URL`: SMTP URL for sending emails (format: `smtps://username:password@smtp.example.com:465`)

## Google Maps Setup

The application uses Google Maps for displaying restroom locations and geocoding addresses. You'll need two API keys:

1. **Server-side API Key** (`GOOGLE_MAPS_API_KEY` or `settings.private.googleMaps.apiKey`):
   - Used for geocoding operations (converting addresses to coordinates)
   - Should have the Geocoding API enabled
   - Can be restricted to your server's IP addresses

2. **Client-side API Key** (`GOOGLE_MAPS_PUBLIC_API_KEY` or `settings.public.googleMaps.publicApiKey`):
   - Used for displaying maps in the browser
   - Should have the Maps JavaScript API enabled
   - Should be restricted to your domain(s) for security

**Setting up Google Maps API keys:**

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API (for client-side maps)
   - Geocoding API (for server-side address conversion)
4. Create two API keys:
   - One restricted to your server IP for geocoding
   - One restricted to your domain(s) for map display
5. Add the keys to your environment variables or `settings.json`

**Security Note:** Always restrict your API keys to prevent unauthorized usage and unexpected charges.

## Admin Interface

The app includes an admin interface for managing hydration settings at `/admin`. From here, you can:

1. Enable or disable hydration
2. Run manual hydration using different methods:
   - By location (latitude/longitude)
   - By search query
   - With filters (ADA accessible, unisex)
   - By date (day/month/year)
3. View hydration results and statistics

## Hydration Process

When hydration is enabled, the app will:

1. Save results from production API searches to the local database
2. Check for duplicates before saving (based on the production ID)
3. Transform the data to match the local schema

## Implementation Details

The hydration feature is implemented using the following files:

- `imports/api/production/apiService.js`: Service for interacting with the production API
- `imports/api/hydration/hydrationService.js`: Service for handling database hydration
- `server/methods/restrooms.js`: Modified Meteor methods that incorporate hydration
- `server/startup/hydration.js`: Server startup code for initializing hydration settings
- `imports/ui/components/admin/HydrationAdmin.jsx`: Admin interface component

## API Endpoints Used

The hydration feature uses the following production API endpoints:

- `GET /api/v1/restrooms/by_location?lat=&lng=&per_page=`: Search by location
- `GET /api/v1/restrooms/search?query=&per_page=`: Search by query
- `GET /api/v1/restrooms?ada=&unisex=&per_page=`: Search with filters
- `GET /api/v1/restrooms/by_date?day=&month=&year=&per_page=`: Search by date

## Disabling for Production

As the local database grows, you may want to disable hydration. You can do this by:

1. Setting `enableHydration: false` in `settings.json`
2. Setting `ENABLE_HYDRATION=false` as an environment variable
3. Using the admin interface to toggle hydration off

## Example Usage

Here's an example of how hydration works in practice:

1. User searches for restrooms in Seattle
2. App displays results from the local database
3. App fetches results from the production API and displays them
4. If hydration is enabled, new results from the production API are saved to the local database
5. Next time someone searches for restrooms in Seattle, more results will be available in the local database

## Troubleshooting

### Common Issues

**Maps not loading:**
- Verify your `GOOGLE_MAPS_PUBLIC_API_KEY` is set correctly
- Check that the Maps JavaScript API is enabled in Google Cloud Console
- Ensure your API key is not restricted to exclude your domain

**Geocoding errors:**
- Verify your `GOOGLE_MAPS_API_KEY` (server-side) is set correctly
- Check that the Geocoding API is enabled in Google Cloud Console
- Ensure your server IP is not blocked by API key restrictions

**Database connection issues:**
- Make sure MongoDB is running: `sudo systemctl start mongod`
- Check the `MONGO_URL` environment variable
- Verify MongoDB is accessible on the specified port (default: 27017)

**Hydration not working:**
- Check that `enableHydration` is set to `true` in settings
- Verify the production API is accessible
- Check server logs for hydration-related error messages

**Build errors:**
- Clear Meteor's cache: `meteor reset`
- Reinstall dependencies: `rm -rf node_modules && meteor npm install`
- Update Meteor: `meteor update`

### Development Tips

1. **Enable debug mode:**
   ```bash
   DEBUG=1 meteor run --settings settings.json
   ```

2. **Reset the database:**
   ```bash
   meteor reset
   ```

3. **View MongoDB data:**
   ```bash
   meteor mongo
   > db.restrooms.find().pretty()
   ```

4. **Check server logs:**
   - Server logs appear in the terminal where you ran `meteor run`
   - Look for hydration messages and API errors

If you encounter issues with hydration:

1. Check the server logs for hydration-related messages
2. Verify that the production API is accessible
3. Check the hydration status in the admin interface
4. Try running a manual hydration to see if any errors occur