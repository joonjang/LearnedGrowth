import DisputeScreen from '@/app/dispute/[id]';
import type { LearnedGrowthResponse, LearnedGrowthResult } from '@/models/aiService';
import type { Entry } from '@/models/entry';
import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';

// --- MOCKS START ---

// 1. Mock Reanimated (Lightweight version)
jest.mock('react-native-reanimated', () => {
   // eslint-disable-next-line @typescript-eslint/no-require-imports
   const { View } = require('react-native');
   return {
      __esModule: true,
      default: {
         View: View,
         createAnimatedComponent: (component: any) => component,
         call: () => {},
      },
      useSharedValue: (initialValue: any) => ({ value: initialValue }),
      useAnimatedStyle: () => ({}),
      withTiming: (toValue: any) => toValue,
      withSpring: (toValue: any) => toValue,
   };
});

// 2. Mock Navigation (FIX for "Couldn't find a navigation object")
jest.mock('@react-navigation/native', () => {
   return {
      ...jest.requireActual('@react-navigation/native'),
      useIsFocused: jest.fn(() => true), // Force "focused" state
      useNavigation: jest.fn(() => ({})), 
   };
});

// 3. Mock Keyboard Controller
jest.mock('react-native-keyboard-controller', () => {
   // eslint-disable-next-line @typescript-eslint/no-require-imports
   const { View } = require('react-native');
   return {
      KeyboardController: {
         isVisible: jest.fn(() => false),
      },
      KeyboardEvents: {
         addListener: jest.fn(() => ({ remove: jest.fn() })),
      },
      KeyboardAvoidingView: ({ children, ...props }: any) => (
         <View {...props}>{children}</View>
      ),
   };
});

jest.mock('react-native-safe-area-context', () => ({
   useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
   useLocalSearchParams: jest.fn(),
   router: { back: jest.fn() },
}));

jest.mock('@/hooks/useEntries', () => ({
   useEntries: jest.fn(),
}));

jest.mock('@/hooks/useAbcAi', () => ({
   useAbcAi: jest.fn(),
}));

jest.mock('@/providers/PreferencesProvider', () => ({
   usePreferences: jest.fn(),
}));

jest.mock('lottie-react-native', () => {
   return function MockLottieView() {
      return null;
   };
});
// --- MOCKS END ---

type Deferred<T> = {
   promise: Promise<T>;
   resolve: (value: T) => void;
};

function createDeferred<T>(): Deferred<T> {
   let resolve!: (value: T) => void;
   const promise = new Promise<T>((res) => {
      resolve = res;
   });
   return { promise, resolve };
}

describe('DisputeScreen', () => {
   beforeEach(() => {
      jest.clearAllMocks();
   });

   it('should save AI response to entry even if screen unmounts during loading', async () => {
      const entry: Entry = {
         id: 'entry-1',
         adversity: 'Test adversity',
         belief: 'Test belief',
         consequence: 'Test consequence',
         dispute: '',
         energy: '',
         aiResponse: null,
         aiRetryCount: 0,
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString(),
         accountId: null,
         dirtySince: null,
         isDeleted: false,
      };

      const aiResponse: LearnedGrowthResponse = {
         safety: { isCrisis: false, crisisMessage: null },
         meta: {
            category: null,
            tags: [],
            sentimentScore: null,
            optimismScore: null,
         },
         analysis: {
            dimensions: {
               permanence: {
                  score: 'optimistic',
                  detectedPhrase: null,
                  insight: null,
               },
               pervasiveness: {
                  score: 'optimistic',
                  detectedPhrase: null,
                  insight: null,
               },
               personalization: {
                  score: 'optimistic',
                  detectedPhrase: null,
                  insight: null,
               },
            },
            emotionalLogic: 'Some logic',
         },
         suggestions: {
            evidenceQuestion: null,
            alternativesQuestion: null,
            usefulnessQuestion: null,
            counterBelief: null,
         },
      };

      const aiResult: LearnedGrowthResult = {
         data: aiResponse,
         meta: { source: 'local' },
      };

      const deferred = createDeferred<LearnedGrowthResult>();
      const mockAnalyze = jest.fn(() => deferred.promise);
      const mockUpdateEntry = jest.fn().mockResolvedValue(undefined);

      const { useEntries } = jest.requireMock('@/hooks/useEntries');
      useEntries.mockReturnValue({
         getEntryById: jest.fn(() => entry),
         updateEntry: mockUpdateEntry,
      });

      const { useAbcAi } = jest.requireMock('@/hooks/useAbcAi');
      useAbcAi.mockReturnValue({
         analyze: mockAnalyze,
         lastResult: null,
         loading: true,
         error: null,
         ready: true,
         streamText: '',
      });

      const { usePreferences } = jest.requireMock('@/providers/PreferencesProvider');
      usePreferences.mockReturnValue({
         showAiAnalysis: true,
         hapticsEnabled: false,
         hapticsAvailable: false,
         triggerHaptic: jest.fn(),
      });

      const { useLocalSearchParams } = jest.requireMock('expo-router');
      useLocalSearchParams.mockReturnValue({
         id: entry.id,
         refresh: 'true',
         view: 'analysis',
      });

      const { getByText, unmount } = render(<DisputeScreen />);

      // Verify loading state
      await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(1));
      expect(getByText(/analyzing/i)).toBeTruthy();

      // Trigger the "User Leaves" scenario
      unmount();

      // Resolve the AI promise (simulating it finished in background)
      deferred.resolve(aiResult);
      await act(async () => {
         await deferred.promise;
      });

      // Assert data was still saved
      await waitFor(() => {
         expect(mockUpdateEntry).toHaveBeenCalledWith(entry.id, {
            aiResponse: aiResult.data,
            aiRetryCount: 1,
         });
      });
   });
});
