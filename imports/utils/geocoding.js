// imports/utils/geocoding.js
import { Meteor } from 'meteor/meteor';

/**
 * Geocode an address to get coordinates
 * @param {string} address - Full address to geocode
 * @returns {Promise<{latitude: number, longitude: number} | null>} Coordinates or null if not found
 */
export const geocodeAddress = async (address) => {
  if (!address) return null;
  
  try {
    // Call server method to handle geocoding (keeps API key secure)
    return await Meteor.callAsync('geocode.address', address);
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
};

/**
 * Reverse geocode coordinates to get an address
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<{street: string, city: string, state: string, country: string} | null>} Address info or null
 */
export const reverseGeocode = async (latitude, longitude) => {
  if (!latitude || !longitude) return null;
  
  try {
    // Call server method to handle reverse geocoding
    return await Meteor.callAsync('geocode.reverse', latitude, longitude);
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw error;
  }
};

// Server-side implementation (in server/methods/geocoding.js)
if (Meteor.isServer) {
  import { HTTP } from 'meteor/http';
  
  Meteor.methods({
    /**
     * Server-side geocoding with Google Maps API
     */
    'geocode.address': async function(address) {
      check(address, String);
      
      if (!address) return null;
      
      // Rate limiting to prevent abuse
      const clientIP = this.connection?.clientAddress || 'unknown';
      const rateLimit = RateLimiter.findOne({ clientIP, method: 'geocode.address' });
      
      if (rateLimit && rateLimit.count > 10 && new Date() - rateLimit.lastReset < 60000) {
        throw new Meteor.Error('rate-limit-exceeded', 'Too many geocoding requests');
      }
      
      // Update rate limit counter
      RateLimiter.upsert(
        { clientIP, method: 'geocode.address' },
        { 
          $inc: { count: 1 },
          $setOnInsert: { lastReset: new Date() }
        }
      );
      
      // Reset counters that are older than 1 minute
      RateLimiter.update(
        { lastReset: { $lt: new Date(Date.now() - 60000) } },
        { $set: { count: 0, lastReset: new Date() } },
        { multi: true }
      );
      
      try {
        // Get API key from environment variable
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        
        if (!apiKey) {
          throw new Meteor.Error('missing-api-key', 'Google Maps API key is not configured');
        }
        
        // Call Google Maps Geocoding API
        const response = await HTTP.getAsync(
          'https://maps.googleapis.com/maps/api/geocode/json',
          {
            params: {
              address: address,
              key: apiKey
            }
          }
        );
        
        if (response.data.status === 'OK' && response.data.results && response.data.results.length > 0) {
          const location = response.data.results[0].geometry.location;
          
          return {
            latitude: location.lat,
            longitude: location.lng
          };
        }
        
        return null;
      } catch (error) {
        console.error('Google Maps Geocoding API error:', error);
        throw new Meteor.Error('geocoding-failed', 'Error geocoding address');
      }
    },
    
    /**
     * Server-side reverse geocoding with Google Maps API
     */
    'geocode.reverse': async function(latitude, longitude) {
      check(latitude, Number);
      check(longitude, Number);
      
      // Rate limiting to prevent abuse
      const clientIP = this.connection?.clientAddress || 'unknown';
      const rateLimit = RateLimiter.findOne({ clientIP, method: 'geocode.reverse' });
      
      if (rateLimit && rateLimit.count > 10 && new Date() - rateLimit.lastReset < 60000) {
        throw new Meteor.Error('rate-limit-exceeded', 'Too many geocoding requests');
      }
      
      // Update rate limit counter
      RateLimiter.upsert(
        { clientIP, method: 'geocode.reverse' },
        { 
          $inc: { count: 1 },
          $setOnInsert: { lastReset: new Date() }
        }
      );
      
      try {
        // Get API key from environment variable
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        
        if (!apiKey) {
          throw new Meteor.Error('missing-api-key', 'Google Maps API key is not configured');
        }
        
        // Call Google Maps Reverse Geocoding API
        const response = await HTTP.getAsync(
          'https://maps.googleapis.com/maps/api/geocode/json',
          {
            params: {
              latlng: `${latitude},${longitude}`,
              key: apiKey
            }
          }
        );
        
        if (response.data.status === 'OK' && response.data.results && response.data.results.length > 0) {
          // Parse the address components
          const result = response.data.results[0];
          const addressComponents = result.address_components;
          
          // Extract address parts
          let street = '';
          let city = '';
          let state = '';
          let country = '';
          
          addressComponents.forEach(component => {
            const types = component.types;
            
            if (types.includes('street_number')) {
              street += component.long_name;
            } else if (types.includes('route')) {
              street += street ? ` ${component.long_name}` : component.long_name;
            } else if (types.includes('locality')) {
              city = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              state = component.short_name;
            } else if (types.includes('country')) {
              country = component.long_name;
            }
          });
          
          return {
            street,
            city,
            state,
            country
          };
        }
        
        return null;
      } catch (error) {
        console.error('Google Maps Reverse Geocoding API error:', error);
        throw new Meteor.Error('reverse-geocoding-failed', 'Error reverse geocoding coordinates');
      }
    },
    
    /**
     * Get Google Maps API key for client-side use
     */
    'getGoogleMapsApiKey': function() {
      // Only provide the key if the user is authenticated
      // or limit its capabilities with proper restrictions
      const isAdmin = this.userId && Meteor.users.findOne(this.userId)?.isAdmin;
      
      if (!isAdmin) {
        // For non-admin users, return the restricted key
        return process.env.GOOGLE_MAPS_PUBLIC_API_KEY;
      }
      
      // For admins, return the full-access key
      return process.env.GOOGLE_MAPS_API_KEY;
    }
  });
}