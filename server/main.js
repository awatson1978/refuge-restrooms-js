// server/main.js
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';


import './methods/restrooms.js'

// Import hydration functionality
import '../imports/api/hydration';

// Import server startup files
import './startup/hydration';


// Import collections
// We'll now import these directly to ensure they're initialized properly
import { Restrooms } from '../imports/api/restrooms/collection';
import { Contacts } from '../imports/api/contacts/collection';

import { get, set } from 'lodash';


// Conditionally import roles package
let Roles;
try {
  Roles = require('meteor/alanning:roles').Roles;
} catch (e) {
  console.warn('alanning:roles package not installed. Role functionality will be limited.');
}

// Check for required packages and warn if not installed
Meteor.startup(() => {
  console.log('Starting REFUGE Restrooms server...');
  
  // Check for Collection2 package
  if (!Restrooms.attachSchema) {
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
  
  // Try to dynamically load the server method files
  try {
    require('./methods/geocoding');
    console.log('Geocoding methods loaded');
  } catch (e) {
    console.warn('Error loading geocoding methods:', e.message);
  }
  
  try {
    require('./methods/recaptcha');
    console.log('reCAPTCHA methods loaded');
  } catch (e) {
    console.warn('Error loading reCAPTCHA methods:', e.message);
  }
  
  try {
    require('./publications/admin');
    console.log('Admin publications loaded');
  } catch (e) {
    console.warn('Error loading admin publications:', e.message);
  }
  
  // Log startup complete
  console.log('REFUGE Restrooms server started successfully');
});

// Add a fallback method for reCAPTCHA verification if the geocoding.js file failed to load
if (Meteor.isServer && !Meteor.server.method_handlers['recaptcha.verify']) {
  Meteor.methods({
    'recaptcha.verify': function() {
      console.warn('Using fallback reCAPTCHA verification method');
      return true; // Allow in development without verification
    }
  });
}

// Add a fallback method for geocoding if the geocoding.js file failed to load
if (Meteor.isServer && !Meteor.server.method_handlers['geocode.address']) {
  Meteor.methods({
    'geocode.address': function() {
      console.warn('Using fallback geocoding method');
      return null; // No geocoding in development
    },
    'geocode.reverse': function() {
      console.warn('Using fallback reverse geocoding method');
      return null; // No reverse geocoding in development
    },
    'getGoogleMapsApiKey': function() {
        // Log that this method was called
        console.log('getGoogleMapsApiKey method called');
        
        // Try to get from settings
        if (Meteor.settings && 
            Meteor.settings.public && 
            Meteor.settings.public.googleMaps && 
            Meteor.settings.public.googleMaps.publicApiKey) {
          console.log('Returning API key from settings.json');
          return Meteor.settings.public.googleMaps.publicApiKey;
        }
        
        // Try to get from environment variables
        if (process.env.GOOGLE_MAPS_PUBLIC_API_KEY) {
          console.log('Returning API key from environment variable');
          return process.env.GOOGLE_MAPS_PUBLIC_API_KEY;
        }
        
        // For development, you can hardcode a key here
        // (but remember to remove it before committing to source control!)
        const devKey = '';  // You can add a key here for testing
        
        if (devKey) {
          console.log('Returning hardcoded dev API key');
          return devKey;
        }
        
        console.log('No Google Maps API key found');
        console.log('Try running:  export GOOGLE_MAPS_PUBLIC_API_KEY="12345"');
        return '';
    },
    'test.insertRestrooms': function(count = 10) {
      // Only allow in development
      if (process.env.NODE_ENV === 'production') {
        throw new Meteor.Error('not-allowed', 'Test data can only be created in development mode');
      }
      
      console.log(`Inserting ${count} test restrooms`);
      
      const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Philadelphia', 
                    'Phoenix', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'];
      
      const states = ['NY', 'CA', 'IL', 'TX', 'PA', 'AZ', 'TX', 'CA', 'TX', 'CA'];
      
      const restroomNames = [
        'Coffee Shop Restroom', 'Library Bathroom', 'Mall Facilities',
        'Restaurant Restroom', 'Gas Station Toilet', 'Park Bathroom',
        'Museum Facilities', 'Theater Restroom', 'Hotel Bathroom',
        'Gym Restroom', 'University Facilities', 'Hospital Bathroom',
        'Airport Restroom', 'Train Station Toilet', 'Office Building Bathroom'
      ];
      
      // Clear existing test data
      const removed = Restrooms.removeAsync({ isTestData: true });
      console.log(`Removed ${removed} existing test restrooms`);
      
      // Insert new test data
      for (let i = 0; i < count; i++) {
        const cityIndex = i % cities.length;
        const nameIndex = i % restroomNames.length;
        
        Restrooms.insertAsync({
          name: `${restroomNames[nameIndex]} ${i + 1}`,
          street: `${100 + i} Main St`,
          city: cities[cityIndex],
          state: states[cityIndex],
          country: 'United States',
          accessible: Math.random() > 0.5,
          unisex: Math.random() > 0.3,
          changing_table: Math.random() > 0.7,
          directions: 'Enter through the main door and turn right.',
          comment: 'Clean and well-maintained.',
          latitude: 40 + (Math.random() * 10 - 5),
          longitude: -74 + (Math.random() * 10 - 5),
          upvote: Math.floor(Math.random() * 50),
          downvote: Math.floor(Math.random() * 10),
          approved: true,
          edit_id: `test-${i}`,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
          updatedAt: new Date(),
          isTestData: true // Mark as test data for easy cleanup
        });
      }
      
      return { success: true, count };
    },
    
    'test.clearTestData': function() {
      if (process.env.NODE_ENV === 'production') {
        throw new Meteor.Error('not-allowed', 'Test data can only be removed in development mode');
      }
      
      const removed = Restrooms.removeAsync({ isTestData: true });
      console.log(`Removed ${removed} test restrooms`);
      
      return { success: true, count: removed };
    }
  });
}