// imports/api/restrooms/collection.js
import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { RestroomSchema } from './schema';

export const Restrooms = new Mongo.Collection('restrooms');

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
  },
  
  // Get coordinates in [lat, lng] format (for convenience with APIs expecting this format)
  getCoordinates() {
    if (this.position && this.position.type === 'Point' && this.position.coordinates) {
      // GeoJSON stores as [lng, lat], but many APIs expect [lat, lng]
      return [this.position.coordinates[1], this.position.coordinates[0]];
    }
    return null;
  },
  
  // Distance calculation from a point
  distanceFrom(lat, lng, inKilometers = false) {
    if (!this.position || !this.position.coordinates) return null;
    
    // GeoJSON uses [longitude, latitude] order
    const restroomLng = this.position.coordinates[0];
    const restroomLat = this.position.coordinates[1];
    
    // Haversine formula
    const R = inKilometers ? 6371 : 3959; // Earth radius in km or miles
    const dLat = (lat - restroomLat) * Math.PI / 180;
    const dLng = (lng - restroomLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(restroomLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
};

// Apply helpers if the collection.helpers method is available
if (typeof Restrooms.helpers === 'function') {
  Restrooms.helpers(helpers);
} else {
  // Fallback if not available
  console.warn('Collection.helpers not available, using transform function');
  Restrooms._transform = function(doc) {
    Object.keys(helpers).forEach(key => {
      doc[key] = helpers[key].bind(doc);
    });
    return doc;
  };
}

// Create indexes on server startup
if (Meteor.isServer) {
  Meteor.startup(async () => {
    console.log('Setting up Restrooms collection indexes...');

    try {
      // Create a 2dsphere index for geospatial queries
      await Restrooms.rawCollection().createIndex(
        { position: '2dsphere' },
        { name: 'position_2dsphere' }
      );
      console.log('Created 2dsphere index for geospatial queries');
      
      // Create text index for search
      await Restrooms.rawCollection().createIndex(
        {
          name: "text",
          street: "text",
          city: "text",
          state: "text",
          comment: "text",
          directions: "text"
        },
        {
          weights: {
            name: 10,
            street: 5,
            city: 3,
            state: 2,
            comment: 1,
            directions: 1
          },
          name: "text_search_index"
        }
      );
      console.log('Created text index for search queries');
      
      // Create index for filtering by features
      await Restrooms.rawCollection().createIndex(
        { accessible: 1, unisex: 1, changing_table: 1 },
        { name: 'features_index' }
      );
      console.log('Created index for feature filtering');
      
      // Create index for approval status
      await Restrooms.rawCollection().createIndex(
        { approved: 1, status: 1 },
        { name: 'approval_status_index' }
      );
      console.log('Created index for approval status');
      
      // Create index for production ID (for hydration/sync)
      await Restrooms.rawCollection().createIndex(
        { productionId: 1 },
        { unique: true, sparse: true, name: 'production_id_index' }
      );
      console.log('Created unique index for production ID');
      
    } catch (error) {
      console.error('Error setting up indexes:', error);
    }
  });
}

// Attach schema if SimpleSchema is available
if (Restrooms.attachSchema) {
  Restrooms.attachSchema(RestroomSchema);
} else {
  console.warn('SimpleSchema not available, skipping schema attachment');
}

export default Restrooms;