// imports/api/restrooms/index.js
// Fixed singleton pattern without using Mongo._getCollection

import { Mongo } from 'meteor/mongo';

// Create a more reliable singleton pattern
// Use a module-level variable to store the collection reference
let _collection;

// We'll use a function to get or create the collection
function getRestroomsCollection() {
  if (_collection) {
    return _collection;
  }
  
  // Try-catch to handle the case where the collection might already exist
  try {
    _collection = new Mongo.Collection('restrooms');
  } catch (e) {
    // If the collection already exists, find it in Mongo.Collection instances
    // This is a workaround since there's no direct API to get existing collections
    console.warn('Collection already exists, attempting to retrieve it:', e.message);
    
    // Just return a new client-side collection that doesn't actually create
    // anything on the server but connects to the existing one
    _collection = new Mongo.Collection('restrooms', { _suppressSameNameError: true });
  }
  
  return _collection;
}

// Get the singleton collection
const Restrooms = getRestroomsCollection();

// Helper methods for the collection
const helpers = {
  // Get full address as a string
  fullAddress() {
    return `${this.street}, ${this.city}, ${this.state}${this.country ? ', ' + this.country : ''}`;
  },
  
  // Check if restroom has been rated
  rated() {
    return this.upvote > 0 || this.downvote > 0;
  },
  
  // Calculate rating percentage
  ratingPercentage() {
    if (!this.rated()) return 0;
    return (this.upvote / (this.upvote + this.downvote)) * 100;
  }
};

// Apply helpers to each restroom document if possible
if (typeof Restrooms.helpers === 'function') {
  Restrooms.helpers(helpers);
} else {
  // Fallback if Collection.helpers isn't available
  try {
    // Try to add a transform function
    Restrooms._transform = function(doc) {
      Object.keys(helpers).forEach(key => {
        doc[key] = helpers[key].bind(doc);
      });
      return doc;
    };
  } catch (e) {
    console.warn('Could not add transform to Restrooms collection:', e.message);
  }
}

// Export the singleton collection
export { Restrooms };
export default Restrooms;