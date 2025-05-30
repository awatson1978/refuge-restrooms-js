// imports/api/fhir/transforms/legacyApiTransform.js
import { get, set } from 'lodash';
import moment from 'moment';

/**
 * Transform legacy restroom API response to FHIR Location resource
 * @param {Object} legacyRestroom - Raw restroom data from legacy API
 * @returns {Object} FHIR Location resource
 */
export const legacyRestroomToFhir = function(legacyRestroom) {
  // Generate FHIR-compliant ID
  const legacyId = get(legacyRestroom, 'id');
  const fhirId = legacyId ? `legacy-${legacyId}` : `temp-${Date.now()}`;
  
  const fhirLocation = {
    resourceType: "Location",
    id: fhirId
  };

  // Meta information
  const meta = {
    versionId: "1",
    lastUpdated: moment().toDate(),
    profile: ["http://refugerestrooms.org/fhir/StructureDefinition/RestroomLocation"],
    source: "legacy-api"
  };
  
  const updatedAt = get(legacyRestroom, 'updated_at');
  if (updatedAt) {
    set(meta, 'lastUpdated', moment(updatedAt).toDate());
  }
  
  set(fhirLocation, 'meta', meta);

  // Core FHIR Location fields
  set(fhirLocation, 'status', 'active');
  set(fhirLocation, 'name', get(legacyRestroom, 'name', 'Unnamed Restroom'));
  
  // Identifiers for tracking legacy source
  const identifiers = [];
  
  if (legacyId) {
    identifiers.push({
      use: "secondary",
      system: "http://refugerestrooms.org/legacy-api",
      value: legacyId.toString()
    });
  }
  
  // Add edit_id if present
  const editId = get(legacyRestroom, 'edit_id');
  if (editId) {
    identifiers.push({
      use: "secondary", 
      system: "http://refugerestrooms.org/edit-id",
      value: editId.toString()
    });
  }
  
  if (identifiers.length > 0) {
    set(fhirLocation, 'identifier', identifiers);
  }

  // Address using FHIR Address datatype
  const address = {
    use: "work",
    type: "physical"
  };
  
  const street = get(legacyRestroom, 'street');
  if (street) {
    set(address, 'line', [street]);
  }
  
  const city = get(legacyRestroom, 'city');
  if (city) {
    set(address, 'city', city);
  }
  
  const state = get(legacyRestroom, 'state');
  if (state) {
    set(address, 'state', state);
  }
  
  const country = get(legacyRestroom, 'country', 'United States');
  set(address, 'country', country);
  
  set(fhirLocation, 'address', address);

  // Position from legacy lat/lng
  const lat = get(legacyRestroom, 'latitude');
  const lng = get(legacyRestroom, 'longitude');
  
  if (lat && lng) {
    set(fhirLocation, 'position', {
      latitude: parseFloat(lat),
      longitude: parseFloat(lng)
    });
  }

  // Physical type - all restrooms are buildings
  set(fhirLocation, 'physicalType', {
    coding: [{
      system: "http://terminology.hl7.org/CodeSystem/location-physical-type",
      code: "bu",
      display: "Building"
    }]
  });

  // Extensions for restroom-specific data
  const extensions = [];

  // Accessibility features extension
  const accessibilityExtension = {
    url: "http://refugerestrooms.org/fhir/StructureDefinition/accessibility-features",
    extension: [
      {
        url: "wheelchair-accessible",
        valueBoolean: get(legacyRestroom, 'accessible', false)
      },
      {
        url: "unisex-facility",
        valueBoolean: get(legacyRestroom, 'unisex', false)
      },
      {
        url: "changing-table",
        valueBoolean: get(legacyRestroom, 'changing_table', false)
      }
    ]
  };
  
  extensions.push(accessibilityExtension);

  // Facility details extension (directions and comments)
  const directions = get(legacyRestroom, 'directions', '');
  const comment = get(legacyRestroom, 'comment', '');
  
  if (directions || comment) {
    const facilityExtension = {
      url: "http://refugerestrooms.org/fhir/StructureDefinition/facility-details",
      extension: []
    };

    if (directions) {
      facilityExtension.extension.push({
        url: "directions",
        valueString: directions
      });
    }

    if (comment) {
      facilityExtension.extension.push({
        url: "comments",
        valueString: comment
      });
    }

    extensions.push(facilityExtension);
  }

  // Community rating extension
  const upvotes = get(legacyRestroom, 'upvote', 0);
  const downvotes = get(legacyRestroom, 'downvote', 0);
  
  const ratingExtension = {
    url: "http://refugerestrooms.org/fhir/StructureDefinition/community-rating",
    extension: [
      {
        url: "upvotes",
        valueInteger: parseInt(upvotes) || 0
      },
      {
        url: "downvotes",
        valueInteger: parseInt(downvotes) || 0
      }
    ]
  };
  
  extensions.push(ratingExtension);

  // Approval status extension
  const approvalExtension = {
    url: "http://refugerestrooms.org/fhir/StructureDefinition/approval-status",
    extension: [
      {
        url: "approved",
        valueBoolean: true // Assume legacy data is approved
      },
      {
        url: "from-hydration",
        valueBoolean: true
      }
    ]
  };
  
  extensions.push(approvalExtension);

  // Timestamps extension
  const createdAt = get(legacyRestroom, 'created_at');
  if (createdAt) {
    const timestampExtension = {
      url: "http://refugerestrooms.org/fhir/StructureDefinition/timestamps",
      extension: [
        {
          url: "created-at",
          valueDateTime: moment(createdAt).toISOString()
        }
      ]
    };
    
    extensions.push(timestampExtension);
  }

  set(fhirLocation, 'extension', extensions);

  return fhirLocation;
};

