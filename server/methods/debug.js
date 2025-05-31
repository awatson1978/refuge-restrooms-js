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
  }
});