// imports/api/hydration/hydrationService.js
import { Meteor } from 'meteor/meteor';
import { get, isEqual } from 'lodash';
import { RefugeApiService } from '../production/apiService';
import { Restrooms } from '../restrooms/collection';

/**
 * Service to handle hydration of the local database from the production API
 */
export const HydrationService = {
  /**
   * Check if hydration is enabled in settings
   * @returns {boolean} Whether hydration is enabled
   */
  isHydrationEnabled() {
    return get(Meteor, 'settings.private.enableHydration', false) === true;
  },

  /**
   * Transform a production API restroom object to match our local schema
   * @param {Object} productionRestroom - Restroom object from production API
   * @returns {Object} Transformed restroom object matching our schema
   */
  transformRestroomData(productionRestroom) {
    // Ensure we have coordinates for a valid GeoJSON Point
    let position = null;
    
    if (productionRestroom.latitude != null && productionRestroom.longitude != null) {
      position = {
        type: 'Point',
        coordinates: [
          parseFloat(productionRestroom.longitude), 
          parseFloat(productionRestroom.latitude)
        ] // GeoJSON uses [longitude, latitude] order
      };
    }
    
    // Map fields from production API to our schema
    return {
      name: productionRestroom.name,
      street: productionRestroom.street,
      city: productionRestroom.city,
      state: productionRestroom.state,
      country: productionRestroom.country || 'United States',
      position: position,
      accessible: !!productionRestroom.accessible,
      unisex: !!productionRestroom.unisex,
      changing_table: !!productionRestroom.changing_table,
      directions: productionRestroom.directions || '',
      comment: productionRestroom.comment || '',
      upvote: productionRestroom.upvote || 0,
      downvote: productionRestroom.downvote || 0,
      approved: true,
      status: 'active',
      // Store the original ID from production for reference and deduplication
      productionId: productionRestroom.id.toString(),
      // Set a consistent edit_id based on production ID
      edit_id: productionRestroom.id.toString(),
      createdAt: new Date(productionRestroom.created_at) || new Date(),
      updatedAt: new Date(productionRestroom.updated_at) || new Date(),
      // Flag to indicate this came from hydration
      fromHydration: true
    };
  },

  /**
   * Check if a restroom already exists in our database based on production ID
   * @param {string} productionId - Production API restroom ID
   * @returns {Promise<boolean>} Whether the restroom exists
   */
  async restroomExists(productionId) {
    if (!productionId) return false;
    
    const count = await Restrooms.find({
      productionId: productionId.toString()
    }).countAsync();
    
    return count > 0;
  },

  /**
   * Save a restroom from production API to our local database
   * @param {Object} productionRestroom - Restroom object from production API
   * @returns {Promise<Object>} Result of the operation
   */
  async saveRestroom(productionRestroom) {
    if (!this.isHydrationEnabled()) {
      console.log('Hydration is disabled. Skipping save operation.');
      return { skipped: true, reason: 'hydration-disabled' };
    }
    
    if (!productionRestroom || !productionRestroom.id) {
      return { success: false, reason: 'invalid-data' };
    }
    
    try {
      // Check if restroom already exists
      const exists = await this.restroomExists(productionRestroom.id);
      
      if (exists) {
        // Check if we need to update existing data
        // For now, we're just skipping to avoid duplicates
        return { skipped: true, reason: 'already-exists' };
      }
      
      // Transform the data to match our schema
      const restroomData = this.transformRestroomData(productionRestroom);
      
      // Insert into our database
      const restroomId = await Restrooms.insertAsync(restroomData);
      
      console.log(`Hydrated restroom from production: ${productionRestroom.name} (${productionRestroom.id})`);
      
      return { 
        success: true, 
        restroomId,
        productionId: productionRestroom.id
      };
    } catch (error) {
      console.error('Error saving production restroom to local database:', error);
      return { 
        success: false, 
        reason: error.message,
        productionId: productionRestroom.id
      };
    }
  },

  /**
   * Hydrate database with results from a production API search
   * @param {Array} restrooms - Array of restroom objects from production API
   * @returns {Promise<Object>} Summary of the operation
   */
  async hydrateFromResults(restrooms) {
    if (!this.isHydrationEnabled()) {
      console.log('Hydration is disabled. Skipping hydration operation.');
      return { 
        skipped: true, 
        reason: 'hydration-disabled',
        total: restrooms.length
      };
    }
    
    if (!restrooms || !Array.isArray(restrooms) || restrooms.length === 0) {
      return { success: false, reason: 'no-data' };
    }
    
    const results = {
      total: restrooms.length,
      saved: 0,
      skipped: 0,
      failed: 0,
      details: []
    };
    
    // Process each restroom
    for (const restroom of restrooms) {
      const saveResult = await this.saveRestroom(restroom);
      
      if (saveResult.success) {
        results.saved++;
      } else if (saveResult.skipped) {
        results.skipped++;
      } else {
        results.failed++;
      }
      
      results.details.push(saveResult);
    }
    
    console.log(`Hydration summary: ${results.saved} saved, ${results.skipped} skipped, ${results.failed} failed out of ${results.total} restrooms`);
    
    return results;
  }
};

