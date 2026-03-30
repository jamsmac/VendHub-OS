/**
 * Jest manual mock for bcrypt.
 * The native bcrypt module has platform-specific binaries that may not
 * match the test runner's architecture. This mock provides the same API
 * surface used in application code.
 */

const bcrypt = {
  hash: jest.fn().mockResolvedValue("$2b$12$mockedHashValue"),
  hashSync: jest.fn().mockReturnValue("$2b$12$mockedHashValue"),
  compare: jest.fn().mockResolvedValue(true),
  compareSync: jest.fn().mockReturnValue(true),
  genSalt: jest.fn().mockResolvedValue("$2b$12$mockedSalt"),
  genSaltSync: jest.fn().mockReturnValue("$2b$12$mockedSalt"),
  getRounds: jest.fn().mockReturnValue(12),
};

export = bcrypt;
