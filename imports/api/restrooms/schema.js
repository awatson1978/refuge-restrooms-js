// imports/api/restrooms/schema.js
import SimpleSchema from 'simpl-schema';

// FHIR-inspired Location resource for restrooms
export const RestroomSchema = new SimpleSchema({
  // Basic identification and metadata
  _id: { type: String, optional: true },
  name: { type: String, required: true },
  status: {
    type: String,
    allowedValues: ['active', 'inactive', 'pending-review'],
    defaultValue: 'pending-review'
  },
  edit_id: { type: String, optional: true },
  approved: { type: Boolean, defaultValue: false },
  
  // Address information
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  
  // Geolocation in GeoJSON format
  position: {
    type: Object,
    blackbox: true, // Allow GeoJSON without strict validation
    optional: true
  },
  'position.type': {
    type: String,
    allowedValues: ['Point'],
    optional: true
  },
  'position.coordinates': {
    type: Array,
    optional: true
  },
  'position.coordinates.$': {
    type: Number
  },
  
  // Keep legacy fields for backward compatibility (optional)
  latitude: { type: Number, optional: true },
  longitude: { type: Number, optional: true },
  
  // Features
  accessible: { type: Boolean, defaultValue: false },
  unisex: { type: Boolean, defaultValue: false },
  changing_table: { type: Boolean, defaultValue: false },
  
  // User-provided content
  directions: { type: String, optional: true },
  comment: { type: String, optional: true },
  
  // Voting/rating
  upvote: { type: SimpleSchema.Integer, defaultValue: 0 },
  downvote: { type: SimpleSchema.Integer, defaultValue: 0 },
  
  // For syncing with production API
  productionId: { type: String, optional: true },
  fromHydration: { type: Boolean, optional: true },
  
  // Timestamps
  createdAt: { type: Date, defaultValue: new Date() },
  updatedAt: { type: Date, defaultValue: new Date() }
});