// Register Meteor methods for hydration if enabled
if (Meteor.isServer) {
  Meteor.methods({
    /**
     * Hydrate restrooms by location
     */
    'hydration.byLocation': async function(lat, lng, perPage = 20) {
      if (!HydrationService.isHydrationEnabled()) {
        return { skipped: true, reason: 'hydration-disabled' };
      }
      
      // Check parameters
      check(lat, Number);
      check(lng, Number);
      check(perPage, Number);
      
      console.log(`Hydrating restrooms by location: ${lat},${lng}`);
      
      try {
        // Fetch from production API
        const restrooms = await RefugeApiService.getRestroomsByLocation(lat, lng, perPage);
        
        // Hydrate database with results
        return await HydrationService.hydrateFromResults(restrooms);
      } catch (error) {
        console.error('Error in hydration.byLocation:', error);
        throw new Meteor.Error('hydration-error', error.message);
      }
    },
    
    /**
     * Hydrate restrooms by search query
     */
    'hydration.bySearch': async function(query, perPage = 20) {
      if (!HydrationService.isHydrationEnabled()) {
        return { skipped: true, reason: 'hydration-disabled' };
      }
      
      // Check parameters
      check(query, String);
      check(perPage, Number);
      
      console.log(`Hydrating restrooms by search: "${query}"`);
      
      try {
        // Fetch from production API
        const restrooms = await RefugeApiService.searchRestrooms(query, perPage);
        
        // Hydrate database with results
        return await HydrationService.hydrateFromResults(restrooms);
      } catch (error) {
        console.error('Error in hydration.bySearch:', error);
        throw new Meteor.Error('hydration-error', error.message);
      }
    },
    
    /**
     * Hydrate restrooms with filters
     */
    'hydration.withFilters': async function(filters = {}, perPage = 20) {
      if (!HydrationService.isHydrationEnabled()) {
        return { skipped: true, reason: 'hydration-disabled' };
      }
      
      // Check parameters
      check(filters, Object);
      check(perPage, Number);
      
      console.log(`Hydrating restrooms with filters:`, filters);
      
      try {
        // Fetch from production API
        const restrooms = await RefugeApiService.getRestroomsWithFilters(filters, perPage);
        
        // Hydrate database with results
        return await HydrationService.hydrateFromResults(restrooms);
      } catch (error) {
        console.error('Error in hydration.withFilters:', error);
        throw new Meteor.Error('hydration-error', error.message);
      }
    },
    
    /**
     * Hydrate restrooms by date
     */
    'hydration.byDate': async function(day, month, year, perPage = 20) {
      if (!HydrationService.isHydrationEnabled()) {
        return { skipped: true, reason: 'hydration-disabled' };
      }
      
      // Check parameters
      check(day, Number);
      check(month, Number);
      check(year, Number);
      check(perPage, Number);
      
      console.log(`Hydrating restrooms by date: ${day}/${month}/${year}`);
      
      try {
        // Fetch from production API
        const restrooms = await RefugeApiService.getRestroomsByDate(day, month, year, perPage);
        
        // Hydrate database with results
        return await HydrationService.hydrateFromResults(restrooms);
      } catch (error) {
        console.error('Error in hydration.byDate:', error);
        throw new Meteor.Error('hydration-error', error.message);
      }
    },
    
    /**
     * Toggle hydration status
     * Note: This requires admin permissions in a real app
     */
    'hydration.toggle': function(enabled) {
      // In a real app, check admin permissions
      // if (!Roles.userIsInRole(this.userId, 'admin')) {
      //   throw new Meteor.Error('not-authorized', 'Not authorized');
      // }
      
      check(enabled, Boolean);
      
      if (Meteor.settings.private) {
        Meteor.settings.private.enableHydration = enabled;
        return { success: true, enabled };
      } else {
        throw new Meteor.Error('settings-error', 'Private settings not available');
      }
    },
    
    /**
     * Get current hydration status
     */
    'hydration.status': function() {
      return {
        enabled: HydrationService.isHydrationEnabled()
      };
    }
  });
}

export default HydrationService;