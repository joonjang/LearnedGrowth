// No top-level variables!
jest.mock('uuid', () => {
   let counter = 0; // <-- inside the factory, so it's allowed
   return {
      v4: jest.fn(() => `mockUUID-${counter++}`),
      __reset: () => {
         counter = 0;
      },
   };
});

