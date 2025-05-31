// server/methods/debug.js
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { get } from 'lodash';
import { RefugeApiService } from '../../imports/api/production/apiService';
import { FhirHydrationService } from '../../imports/api/fhir/services/hydrationService';

Meteor.methods({
  /**
   * Check overall application configuration
   */
  'debug.checkConfig': function() {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    const config = {
      environment: {
        nodeEnv: process.env.NODE_ENV,
        meteorRelease: Meteor.release,
        isProduction: Meteor.isProduction,
        isServer: Meteor.isServer
      },
      googleMaps: {
        serverApiKey: !!(process.env.GOOGLE_MAPS_API_KEY || get(Meteor, 'settings.private.googleMaps.apiKey')),
        publicApiKey: !!(process.env.GOOGLE_MAPS_PUBLIC_API_KEY || get(Meteor, 'settings.public.googleMaps.publicApiKey')),
        serverKeySource: process.env.GOOGLE_MAPS_API_KEY ? 'env' : get(Meteor, 'settings.private.googleMaps.apiKey') ? 'settings' : 'none',
        publicKeySource: process.env.GOOGLE_MAPS_PUBLIC_API_KEY ? 'env' : get(Meteor, 'settings.public.googleMaps.publicApiKey') ? 'settings' : 'none'
      },
      recaptcha: {
        siteKey: !!get(Meteor, 'settings.public.recaptchaSiteKey'),
        secretKey: !!(process.env.RECAPTCHA_SECRET_KEY || get(Meteor, 'settings.private.recaptchaSecretKey'))
      },
      hydration: {
        enabled: get(Meteor, 'settings.private.enableHydration', false),
        useProductionAPI: get(Meteor, 'settings.public.useProductionAPI', true),
        productionApiUrl: get(Meteor, 'settings.public.production.apiUrl', 'https://www.refugerestrooms.org/api/v1')
      },
      settings: {
        hasPrivate: !!get(Meteor, 'settings.private'),
        hasPublic: !!get(Meteor, 'settings.public'),
        privateKeys: get(Meteor, 'settings.private') ? Object.keys(get(Meteor, 'settings.private')) : [],
        publicKeys: get(Meteor, 'settings.public') ? Object.keys(get(Meteor, 'settings.public')) : []
      }
    };
    
    console.log('=== CONFIGURATION CHECK ===');
    console.log(JSON.stringify(config, null, 2));
    console.log('============================');
    
    return config;
  },
  
  /**
   * Test hydration functionality
   */
  'debug.testHydration': async function(searchQuery = 'Seattle') {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    check(searchQuery, String);
    
    console.log(`=== TESTING HYDRATION WITH QUERY: "${searchQuery}" ===`);
    
    try {
      // Check if hydration is enabled
      const hydrationEnabled = FhirHydrationService.isHydrationEnabled();
      console.log('Hydration enabled:', hydrationEnabled);
      
      if (!hydrationEnabled) {
        return {
          success: false,
          error: 'Hydration is disabled',
          config: {
            hydrationEnabled,
            useProductionAPI: get(Meteor, 'settings.public.useProductionAPI'),
            apiUrl: get(Meteor, 'settings.public.production.apiUrl')
          }
        };
      }
      
      // Test production API access
      console.log('Testing production API access...');
      const apiResults = await RefugeApiService.searchRestrooms(searchQuery, 5);
      console.log(`Production API returned ${apiResults.length} results`);
      
      if (apiResults.length === 0) {
        return {
          success: false,
          error: 'No results from production API',
          details: {
            apiResults: apiResults.length,
            searchQuery
          }
        };
      }
      
      // Test hydration
      console.log('Testing hydration...');
      const hydrationResult = await FhirHydrationService.hydrateBySearch(searchQuery, 5);
      console.log('Hydration result:', hydrationResult);
      
      return {
        success: true,
        details: {
          apiResults: apiResults.length,
          hydrationResult,
          searchQuery
        }
      };
      
    } catch (error) {
      console.error('Hydration test failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        stack: error.stack
      };
    }
  },
  
  /**
   * Test geocoding functionality
   */
  'debug.testGeocoding': async function(address = 'Evansville, IN') {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    check(address, String);
    
    console.log(`=== TESTING GEOCODING WITH ADDRESS: "${address}" ===`);
    
    try {
      const result = await Meteor.callAsync('geocode.address', address);
      console.log('Geocoding result:', result);
      
      return {
        success: true,
        result,
        address
      };
      
    } catch (error) {
      console.error('Geocoding test failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        address
      };
    }
  },
  
  /**
   * Test Google Maps API connectivity directly
   */
  'debug.testDirectGoogleMapsCall': async function() {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    console.log('=== TESTING DIRECT GOOGLE MAPS API CALL ===');
    
    try {
      const result = await Meteor.callAsync('debug.testGoogleMapsConnection');
      console.log('Google Maps connection test result:', result);
      return result;
    } catch (error) {
      console.error('Google Maps connection test failed:', error);
      return {
        success: false,
        error: error.message,
        details: 'Failed to call debug.testGoogleMapsConnection method'
      };
    }
  },
  
  /**
   * Test FHIR location methods
   */
  'debug.testFhirMethods': async function() {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    console.log('=== TESTING FHIR METHODS ===');
    
    const tests = {};
    
    try {
      // Test getAll
      console.log('Testing fhir.locations.getAll...');
      const getAllResult = await Meteor.callAsync('fhir.locations.getAll', {
        limit: 5,
        returnLegacyFormat: true
      });
      tests.getAll = {
        success: true,
        count: get(getAllResult, 'count', 0),
        locationsReturned: get(getAllResult, 'locations.length', 0)
      };
      
    } catch (error) {
      tests.getAll = {
        success: false,
        error: error.message
      };
    }
    
    try {
      // Test text search
      console.log('Testing fhir.locations.searchByText...');
      const searchResult = await Meteor.callAsync('fhir.locations.searchByText', 'coffee', {
        limit: 5,
        returnLegacyFormat: true
      });
      tests.textSearch = {
        success: true,
        resultsReturned: searchResult.length
      };
      
    } catch (error) {
      tests.textSearch = {
        success: false,
        error: error.message
      };
    }
    
    try {
      // Test location search (using Seattle coordinates)
      console.log('Testing fhir.locations.searchByLocation...');
      const locationResult = await Meteor.callAsync('fhir.locations.searchByLocation', 47.6062, -122.3321, {
        limit: 5,
        returnLegacyFormat: true
      });
      tests.locationSearch = {
        success: true,
        resultsReturned: locationResult.length
      };
      
    } catch (error) {
      tests.locationSearch = {
        success: false,
        error: error.message
      };
    }
    
    console.log('FHIR method test results:', tests);
    return tests;
  },

  'debug.testDirectProductionAPI': async function(query = 'Evansville') {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    check(query, String);
    
    console.log(`=== TESTING DIRECT PRODUCTION API CALL: "${query}" ===`);
    
    const baseUrl = get(Meteor, 'settings.public.production.apiUrl', 'https://www.refugerestrooms.org/api/v1');
    const testUrl = `${baseUrl}/restrooms/search?query=${encodeURIComponent(query)}&per_page=5`;
    
    console.log('Testing URL:', testUrl);
    
    try {
      const response = HTTP.get(testUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Meteor/3.0 REFUGE-Restrooms-Debug'
        }
      });
      
      const result = {
        success: true,
        statusCode: get(response, 'statusCode'),
        hasData: !!get(response, 'data'),
        dataType: typeof get(response, 'data'),
        isArray: Array.isArray(get(response, 'data')),
        resultsCount: Array.isArray(get(response, 'data')) ? get(response, 'data').length : 0,
        contentType: get(response, 'headers.content-type'),
        firstResult: Array.isArray(get(response, 'data')) && get(response, 'data').length > 0 
          ? {
              id: get(response, 'data[0].id'),
              name: get(response, 'data[0].name'),
              city: get(response, 'data[0].city'),
              state: get(response, 'data[0].state')
            }
          : null
      };
      
      console.log('Direct production API test result:', result);
      return result;
      
    } catch (error) {
      const errorResult = {
        success: false,
        error: get(error, 'message'),
        errorCode: get(error, 'code'),
        httpStatusCode: get(error, 'response.statusCode'),
        responseContent: get(error, 'response.content', '').substring(0, 500)
      };
      
      console.error('Direct production API test failed:', errorResult);
      return errorResult;
    }
  },

  /**
   * Test HTTP library behavior
   */
  'debug.testHttpLibrary': async function() {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    console.log('=== TESTING HTTP LIBRARY BEHAVIOR ===');
    
    // Test with a simple, reliable endpoint
    const testUrl = 'https://httpbin.org/json';
    console.log('Testing with URL:', testUrl);
    
    try {
      const response = HTTP.get(testUrl, {
        timeout: 10000
      });
      
      const result = {
        success: true,
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : [],
        statusCode: get(response, 'statusCode'),
        hasContent: !!get(response, 'content'),
        hasData: !!get(response, 'data'),
        contentType: get(response, 'headers.content-type'),
        dataKeys: get(response, 'data') ? Object.keys(get(response, 'data')) : []
      };
      
      console.log('HTTP library test result:', result);
      return result;
      
    } catch (error) {
      const errorResult = {
        success: false,
        error: get(error, 'message'),
        errorCode: get(error, 'code'),
        httpStatusCode: get(error, 'response.statusCode')
      };
      
      console.error('HTTP library test failed:', errorResult);
      return errorResult;
    }
  },

  /**
   * Test Google Maps geocoding with detailed debugging
   */
  'debug.testGeocodingDetailed': async function(address = 'Evansville, IN') {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    check(address, String);
    
    console.log(`=== TESTING GEOCODING DETAILED: "${address}" ===`);
    
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || 
                    get(Meteor, 'settings.private.googleMaps.apiKey');
    
    if (!apiKey) {
      return {
        success: false,
        error: 'No API key configured'
      };
    }
    
    const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    
    console.log('Testing geocoding URL (key hidden):', testUrl.replace(apiKey, 'API_KEY_HIDDEN'));
    
    try {
      console.log('Making HTTP.get call...');
      const response = HTTP.get(testUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Meteor/3.0 REFUGE-Restrooms-Debug'
        }
      });
      
      console.log('HTTP.get completed successfully');
      console.log('Response type:', typeof response);
      console.log('Response keys:', response ? Object.keys(response) : 'null');
      
      const result = {
        success: true,
        httpResponse: {
          type: typeof response,
          keys: response ? Object.keys(response) : [],
          statusCode: get(response, 'statusCode'),
          hasContent: !!get(response, 'content'),
          hasData: !!get(response, 'data'),
          contentType: get(response, 'headers.content-type'),
          contentLength: get(response, 'content', '').length,
          dataType: typeof get(response, 'data')
        },
        geocodingResponse: {
          status: get(response, 'data.status'),
          resultsCount: get(response, 'data.results.length', 0),
          errorMessage: get(response, 'data.error_message'),
          firstResultLocation: get(response, 'data.results[0].geometry.location')
        }
      };
      
      console.log('Detailed geocoding test result:', JSON.stringify(result, null, 2));
      return result;
      
    } catch (error) {
      console.error('Geocoding detailed test failed:', error);
      
      const errorResult = {
        success: false,
        error: get(error, 'message'),
        errorCode: get(error, 'code'),
        httpStatusCode: get(error, 'response.statusCode'),
        hasResponse: !!get(error, 'response'),
        responseContent: get(error, 'response.content', '').substring(0, 500)
      };
      
      console.log('Geocoding error result:', JSON.stringify(errorResult, null, 2));
      return errorResult;
    }
  },

  /**
   * Check why hydration results are being skipped
   */
  'debug.investigateHydrationSkipping': async function(query = 'Evansville') {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    check(query, String);
    
    console.log(`=== INVESTIGATING HYDRATION SKIPPING: "${query}" ===`);
    
    try {
      // First, get results from production API directly
      console.log('Step 1: Fetching from production API...');
      const productionResults = await RefugeApiService.searchRestrooms(query, 10);
      console.log(`Production API returned ${productionResults.length} results`);
      
      if (productionResults.length === 0) {
        return {
          success: false,
          error: 'No results from production API',
          query
        };
      }
      
      // Check if these results already exist in our FHIR database
      console.log('Step 2: Checking existing FHIR locations...');
      const existingChecks = [];
      
      for (const result of productionResults.slice(0, 5)) { // Check first 5
        const legacyId = get(result, 'id');
        
        if (legacyId) {
          const existsCount = await FhirLocations.find({
            'identifier.value': legacyId.toString()
          }).countAsync();
          
          existingChecks.push({
            legacyId,
            name: get(result, 'name'),
            city: get(result, 'city'),
            state: get(result, 'state'),
            exists: existsCount > 0
          });
        }
      }
      
      // Count total FHIR locations
      const totalFhirCount = await FhirLocations.find().countAsync();
      const hydratedCount = await FhirLocations.find({
        'meta.source': 'legacy-api'
      }).countAsync();
      
      const investigation = {
        success: true,
        query,
        productionResultsCount: productionResults.length,
        fhirStats: {
          total: totalFhirCount,
          fromHydration: hydratedCount,
          local: totalFhirCount - hydratedCount
        },
        sampleResults: productionResults.slice(0, 3).map(function(result) {
          return {
            id: get(result, 'id'),
            name: get(result, 'name'),
            city: get(result, 'city'),
            state: get(result, 'state'),
            lat: get(result, 'latitude'),
            lng: get(result, 'longitude')
          };
        }),
        existingChecks,
        allExist: existingChecks.every(function(check) { return check.exists; }),
        hydrationEnabled: FhirHydrationService.isHydrationEnabled()
      };
      
      console.log('Hydration investigation result:', JSON.stringify(investigation, null, 2));
      return investigation;
      
    } catch (error) {
      console.error('Hydration investigation failed:', error);
      return {
        success: false,
        error: error.message,
        query
      };
    }
  },

  /**
   * Clear all hydrated data and retry
   */
  'debug.clearHydratedDataAndRetry': async function(query = 'Evansville') {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    check(query, String);
    
    console.log(`=== CLEARING HYDRATED DATA AND RETRYING: "${query}" ===`);
    
    try {
      // Clear all hydrated locations
      console.log('Step 1: Clearing all hydrated FHIR locations...');
      const removed = await FhirLocations.removeAsync({
        'meta.source': 'legacy-api'
      });
      console.log(`Removed ${removed} hydrated locations`);
      
      // Now try hydration again
      console.log('Step 2: Attempting fresh hydration...');
      const hydrationResult = await FhirHydrationService.hydrateBySearch(query, 10);
      console.log('Fresh hydration result:', hydrationResult);
      
      // Check what we have now
      const totalCount = await FhirLocations.find().countAsync();
      const hydratedCount = await FhirLocations.find({
        'meta.source': 'legacy-api'
      }).countAsync();
      
      return {
        success: true,
        removedCount: removed,
        hydrationResult,
        newStats: {
          total: totalCount,
          hydrated: hydratedCount
        }
      };
      
    } catch (error) {
      console.error('Clear and retry failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Test search after clearing data
   */
  'debug.testSearchAfterClear': async function(query = 'Evansville') {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    check(query, String);
    
    console.log(`=== TESTING SEARCH AFTER CLEAR: "${query}" ===`);
    
    try {
      // Clear and retry first
      const clearResult = await Meteor.callAsync('debug.clearHydratedDataAndRetry', query);
      console.log('Clear result:', clearResult);
      
      // Now test the FHIR search method
      const searchResult = await Meteor.callAsync('fhir.locations.searchByText', query, {
        limit: 10,
        returnLegacyFormat: true
      });
      console.log(`Search returned ${searchResult.length} results`);
      
      return {
        success: true,
        clearResult,
        searchResultCount: searchResult.length,
        sampleResults: searchResult.slice(0, 3).map(function(result) {
          return {
            _id: get(result, '_id'),
            name: get(result, 'name'),
            city: get(result, 'city'),
            state: get(result, 'state'),
            distance: get(result, 'distance')
          };
        })
      };
      
    } catch (error) {
      console.error('Test search after clear failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  'debug.testFixedProductionAPI': async function(query = 'Evansville') {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    check(query, String);
    
    console.log(`=== TESTING FIXED PRODUCTION API: "${query}" ===`);
    
    try {
      // Test the API response structure first
      const testResult = await RefugeApiService.testApiResponse(query);
      console.log('API test result:', testResult);
      
      if (!testResult.success) {
        return testResult;
      }
      
      // Now test the actual search method
      const searchResults = await RefugeApiService.searchRestrooms(query, 10);
      console.log(`Search returned ${searchResults.length} results`);
      
      return {
        success: true,
        testResult,
        searchResults: {
          count: searchResults.length,
          sampleResults: searchResults.slice(0, 3).map(function(result) {
            return {
              id: get(result, 'id'),
              name: get(result, 'name'),
              city: get(result, 'city'),
              state: get(result, 'state'),
              latitude: get(result, 'latitude'),
              longitude: get(result, 'longitude')
            };
          })
        }
      };
      
    } catch (error) {
      console.error('Fixed production API test failed:', error);
      return {
        success: false,
        error: error.message,
        errorType: error.error || 'unknown'
      };
    }
  },

  /**
   * Test location-based search with coordinates
   */
  'debug.testLocationSearch': async function(lat = 37.9715592, lng = -87.5710898) {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    check(lat, Number);
    check(lng, Number);
    
    console.log(`=== TESTING LOCATION SEARCH: ${lat}, ${lng} ===`);
    
    try {
      const results = await RefugeApiService.getRestroomsByLocation(lat, lng, 10);
      console.log(`Location search returned ${results.length} results`);
      
      return {
        success: true,
        coordinates: { lat, lng },
        resultsCount: results.length,
        sampleResults: results.slice(0, 3).map(function(result) {
          return {
            id: get(result, 'id'),
            name: get(result, 'name'),
            city: get(result, 'city'),
            state: get(result, 'state'),
            latitude: get(result, 'latitude'),
            longitude: get(result, 'longitude'),
            accessible: get(result, 'accessible'),
            unisex: get(result, 'unisex')
          };
        })
      };
      
    } catch (error) {
      console.error('Location search test failed:', error);
      return {
        success: false,
        error: error.message,
        coordinates: { lat, lng }
      };
    }
  },

  /**
   * Test different API endpoints
   */
  'debug.testAllEndpoints': async function() {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    console.log('=== TESTING ALL API ENDPOINTS ===');
    
    const results = {};
    
    // Test search endpoint
    try {
      console.log('Testing search endpoint...');
      const searchResults = await RefugeApiService.searchRestrooms('Seattle', 5);
      results.search = {
        success: true,
        count: searchResults.length,
        hasResults: searchResults.length > 0
      };
    } catch (error) {
      results.search = {
        success: false,
        error: error.message
      };
    }
    
    // Test location endpoint
    try {
      console.log('Testing location endpoint...');
      const locationResults = await RefugeApiService.getRestroomsByLocation(47.6062, -122.3321, 5); // Seattle coordinates
      results.location = {
        success: true,
        count: locationResults.length,
        hasResults: locationResults.length > 0
      };
    } catch (error) {
      results.location = {
        success: false,
        error: error.message
      };
    }
    
    // Test filters endpoint
    try {
      console.log('Testing filters endpoint...');
      const filterResults = await RefugeApiService.getRestroomsWithFilters({ ada: true }, 5);
      results.filters = {
        success: true,
        count: filterResults.length,
        hasResults: filterResults.length > 0
      };
    } catch (error) {
      results.filters = {
        success: false,
        error: error.message
      };
    }
    
    // Test date endpoint
    try {
      console.log('Testing date endpoint...');
      const dateResults = await RefugeApiService.getRestroomsByDate(1, 1, 2024, 5);
      results.date = {
        success: true,
        count: dateResults.length,
        hasResults: dateResults.length > 0
      };
    } catch (error) {
      results.date = {
        success: false,
        error: error.message
      };
    }
    
    console.log('All endpoints test results:', results);
    return results;
  },

  /**
   * Simple method to test raw API access
   */
  'debug.testRawApiAccess': async function(endpoint = 'restrooms/search', params = 'query=Seattle&per_page=5') {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    check(endpoint, String);
    check(params, String);
    
    console.log(`=== TESTING RAW API ACCESS: ${endpoint}?${params} ===`);
    
    const baseUrl = get(Meteor, 'settings.public.production.apiUrl', 'https://www.refugerestrooms.org/api/v1');
    const fullUrl = `${baseUrl}/${endpoint}?${params}`;
    
    console.log('Full URL:', fullUrl);
    
    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Meteor/3.0 REFUGE-Restrooms-Raw-Test',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      console.log('Response status:', response.status, response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const text = await response.text();
      console.log('Response text length:', text.length);
      console.log('Response preview:', text.substring(0, 200));
      
      let parsedData;
      try {
        parsedData = JSON.parse(text);
        console.log('Parsed data type:', typeof parsedData);
        console.log('Is array:', Array.isArray(parsedData));
        if (Array.isArray(parsedData)) {
          console.log('Array length:', parsedData.length);
          if (parsedData.length > 0) {
            console.log('First item keys:', Object.keys(parsedData[0]));
          }
        } else if (typeof parsedData === 'object') {
          console.log('Object keys:', Object.keys(parsedData));
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError.message);
        return {
          success: false,
          error: 'Failed to parse JSON response',
          rawResponse: text.substring(0, 1000),
          url: fullUrl
        };
      }
      
      return {
        success: true,
        url: fullUrl,
        response: {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        },
        data: parsedData,
        analysis: {
          dataType: typeof parsedData,
          isArray: Array.isArray(parsedData),
          length: Array.isArray(parsedData) ? parsedData.length : null,
          keys: typeof parsedData === 'object' && !Array.isArray(parsedData) ? Object.keys(parsedData) : null,
          firstItemKeys: Array.isArray(parsedData) && parsedData.length > 0 ? Object.keys(parsedData[0]) : null
        }
      };
      
    } catch (error) {
      console.error('Raw API access error:', error);
      return {
        success: false,
        error: error.message,
        url: fullUrl,
        errorType: error.name
      };
    }
  }
});