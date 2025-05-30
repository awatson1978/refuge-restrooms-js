// imports/api/fhir/location/collection.js
import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { get, set } from 'lodash';
import { FhirLocationSchema } from './schema';

export const FhirLocations = new Mongo.Collection('fhir_locations');

// FHIR-native helper methods using lodash get/set for safe nested access
const helpers = {
  /**
   * Get accessibility features from FHIR extensions
   * @returns {Object} accessibility features
   */
  getAccessibilityFeatures() {
    const extensions = get(this, 'extension', []);
    const accessExt = extensions.find(function(ext) {
      return get(ext, 'url') === 'http://refugerestrooms.org/fhir/StructureDefinition/accessibility-features';
    });
    
    if (!accessExt) {
      return {
        accessible: false,
        unisex: false,
        changingTable: false
      };
    }
    
    const features = {};
    const subExtensions = get(accessExt, 'extension', []);
    
    subExtensions.forEach(function(subExt) {
      const url = get(subExt, 'url');
      const value = get(subExt, 'valueBoolean', false);
      
      if (url === 'wheelchair-accessible') {
        set(features, 'accessible', value);
      } else if (url === 'unisex-facility') {
        set(features, 'unisex', value);
      } else if (url === 'changing-table') {
        set(features, 'changingTable', value);
      }
    });
    
    return features;
  },

  /**
   * Get community rating from FHIR extensions
   * @returns {Object} rating information
   */
  getRating() {
    const extensions = get(this, 'extension', []);
    const ratingExt = extensions.find(function(ext) {
      return get(ext, 'url') === 'http://refugerestrooms.org/fhir/StructureDefinition/community-rating';
    });
    
    if (!ratingExt) {
      return { 
        upvotes: 0, 
        downvotes: 0, 
        percentage: 0,
        total: 0,
        isRated: false
      };
    }
    
    const subExtensions = get(ratingExt, 'extension', []);
    let upvotes = 0;
    let downvotes = 0;
    
    subExtensions.forEach(function(subExt) {
      const url = get(subExt, 'url');
      const value = get(subExt, 'valueInteger', 0);
      
      if (url === 'upvotes') {
        upvotes = value;
      } else if (url === 'downvotes') {
        downvotes = value;
      }
    });
    
    const total = upvotes + downvotes;
    const percentage = total > 0 ? (upvotes / total) * 100 : 0;
    
    return {
      upvotes,
      downvotes,
      percentage,
      total,
      isRated: total > 0
    };
  },

  /**
   * Get formatted address from FHIR address
   * @returns {Object} address components
   */
  getAddress() {
    const address = get(this, 'address', {});
    
    return {
      street: get(address, 'line[0]', ''),
      city: get(address, 'city', ''),
      state: get(address, 'state', ''),
      country: get(address, 'country', ''),
      postalCode: get(address, 'postalCode', ''),
      full: this.getFullAddress()
    };
  },

  /**
   * Get full formatted address string
   * @returns {String} full address
   */
  getFullAddress() {
    const address = get(this, 'address', {});
    const parts = [];
    
    const street = get(address, 'line[0]');
    const city = get(address, 'city');
    const state = get(address, 'state');
    const country = get(address, 'country');
    
    if (street) parts.push(street);
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (country && country !== 'United States') parts.push(country);
    
    return parts.join(', ');
  },

  /**
   * Get position coordinates
   * @returns {Object} latitude and longitude
   */
  getPosition() {
    return {
      latitude: get(this, 'position.latitude'),
      longitude: get(this, 'position.longitude'),
      altitude: get(this, 'position.altitude')
    };
  },

  /**
   * Get facility details from extensions
   * @returns {Object} directions and comments
   */
  getFacilityDetails() {
    const extensions = get(this, 'extension', []);
    const facilityExt = extensions.find(function(ext) {
      return get(ext, 'url') === 'http://refugerestrooms.org/fhir/StructureDefinition/facility-details';
    });
    
    if (!facilityExt) {
      return {
        directions: '',
        comments: ''
      };
    }
    
    const details = {};
    const subExtensions = get(facilityExt, 'extension', []);
    
    subExtensions.forEach(function(subExt) {
      const url = get(subExt, 'url');
      const value = get(subExt, 'valueString', '');
      
      if (url === 'directions') {
        set(details, 'directions', value);
      } else if (url === 'comments') {
        set(details, 'comments', value);
      }
    });
    
    return details;
  },

  /**
   * Check if location is from hydration
   * @returns {Boolean} true if from hydration
   */
  isFromHydration() {
    const extensions = get(this, 'extension', []);
    const approvalExt = extensions.find(function(ext) {
      return get(ext, 'url') === 'http://refugerestrooms.org/fhir/StructureDefinition/approval-status';
    });
    
    if (!approvalExt) return false;
    
    const subExtensions = get(approvalExt, 'extension', []);
    const hydrationExt = subExtensions.find(function(subExt) {
      return get(subExt, 'url') === 'from-hydration';
    });
    
    return get(hydrationExt, 'valueBoolean', false);
  },

  /**
   * Get legacy restroom ID from identifiers
   * @returns {String} legacy ID or null
   */
  getLegacyId() {
    const identifiers = get(this, 'identifier', []);
    const legacyIdent = identifiers.find(function(ident) {
      const system = get(ident, 'system');
      return system === 'http://refugerestrooms.org/legacy-api' || 
             system === 'http://refugerestrooms.org/production-id';
    });
    
    return get(legacyIdent, 'value');
  },

  /**
   * Calculate distance from a point using Haversine formula
   * @param {Number} lat - target latitude
   * @param {Number} lng - target longitude
   * @param {Boolean} inKilometers - return distance in km vs miles
   * @returns {Number} distance
   */
  distanceFrom(lat, lng, inKilometers = false) {
    const position = this.getPosition();
    const restroomLat = get(position, 'latitude');
    const restroomLng = get(position, 'longitude');
    
    if (!restroomLat || !restroomLng || !lat || !lng) {
      return null;
    }
    
    // Haversine formula
    const R = inKilometers ? 6371 : 3959; // Earth radius in km or miles
    const dLat = (lat - restroomLat) * Math.PI / 180;
    const dLng = (lng - restroomLng) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(restroomLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  },

  /**
   * Get timestamps from extensions or meta
   * @returns {Object} created and updated dates
   */
  getTimestamps() {
    const extensions = get(this, 'extension', []);
    const timestampExt = extensions.find(function(ext) {
      return get(ext, 'url') === 'http://refugerestrooms.org/fhir/StructureDefinition/timestamps';
    });
    
    let createdAt = null;
    if (timestampExt) {
      const subExtensions = get(timestampExt, 'extension', []);
      const createdExt = subExtensions.find(function(subExt) {
        return get(subExt, 'url') === 'created-at';
      });
      createdAt = get(createdExt, 'valueDateTime');
    }
    
    return {
      createdAt: createdAt ? new Date(createdAt) : null,
      updatedAt: get(this, 'meta.lastUpdated', null)
    };
  }
};

// Apply helpers to the collection
if (typeof FhirLocations.helpers === 'function') {
  FhirLocations.helpers(helpers);
} else {
  // Fallback if Collection.helpers isn't available
  console.warn('Collection.helpers not available, using transform function');
  FhirLocations._transform = function(doc) {
    Object.keys(helpers).forEach(function(key) {
      doc[key] = helpers[key].bind(doc);
    });
    return doc;
  };
}

// Create indexes on server startup
if (Meteor.isServer) {
  Meteor.startup(async function() {
    console.log('Setting up FHIR Locations collection indexes...');

    try {
      // Create a 2dsphere index for geospatial queries on position
      await FhirLocations.rawCollection().createIndex(
        { 
          'position.latitude': 1,
          'position.longitude': 1
        },
        { name: 'position_2d' }
      );
      console.log('Created 2D index for position queries');
      
      // Create text index for search across name and address
      await FhirLocations.rawCollection().createIndex(
        {
          name: "text",
          'address.line': "text",
          'address.city': "text",
          'address.state': "text"
        },
        {
          weights: {
            name: 10,
            'address.line': 5,
            'address.city': 3,
            'address.state': 2
          },
          name: "fhir_text_search_index"
        }
      );
      console.log('Created text index for FHIR search queries');
      
      // Create index for status filtering
      await FhirLocations.rawCollection().createIndex(
        { status: 1 },
        { name: 'status_index' }
      );
      console.log('Created index for status filtering');
      
      // Create index for legacy ID lookups (for hydration deduplication)
      await FhirLocations.rawCollection().createIndex(
        { 'identifier.value': 1 },
        { name: 'identifier_value_index', sparse: true }
      );
      console.log('Created index for identifier lookups');
      
      // Create index for meta.source (hydration tracking)
      await FhirLocations.rawCollection().createIndex(
        { 'meta.source': 1 },
        { name: 'meta_source_index', sparse: true }
      );
      console.log('Created index for source tracking');
      
      // Create compound index for geospatial + status queries
      await FhirLocations.rawCollection().createIndex(
        { 
          status: 1,
          'position.latitude': 1,
          'position.longitude': 1
        },
        { name: 'status_position_compound' }
      );
      console.log('Created compound index for status + position');
      
    } catch (error) {
      console.error('Error setting up FHIR indexes:', error);
    }
  });
}

// Attach schema if SimpleSchema is available
if (FhirLocations.attachSchema) {
  FhirLocations.attachSchema(FhirLocationSchema);
} else {
  console.warn('SimpleSchema not available, skipping schema attachment');
}

export default FhirLocations;