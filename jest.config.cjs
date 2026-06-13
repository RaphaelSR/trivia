module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    // vite-env.ts usa import.meta.env (sintaxe Vite, inválida em CJS);
    // nos testes ele é trocado pelo stub que lê process.env.
    'vite-env$': '<rootDir>/src/shared/services/vite-env.jest.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  transform: {
    '^.+\\.tsx?$': [require.resolve('ts-jest'), {
      // Type-checking is handled by `tsc --noEmit` in CI; disabling here prevents
      // import.meta.env errors (Vite-only) from failing jest compilation.
      diagnostics: false,
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        resolveJsonModule: true,
        baseUrl: '.',
        paths: {
          '@/*': ['./src/*'],
        },
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/app/providers/AppProviders.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
}
