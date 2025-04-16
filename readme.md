# REFUGE Restrooms - Full Stack Javascript Rewrite

This is a rewrite of the REFUGE Restrooms application to use full-stack Node/Javascript.  This implementation uses the Meteor.js tech stack and a MongoDB backend, supports API access to the original database, and can hydrate a MongoDB copy of the database.  It supports geospatial $near operators; as well as compiling to both Android and iOS via Cordovoa.  This rewrite was vibe-coded, so caveat emptor and code quality checks are encouraged.  

## Overview

The database hydration feature allows the app to gradually build up its local MongoDB database by fetching data from the production REFUGE Restrooms API. When users search for restrooms, the app will not only display results from the local database but will also fetch and display results from the production API. If hydration is enabled, these production results will be saved to the local database for future use.

## Configuration

### Settings.json

The hydration feature can be configured in the `settings.json` file:

```json
{
  "public": {
    "production": {
      "apiUrl": "https://www.refugerestrooms.org/api/v1",
      "originUrl": "https://www.refugerestrooms.org"
    },
    "useProductionAPI": true
  },
  "private": {
    "enableHydration": true
  }
}
```

- `production.apiUrl`: The base URL for the production API endpoints
- `production.originUrl`: The origin URL of the production website
- `useProductionAPI`: Whether to fetch results from the production API
- `enableHydration`: Whether to save production results to the local database

### Environment Variables

Alternatively, you can configure hydration using environment variables:

- `ENABLE_HYDRATION`: Set to "true" or "false" to enable or disable hydration
- `USE_PRODUCTION_API`: Set to "true" or "false" to enable or disable fetching from production API

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

If you encounter issues with hydration:

1. Check the server logs for hydration-related messages
2. Verify that the production API is accessible
3. Check the hydration status in the admin interface
4. Try running a manual hydration to see if any errors occur
