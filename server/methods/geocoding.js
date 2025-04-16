// server/methods/geocoding.js
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { HTTP } from 'meteor/http';
import { RateLimiter } from 'meteor/ddp-rate-limiter';

// Set up rate limiter for geocoding requests
const geocodingLimiter = new RateLimiter({
  ruleSets: [{
    userId: () => true,
    type: 'method',
    name: methodName => methodName.startsWith('geocode.'),
    connectionId: () => true,
  }],
  limit: 5, // 5 requests
  timeRange: 60000, // per minute
});

Meteor.methods({
  /**
   * Server-side geocoding with Google Maps API
   */
  'geocode.address': function(address) {
    check(address, String);
    
    if (!address) return null;
    
    // Apply rate limiting
    const invocation = geocodingLimiter.check(this.userId || this.connection.clientAddress);
    if (invocation.allowed !== true) {
      throw new Meteor.Error('rate-limit-exceeded', 'Too many geocoding requests');
    }
    
    try {
      // Get API key from environment variable or settings
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || 
                      (Meteor.settings.private && Meteor.settings.private.googleMaps.apiKey);
      
      if (!apiKey) {
        throw new Meteor.Error('missing-api-key', 'Google Maps API key is not configured');
      }
      
      // Call Google Maps Geocoding API
      const response = HTTP.get(
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
  'geocode.reverse': function(latitude, longitude) {
    check(latitude, Number);
    check(longitude, Number);
    
    // Apply rate limiting
    const invocation = geocodingLimiter.check(this.userId || this.connection.clientAddress);
    if (invocation.allowed !== true) {
      throw new Meteor.Error('rate-limit-exceeded', 'Too many geocoding requests');
    }
    
    try {
      // Get API key from environment variable or settings
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || (Meteor.settings.private && Meteor.settings.private.googleMaps.apiKey);
      
      if (!apiKey) {
        throw new Meteor.Error('missing-api-key', 'Google Maps API key is not configured');
      }
      
      // Call Google Maps Reverse Geocoding API
      const response = HTTP.get(
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
    // Check if user is logged in and is admin
    const isAdmin = this.userId && Roles.userIsInRole(this.userId, 'admin');
    
    // Return the appropriate API key based on security context
    if (Meteor.settings.public && Meteor.settings.public.googleMaps && Meteor.settings.public.googleMaps.publicApiKey) {
      // Return public key with restricted permissions
      return Meteor.settings.public.googleMaps.publicApiKey;
    } else if (process.env.GOOGLE_MAPS_PUBLIC_API_KEY) {
      // Return from environment variable if available
      return process.env.GOOGLE_MAPS_PUBLIC_API_KEY;
    }
    
    // Fall back to no key (will show developer mode)
    console.warn('No Google Maps public API key found');
    return '';
  }
});