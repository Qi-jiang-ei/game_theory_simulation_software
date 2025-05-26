/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  globals: {
    'import.meta': {
      env: {
        VITE_SUPABASE_URL: 'mock_supabase_url',
        VITE_SUPABASE_ANON_KEY: 'mock_supabase_anon_key',
        VITE_SUPABASE_SERVICE_ROLE_KEY: 'mock_supabase_service_role_key',
      },
    },
  },
  moduleNameMapper: {
    '^.*\\/lib\\/supabaseClient$': '<rootDir>/src/__mocks__/supabaseClient.ts',
  },
};

export default config; 