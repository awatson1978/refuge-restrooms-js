// imports/api/fhir/location/schema.js
import SimpleSchema from 'simpl-schema';

// FHIR Location resource schema for restroom locations
export const FhirLocationSchema = new SimpleSchema({
  // FHIR Base Resource fields
  resourceType: {
    type: String,
    allowedValues: ['Location'],
    defaultValue: 'Location'
  },
  
  id: { 
    type: String, 
    required: true 
  },
  
  meta: {
    type: Object,
    optional: true
  },
  'meta.versionId': {
    type: String,
    optional: true
  },
  'meta.lastUpdated': {
    type: Date,
    optional: true
  },
  'meta.profile': {
    type: Array,
    optional: true
  },
  'meta.profile.$': {
    type: String
  },
  'meta.source': {
    type: String,
    optional: true
  },
  
  // FHIR Location core fields
  identifier: {
    type: Array,
    optional: true
  },
  'identifier.$': {
    type: Object
  },
  'identifier.$.use': {
    type: String,
    allowedValues: ['usual', 'official', 'temp', 'secondary', 'old'],
    optional: true
  },
  'identifier.$.system': {
    type: String,
    optional: true
  },
  'identifier.$.value': {
    type: String,
    optional: true
  },
  
  status: {
    type: String,
    allowedValues: ['active', 'suspended', 'inactive'],
    defaultValue: 'active'
  },
  
  name: {
    type: String,
    required: true
  },
  
  // Address using FHIR Address datatype
  address: {
    type: Object,
    optional: true
  },
  'address.use': {
    type: String,
    allowedValues: ['home', 'work', 'temp', 'old', 'billing'],
    defaultValue: 'work'
  },
  'address.type': {
    type: String,
    allowedValues: ['postal', 'physical', 'both'],
    defaultValue: 'physical'
  },
  'address.line': {
    type: Array,
    optional: true
  },
  'address.line.$': {
    type: String
  },
  'address.city': {
    type: String,
    optional: true
  },
  'address.state': {
    type: String,
    optional: true
  },
  'address.postalCode': {
    type: String,
    optional: true
  },
  'address.country': {
    type: String,
    optional: true
  },
  
  // Position using FHIR Location.position
  position: {
    type: Object,
    optional: true
  },
  'position.longitude': {
    type: Number,
    decimal: true,
    optional: true
  },
  'position.latitude': {
    type: Number,
    decimal: true,
    optional: true
  },
  'position.altitude': {
    type: Number,
    decimal: true,
    optional: true
  },
  
  // Physical type
  physicalType: {
    type: Object,
    optional: true
  },
  'physicalType.coding': {
    type: Array,
    optional: true
  },
  'physicalType.coding.$': {
    type: Object
  },
  'physicalType.coding.$.system': {
    type: String,
    optional: true
  },
  'physicalType.coding.$.code': {
    type: String,
    optional: true
  },
  'physicalType.coding.$.display': {
    type: String,
    optional: true
  },
  
  // Extensions for restroom-specific features
  extension: {
    type: Array,
    optional: true
  },
  'extension.$': {
    type: Object,
    blackbox: true // Allow any extension structure
  }
});

// Extension schemas for validation (optional - can validate manually)
export const AccessibilityFeaturesExtension = new SimpleSchema({
  url: {
    type: String,
    allowedValues: ['http://refugerestrooms.org/fhir/StructureDefinition/accessibility-features']
  },
  extension: {
    type: Array
  },
  'extension.$': {
    type: Object
  },
  'extension.$.url': {
    type: String,
    allowedValues: ['wheelchair-accessible', 'unisex-facility', 'changing-table']
  },
  'extension.$.valueBoolean': {
    type: Boolean
  }
});

export const FacilityDetailsExtension = new SimpleSchema({
  url: {
    type: String,
    allowedValues: ['http://refugerestrooms.org/fhir/StructureDefinition/facility-details']
  },
  extension: {
    type: Array
  },
  'extension.$': {
    type: Object
  },
  'extension.$.url': {
    type: String,
    allowedValues: ['directions', 'comments']
  },
  'extension.$.valueString': {
    type: String
  }
});

export const CommunityRatingExtension = new SimpleSchema({
  url: {
    type: String,
    allowedValues: ['http://refugerestrooms.org/fhir/StructureDefinition/community-rating']
  },
  extension: {
    type: Array
  },
  'extension.$': {
    type: Object
  },
  'extension.$.url': {
    type: String,
    allowedValues: ['upvotes', 'downvotes']
  },
  'extension.$.valueInteger': {
    type: SimpleSchema.Integer
  }
});

export default FhirLocationSchema;