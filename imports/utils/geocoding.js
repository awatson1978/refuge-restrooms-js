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
