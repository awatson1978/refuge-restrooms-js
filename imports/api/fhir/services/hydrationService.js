// imports/api/fhir/services/hydrationService.js
import { Meteor } from 'meteor/meteor';
import { get, set } from 'lodash';
import { FhirLocations } from '../location/collection';
import { RefugeApiService } from '../../production/apiService';
import { legacyRestroomToFhir } from '../transforms/legacyApiTransform';

/**
 * FHIR-native hydration service for populating local database from legacy API
 */
export const FhirHydrationService = {
  /**
   * Check if hydration is enabled in settings
   * @returns {Boolean} Whether hydration is enabled
   */
  isHydrationEnabled() {
    return get(Meteor, 'settings.private.enableHydration', false) === true;
  },

  /**
   * Check if a restroom already exists based on legacy ID
   * @param {String|Number} legacyId - Legacy API restroom ID
   * @returns {Promise<Boolean>} Whether the restroom exists
   */
  async restroomExists(legacyId) {
    if (!legacyId) return false;
    
    try {
      const count = await FhirLocations.find({
        'identifier.value': legacyId.toString()
      }).countAsync();
      
      return count > 0;
    } catch (error) {
      console.error('Error checking restroom existence:', error);
      return false;
    }
  },

  /**
   * Save a legacy restroom as FHIR Location to local database
   * @param {Object} legacyRestroom - Legacy restroom data from API
   * @returns {Promise<Object>} Result of the operation
   */
  async saveRestroom(legacyRestroom) {
    if (!this.isHydrationEnabled()) {
      console.log('Hydration is disabled. Skipping save operation.');
      return { skipped: true, reason: 'hydration-disabled' };
    }
    
    const legacyId = get(legacyRestroom, 'id');
    if (!legacyRestroom || !legacyId) {
      return { success: false, reason: 'invalid-data' };
    }
    
    try {
      // Check if restroom already exists
      const exists = await this.restroomExists(legacyId);
      
      if (exists) {
        return { skipped: true, reason: 'already-exists', legacyId };
      }
      
      // Transform legacy data to FHIR Location
      const fhirLocation = legacyRestroomToFhir(legacyRestroom);
      
      // Insert into FHIR collection
      const insertedId = await FhirLocations.insertAsync(fhirLocation);
      
      console.log(`Hydrated restroom: ${get(legacyRestroom, 'name')} (legacy ID: ${legacyId})`);
      
      return { 
        success: true, 
        insertedId,
        fhirId: get(fhirLocation, 'id'),
        legacyId: legacyId.toString()
      };
      
    } catch (error) {
      console.error(`Error saving legacy restroom ${legacyId} to FHIR:`, error);
      return { 
        success: false, 
        reason: error.message,
        legacyId: legacyId.toString()
      };
    }
  },

  /**
   * Hydrate database with results from a legacy API search
   * @param {Array} legacyRestrooms - Array of legacy restroom objects
   * @returns {Promise<Object>} Summary of the hydration operation
   */
  async hydrateFromResults(legacyRestrooms) {
    if (!this.isHydrationEnabled()) {
      console.log('Hydration is disabled. Skipping hydration operation.');
      return { 
        skipped: true, 
        reason: 'hydration-disabled',
        total: legacyRestrooms ? legacyRestrooms.length : 0
      };
    }
    
    if (!legacyRestrooms || !Array.isArray(legacyRestrooms) || legacyRestrooms.length === 0) {
      return { success: false, reason: 'no-data', total: 0 };
    }
    
    const results = {
      total: legacyRestrooms.length,
      saved: 0,
      skipped: 0,
      failed: 0,
      details: []
    };
    
    // Process each legacy restroom
    for (const legacyRestroom of legacyRestrooms) {
      const saveResult = await this.saveRestroom(legacyRestroom);
      
      if (get(saveResult, 'success')) {
        results.saved++;
      } else if (get(saveResult, 'skipped')) {
        results.skipped++;
      } else {
        results.failed++;
      }
      
      results.details.push(saveResult);
    }
    
    console.log(`FHIR Hydration summary: ${results.saved} saved, ${results.skipped} skipped, ${results.failed} failed out of ${results.total} restrooms`);
    
    return results;
  },

  /**
   * Hydrate restrooms by location using legacy API
   * @param {Number} lat - Latitude
   * @param {Number} lng - Longitude  
   * @param {Number} perPage - Number of results to fetch
   * @returns {Promise<Object>} Hydration results
   */
  async hydrateByLocation(lat, lng, perPage = 20) {
    if (!this.isHydrationEnabled()) {
      return { skipped: true, reason: 'hydration-disabled' };
    }
    
    console.log(`FHIR Hydration: Fetching restrooms near ${lat},${lng} (limit: ${perPage})`);
    
    try {
      // Fetch from legacy API
      const legacyRestrooms = await RefugeApiService.getRestroomsByLocation(lat, lng, perPage);
      
      // Transform and save to FHIR
      return await this.hydrateFromResults(legacyRestrooms);
      
    } catch (error) {
      console.error('Error in FHIR hydration by location:', error);
      throw new Meteor.Error('fhir-hydration-error', error.message);
    }
  },

  /**
   * Hydrate restrooms by search query using legacy API
   * @param {String} query - Search query
   * @param {Number} perPage - Number of results to fetch
   * @returns {Promise<Object>} Hydration results
   */
  async hydrateBySearch(query, perPage = 20) {
    if (!this.isHydrationEnabled()) {
      return { skipped: true, reason: 'hydration-disabled' };
    }
    
    console.log(`FHIR Hydration: Searching for "${query}" (limit: ${perPage})`);
    
    try {
      // Fetch from legacy API
      const legacyRestrooms = await RefugeApiService.searchRestrooms(query, perPage);
      
      // Transform and save to FHIR
      return await this.hydrateFromResults(legacyRestrooms);
      
    } catch (error) {
      console.error('Error in FHIR hydration by search:', error);
      throw new Meteor.Error('fhir-hydration-error', error.message);
    }
  },

  /**
   * Hydrate restrooms with filters using legacy API
   * @param {Object} filters - Filter options
   * @param {Number} perPage - Number of results to fetch  
   * @returns {Promise<Object>} Hydration results
   */
  async hydrateWithFilters(filters = {}, perPage = 20) {
    if (!this.isHydrationEnabled()) {
      return { skipped: true, reason: 'hydration-disabled' };
    }
    
    console.log(`FHIR Hydration: Fetching with filters:`, filters, `(limit: ${perPage})`);
    
    try {
      // Fetch from legacy API
      const legacyRestrooms = await RefugeApiService.getRestroomsWithFilters(filters, perPage);
      
      // Transform and save to FHIR
      return await this.hydrateFromResults(legacyRestrooms);
      
    } catch (error) {
      console.error('Error in FHIR hydration with filters:', error);
      throw new Meteor.Error('fhir-hydration-error', error.message);
    }
  },

  /**
   * Hydrate restrooms by date using legacy API
   * @param {Number} day - Day of month
   * @param {Number} month - Month (1-12)
   * @param {Number} year - Year
   * @param {Number} perPage - Number of results to fetch
   * @returns {Promise<Object>} Hydration results
   */
  async hydrateByDate(day, month, year, perPage = 20) {
    if (!this.isHydrationEnabled()) {
      return { skipped: true, reason: 'hydration-disabled' };
    }
    
    console.log(`FHIR Hydration: Fetching by date ${day}/${month}/${year} (limit: ${perPage})`);
    
    try {
      // Fetch from legacy API
      const legacyRestrooms = await RefugeApiService.getRestroomsByDate(day, month, year, perPage);
      
      // Transform and save to FHIR
      return await this.hydrateFromResults(legacyRestrooms);
      
    } catch (error) {
      console.error('Error in FHIR hydration by date:', error);
      throw new Meteor.Error('fhir-hydration-error', error.message);
    }
  },

  /**
   * Get hydration statistics
   * @returns {Promise<Object>} Hydration stats
   */
  async getHydrationStats() {
    try {
      const totalLocations = await FhirLocations.find().countAsync();
      const hydratedLocations = await FhirLocations.find({
        'meta.source': 'legacy-api'
      }).countAsync();
      
      return {
        total: totalLocations,
        hydrated: hydratedLocations,
        local: totalLocations - hydratedLocations,
        hydrationPercentage: totalLocations > 0 ? (hydratedLocations / totalLocations) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting hydration stats:', error);
      return {
        total: 0,
        hydrated: 0,
        local: 0,
        hydrationPercentage: 0,
        error: error.message
      };
    }
  }
};

// Register Meteor methods for FHIR hydration if enabled
if (Meteor.isServer) {
  Meteor.methods({
    /**
     * Hydrate restrooms by location - FHIR version
     */
    'fhir.hydration.byLocation': async function(lat, lng, perPage = 20) {
      if (!FhirHydrationService.isHydrationEnabled()) {
        return { skipped: true, reason: 'hydration-disabled' };
      }
      
      check(lat, Number);
      check(lng, Number);
      check(perPage, Number);
      
      return await FhirHydrationService.hydrateByLocation(lat, lng, perPage);
    },
    
    /**
     * Hydrate restrooms by search query - FHIR version
     */
    'fhir.hydration.bySearch': async function(query, perPage = 20) {
      if (!FhirHydrationService.isHydrationEnabled()) {
        return { skipped: true, reason: 'hydration-disabled' };
      }
      
      check(query, String);
      check(perPage, Number);
      
      return await FhirHydrationService.hydrateBySearch(query, perPage);
    },
    
    /**
     * Hydrate restrooms with filters - FHIR version
     */
    'fhir.hydration.withFilters': async function(filters = {}, perPage = 20) {
      if (!FhirHydrationService.isHydrationEnabled()) {
        return { skipped: true, reason: 'hydration-disabled' };
      }
      
      check(filters, Object);
      check(perPage, Number);
      
      return await FhirHydrationService.hydrateWithFilters(filters, perPage);
    },
    
    /**
     * Hydrate restrooms by date - FHIR version
     */
    'fhir.hydration.byDate': async function(day, month, year, perPage = 20) {
      if (!FhirHydrationService.isHydrationEnabled()) {
        return { skipped: true, reason: 'hydration-disabled' };
      }
      
      check(day, Number);
      check(month, Number);
      check(year, Number);
      check(perPage, Number);
      
      return await FhirHydrationService.hydrateByDate(day, month, year, perPage);
    },
    
    /**
     * Toggle FHIR hydration status
     */
    'fhir.hydration.toggle': function(enabled) {
      check(enabled, Boolean);
      
      if (Meteor.settings.private) {
        set(Meteor.settings, 'private.enableHydration', enabled);
        return { success: true, enabled };
      } else {
        throw new Meteor.Error('settings-error', 'Private settings not available');
      }
    },
    
    /**
     * Get current FHIR hydration status
     */
    'fhir.hydration.status': function() {
      return {
        enabled: FhirHydrationService.isHydrationEnabled()
      };
    },
    
    /**
     * Get FHIR hydration statistics
     */
    'fhir.hydration.stats': async function() {
      return await FhirHydrationService.getHydrationStats();
    }
  });
}

export default FhirHydrationService;