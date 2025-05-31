// server/main.js
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { get, set } from 'lodash';

// Import FHIR system
import '../imports/api/fhir/location/collection';
import './methods/fhirLocations';
import '../imports/api/fhir/services/hydrationService';

// Import other server methods
import './methods/debug';
import './methods/geocoding';
import './methods/recaptcha'; 
import './publications/admin';


// Import legacy collections for migration/compatibility
import { Restrooms } from '../imports/api/restrooms/collection';
import { Contacts } from '../imports/api/contacts/collection';

// Import FHIR collections
import { FhirLocations } from '../imports/api/fhir/location/collection';

// Import server startup files
import './startup/hydration';

// Conditionally import roles package
let Roles;
try {
  Roles = require('meteor/alanning:roles').Roles;
} catch (e) {
  console.warn('alanning:roles package not installed. Role functionality will be limited.');
}

// Check for required packages and warn if not installed
Meteor.startup(() => {
  console.log('Starting REFUGE Restrooms FHIR server...');
  
  // Check for Collection2 package
  if (!FhirLocations.attachSchema) {
    console.warn('Collection2 package not installed. Schema validation will be limited.');
    console.warn('Run: meteor add aldeed:collection2');
  }
  
  // Check for Roles package
  if (!Roles) {
    console.warn('Roles package not installed. Admin functionality will be limited.');
    console.warn('Run: meteor add alanning:roles');
  }
  
  // Create initial admin user if none exists
  if (Meteor.users.find().countAsync() === 0) {
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const adminId = Accounts.createUser({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        profile: {
          name: 'Administrator'
        }
      });
      
      // Add admin role if Roles package is available
      if (Roles) {
        Roles.createRole('admin', { unlessExists: true });
        Roles.addUsersToRoles(adminId, 'admin');
      } else {
        // Without roles package, mark user as admin in profile
        Meteor.users.update(adminId, {
          $set: {
            'profile.isAdmin': true
          }
        });
      }
      
      console.log(`Admin user created: ${process.env.ADMIN_EMAIL}`);
    } else {
      console.warn('Admin user not created: ADMIN_EMAIL and ADMIN_PASSWORD environment variables not set.');
    }
  }
  
  // Configure email if MAIL_URL is set
  if (process.env.MAIL_URL) {
    process.env.MAIL_URL = process.env.MAIL_URL;
    console.log('Email service configured');
  } else {
    console.warn('Email service not configured: MAIL_URL environment variable not set.');
  }
  
  // Set up Google Maps API key
  if (process.env.GOOGLE_MAPS_API_KEY) {
    set(Meteor, 'settings.public.googleMaps.publicApiKey', process.env.GOOGLE_MAPS_API_KEY);
    set(Meteor, 'settings.private.googleMaps.apiKey', process.env.GOOGLE_MAPS_API_KEY);
  } else {
    console.warn('Google Maps API key not set: GOOGLE_MAPS_API_KEY environment variable missing.');
  }
  
  // Set up reCAPTCHA keys
  if (!process.env.RECAPTCHA_SECRET_KEY) {
    console.warn('reCAPTCHA secret key not set: RECAPTCHA_SECRET_KEY environment variable missing.');
  }
  
  // Set up FHIR system configuration
  if (process.env.ENABLE_FHIR_NATIVE !== undefined) {
    const enableFhir = process.env.ENABLE_FHIR_NATIVE.toLowerCase() === 'true';
    set(Meteor, 'settings.private.enableFhirNative', enableFhir);
    console.log(`FHIR native mode: ${enableFhir ? 'enabled' : 'disabled'}`);
  } else {
    // Default to FHIR native
    set(Meteor, 'settings.private.enableFhirNative', true);
    console.log('FHIR native mode: enabled (default)');
  }
  
  // Log startup complete
  console.log('REFUGE Restrooms FHIR server started successfully');
  
  // Log collection counts
  Meteor.defer(async function() {
    try {
      const fhirCount = await FhirLocations.find().countAsync();
      const legacyCount = await Restrooms.find().countAsync();
      console.log(`Database status: ${fhirCount} FHIR Locations, ${legacyCount} legacy restrooms`);
    } catch (error) {
      console.log('Could not get collection counts:', error.message);
    }
  });
});