/**
 * Transform FHIR Location resource to legacy restroom format
 * Useful for maintaining compatibility with existing UI components
 * @param {Object} fhirLocation - FHIR Location resource
 * @returns {Object} Legacy restroom format
 */
export const fhirLocationToLegacy = function(fhirLocation) {
  const legacy = {};
  
  // Basic fields
  set(legacy, '_id', get(fhirLocation, 'id'));
  set(legacy, 'name', get(fhirLocation, 'name', ''));
  set(legacy, 'status', get(fhirLocation, 'status', 'active'));
  
  // Get legacy ID from identifiers
  const identifiers = get(fhirLocation, 'identifier', []);
  const legacyIdent = identifiers.find(function(ident) {
    return get(ident, 'system') === 'http://refugerestrooms.org/legacy-api';
  });
  
  if (legacyIdent) {
    set(legacy, 'productionId', get(legacyIdent, 'value'));
  }
  
  // Get edit_id from identifiers
  const editIdent = identifiers.find(function(ident) {
    return get(ident, 'system') === 'http://refugerestrooms.org/edit-id';
  });
  
  if (editIdent) {
    set(legacy, 'edit_id', get(editIdent, 'value'));
  }

  // Address
  const address = get(fhirLocation, 'address', {});
  set(legacy, 'street', get(address, 'line[0]', ''));
  set(legacy, 'city', get(address, 'city', ''));
  set(legacy, 'state', get(address, 'state', ''));
  set(legacy, 'country', get(address, 'country', ''));

  // Position
  const position = get(fhirLocation, 'position', {});
  const lat = get(position, 'latitude');
  const lng = get(position, 'longitude');
  
  if (lat && lng) {
    set(legacy, 'latitude', lat);
    set(legacy, 'longitude', lng);
    
    // Also create GeoJSON format for compatibility
    set(legacy, 'position', {
      type: 'Point',
      coordinates: [lng, lat] // GeoJSON uses [lng, lat] order
    });
  }

  // Extract accessibility features from extensions
  const extensions = get(fhirLocation, 'extension', []);
  
  const accessExt = extensions.find(function(ext) {
    return get(ext, 'url') === 'http://refugerestrooms.org/fhir/StructureDefinition/accessibility-features';
  });
  
  if (accessExt) {
    const subExtensions = get(accessExt, 'extension', []);
    
    subExtensions.forEach(function(subExt) {
      const url = get(subExt, 'url');
      const value = get(subExt, 'valueBoolean', false);
      
      if (url === 'wheelchair-accessible') {
        set(legacy, 'accessible', value);
      } else if (url === 'unisex-facility') {
        set(legacy, 'unisex', value);
      } else if (url === 'changing-table') {
        set(legacy, 'changing_table', value);
      }
    });
  }

  // Extract facility details from extensions
  const facilityExt = extensions.find(function(ext) {
    return get(ext, 'url') === 'http://refugerestrooms.org/fhir/StructureDefinition/facility-details';
  });
  
  if (facilityExt) {
    const subExtensions = get(facilityExt, 'extension', []);
    
    subExtensions.forEach(function(subExt) {
      const url = get(subExt, 'url');
      const value = get(subExt, 'valueString', '');
      
      if (url === 'directions') {
        set(legacy, 'directions', value);
      } else if (url === 'comments') {
        set(legacy, 'comment', value);
      }
    });
  }

  // Extract rating from extensions
  const ratingExt = extensions.find(function(ext) {
    return get(ext, 'url') === 'http://refugerestrooms.org/fhir/StructureDefinition/community-rating';
  });
  
  if (ratingExt) {
    const subExtensions = get(ratingExt, 'extension', []);
    
    subExtensions.forEach(function(subExt) {
      const url = get(subExt, 'url');
      const value = get(subExt, 'valueInteger', 0);
      
      if (url === 'upvotes') {
        set(legacy, 'upvote', value);
      } else if (url === 'downvotes') {
        set(legacy, 'downvote', value);
      }
    });
  }

  // Extract approval status
  const approvalExt = extensions.find(function(ext) {
    return get(ext, 'url') === 'http://refugerestrooms.org/fhir/StructureDefinition/approval-status';
  });
  
  if (approvalExt) {
    const subExtensions = get(approvalExt, 'extension', []);
    
    const approvedExt = subExtensions.find(function(subExt) {
      return get(subExt, 'url') === 'approved';
    });
    
    const hydrationExt = subExtensions.find(function(subExt) {
      return get(subExt, 'url') === 'from-hydration';
    });
    
    if (approvedExt) {
      set(legacy, 'approved', get(approvedExt, 'valueBoolean', false));
    }
    
    if (hydrationExt) {
      set(legacy, 'fromHydration', get(hydrationExt, 'valueBoolean', false));
    }
  }

  // Extract timestamps
  const timestampExt = extensions.find(function(ext) {
    return get(ext, 'url') === 'http://refugerestrooms.org/fhir/StructureDefinition/timestamps';
  });
  
  if (timestampExt) {
    const subExtensions = get(timestampExt, 'extension', []);
    const createdExt = subExtensions.find(function(subExt) {
      return get(subExt, 'url') === 'created-at';
    });
    
    if (createdExt) {
      set(legacy, 'createdAt', new Date(get(createdExt, 'valueDateTime')));
    }
  }
  
  // Updated timestamp from meta
  const lastUpdated = get(fhirLocation, 'meta.lastUpdated');
  if (lastUpdated) {
    set(legacy, 'updatedAt', new Date(lastUpdated));
  }

  return legacy;
};

/**
 * Validate if an object looks like a legacy restroom
 * @param {Object} obj - Object to validate
 * @returns {Boolean} true if looks like legacy format
 */
export const isLegacyFormat = function(obj) {
  return obj && (
    get(obj, 'id') !== undefined ||
    get(obj, 'latitude') !== undefined ||
    get(obj, 'upvote') !== undefined
  );
};

/**
 * Validate if an object is a FHIR Location
 * @param {Object} obj - Object to validate  
 * @returns {Boolean} true if FHIR Location
 */
export const isFhirLocation = function(obj) {
  return obj && get(obj, 'resourceType') === 'Location';
};

export default {
  legacyRestroomToFhir,
  fhirLocationToLegacy,
  isLegacyFormat,
  isFhirLocation
};