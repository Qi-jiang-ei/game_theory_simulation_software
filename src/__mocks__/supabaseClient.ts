// src/__mocks__/supabaseClient.ts

// Mock supabase object
export const supabase = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
  // Add other potentially used supabase client methods or properties here
  rest: { // Mock the rest property to satisfy type checks
    interceptors: {},
  },
};

// Mock supabaseAdmin object (if used elsewhere)
export const supabaseAdmin = {};

// If you have default export in supabaseClient, mock it as well
// export default supabase; 