// Add FHIR-compatible method aliases for backward compatibility
Meteor.methods({
  /**
   * Legacy compatibility method - routes to FHIR
   */
  'restrooms.searchByLocation': async function(lat, lng, options = {}) {
    console.log('Legacy method called, routing to FHIR...');
    return await Meteor.callAsync('fhir.locations.searchByLocation', lat, lng, {
      ...options,
      returnLegacyFormat: true
    });
  },

  /**
   * Legacy compatibility method - routes to FHIR
   */
  'restrooms.search': async function(query, options = {}) {
    console.log('Legacy search method called, routing to FHIR...');
    return await Meteor.callAsync('fhir.locations.searchByText', query, {
      ...options,
      returnLegacyFormat: true
    });
  },

  /**
   * Legacy compatibility method - routes to FHIR
   */
  'restrooms.getById': async function(id) {
    console.log('Legacy getById method called, routing to FHIR...');
    return await Meteor.callAsync('fhir.locations.getById', id, {
      returnLegacyFormat: true
    });
  },

  /**
   * Legacy compatibility method - routes to FHIR
   */
  'restroomsDirectFetch': async function(options = {}) {
    console.log('Legacy direct fetch method called, routing to FHIR...');
    
    const result = await Meteor.callAsync('fhir.locations.getAll', {
      ...options,
      returnLegacyFormat: true
    });
    
    return {
      restrooms: get(result, 'locations', []),
      count: get(result, 'count', 0)
    };
  },

  /**
   * Legacy compatibility method - routes to FHIR
   */
  'restrooms.insert': async function(restroomData, recaptchaToken) {
    console.log('Legacy insert method called, routing to FHIR...');
    return await Meteor.callAsync('fhir.locations.insert', restroomData, recaptchaToken);
  },

  /**
   * Legacy compatibility method - routes to FHIR
   */
  'restrooms.upvote': async function(restroomId) {
    console.log('Legacy upvote method called, routing to FHIR...');
    return await Meteor.callAsync('fhir.locations.upvote', restroomId);
  },

  /**
   * Legacy compatibility method - routes to FHIR
   */
  'restrooms.downvote': async function(restroomId) {
    console.log('Legacy downvote method called, routing to FHIR...');
    return await Meteor.callAsync('fhir.locations.downvote', restroomId);
  },

  /**
   * Test data insertion - FHIR version
   */
  'test.insertFhirLocations': async function(count = 10) {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Test data can only be created in development mode');
    }
    
    console.log(`Inserting ${count} test FHIR locations`);
    
    const cities = [
      { name: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060 },
      { name: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
      { name: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
      { name: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
      { name: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 }
    ];
    
    const restroomNames = [
      'Coffee Shop Restroom', 'Library Bathroom', 'Mall Facilities',
      'Restaurant Restroom', 'Gas Station Toilet', 'Park Bathroom',
      'Museum Facilities', 'Theater Restroom', 'Hotel Bathroom',
      'Gym Restroom'
    ];
    
    // Clear existing test data
    const removed = await FhirLocations.removeAsync({ 'meta.source': 'test-data' });
    console.log(`Removed ${removed} existing test FHIR locations`);
    
    // Insert new test data
    const insertedIds = [];
    
    for (let i = 0; i < count; i++) {
      const cityIndex = i % cities.length;
      const nameIndex = i % restroomNames.length;
      const city = cities[cityIndex];
      
      // Add some random variation to coordinates
      const latVariation = (Math.random() * 0.02) - 0.01;
      const lngVariation = (Math.random() * 0.02) - 0.01;
      
      // Create FHIR Location
      const fhirLocation = {
        resourceType: 'Location',
        id: `test-${i + 1}-${Date.now()}`,
        meta: {
          versionId: '1',
          lastUpdated: new Date(),
          profile: ['http://refugerestrooms.org/fhir/StructureDefinition/RestroomLocation'],
          source: 'test-data'
        },
        status: 'active',
        name: `${restroomNames[nameIndex]} ${i + 1}`,
        address: {
          use: 'work',
          type: 'physical',
          line: [`${100 + i} Main St`],
          city: city.name,
          state: city.state,
          country: 'United States'
        },
        position: {
          latitude: city.lat + latVariation,
          longitude: city.lng + lngVariation
        },
        physicalType: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/location-physical-type',
            code: 'bu',
            display: 'Building'
          }]
        },
        extension: [
          {
            url: 'http://refugerestrooms.org/fhir/StructureDefinition/accessibility-features',
            extension: [
              {
                url: 'wheelchair-accessible',
                valueBoolean: Math.random() > 0.5
              },
              {
                url: 'unisex-facility',
                valueBoolean: Math.random() > 0.3
              },
              {
                url: 'changing-table',
                valueBoolean: Math.random() > 0.7
              }
            ]
          },
          {
            url: 'http://refugerestrooms.org/fhir/StructureDefinition/facility-details',
            extension: [
              {
                url: 'directions',
                valueString: 'Enter through the main door and turn right.'
              },
              {
                url: 'comments',
                valueString: 'Clean and well-maintained.'
              }
            ]
          },
          {
            url: 'http://refugerestrooms.org/fhir/StructureDefinition/community-rating',
            extension: [
              {
                url: 'upvotes',
                valueInteger: Math.floor(Math.random() * 50)
              },
              {
                url: 'downvotes',
                valueInteger: Math.floor(Math.random() * 10)
              }
            ]
          },
          {
            url: 'http://refugerestrooms.org/fhir/StructureDefinition/approval-status',
            extension: [
              {
                url: 'approved',
                valueBoolean: true
              },
              {
                url: 'from-hydration',
                valueBoolean: false
              }
            ]
          }
        ]
      };
      
      const insertedId = await FhirLocations.insertAsync(fhirLocation);
      insertedIds.push(insertedId);
    }
    
    return { 
      success: true, 
      count, 
      message: `Inserted ${count} test FHIR locations`,
      ids: insertedIds
    };
  },
  
  /**
   * Clear test FHIR data
   */
  'test.clearFhirTestData': async function() {
    if (process.env.NODE_ENV === 'production') {
      throw new Meteor.Error('not-allowed', 'Test data can only be removed in development mode');
    }
    
    const removed = await FhirLocations.removeAsync({ 'meta.source': 'test-data' });
    console.log(`Removed ${removed} test FHIR locations`);
    
    return { success: true, count: removed };
  }
});