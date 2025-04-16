// imports/api/production/apiService.js
import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { get } from 'lodash';

/**
 * Service to interact with the production REFUGE Restrooms API
 */
export const RefugeApiService = {
  /**
   * Base URL for production API
   * @returns {string} Base URL from settings or default
   */
  getBaseUrl() {
    return get(Meteor, 'settings.public.production.apiUrl', 'https://www.refugerestrooms.org/api/v1');
  },

  /**
   * Fetch restrooms by location from production API
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} perPage - Number of results to fetch (default: 20)
   * @returns {Promise<Array>} Array of restroom objects
   */
  async getRestroomsByLocation(lat, lng, perPage = 20) {
    try {
      // Using HTTP.get with Promise instead of HTTP.getAsync
      const result = await HTTP.get(`${this.getBaseUrl()}/restrooms/by_location`, {
        params: {
          lat,
          lng,
          per_page: perPage
        }
      });
      
      return result.data || [];
    } catch (error) {
      console.error('Error fetching restrooms by location from production API:', error);
      throw new Meteor.Error('api-error', 'Failed to fetch restrooms from production API');
    }
  },

  /**
   * Search restrooms by query from production API
   * @param {string} query - Search query
   * @param {number} perPage - Number of results to fetch (default: 20)
   * @returns {Promise<Array>} Array of restroom objects
   */
  async searchRestrooms(query, perPage = 20) {
    try {
      // Using HTTP.get with Promise instead of HTTP.getAsync
      const result = await HTTP.get(`${this.getBaseUrl()}/restrooms/search`, {
        params: {
          query,
          per_page: perPage
        }
      });
      
      return result.data || [];
    } catch (error) {
      console.error('Error searching restrooms from production API:', error);
      throw new Meteor.Error('api-error', 'Failed to search restrooms from production API');
    }
  },

  /**
   * Fetch restrooms with filters from production API
   * @param {Object} filters - Filter options
   * @param {boolean} filters.ada - Filter by ADA accessibility
   * @param {boolean} filters.unisex - Filter by unisex availability
   * @param {number} perPage - Number of results to fetch (default: 20)
   * @returns {Promise<Array>} Array of restroom objects
   */
  async getRestroomsWithFilters(filters = {}, perPage = 20) {
    try {
      const params = {
        per_page: perPage
      };
      
      if (filters.ada !== undefined) params.ada = filters.ada;
      if (filters.unisex !== undefined) params.unisex = filters.unisex;
      
      // Using HTTP.get with Promise instead of HTTP.getAsync
      const result = await HTTP.get(`${this.getBaseUrl()}/restrooms`, {
        params
      });
      
      return result.data || [];
    } catch (error) {
      console.error('Error fetching filtered restrooms from production API:', error);
      throw new Meteor.Error('api-error', 'Failed to fetch filtered restrooms from production API');
    }
  },

  /**
   * Fetch restrooms by date from production API
   * @param {number} day - Day of the month
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @param {number} perPage - Number of results to fetch (default: 20)
   * @returns {Promise<Array>} Array of restroom objects
   */
  async getRestroomsByDate(day, month, year, perPage = 20) {
    try {
      // Using HTTP.get with Promise instead of HTTP.getAsync
      const result = await HTTP.get(`${this.getBaseUrl()}/restrooms/by_date`, {
        params: {
          day,
          month,
          year,
          per_page: perPage
        }
      });
      
      return result.data || [];
    } catch (error) {
      console.error('Error fetching restrooms by date from production API:', error);
      throw new Meteor.Error('api-error', 'Failed to fetch restrooms by date from production API');
    }
  }
};

export default RefugeApiService;