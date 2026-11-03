const fs = require('fs');
const path = require('path');

// Jest 27 cannot resolve the package import used by Prisma Client 6.
const prismaPackage = fs.realpathSync(path.dirname(require.resolve('@prisma/client')));
const prismaEntry = path.resolve(prismaPackage, '../../.prisma/client/index.js');
const axiosEntry = require.resolve('axios', {
  paths: [require.resolve('@nestjs/axios')],
});

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: path.resolve(__dirname, '..'),
  testEnvironment: '<rootDir>/test/jest-node-environment.js',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^#main-entry-point$': prismaEntry,
    '^axios$': axiosEntry,
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts'],
  coverageDirectory: '<rootDir>/coverage/e2e',
};
