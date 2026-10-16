import { validateIncidentForm, formatCoordinates } from '../../src/utils/incidentValidation';
import { IncidentType, LocationData } from '../../src/types/incident';

describe('Incident Validation Logic', () => {
  const validLocation: LocationData = {
    latitude: 6.9271,
    longitude: 79.8612,
    accuracy: 10,
  };

  describe('Positive Test Cases', () => {
    it('accepts completely valid incident data with photo', () => {
      const result = validateIncidentForm({
        type: 'snare',
        description: 'Wire snare trap found near waterhole',
        location: validLocation,
        photoUri: 'file:///path/to/evidence.jpg',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('accepts valid incident data without photo (photo is optional per business rule)', () => {
      const result = validateIncidentForm({
        type: 'carcass',
        description: 'Dead deer observed near fence',
        location: validLocation,
        photoUri: null,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('accepts each of the valid incident types', () => {
      const validTypes: IncidentType[] = ['snare', 'carcass', 'campsite', 'footprints'];

      validTypes.forEach((type) => {
        const result = validateIncidentForm({
          type,
          description: `Valid observation of ${type}`,
          location: validLocation,
        });
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Negative & Edge Test Cases - Incident Type', () => {
    it('rejects missing or null incident type', () => {
      const result = validateIncidentForm({
        type: null,
        description: 'Found suspicious footprints',
        location: validLocation,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.type).toBe('Incident type is required');
    });
  });

  describe('Negative & Edge Test Cases - Description', () => {
    it('rejects empty description string', () => {
      const result = validateIncidentForm({
        type: 'snare',
        description: '',
        location: validLocation,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.description).toBe('Description is required');
    });

    it('rejects description consisting solely of whitespace', () => {
      const result = validateIncidentForm({
        type: 'campsite',
        description: '     \n\t   ',
        location: validLocation,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.description).toBe('Description is required');
    });

    it('accepts minimal valid 1-character description after trimming', () => {
      const result = validateIncidentForm({
        type: 'footprints',
        description: ' A ',
        location: validLocation,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors.description).toBeUndefined();
    });
  });

  describe('Negative & Edge Test Cases - Location Coordinates', () => {
    it('rejects null location', () => {
      const result = validateIncidentForm({
        type: 'snare',
        description: 'Trap spotted',
        location: null,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.location).toBe('Valid location coordinates are required');
    });

    it('rejects NaN latitude or longitude', () => {
      const result = validateIncidentForm({
        type: 'snare',
        description: 'Trap spotted',
        location: { latitude: NaN, longitude: 79.86, accuracy: 5 },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.location).toBe('Valid location coordinates are required');
    });

    it('rejects out-of-boundary latitude (> 90 or < -90)', () => {
      const resultAbove = validateIncidentForm({
        type: 'snare',
        description: 'Trap spotted',
        location: { latitude: 91.0, longitude: 79.86, accuracy: 5 },
      });
      const resultBelow = validateIncidentForm({
        type: 'snare',
        description: 'Trap spotted',
        location: { latitude: -91.0, longitude: 79.86, accuracy: 5 },
      });

      expect(resultAbove.isValid).toBe(false);
      expect(resultBelow.isValid).toBe(false);
    });

    it('rejects out-of-boundary longitude (> 180 or < -180)', () => {
      const resultAbove = validateIncidentForm({
        type: 'snare',
        description: 'Trap spotted',
        location: { latitude: 6.9, longitude: 181.0, accuracy: 5 },
      });
      const resultBelow = validateIncidentForm({
        type: 'snare',
        description: 'Trap spotted',
        location: { latitude: 6.9, longitude: -181.0, accuracy: 5 },
      });

      expect(resultAbove.isValid).toBe(false);
      expect(resultBelow.isValid).toBe(false);
    });

    it('accepts boundary latitude and longitude values (-90, 90, -180, 180)', () => {
      const resultEdge = validateIncidentForm({
        type: 'snare',
        description: 'Polar observation',
        location: { latitude: 90.0, longitude: 180.0, accuracy: 0 },
      });

      expect(resultEdge.isValid).toBe(true);
    });
  });

  describe('formatCoordinates utility', () => {
    it('correctly formats floating numbers to 5 decimal places', () => {
      const formatted = formatCoordinates(6.927079, 79.861244);
      expect(formatted).toBe('Lat: 6.92708, Lng: 79.86124');
    });

    it('returns N/A when given invalid coordinates', () => {
      expect(formatCoordinates(NaN, 79.86)).toBe('N/A');
      expect(formatCoordinates(6.92, NaN)).toBe('N/A');
    });
  });
});
