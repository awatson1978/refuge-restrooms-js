// server/startup/hydration.js
import { Meteor } from 'meteor/meteor';
import { get, set } from 'lodash';

Meteor.startup(function() {
  console.log('Initializing hydration settings...');

  // Set up hydration settings from environment variables
  if (process.env.ENABLE_HYDRATION !== undefined) {
    // Fix: Properly parse the environment variable
    const enableHydration = process.env.ENABLE_HYDRATION === '1' || 
                           process.env.ENABLE_HYDRATION.toLowerCase() === 'true';
    
    // Ensure settings structure exists
    if (!Meteor.settings) {
      Meteor.settings = {};
    }
    
    if (!Meteor.settings.private) {
      Meteor.settings.private = {};
    }
    
    // Set the hydration setting
    set(Meteor.settings, 'private.enableHydration', enableHydration);
    
    console.log(`Hydration ${enableHydration ? 'enabled' : 'disabled'} from environment variable (${process.env.ENABLE_HYDRATION})`);
  } else if (get(Meteor, 'settings.private.enableHydration') !== undefined) {
    console.log(`Hydration ${get(Meteor, 'settings.private.enableHydration') ? 'enabled' : 'disabled'} from settings.json`);
  } else {
    // Default to enabled if not specified (changed from disabled)
    if (!Meteor.settings) {
      Meteor.settings = {};
    }
    
    if (!Meteor.settings.private) {
      Meteor.settings.private = {};
    }
    
    set(Meteor.settings, 'private.enableHydration', true);
    console.log('Hydration enabled by default');
  }
  
  // Set up production API settings
  if (!get(Meteor, 'settings.public')) {
    set(Meteor, 'settings.public', {});
  }
  
  if (!get(Meteor, 'settings.public.production')) {
    set(Meteor, 'settings.public.production', {});
  }
  
  // Set production API URL if not already set
  if (!get(Meteor, 'settings.public.production.apiUrl')) {
    set(Meteor, 'settings.public.production.apiUrl', 'https://www.refugerestrooms.org/api/v1');
    console.log('Set default production API URL');
  }
  
  // Set production origin URL if not already set
  if (!get(Meteor, 'settings.public.production.originUrl')) {
    set(Meteor, 'settings.public.production.originUrl', 'https://www.refugerestrooms.org');
    console.log('Set default production origin URL');
  }
  
  // Check if we should use production API from environment
  if (process.env.USE_PRODUCTION_API !== undefined) {
    const useProductionApi = process.env.USE_PRODUCTION_API === '1' || 
                            process.env.USE_PRODUCTION_API.toLowerCase() === 'true';
    set(Meteor, 'settings.public.useProductionAPI', useProductionApi);
    console.log(`Production API ${useProductionApi ? 'enabled' : 'disabled'} from environment variable`);
  } else if (get(Meteor, 'settings.public.useProductionAPI') === undefined) {
    // Default to true
    set(Meteor, 'settings.public.useProductionAPI', true);
    console.log('Production API enabled by default');
  }
});