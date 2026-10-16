import { IncidentType, LocationData } from '../types/incident';

export interface IncidentValidationInput {
  type: IncidentType | null;
  description: string;
  location: LocationData | null;
  photoUri?: string | null;
}

export interface IncidentValidationResult {
  isValid: boolean;
  errors: {
    type?: string;
    description?: string;
    location?: string;
  };
}

/**
 * Validates the incident form input.
 * Matches the business logic in ReportIncidentScreen:
 * - type must not be null
 * - description must not be empty or whitespace only
 * - location must have valid numerical latitude and longitude
 */
export function validateIncidentForm(input: IncidentValidationInput): IncidentValidationResult {
  const errors: IncidentValidationResult['errors'] = {};

  if (!input.type) {
    errors.type = 'Incident type is required';
  }

  if (!input.description || input.description.trim().length === 0) {
    errors.description = 'Description is required';
  }

  if (
    !input.location ||
    typeof input.location.latitude !== 'number' ||
    typeof input.location.longitude !== 'number' ||
    isNaN(input.location.latitude) ||
    isNaN(input.location.longitude) ||
    input.location.latitude < -90 ||
    input.location.latitude > 90 ||
    input.location.longitude < -180 ||
    input.location.longitude > 180
  ) {
    errors.location = 'Valid location coordinates are required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Formats coordinates for display in review and incident details.
 */
export function formatCoordinates(lat: number, lng: number): string {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return 'N/A';
  }
  return `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
}
