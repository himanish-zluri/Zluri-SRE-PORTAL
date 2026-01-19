import { ROLES, Role, ELEVATED_ROLES, hasElevatedAccess } from '../../constants/roles';

describe('Roles Constants', () => {
  describe('ROLES', () => {
    it('should have correct role values', () => {
      expect(ROLES.DEVELOPER).toBe('DEVELOPER');
      expect(ROLES.MANAGER).toBe('MANAGER');
      expect(ROLES.ADMIN).toBe('ADMIN');
    });

    it('should be a const assertion object', () => {
      // Test that ROLES is properly typed as const
      expect(typeof ROLES).toBe('object');
      expect(ROLES).toBeDefined();
    });
  });

  describe('ELEVATED_ROLES', () => {
    it('should contain manager and admin roles', () => {
      expect(ELEVATED_ROLES).toEqual([ROLES.MANAGER, ROLES.ADMIN]);
      expect(ELEVATED_ROLES).toHaveLength(2);
    });

    it('should not contain developer role', () => {
      expect(ELEVATED_ROLES).not.toContain(ROLES.DEVELOPER);
    });
  });

  describe('hasElevatedAccess', () => {
    it('should return true for manager role', () => {
      expect(hasElevatedAccess(ROLES.MANAGER)).toBe(true);
    });

    it('should return true for admin role', () => {
      expect(hasElevatedAccess(ROLES.ADMIN)).toBe(true);
    });

    it('should return false for developer role', () => {
      expect(hasElevatedAccess(ROLES.DEVELOPER)).toBe(false);
    });

    it('should handle all role types correctly', () => {
      const allRoles: Role[] = [ROLES.DEVELOPER, ROLES.MANAGER, ROLES.ADMIN];
      
      allRoles.forEach(role => {
        const result = hasElevatedAccess(role);
        expect(typeof result).toBe('boolean');
        
        if (role === ROLES.DEVELOPER) {
          expect(result).toBe(false);
        } else {
          expect(result).toBe(true);
        }
      });
    });

    it('should test both branches of the function', () => {
      // Test the true branch
      expect(hasElevatedAccess(ROLES.MANAGER)).toBe(true);
      expect(hasElevatedAccess(ROLES.ADMIN)).toBe(true);
      
      // Test the false branch
      expect(hasElevatedAccess(ROLES.DEVELOPER)).toBe(false);
    });
  });

  describe('Type checking', () => {
    it('should have correct Role type values', () => {
      const developerRole: Role = ROLES.DEVELOPER;
      const managerRole: Role = ROLES.MANAGER;
      const adminRole: Role = ROLES.ADMIN;

      expect(developerRole).toBe('DEVELOPER');
      expect(managerRole).toBe('MANAGER');
      expect(adminRole).toBe('ADMIN');
    });

    it('should work with Role type in function parameters', () => {
      const testRole = (role: Role): string => {
        return `Role: ${role}`;
      };

      expect(testRole(ROLES.DEVELOPER)).toBe('Role: DEVELOPER');
      expect(testRole(ROLES.MANAGER)).toBe('Role: MANAGER');
      expect(testRole(ROLES.ADMIN)).toBe('Role: ADMIN');
    });
  });
});