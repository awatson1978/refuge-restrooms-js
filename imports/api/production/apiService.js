// imports/api/production/apiServiceFixed.js
import { Meteor } from 'meteor/meteor';
import { get } from 'lodash';

/**
 * Fixed service to interact with the production REFUGE Restrooms API using fetch
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
   * Fetch restrooms by location from production API using fetch
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} perPage - Number of results to fetch (default: 20)
   * @returns {Promise<Array>} Array of restroom objects
   */
  async getRestroomsByLocation(lat, lng, perPage = 20) {
    try {
      const url = `${this.getBaseUrl()}/restrooms/by_location?lat=${lat}&lng=${lng}&per_page=${perPage}`;
      
      console.log('Fetching from production API (by_location):', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Meteor/3.0 REFUGE-Restrooms-App',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        console.error(`Production API HTTP ${response.status}: ${response.statusText}`);
        throw new Meteor.Error('api-error', `Production API returned HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('Production API response (by_location):', {
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'not array',
        dataType: typeof data,
        firstItem: Array.isArray(data) && data.length > 0 ? {
          id: get(data[0], 'id'),
          name: get(data[0], 'name'),
          city: get(data[0], 'city')
        } : null
      });
      
      return Array.isArray(data) ? data : [];
      
    } catch (error) {
      console.error('Error fetching restrooms by location from production API:', error);
      throw new Meteor.Error('api-error', 'Failed to fetch restrooms from production API');
    }
  },

  /**
   * Search restrooms by query from production API using fetch
   * @param {string} query - Search query
   * @param {number} perPage - Number of results to fetch (default: 20)
   * @returns {Promise<Array>} Array of restroom objects
   */
  async searchRestrooms(query, perPage = 20) {
    try {
      const url = `${this.getBaseUrl()}/restrooms/search?query=${encodeURIComponent(query)}&per_page=${perPage}`;
      
      console.log('Fetching from production API (search):', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Meteor/3.0 REFUGE-Restrooms-App',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        console.error(`Production API HTTP ${response.status}: ${response.statusText}`);
        throw new Meteor.Error('api-error', `Production API returned HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('Production API response (search):', {
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'not array',
        dataType: typeof data,
        keys: typeof data === 'object' ? Object.keys(data) : 'not object',
        firstItem: Array.isArray(data) && data.length > 0 ? {
          id: get(data[0], 'id'),
          name: get(data[0], 'name'),
          city: get(data[0], 'city')
        } : null
      });
      
      return Array.isArray(data) ? data : [];
      
    } catch (error) {
      console.error('Error searching restrooms from production API:', error);
      throw new Meteor.Error('api-error', 'Failed to search restrooms from production API');
    }
  },

  /**
   * Test method to check what the API actually returns
   * @param {string} query - Search query
   * @returns {Promise<Object>} Raw response data
   */
  async testApiResponse(query = 'Seattle') {
    try {
      const url = `${this.getBaseUrl()}/restrooms/search?query=${encodeURIComponent(query)}&per_page=5`;
      
      console.log('Testing production API response:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Meteor/3.0 REFUGE-Restrooms-Test',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      console.log('Raw response info:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      const text = await response.text();
      console.log('Raw response text (first 500 chars):', text.substring(0, 500));
      
      let parsedData;
      try {
        parsedData = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return {
          success: false,
          error: 'Failed to parse JSON',
          rawText: text.substring(0, 1000)
        };
      }
      
      return {
        success: true,
        response: {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        },
        data: parsedData,
        dataAnalysis: {
          type: typeof parsedData,
          isArray: Array.isArray(parsedData),
          keys: typeof parsedData === 'object' ? Object.keys(parsedData) : null,
          length: Array.isArray(parsedData) ? parsedData.length : null
        }
      };
      
    } catch (error) {
      console.error('API test error:', error);
      return {
        success: false,
        error: error.message,
        type: error.name
      };
    }
  },

  /**
   * Fetch restrooms with filters from production API using fetch
   * @param {Object} filters - Filter options
   * @param {boolean} filters.ada - Filter by ADA accessibility
   * @param {boolean} filters.unisex - Filter by unisex availability
   * @param {number} perPage - Number of results to fetch (default: 20)
   * @returns {Promise<Array>} Array of restroom objects
   */
  async getRestroomsWithFilters(filters = {}, perPage = 20) {
    try {
      const params = new URLSearchParams({
        per_page: perPage.toString()
      });
      
      if (filters.ada !== undefined) params.set('ada', filters.ada.toString());
      if (filters.unisex !== undefined) params.set('unisex', filters.unisex.toString());
      
      const url = `${this.getBaseUrl()}/restrooms?${params.toString()}`;
      
      console.log('Fetching from production API (with filters):', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Meteor/3.0 REFUGE-Restrooms-App',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        console.error(`Production API HTTP ${response.status}: ${response.statusText}`);
        throw new Meteor.Error('api-error', `Production API returned HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('Production API response (with filters):', {
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'not array',
        dataType: typeof data
      });
      
      return Array.isArray(data) ? data : [];
      
    } catch (error) {
      console.error('Error fetching filtered restrooms from production API:', error);
      throw new Meteor.Error('api-error', 'Failed to fetch filtered restrooms from production API');
    }
  },

  /**
   * Fetch restrooms by date from production API using fetch
   * @param {number} day - Day of the month
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @param {number} perPage - Number of results to fetch (default: 20)
   * @returns {Promise<Array>} Array of restroom objects
   */
  async getRestroomsByDate(day, month, year, perPage = 20) {
    try {
      const url = `${this.getBaseUrl()}/restrooms/by_date?day=${day}&month=${month}&year=${year}&per_page=${perPage}`;
      
      console.log('Fetching from production API (by_date):', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Meteor/3.0 REFUGE-Restrooms-App',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        console.error(`Production API HTTP ${response.status}: ${response.statusText}`);
        throw new Meteor.Error('api-error', `Production API returned HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('Production API response (by_date):', {
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'not array',
        dataType: typeof data
      });
      
      return Array.isArray(data) ? data : [];
      
    } catch (error) {
      console.error('Error fetching restrooms by date from production API:', error);
      throw new Meteor.Error('api-error', 'Failed to fetch restrooms by date from production API');
    }
  }
};

export default RefugeApiService;