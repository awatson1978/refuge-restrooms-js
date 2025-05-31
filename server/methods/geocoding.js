// server/methods/geocoding.js
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { HTTP } from 'meteor/http';
import { get } from 'lodash';

// Simple rate limiting using a Map to track requests
const rateLimitMap = new Map();

function checkRateLimit(clientId, method, maxRequests = 5, timeWindow = 60000) {
  const now = Date.now();
  const key = `${clientId}:${method}`;
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + timeWindow });
    return { allowed: true };
  }
  
  const record = rateLimitMap.get(key);
  
  if (now > record.resetTime) {
    // Reset the counter
    rateLimitMap.set(key, { count: 1, resetTime: now + timeWindow });
    return { allowed: true };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false };
  }
  
  record.count++;
  return { allowed: true };
}

Meteor.methods({
  /**
   * Server-side geocoding with Google Maps API
   */
  'geocode.address': function(address) {
    check(address, String);
    
    if (!address) return null;
    
    // Apply rate limiting
    const clientId = this.userId || this.connection.clientAddress || 'anonymous';
    const rateLimitCheck = checkRateLimit(clientId, 'geocode.address');
    if (!rateLimitCheck.allowed) {
      throw new Meteor.Error('rate-limit-exceeded', 'Too many geocoding requests');
    }
    
    // Get API key from environment variable or settings
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || 
                    get(Meteor, 'settings.private.googleMaps.apiKey');
    
    if (!apiKey) {
      console.error('Google Maps API key is not configured');
      throw new Meteor.Error('missing-api-key', 'Google Maps API key is not configured');
    }
    
    console.log(`Geocoding address: "${address}" with API key: ${apiKey ? 'present' : 'missing'}`);
    
    // Build the URL manually for debugging
    const baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
    const params = new URLSearchParams({
      address: address,
      key: apiKey
    });
    const fullUrl = `${baseUrl}?${params.toString()}`;
    
    console.log(`Full geocoding URL: ${fullUrl.replace(apiKey, 'API_KEY_HIDDEN')}`);
    
    let response;
    try {
      // First, try a simple test to see if we can reach Google at all
      console.log('Testing connectivity to Google Maps API...');
      
      response = HTTP.call('GET', fullUrl, {
        timeout: 15000, // 15 second timeout
        headers: {
          'User-Agent': 'Meteor/3.0 REFUGE-Restrooms-App'
        }
      });
      
      console.log('Raw HTTP response object structure:', {
        hasResponse: !!response,
        responseKeys: response ? Object.keys(response) : [],
        statusCode: get(response, 'statusCode'),
        hasContent: !!get(response, 'content'),
        hasData: !!get(response, 'data'),
        contentType: get(response, 'headers.content-type')
      });
      
    } catch (error) {
      console.error('HTTP request to Google Maps API failed:', {
        errorMessage: get(error, 'message'),
        errorCode: get(error, 'code'),
        errorStack: get(error, 'stack'),
        isHttpError: !!get(error, 'response'),
        httpStatusCode: get(error, 'response.statusCode'),
        httpContent: get(error, 'response.content', '').substring(0, 500)
      });
      
      // Handle specific error types
      if (get(error, 'code') === 'ETIMEDOUT' || get(error, 'code') === 'ENOTFOUND') {
        throw new Meteor.Error('network-error', 'Unable to connect to Google Maps API. Check your internet connection.');
      } else if (get(error, 'code') === 'ECONNREFUSED') {
        throw new Meteor.Error('connection-refused', 'Connection to Google Maps API was refused');
      } else if (get(error, 'response.statusCode') === 403) {
        throw new Meteor.Error('api-key-invalid', 'Google Maps API key is invalid or has insufficient permissions');
      } else if (get(error, 'response.statusCode') === 429) {
        throw new Meteor.Error('quota-exceeded', 'Google Maps API quota exceeded');
      } else {
        throw new Meteor.Error('http-error', `HTTP request failed: ${get(error, 'message', 'Unknown error')}`);
      }
    }
    
    // Check if we got a valid HTTP response
    if (!response) {
      console.error('No response object returned from HTTP.call');
      throw new Meteor.Error('no-response', 'No response from geocoding service');
    }
    
    const statusCode = get(response, 'statusCode');
    if (statusCode !== 200) {
      const content = get(response, 'content', '');
      console.error(`HTTP ${statusCode} response from Google Maps API:`, content.substring(0, 500));
      throw new Meteor.Error('http-error', `Geocoding service returned HTTP ${statusCode}`);
    }
    
    // Parse the response data
    let responseData;
    const contentType = get(response, 'headers.content-type', '');
    
    if (contentType.includes('application/json')) {
      try {
        responseData = get(response, 'data');
        
        // If data is not parsed, try parsing content manually
        if (!responseData) {
          const content = get(response, 'content', '');
          if (content) {
            responseData = JSON.parse(content);
          }
        }
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        const content = get(response, 'content', '');
        console.error('Raw content:', content.substring(0, 500));
        throw new Meteor.Error('parse-error', 'Could not parse response from geocoding service');
      }
    } else {
      console.error('Unexpected content type:', contentType);
      const content = get(response, 'content', '');
      console.error('Raw content:', content.substring(0, 500));
      throw new Meteor.Error('unexpected-response', 'Unexpected response format from geocoding service');
    }
    
    if (!responseData) {
      console.error('No data in response after parsing');
      throw new Meteor.Error('no-data', 'No data in geocoding response');
    }
    
    console.log('Parsed geocoding response:', {
      status: get(responseData, 'status'),
      resultsCount: get(responseData, 'results.length', 0),
      errorMessage: get(responseData, 'error_message')
    });
    
    const status = get(responseData, 'status');
    const results = get(responseData, 'results', []);
    const errorMessage = get(responseData, 'error_message');
    
    if (status === 'OK' && results.length > 0) {
      const location = get(results, '[0].geometry.location');
      const lat = get(location, 'lat');
      const lng = get(location, 'lng');
      
      if (lat && lng) {
        console.log(`Successfully geocoded "${address}" to ${lat}, ${lng}`);
        return {
          latitude: lat,
          longitude: lng
        };
      } else {
        console.error('No coordinates in geocoding result:', location);
        return null;
      }
    } else if (status === 'ZERO_RESULTS') {
      console.log(`No results found for address: "${address}"`);
      return null;
    } else if (status === 'OVER_QUERY_LIMIT') {
      console.error('Google Maps API quota exceeded');
      throw new Meteor.Error('quota-exceeded', 'Geocoding quota exceeded');
    } else if (status === 'REQUEST_DENIED') {
      console.error('Google Maps API request denied:', errorMessage || 'No error message');
      throw new Meteor.Error('request-denied', `Geocoding request denied: ${errorMessage || 'Check API key permissions'}`);
    } else if (status === 'INVALID_REQUEST') {
      console.error('Invalid geocoding request:', errorMessage || 'No error message');
      throw new Meteor.Error('invalid-request', `Invalid geocoding request: ${errorMessage || 'Unknown reason'}`);
    } else {
      console.error('Geocoding failed with status:', status, 'Error:', errorMessage);
      throw new Meteor.Error('geocoding-failed', `Geocoding failed: ${status} - ${errorMessage || 'Unknown error'}`);
    }
  },
  
  /**
   * Test Google Maps API connectivity and key validity
   */
  'debug.testGoogleMapsConnection': function() {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || 
                    get(Meteor, 'settings.private.googleMaps.apiKey');
    
    if (!apiKey) {
      return {
        success: false,
        error: 'No API key configured',
        details: {
          envKeyPresent: !!process.env.GOOGLE_MAPS_API_KEY,
          settingsKeyPresent: !!get(Meteor, 'settings.private.googleMaps.apiKey'),
          hasPrivateSettings: !!get(Meteor, 'settings.private')
        }
      };
    }
    
    console.log('Testing Google Maps API connection...');
    
    try {
      // Test with a simple, known location
      const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Seattle,WA&key=${apiKey}`;
      
      const response = HTTP.call('GET', testUrl, {
        timeout: 10000
      });
      
      const result = {
        success: true,
        statusCode: get(response, 'statusCode'),
        hasData: !!get(response, 'data'),
        contentType: get(response, 'headers.content-type'),
        apiStatus: get(response, 'data.status'),
        resultsCount: get(response, 'data.results.length', 0),
        errorMessage: get(response, 'data.error_message')
      };
      
      console.log('Google Maps API test result:', result);
      return result;
      
    } catch (error) {
      const errorResult = {
        success: false,
        error: get(error, 'message'),
        errorCode: get(error, 'code'),
        httpStatusCode: get(error, 'response.statusCode'),
        details: {
          isNetworkError: ['ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].includes(get(error, 'code')),
          responseContent: get(error, 'response.content', '').substring(0, 200)
        }
      };
      
      console.error('Google Maps API test failed:', errorResult);
      return errorResult;
    }
  },
  
  /**
   * Server-side reverse geocoding with Google Maps API
   */
  'geocode.reverse': function(latitude, longitude) {
    check(latitude, Number);
    check(longitude, Number);
    
    // Apply rate limiting
    const clientId = this.userId || this.connection.clientAddress || 'anonymous';
    const rateLimitCheck = checkRateLimit(clientId, 'geocode.reverse');
    if (!rateLimitCheck.allowed) {
      throw new Meteor.Error('rate-limit-exceeded', 'Too many geocoding requests');
    }
    
    try {
      // Get API key from environment variable or settings
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || 
                      get(Meteor, 'settings.private.googleMaps.apiKey');
      
      if (!apiKey) {
        console.error('Google Maps API key is not configured');
        throw new Meteor.Error('missing-api-key', 'Google Maps API key is not configured');
      }
      
      console.log(`Reverse geocoding coordinates: ${latitude}, ${longitude}`);
      
      // Call Google Maps Reverse Geocoding API
      const response = HTTP.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            latlng: `${latitude},${longitude}`,
            key: apiKey
          },
          timeout: 10000
        }
      );
      
      // Check if we got a valid response
      if (!response || get(response, 'statusCode') !== 200) {
        console.error('Invalid HTTP response from Google Maps API:', {
          statusCode: get(response, 'statusCode')
        });
        throw new Meteor.Error('reverse-geocoding-failed', 'Invalid response from geocoding service');
      }
      
      const responseData = get(response, 'data');
      if (!responseData) {
        console.error('No data in reverse geocoding response');
        throw new Meteor.Error('reverse-geocoding-failed', 'No data in reverse geocoding response');
      }
      
      const status = get(responseData, 'status');
      const results = get(responseData, 'results', []);
      
      if (status === 'OK' && results.length > 0) {
        // Parse the address components
        const result = results[0];
        const addressComponents = get(result, 'address_components', []);
        
        // Extract address parts
        let street = '';
        let city = '';
        let state = '';
        let country = '';
        
        addressComponents.forEach(function(component) {
          const types = get(component, 'types', []);
          
          if (types.includes('street_number')) {
            street += get(component, 'long_name', '');
          } else if (types.includes('route')) {
            street += street ? ` ${get(component, 'long_name', '')}` : get(component, 'long_name', '');
          } else if (types.includes('locality')) {
            city = get(component, 'long_name', '');
          } else if (types.includes('administrative_area_level_1')) {
            state = get(component, 'short_name', '');
          } else if (types.includes('country')) {
            country = get(component, 'long_name', '');
          }
        });
        
        const result_address = {
          street,
          city,
          state,
          country
        };
        
        console.log(`Successfully reverse geocoded ${latitude}, ${longitude} to:`, result_address);
        
        return result_address;
      } else if (status === 'ZERO_RESULTS') {
        console.log(`No address found for coordinates: ${latitude}, ${longitude}`);
        return null;
      } else {
        console.error('Reverse geocoding failed with status:', status);
        throw new Meteor.Error('reverse-geocoding-failed', `Reverse geocoding failed: ${status}`);
      }
      
    } catch (error) {
      console.error('Google Maps Reverse Geocoding API error:', error);
      
      // Re-throw Meteor errors as-is
      if (error instanceof Meteor.Error) {
        throw error;
      }
      
      // Handle HTTP errors specifically
      if (get(error, 'response.statusCode')) {
        const statusCode = get(error, 'response.statusCode');
        console.error(`HTTP ${statusCode} error from Google Maps API`);
        throw new Meteor.Error('http-error', `Reverse geocoding service returned HTTP ${statusCode}`);
      }
      
      // Handle network/timeout errors
      if (get(error, 'code') === 'ETIMEDOUT' || get(error, 'code') === 'ENOTFOUND') {
        console.error('Network error connecting to Google Maps API:', get(error, 'message'));
        throw new Meteor.Error('network-error', 'Unable to connect to reverse geocoding service');
      }
      
      // Generic error
      throw new Meteor.Error('reverse-geocoding-failed', 'Error reverse geocoding coordinates');
    }
  },
  
  /**
   * Get Google Maps API key for client-side use
   */
  'getGoogleMapsApiKey': function() {
    // Return the appropriate API key based on security context
    const publicKey = process.env.GOOGLE_MAPS_PUBLIC_API_KEY || 
                      get(Meteor, 'settings.public.googleMaps.publicApiKey');
    
    if (publicKey) {
      console.log('Returning public Google Maps API key');
      return publicKey;
    }
    
    // Fall back to no key (will show developer mode)
    console.warn('No Google Maps public API key found');
    return '';
  },

  'geocode.addressFixed': async function(address) {
    check(address, String);
    
    if (!address) return null;
    
    // Apply rate limiting
    const clientId = this.userId || this.connection.clientAddress || 'anonymous';
    const rateLimitCheck = checkRateLimit(clientId, 'geocode.address');
    if (!rateLimitCheck.allowed) {
      throw new Meteor.Error('rate-limit-exceeded', 'Too many geocoding requests');
    }
    
    // Get API key from environment variable or settings
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || 
                    get(Meteor, 'settings.private.googleMaps.apiKey');
    
    if (!apiKey) {
      console.error('Google Maps API key is not configured');
      throw new Meteor.Error('missing-api-key', 'Google Maps API key is not configured');
    }
    
    console.log(`Geocoding address: "${address}" with API key: ${apiKey ? 'present' : 'missing'}`);
    
    // Build the URL
    const baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
    const params = new URLSearchParams({
      address: address,
      key: apiKey
    });
    const fullUrl = `${baseUrl}?${params.toString()}`;
    
    console.log(`Full geocoding URL: ${fullUrl.replace(apiKey, 'API_KEY_HIDDEN')}`);
    
    try {
      console.log('Making fetch request to Google Maps API...');
      
      // Use Meteor 3's native fetch
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Meteor/3.0 REFUGE-Restrooms-App'
        },
        // Add timeout using AbortController
        signal: AbortSignal.timeout(15000)
      });
      
      console.log('Fetch response received:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        console.error(`HTTP ${response.status} error from Google Maps API: ${response.statusText}`);
        throw new Meteor.Error('http-error', `Geocoding service returned HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Parse JSON response
      const responseData = await response.json();
      
      console.log('Parsed geocoding response:', {
        status: get(responseData, 'status'),
        resultsCount: get(responseData, 'results.length', 0),
        errorMessage: get(responseData, 'error_message')
      });
      
      const status = get(responseData, 'status');
      const results = get(responseData, 'results', []);
      const errorMessage = get(responseData, 'error_message');
      
      if (status === 'OK' && results.length > 0) {
        const location = get(results, '[0].geometry.location');
        const lat = get(location, 'lat');
        const lng = get(location, 'lng');
        
        if (lat && lng) {
          console.log(`Successfully geocoded "${address}" to ${lat}, ${lng}`);
          return {
            latitude: lat,
            longitude: lng
          };
        } else {
          console.error('No coordinates in geocoding result:', location);
          return null;
        }
      } else if (status === 'ZERO_RESULTS') {
        console.log(`No results found for address: "${address}"`);
        return null;
      } else if (status === 'OVER_QUERY_LIMIT') {
        console.error('Google Maps API quota exceeded');
        throw new Meteor.Error('quota-exceeded', 'Geocoding quota exceeded');
      } else if (status === 'REQUEST_DENIED') {
        console.error('Google Maps API request denied:', errorMessage || 'No error message');
        throw new Meteor.Error('request-denied', `Geocoding request denied: ${errorMessage || 'Check API key permissions'}`);
      } else if (status === 'INVALID_REQUEST') {
        console.error('Invalid geocoding request:', errorMessage || 'No error message');
        throw new Meteor.Error('invalid-request', `Invalid geocoding request: ${errorMessage || 'Unknown reason'}`);
      } else {
        console.error('Geocoding failed with status:', status, 'Error:', errorMessage);
        throw new Meteor.Error('geocoding-failed', `Geocoding failed: ${status} - ${errorMessage || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('Geocoding fetch error:', error);
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        throw new Meteor.Error('timeout-error', 'Geocoding request timed out');
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Meteor.Error('network-error', 'Unable to connect to Google Maps API. Check your internet connection.');
      } else if (error instanceof Meteor.Error) {
        throw error; // Re-throw Meteor errors as-is
      } else {
        throw new Meteor.Error('geocoding-failed', `Error geocoding address: ${error.message || 'Unknown error'}`);
      }
    }
  },

  /**
   * Test the new fetch-based geocoding
   */
  'debug.testFetchGeocoding': async function(address = 'Evansville, IN') {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Debug methods not allowed in production');
    }
    
    check(address, String);
    
    console.log(`=== TESTING FETCH-BASED GEOCODING: "${address}" ===`);
    
    try {
      const result = await Meteor.callAsync('geocode.addressFixed', address);
      console.log('Fetch geocoding result:', result);
      
      return {
        success: true,
        result,
        address
      };
      
    } catch (error) {
      console.error('Fetch geocoding test failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        errorType: error.error || 'unknown',
        address
      };
    }
  }
});