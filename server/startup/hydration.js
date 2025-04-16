// server/startup/hydration.js
import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  console.log('Initializing hydration settings...');

  // Set up hydration settings from environment variables
  if (process.env.ENABLE_HYDRATION) {
    const enableHydration = process.env.ENABLE_HYDRATION.toLowerCase() === 'true';
    
    // Ensure settings structure exists
    if (!Meteor.settings) {
      Meteor.settings = {};
    }
    
    if (!Meteor.settings.private) {
      Meteor.settings.private = {};
    }
    
    // Set the hydration setting
    Meteor.settings.private.enableHydration = enableHydration;
    
    console.log(`Hydration ${enableHydration ? 'enabled' : 'disabled'} from environment variable`);
  } else if (Meteor.settings?.private?.enableHydration !== undefined) {
    console.log(`Hydration ${Meteor.settings.private.enableHydration ? 'enabled' : 'disabled'} from settings.json`);
  } else {
    // Default to disabled if not specified
    if (!Meteor.settings) {
      Meteor.settings = {};
    }
    
    if (!Meteor.settings.private) {
      Meteor.settings.private = {};
    }
    
    Meteor.settings.private.enableHydration = false;
    console.log('Hydration disabled by default');
  }
  
  // Set up production API settings
  if (!Meteor.settings.public) {
    Meteor.settings.public = {};
  }
  
  if (!Meteor.settings.public.production) {
    Meteor.settings.public.production = {};
  }
  
  // Set production API URL if not already set
  if (!Meteor.settings.public.production.apiUrl) {
    Meteor.settings.public.production.apiUrl = 'https://www.refugerestrooms.org/api/v1';
    console.log('Set default production API URL');
  }
  
  // Set production origin URL if not already set
  if (!Meteor.settings.public.production.originUrl) {
    Meteor.settings.public.production.originUrl = 'https://www.refugerestrooms.org';
    console.log('Set default production origin URL');
  }
  
  // Check if we should use production API from environment
  if (process.env.USE_PRODUCTION_API) {
    Meteor.settings.public.useProductionAPI = process.env.USE_PRODUCTION_API.toLowerCase() === 'true';
    console.log(`Production API ${Meteor.settings.public.useProductionAPI ? 'enabled' : 'disabled'} from environment variable`);
  } else if (Meteor.settings.public.useProductionAPI === undefined) {
    // Default to true
    Meteor.settings.public.useProductionAPI = true;
    console.log('Production API enabled by default');
  }
});