// server/methods/fhirLocations.js
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { get, set } from 'lodash';
import moment from 'moment';
import { FhirLocations } from '../../imports/api/fhir/location/collection';
import { FhirHydrationService } from '../../imports/api/fhir/services/hydrationService';
import { fhirLocationToLegacy } from '../../imports/api/fhir/transforms/legacyApiTransform';
import { validateRecaptcha } from '../../imports/utils/recaptcha';
import { geocodeAddress } from '../../imports/utils/geocoding';

/**
 * FHIR Location Methods - Complete rewrite for FHIR-native operations
 */
Meteor.methods({
  /**
   * Search for FHIR Locations by coordinates with automatic hydration
   */
  'fhir.locations.searchByLocation': async function(lat, lng, options = {}) {
    check(lat, Number);
    check(lng, Number);
    check(options, {
      limit: Match.Optional(Number),
      skip: Match.Optional(Number),
      radius: Match.Optional(Number),
      returnLegacyFormat: Match.Optional(Boolean)
    });
    
    const limit = get(options, 'limit', 20);
    const skip = get(options, 'skip', 0);
    const radius = get(options, 'radius', 20); // miles
    const returnLegacy = get(options, 'returnLegacyFormat', true);
    
    console.log(`FHIR Location search: ${lat},${lng} radius=${radius}mi limit=${limit}`);
    
    try {
      // Convert radius to decimal degrees (approximation: 1 degree ≈ 69 miles)
      const degreeRadius = radius / 69;
      
      // Build MongoDB query for geospatial search
      const geoQuery = {
        'position.latitude': { 
          $gte: lat - degreeRadius, 
          $lte: lat + degreeRadius 
        },
        'position.longitude': { 
          $gte: lng - degreeRadius, 
          $lte: lng + degreeRadius 
        },
        status: 'active'
      };

      // Query local FHIR locations
      let locations = await FhirLocations.find(geoQuery, {
        limit,
        skip,
        sort: { 'meta.lastUpdated': -1 }
      }).fetchAsync();

      console.log(`Found ${locations.length} local FHIR locations`);

      // Automatic hydration if results are sparse
      if (locations.length < 5 && FhirHydrationService.isHydrationEnabled()) {
        try {
          console.log('Attempting hydration for more results...');
          const hydrationResult = await FhirHydrationService.hydrateByLocation(lat, lng, limit);
          
          const savedCount = get(hydrationResult, 'saved', 0);
          if (savedCount > 0) {
            console.log(`Hydrated ${savedCount} new locations`);
            
            // Re-query after hydration
            locations = await FhirLocations.find(geoQuery, {
              limit,
              skip,
              sort: { 'meta.lastUpdated': -1 }
            }).fetchAsync();
          }
        } catch (hydrationError) {
          console.error('Hydration failed, continuing with local results:', hydrationError);
        }
      }

      // Calculate distances and sort by proximity
      locations = locations.map(function(location) {
        const position = get(location, 'position', {});
        const locLat = get(position, 'latitude');
        const locLng = get(position, 'longitude');
        
        let distance = null;
        if (locLat && locLng) {
          // Haversine formula
          const R = 3959; // Earth radius in miles
          const dLat = (locLat - lat) * Math.PI / 180;
          const dLng = (locLng - lng) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat * Math.PI / 180) * Math.cos(locLat * Math.PI / 180) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          distance = Math.round((R * c) * 100) / 100; // Round to 2 decimals
        }
        
        return { ...location, distance };
      });

      // Sort by distance (closest first)
      locations.sort(function(a, b) {
        const distA = get(a, 'distance', Infinity);
        const distB = get(b, 'distance', Infinity);
        return distA - distB;
      });

      // Convert to legacy format if requested
      if (returnLegacy) {
        return locations.map(fhirLocationToLegacy);
      }

      return locations;
      
    } catch (error) {
      console.error('Error in FHIR location search by coordinates:', error);
      throw new Meteor.Error('fhir-search-error', error.message);
    }
  },

  /**
   * Search for FHIR Locations by text with automatic hydration
   */
  'fhir.locations.searchByText': async function(searchText, options = {}) {
    check(searchText, String);
    check(options, {
      limit: Match.Optional(Number),
      skip: Match.Optional(Number),
      returnLegacyFormat: Match.Optional(Boolean)
    });
    
    const limit = get(options, 'limit', 20);
    const skip = get(options, 'skip', 0);
    const returnLegacy = get(options, 'returnLegacyFormat', true);
    
    console.log(`FHIR Location text search: "${searchText}" limit=${limit}`);
    
    try {
      // Build text search query
      const textQuery = {
        $or: [
          { name: { $regex: searchText, $options: 'i' } },
          { 'address.line': { $regex: searchText, $options: 'i' } },
          { 'address.city': { $regex: searchText, $options: 'i' } },
          { 'address.state': { $regex: searchText, $options: 'i' } }
        ],
        status: 'active'
      };

      // Query local FHIR locations
      let locations = await FhirLocations.find(textQuery, {
        limit,
        skip,
        sort: { 'meta.lastUpdated': -1 }
      }).fetchAsync();

      console.log(`Found ${locations.length} local FHIR locations for text search`);

      // Automatic hydration if results are sparse
      if (locations.length < 5 && FhirHydrationService.isHydrationEnabled()) {
        try {
          console.log('Attempting hydration for text search...');
          const hydrationResult = await FhirHydrationService.hydrateBySearch(searchText, limit);
          
          const savedCount = get(hydrationResult, 'saved', 0);
          if (savedCount > 0) {
            console.log(`Hydrated ${savedCount} new locations from text search`);
            
            // Re-query after hydration
            locations = await FhirLocations.find(textQuery, {
              limit,
              skip,
              sort: { 'meta.lastUpdated': -1 }
            }).fetchAsync();
          }
        } catch (hydrationError) {
          console.error('Text search hydration failed, continuing with local results:', hydrationError);
        }
      }

      // Convert to legacy format if requested
      if (returnLegacy) {
        return locations.map(fhirLocationToLegacy);
      }

      return locations;
      
    } catch (error) {
      console.error('Error in FHIR location text search:', error);
      throw new Meteor.Error('fhir-search-error', error.message);
    }
  },

  /**
   * Get all FHIR Locations with filtering and pagination
   */
  'fhir.locations.getAll': async function(options = {}) {
    check(options, {
      limit: Match.Optional(Number),
      skip: Match.Optional(Number),
      accessible: Match.Optional(Boolean),
      unisex: Match.Optional(Boolean),
      changing_table: Match.Optional(Boolean),
      returnLegacyFormat: Match.Optional(Boolean)
    });
    
    const limit = get(options, 'limit', 20);
    const skip = get(options, 'skip', 0);
    const returnLegacy = get(options, 'returnLegacyFormat', true);
    
    try {
      // Start with base query for active locations
      let query = { status: 'active' };
      
      // Add accessibility filters using MongoDB aggregation
      const hasFilters = get(options, 'accessible') === true || 
                        get(options, 'unisex') === true || 
                        get(options, 'changing_table') === true;
      
      if (hasFilters) {
        // Use MongoDB's aggregation framework for complex extension filtering
        const pipeline = [
          { $match: { status: 'active' } }
        ];
        
        // Build accessibility filter conditions
        const accessibilityConditions = [];
        
        if (get(options, 'accessible') === true) {
          accessibilityConditions.push({
            $and: [
              { 'extension.url': 'http://refugerestrooms.org/fhir/StructureDefinition/accessibility-features' },
              { 'extension.extension.url': 'wheelchair-accessible' },
              { 'extension.extension.valueBoolean': true }
            ]
          });
        }
        
        if (get(options, 'unisex') === true) {
          accessibilityConditions.push({
            $and: [
              { 'extension.url': 'http://refugerestrooms.org/fhir/StructureDefinition/accessibility-features' },
              { 'extension.extension.url': 'unisex-facility' },
              { 'extension.extension.valueBoolean': true }
            ]
          });
        }
        
        if (get(options, 'changing_table') === true) {
          accessibilityConditions.push({
            $and: [
              { 'extension.url': 'http://refugerestrooms.org/fhir/StructureDefinition/accessibility-features' },
              { 'extension.extension.url': 'changing-table' },
              { 'extension.extension.valueBoolean': true }
            ]
          });
        }
        
        if (accessibilityConditions.length > 0) {
          pipeline.push({
            $match: {
              $and: accessibilityConditions
            }
          });
        }
        
        // Add sorting and pagination
        pipeline.push({ $sort: { 'meta.lastUpdated': -1 } });
        
        // Get count
        const countPipeline = [...pipeline, { $count: 'total' }];
        const countResult = await FhirLocations.rawCollection().aggregate(countPipeline).toArray();
        const totalCount = get(countResult, '[0].total', 0);
        
        // Add pagination to main pipeline
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: limit });
        
        // Execute aggregation
        const locations = await FhirLocations.rawCollection().aggregate(pipeline).toArray();
        
        console.log(`Found ${locations.length} of ${totalCount} FHIR locations with filters`);
        
        // Convert to legacy format if requested
        const results = returnLegacy ? locations.map(fhirLocationToLegacy) : locations;
        
        return {
          locations: results,
          count: totalCount
        };
        
      } else {
        // Simple query without filters
        const locations = await FhirLocations.find(query, {
          limit,
          skip,
          sort: { 'meta.lastUpdated': -1 }
        }).fetchAsync();
        
        const totalCount = await FhirLocations.find(query).countAsync();
        
        console.log(`Found ${locations.length} of ${totalCount} FHIR locations (no filters)`);
        
        // Convert to legacy format if requested
        const results = returnLegacy ? locations.map(fhirLocationToLegacy) : locations;
        
        return {
          locations: results,
          count: totalCount
        };
      }
      
    } catch (error) {
      console.error('Error in FHIR location getAll:', error);
      throw new Meteor.Error('fhir-query-error', error.message);
    }
  },

  /**
   * Get a single FHIR Location by ID
   */
  'fhir.locations.getById': async function(id, options = {}) {
    check(id, String);
    check(options, {
      returnLegacyFormat: Match.Optional(Boolean)
    });
    
    const returnLegacy = get(options, 'returnLegacyFormat', true);
    
    try {
      const location = await FhirLocations.findOneAsync({ id });
      
      if (!location) {
        throw new Meteor.Error('not-found', 'Location not found');
      }
      
      console.log(`Found FHIR location: ${get(location, 'name')}`);
      
      // Convert to legacy format if requested
      if (returnLegacy) {
        return fhirLocationToLegacy(location);
      }
      
      return location;
      
    } catch (error) {
      console.error('Error getting FHIR location by ID:', error);
      throw new Meteor.Error('fhir-fetch-error', error.message);
    }
  },

  /**
   * Insert a new FHIR Location
   */
  'fhir.locations.insert': async function(locationData, recaptchaToken) {
    check(locationData, Object);
    check(recaptchaToken, String);
    
    // Verify recaptcha
    const recaptchaValid = await validateRecaptcha(recaptchaToken);
    if (!recaptchaValid) {
      throw new Meteor.Error('invalid-recaptcha', 'reCAPTCHA verification failed');
    }
    
    try {
      // Convert legacy format to FHIR if needed
      let fhirLocation;
      
      if (get(locationData, 'resourceType') === 'Location') {
        fhirLocation = locationData;
      } else {
        fhirLocation = await this.convertLegacyDataToFhir(locationData);
      }
      
      // Ensure required FHIR fields
      if (!get(fhirLocation, 'id')) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        set(fhirLocation, 'id', `local-${timestamp}-${random}`);
      }
      
      // Set meta information
      const now = moment().toDate();
      set(fhirLocation, 'meta.lastUpdated', now);
      set(fhirLocation, 'meta.versionId', '1');
      set(fhirLocation, 'meta.source', 'local-submission');
      
      const profiles = get(fhirLocation, 'meta.profile', []);
      if (!profiles.includes('http://refugerestrooms.org/fhir/StructureDefinition/RestroomLocation')) {
        profiles.push('http://refugerestrooms.org/fhir/StructureDefinition/RestroomLocation');
        set(fhirLocation, 'meta.profile', profiles);
      }
      
      // Ensure status is set
      set(fhirLocation, 'status', 'active');
      
      // Geocode address if coordinates not provided
      const position = get(fhirLocation, 'position');
      if (!get(position, 'latitude') || !get(position, 'longitude')) {
        const address = get(fhirLocation, 'address');
        const addressLine = get(address, 'line[0]', '');
        const city = get(address, 'city', '');
        const state = get(address, 'state', '');
        const country = get(address, 'country', '');
        
        if (addressLine && city && state) {
          try {
            const fullAddress = `${addressLine}, ${city}, ${state}, ${country}`;
            const coordinates = await geocodeAddress(fullAddress);
            
            if (coordinates) {
              set(fhirLocation, 'position', {
                latitude: get(coordinates, 'latitude'),
                longitude: get(coordinates, 'longitude')
              });
            }
          } catch (geocodeError) {
            console.warn('Geocoding failed, continuing without coordinates:', geocodeError);
          }
        }
      }
      
      // Ensure approval extension exists
      const extensions = get(fhirLocation, 'extension', []);
      const approvalExtIndex = extensions.findIndex(function(ext) {
        return get(ext, 'url') === 'http://refugerestrooms.org/fhir/StructureDefinition/approval-status';
      });
      
      const approvalExt = {
        url: 'http://refugerestrooms.org/fhir/StructureDefinition/approval-status',
        extension: [
          {
            url: 'approved',
            valueBoolean: true // Auto-approve for now
          },
          {
            url: 'from-hydration',
            valueBoolean: false
          }
        ]
      };
      
      if (approvalExtIndex >= 0) {
        extensions[approvalExtIndex] = approvalExt;
      } else {
        extensions.push(approvalExt);
      }
      
      set(fhirLocation, 'extension', extensions);
      
      // Insert into database
      const insertedId = await FhirLocations.insertAsync(fhirLocation);
      
      console.log(`Inserted new FHIR location: ${get(fhirLocation, 'name')} (${get(fhirLocation, 'id')})`);
      
      return {
        success: true,
        insertedId,
        fhirId: get(fhirLocation, 'id'),
        approved: true
      };
      
    } catch (error) {
      console.error('Error inserting FHIR location:', error);
      throw new Meteor.Error('fhir-insert-error', error.message);
    }
  },

  /**
   * Update an existing FHIR Location
   */
  'fhir.locations.update': async function(id, updates) {
    check(id, String);
    check(updates, Object);
    
    try {
      const existingLocation = await FhirLocations.findOneAsync({ id });
      
      if (!existingLocation) {
        throw new Meteor.Error('not-found', 'Location not found');
      }
      
      // Update meta information
      set(updates, 'meta.lastUpdated', moment().toDate());
      
      const currentVersion = get(existingLocation, 'meta.versionId', '1');
      const newVersion = (parseInt(currentVersion) + 1).toString();
      set(updates, 'meta.versionId', newVersion);
      
      // Perform the update
      const result = await FhirLocations.updateAsync(
        { id },
        { $set: updates }
      );
      
      console.log(`Updated FHIR location: ${id}`);
      
      return { success: true, modified: result };
      
    } catch (error) {
      console.error('Error updating FHIR location:', error);
      throw new Meteor.Error('fhir-update-error', error.message);
    }
  },

  /**
   * Upvote a FHIR Location
   */
  'fhir.locations.upvote': async function(locationId) {
    check(locationId, String);
    
    try {
      const location = await FhirLocations.findOneAsync({ id: locationId });
      
      if (!location) {
        throw new Meteor.Error('not-found', 'Location not found');
      }

      // Find and update the rating extension
      const extensions = get(location, 'extension', []);
      let ratingExtIndex = extensions.findIndex(function(ext) {
        return get(ext, 'url') === 'http://refugerestrooms.org/fhir/StructureDefinition/community-rating';
      });

      let ratingExt;
      if (ratingExtIndex >= 0) {
        ratingExt = extensions[ratingExtIndex];
      } else {
        // Create new rating extension
        ratingExt = {
          url: 'http://refugerestrooms.org/fhir/StructureDefinition/community-rating',
          extension: [
            { url: 'upvotes', valueInteger: 0 },
            { url: 'downvotes', valueInteger: 0 }
          ]
        };
        extensions.push(ratingExt);
        ratingExtIndex = extensions.length - 1;
      }

      // Update upvote count
      const subExtensions = get(ratingExt, 'extension', []);
      const upvoteExtIndex = subExtensions.findIndex(function(subExt) {
        return get(subExt, 'url') === 'upvotes';
      });
      
      if (upvoteExtIndex >= 0) {
        const currentUpvotes = get(subExtensions[upvoteExtIndex], 'valueInteger', 0);
        set(subExtensions[upvoteExtIndex], 'valueInteger', currentUpvotes + 1);
      } else {
        subExtensions.push({ url: 'upvotes', valueInteger: 1 });
      }

      set(ratingExt, 'extension', subExtensions);
      set(extensions[ratingExtIndex], 'extension', subExtensions);

      // Update the document
      await FhirLocations.updateAsync(
        { id: locationId },
        { 
          $set: { 
            extension: extensions,
            'meta.lastUpdated': moment().toDate()
          }
        }
      );

      console.log(`Upvoted FHIR location: ${locationId}`);
      return true;
      
    } catch (error) {
      console.error('Error upvoting FHIR location:', error);
      throw new Meteor.Error('fhir-vote-error', error.message);
    }
  },

  /**
   * Downvote a FHIR Location
   */
  'fhir.locations.downvote': async function(locationId) {
    check(locationId, String);
    
    try {
      const location = await FhirLocations.findOneAsync({ id: locationId });
      
      if (!location) {
        throw new Meteor.Error('not-found', 'Location not found');
      }

      // Find and update the rating extension
      const extensions = get(location, 'extension', []);
      let ratingExtIndex = extensions.findIndex(function(ext) {
        return get(ext, 'url') === 'http://refugerestrooms.org/fhir/StructureDefinition/community-rating';
      });

      let ratingExt;
      if (ratingExtIndex >= 0) {
        ratingExt = extensions[ratingExtIndex];
      } else {
        // Create new rating extension
        ratingExt = {
          url: 'http://refugerestrooms.org/fhir/StructureDefinition/community-rating',
          extension: [
            { url: 'upvotes', valueInteger: 0 },
            { url: 'downvotes', valueInteger: 0 }
          ]
        };
        extensions.push(ratingExt);
        ratingExtIndex = extensions.length - 1;
      }

      // Update downvote count
      const subExtensions = get(ratingExt, 'extension', []);
      const downvoteExtIndex = subExtensions.findIndex(function(subExt) {
        return get(subExt, 'url') === 'downvotes';
      });
      
      if (downvoteExtIndex >= 0) {
        const currentDownvotes = get(subExtensions[downvoteExtIndex], 'valueInteger', 0);
        set(subExtensions[downvoteExtIndex], 'valueInteger', currentDownvotes + 1);
      } else {
        subExtensions.push({ url: 'downvotes', valueInteger: 1 });
      }

      set(ratingExt, 'extension', subExtensions);
      set(extensions[ratingExtIndex], 'extension', subExtensions);

      // Update the document
      await FhirLocations.updateAsync(
        { id: locationId },
        { 
          $set: { 
            extension: extensions,
            'meta.lastUpdated': moment().toDate()
          }
        }
      );

      console.log(`Downvoted FHIR location: ${locationId}`);
      return true;
      
    } catch (error) {
      console.error('Error downvoting FHIR location:', error);
      throw new Meteor.Error('fhir-vote-error', error.message);
    }
  },

  /**
   * Helper method to convert legacy data format to FHIR Location
   */
  convertLegacyDataToFhir(legacyData) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    
    const fhirLocation = {
      resourceType: 'Location',
      id: `local-${timestamp}-${random}`,
      status: 'active',
      name: get(legacyData, 'name', 'Unnamed Restroom')
    };

    // Address
    const address = {
      use: 'work',
      type: 'physical',
      line: [get(legacyData, 'street', '')],
      city: get(legacyData, 'city', ''),
      state: get(legacyData, 'state', ''),
      country: get(legacyData, 'country', 'United States')
    };
    set(fhirLocation, 'address', address);

    // Position
    const lat = get(legacyData, 'latitude');
    const lng = get(legacyData, 'longitude');
    if (lat && lng) {
      set(fhirLocation, 'position', {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng)
      });
    }

    // Physical type
    set(fhirLocation, 'physicalType', {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/location-physical-type',
        code: 'bu',
        display: 'Building'
      }]
    });

    // Extensions
    const extensions = [];

    // Accessibility features
    extensions.push({
      url: 'http://refugerestrooms.org/fhir/StructureDefinition/accessibility-features',
      extension: [
        {
          url: 'wheelchair-accessible',
          valueBoolean: get(legacyData, 'accessible', false)
        },
        {
          url: 'unisex-facility',
          valueBoolean: get(legacyData, 'unisex', false)
        },
        {
          url: 'changing-table',
          valueBoolean: get(legacyData, 'changing_table', false)
        }
      ]
    });

    // Facility details
    const directions = get(legacyData, 'directions', '');
    const comment = get(legacyData, 'comment', '');
    
    if (directions || comment) {
      const facilityExtension = {
        url: 'http://refugerestrooms.org/fhir/StructureDefinition/facility-details',
        extension: []
      };

      if (directions) {
        facilityExtension.extension.push({
          url: 'directions',
          valueString: directions
        });
      }

      if (comment) {
        facilityExtension.extension.push({
          url: 'comments',
          valueString: comment
        });
      }

      extensions.push(facilityExtension);
    }

    // Community rating
    extensions.push({
      url: 'http://refugerestrooms.org/fhir/StructureDefinition/community-rating',
      extension: [
        {
          url: 'upvotes',
          valueInteger: get(legacyData, 'upvote', 0)
        },
        {
          url: 'downvotes',
          valueInteger: get(legacyData, 'downvote', 0)
        }
      ]
    });

    set(fhirLocation, 'extension', extensions);

    return fhirLocation;
  }
});