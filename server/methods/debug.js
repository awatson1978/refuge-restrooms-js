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



  'debug.testEvansvilleHydration': async function() {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    console.log('=== TESTING EVANSVILLE HYDRATION ===');
    
    try {
      // Check current hydration status
      const hydrationEnabled = FhirHydrationService.isHydrationEnabled();
      console.log('Hydration enabled:', hydrationEnabled);
      
      if (!hydrationEnabled) {
        return {
          success: false,
          error: 'Hydration is disabled',
          instructions: 'Set ENABLE_HYDRATION=1 environment variable and restart'
        };
      }
      
      // Test with Evansville coordinates (37.9715592, -87.5710898)
      const lat = 37.9715592;
      const lng = -87.5710898;
      
      console.log(`Testing hydration by location: ${lat}, ${lng}`);
      
      // Clear any existing Evansville data first
      const removed = await FhirLocations.removeAsync({
        'address.city': { $regex: 'Evansville', $options: 'i' },
        'meta.source': 'legacy-api'
      });
      console.log(`Cleared ${removed} existing Evansville FHIR locations`);
      
      // Try hydration by location
      const locationHydration = await FhirHydrationService.hydrateByLocation(lat, lng, 20);
      console.log('Location hydration result:', locationHydration);
      
      // Try hydration by search
      const searchHydration = await FhirHydrationService.hydrateBySearch('Evansville', 20);
      console.log('Search hydration result:', searchHydration);
      
      // Check what we have now
      const evansvilleCount = await FhirLocations.find({
        'address.city': { $regex: 'Evansville', $options: 'i' }
      }).countAsync();
      
      const totalCount = await FhirLocations.find().countAsync();
      
      return {
        success: true,
        coordinates: { lat, lng },
        locationHydration,
        searchHydration,
        evansvilleLocationsFound: evansvilleCount,
        totalLocations: totalCount,
        message: evansvilleCount > 0 
          ? `Successfully hydrated ${evansvilleCount} Evansville locations!`
          : 'No Evansville locations found via hydration'
      };
      
    } catch (error) {
      console.error('Evansville hydration test failed:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  },
  
  /**
   * Force enable hydration and test
   */
  'debug.forceEnableHydrationAndTest': async function() {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    console.log('=== FORCING HYDRATION ENABLE AND TESTING ===');
    
    try {
      // Force enable hydration
      if (!Meteor.settings) {
        Meteor.settings = {};
      }
      if (!Meteor.settings.private) {
        Meteor.settings.private = {};
      }
      
      set(Meteor.settings, 'private.enableHydration', true);
      console.log('Forced hydration to enabled');
      
      // Verify it's enabled
      const isEnabled = FhirHydrationService.isHydrationEnabled();
      console.log('Hydration now enabled:', isEnabled);
      
      if (!isEnabled) {
        return {
          success: false,
          error: 'Failed to enable hydration',
          settings: {
            private: get(Meteor, 'settings.private'),
            enableHydration: get(Meteor, 'settings.private.enableHydration')
          }
        };
      }
      
      // Now test with a simple search
      const testResult = await RefugeApiService.searchRestrooms('Evansville', 10);
      console.log(`Production API returned ${testResult.length} results for Evansville`);
      
      if (testResult.length === 0) {
        return {
          success: false,
          error: 'No results from production API for Evansville',
          hydrationEnabled: true
        };
      }
      
      // Try hydration
      const hydrationResult = await FhirHydrationService.hydrateBySearch('Evansville', 10);
      console.log('Hydration result:', hydrationResult);
      
      return {
        success: true,
        hydrationEnabled: true,
        productionApiResults: testResult.length,
        hydrationResult,
        message: `Hydration enabled and tested with ${testResult.length} Evansville results`
      };
      
    } catch (error) {
      console.error('Force enable hydration test failed:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  },
  
  /**
   * Test production API directly with different endpoints
   */
  'debug.testProductionApiEndpoints': async function() {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    console.log('=== TESTING PRODUCTION API ENDPOINTS ===');
    
    const results = {};
    
    // Test search endpoint with Evansville
    try {
      console.log('Testing search for Evansville...');
      const searchResults = await RefugeApiService.searchRestrooms('Evansville', 10);
      results.searchEvansville = {
        success: true,
        count: searchResults.length,
        sampleResult: searchResults.length > 0 ? {
          id: get(searchResults[0], 'id'),
          name: get(searchResults[0], 'name'),
          city: get(searchResults[0], 'city'),
          state: get(searchResults[0], 'state')
        } : null
      };
    } catch (error) {
      results.searchEvansville = {
        success: false,
        error: error.message
      };
    }
    
    // Test location endpoint with Evansville coordinates
    try {
      console.log('Testing location search for Evansville coordinates...');
      const locationResults = await RefugeApiService.getRestroomsByLocation(37.9715592, -87.5710898, 10);
      results.locationEvansville = {
        success: true,
        count: locationResults.length,
        sampleResult: locationResults.length > 0 ? {
          id: get(locationResults[0], 'id'),
          name: get(locationResults[0], 'name'),
          city: get(locationResults[0], 'city'),
          state: get(locationResults[0], 'state')
        } : null
      };
    } catch (error) {
      results.locationEvansville = {
        success: false,
        error: error.message
      };
    }
    
    // Test search endpoint with Indianapolis (larger city)
    try {
      console.log('Testing search for Indianapolis...');
      const indyResults = await RefugeApiService.searchRestrooms('Indianapolis', 10);
      results.searchIndianapolis = {
        success: true,
        count: indyResults.length,
        sampleResult: indyResults.length > 0 ? {
          id: get(indyResults[0], 'id'),
          name: get(indyResults[0], 'name'),
          city: get(indyResults[0], 'city'),
          state: get(indyResults[0], 'state')
        } : null
      };
    } catch (error) {
      results.searchIndianapolis = {
        success: false,
        error: error.message
      };
    }
    
    console.log('Production API endpoint test results:', results);
    return results;
  },
  
  /**
   * Complete configuration check
   */
  'debug.checkCompleteConfig': function() {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    const config = {
      environment: {
        nodeEnv: process.env.NODE_ENV,
        meteorRelease: Meteor.release,
        isProduction: Meteor.isProduction
      },
      environmentVariables: {
        ENABLE_HYDRATION: process.env.ENABLE_HYDRATION,
        GOOGLE_MAPS_API_KEY: !!process.env.GOOGLE_MAPS_API_KEY,
        GOOGLE_MAPS_PUBLIC_API_KEY: !!process.env.GOOGLE_MAPS_PUBLIC_API_KEY,
        RECAPTCHA_SECRET_KEY: !!process.env.RECAPTCHA_SECRET_KEY,
        USE_PRODUCTION_API: process.env.USE_PRODUCTION_API
      },
      settings: {
        hasSettings: !!Meteor.settings,
        hasPrivate: !!get(Meteor, 'settings.private'),
        hasPublic: !!get(Meteor, 'settings.public'),
        enableHydration: get(Meteor, 'settings.private.enableHydration'),
        useProductionAPI: get(Meteor, 'settings.public.useProductionAPI'),
        productionApiUrl: get(Meteor, 'settings.public.production.apiUrl')
      },
      hydration: {
        enabled: FhirHydrationService.isHydrationEnabled(),
        canAccessProductionApi: !!get(Meteor, 'settings.public.useProductionAPI')
      },
      googleMaps: {
        serverApiKey: !!(process.env.GOOGLE_MAPS_API_KEY || get(Meteor, 'settings.private.googleMaps.apiKey')),
        publicApiKey: !!(process.env.GOOGLE_MAPS_PUBLIC_API_KEY || get(Meteor, 'settings.public.googleMaps.publicApiKey'))
      }
    };
    
    console.log('=== COMPLETE CONFIGURATION CHECK ===');
    console.log(JSON.stringify(config, null, 2));
    console.log('=====================================');
    
    return config;
  },
  
  /**
   * Run complete diagnostic suite
   */
  'debug.runCompleteDiagnostic': async function() {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    console.log('=== RUNNING COMPLETE DIAGNOSTIC SUITE ===');
    
    const diagnostic = {
      timestamp: new Date(),
      tests: {}
    };
    
    // Test 1: Configuration check
    try {
      diagnostic.tests.configuration = await Meteor.callAsync('debug.checkCompleteConfig');
    } catch (error) {
      diagnostic.tests.configuration = { success: false, error: error.message };
    }
    
    // Test 2: Force enable hydration
    try {
      diagnostic.tests.forceHydration = await Meteor.callAsync('debug.forceEnableHydrationAndTest');
    } catch (error) {
      diagnostic.tests.forceHydration = { success: false, error: error.message };
    }
    
    // Test 3: Test production API endpoints
    try {
      diagnostic.tests.productionApiEndpoints = await Meteor.callAsync('debug.testProductionApiEndpoints');
    } catch (error) {
      diagnostic.tests.productionApiEndpoints = { success: false, error: error.message };
    }
    
    // Test 4: Test geocoding
    try {
      const geocodingResult = await Meteor.callAsync('geocode.address', 'Evansville, IN');
      diagnostic.tests.geocoding = {
        success: true,
        result: geocodingResult
      };
    } catch (error) {
      diagnostic.tests.geocoding = { success: false, error: error.message };
    }
    
    // Test 5: Test Evansville hydration
    try {
      diagnostic.tests.evansvilleHydration = await Meteor.callAsync('debug.testEvansvilleHydration');
    } catch (error) {
      diagnostic.tests.evansvilleHydration = { success: false, error: error.message };
    }
    
    console.log('=== DIAGNOSTIC COMPLETE ===');
    console.log('Summary:');
    Object.keys(diagnostic.tests).forEach(function(testName) {
      const test = diagnostic.tests[testName];
      const status = test.success ? 'PASS' : 'FAIL';
      console.log(`  ${testName}: ${status}`);
      if (!test.success) {
        console.log(`    Error: ${test.error}`);
      }
    });
    
    return diagnostic;
  }


});