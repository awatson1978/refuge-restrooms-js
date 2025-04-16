// imports/constants/distanceConversions.js

/**
 * Constants and conversion functions for distance calculations
 */

// Conversion factors
export const CONVERSIONS = {
    // Miles to kilometers conversion factor
    MILES_TO_KM: 1.609344,
    
    // Kilometers to miles conversion factor
    KM_TO_MILES: 0.621371,
    
    // Miles to meters conversion factor (for geospatial queries)
    MILES_TO_METERS: 1609.344,
    
    // Kilometers to meters conversion factor
    KM_TO_METERS: 1000,
    
    // Earth's radius in kilometers (for geospatial calculations)
    EARTH_RADIUS_KM: 6371,
    
    // Earth's radius in miles
    EARTH_RADIUS_MILES: 3959
  };
  
  /**
   * Format distance to show appropriate precision
   * @param {number} distance - The distance value
   * @param {number} precision - Number of decimal places to display
   * @returns {number} Formatted distance value
   */
  export const formatDistance = (distance, precision = 2) => {
    return Number(distance.toFixed(precision));
  };
  
  /**
   * Convert miles to kilometers
   * @param {number} miles - Distance in miles
   * @returns {number} Distance in kilometers
   */
  export const milesToKilometers = (miles) => {
    return miles * CONVERSIONS.MILES_TO_KM;
  };
  
  /**
   * Convert kilometers to miles
   * @param {number} kilometers - Distance in kilometers
   * @returns {number} Distance in miles
   */
  export const kilometersToMiles = (kilometers) => {
    return kilometers * CONVERSIONS.KM_TO_MILES;
  };
  
  /**
   * Convert miles to meters (for geospatial queries)
   * @param {number} miles - Distance in miles
   * @returns {number} Distance in meters
   */
  export const milesToMeters = (miles) => {
    return miles * CONVERSIONS.MILES_TO_METERS;
  };
  
  /**
   * Convert kilometers to meters
   * @param {number} kilometers - Distance in kilometers
   * @returns {number} Distance in meters
   */
  export const kilometersToMeters = (kilometers) => {
    return kilometers * CONVERSIONS.KM_TO_METERS;
  };
  
  export default {
    CONVERSIONS,
    formatDistance,
    milesToKilometers,
    kilometersToMiles,
    milesToMeters,
    kilometersToMeters
  };