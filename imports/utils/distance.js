// imports/utils/distance.js
import { CONVERSIONS, formatDistance } from '../constants/distanceConversions';

/**
 * Calculate the great-circle distance between two points using the Haversine formula
 * 
 * @param {number} lat1 - Latitude of the first point in degrees
 * @param {number} lon1 - Longitude of the first point in degrees
 * @param {number} lat2 - Latitude of the second point in degrees
 * @param {number} lon2 - Longitude of the second point in degrees
 * @param {boolean} inKilometers - Whether to return the distance in kilometers (default) or miles
 * @returns {number} The distance between the two points in kilometers or miles
 */
export const calculateDistance = (lat1, lon1, lat2, lon2, inKilometers = true) => {
  // Convert latitude and longitude from degrees to radians
  const radLat1 = Math.PI * lat1 / 180;
  const radLon1 = Math.PI * lon1 / 180;
  const radLat2 = Math.PI * lat2 / 180;
  const radLon2 = Math.PI * lon2 / 180;
  
  // Haversine formula
  const dLat = radLat2 - radLat1;
  const dLon = radLon2 - radLon1;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Calculate distance
  const earthRadius = inKilometers ? CONVERSIONS.EARTH_RADIUS_KM : CONVERSIONS.EARTH_RADIUS_MILES;
  const distance = earthRadius * c;
  
  return formatDistance(distance, 2);
};

/**
 * Add distance property to an array of restrooms based on a reference point
 * 
 * @param {Array} restrooms - Array of restroom objects
 * @param {number} lat - Latitude of the reference point
 * @param {number} lng - Longitude of the reference point
 * @param {boolean} inKilometers - Whether to calculate distances in kilometers
 * @returns {Array} Array of restrooms with added distance property
 */
export const addDistanceToRestrooms = (restrooms, lat, lng, inKilometers = false) => {
  if (!restrooms || !Array.isArray(restrooms) || restrooms.length === 0) {
    return [];
  }
  
  return restrooms.map(restroom => {
    const { position } = restroom;
    
    if (position && position.latitude && position.longitude) {
      const distance = calculateDistance(
        lat, 
        lng, 
        position.latitude, 
        position.longitude, 
        inKilometers
      );
      
      return { ...restroom, distance };
    }
    
    return { ...restroom, distance: null };
  });
};

/**
 * Sort restrooms by distance
 * 
 * @param {Array} restrooms - Array of restroom objects with distance property
 * @returns {Array} Sorted array of restrooms
 */
export const sortRestroomsByDistance = (restrooms) => {
  if (!restrooms || !Array.isArray(restrooms) || restrooms.length === 0) {
    return [];
  }
  
  return [...restrooms].sort((a, b) => {
    // Null distance values go to the end
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;
    
    return a.distance - b.distance;
  });
};

/**
 * Filter restrooms by maximum distance
 * 
 * @param {Array} restrooms - Array of restroom objects with distance property
 * @param {number} maxDistance - Maximum distance to include
 * @returns {Array} Filtered array of restrooms
 */
export const filterRestroomsByDistance = (restrooms, maxDistance) => {
  if (!restrooms || !Array.isArray(restrooms) || restrooms.length === 0) {
    return [];
  }
  
  return restrooms.filter(restroom => 
    restroom.distance !== null && restroom.distance <= maxDistance
  );
};

export default {
  calculateDistance,
  addDistanceToRestrooms,
  sortRestroomsByDistance,
  filterRestroomsByDistance
};