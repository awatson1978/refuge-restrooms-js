// server/methods/geocodingFixed.js
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
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
   * Fixed geocoding using native fetch instead of HTTP package
   */
  'geocode.address': async function(address) {
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
      
      // Use native fetch with AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(function() {
        controller.abort();
      }, 15000);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Meteor/3.0 REFUGE-Restrooms-App',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('Fetch response received:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(response.headers.entries())
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
   * Fixed reverse geocoding using native fetch
   */
  'geocode.reverse': async function(latitude, longitude) {
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
      
      // Build URL
      const baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
      const params = new URLSearchParams({
        latlng: `${latitude},${longitude}`,
        key: apiKey
      });
      const fullUrl = `${baseUrl}?${params.toString()}`;
      
      // Use native fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(function() {
        controller.abort();
      }, 10000);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Meteor/3.0 REFUGE-Restrooms-App',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Check if we got a valid response
      if (!response.ok) {
        console.error(`HTTP ${response.status} error from Google Maps API: ${response.statusText}`);
        throw new Meteor.Error('reverse-geocoding-failed', `Invalid response from geocoding service: HTTP ${response.status}`);
      }
      
      const responseData = await response.json();
      
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
      
      // Handle fetch-specific errors
      if (error.name === 'AbortError') {
        throw new Meteor.Error('timeout-error', 'Reverse geocoding request timed out');
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
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
    
    // Fall back to server key for development (not recommended for production)
    const serverKey = process.env.GOOGLE_MAPS_API_KEY ||
                      get(Meteor, 'settings.private.googleMaps.apiKey');
    
    if (serverKey) {
      console.log('Returning server Google Maps API key (fallback)');
      return serverKey;
    }
    
    // Fall back to no key (will show developer mode)
    console.warn('No Google Maps API key found');
    return '';
  }
});