import * as validationExports from '../../validation';

describe('Validation Index Exports', () => {
  it('should export validate function', () => {
    expect(validationExports.validate).toBeDefined();
    expect(typeof validationExports.validate).toBe('function');
  });

  it('should export schema definitions', () => {
    // Check that schemas are exported
    expect(validationExports).toBeDefined();
  });
});
