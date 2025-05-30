// imports/api/fhir/index.js
// Main entry point for FHIR API system

// Export collections
export { FhirLocations } from './location/collection';

// Export schemas
export { FhirLocationSchema } from './location/schema';

// Export transforms
export { 
  legacyRestroomToFhir, 
  fhirLocationToLegacy,
  isLegacyFormat,
  isFhirLocation
} from './transforms/legacyApiTransform';

// Export services
export { FhirHydrationService } from './services/hydrationService';

// Re-export for convenience
import { FhirLocations } from './location/collection';
import { FhirHydrationService } from './services/hydrationService';
import { legacyRestroomToFhir, fhirLocationToLegacy } from './transforms/legacyApiTransform';

export default {
  FhirLocations,
  FhirHydrationService,
  transforms: {
    legacyRestroomToFhir,
    fhirLocationToLegacy
  }
};