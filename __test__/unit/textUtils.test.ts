import { buildDisputeText, endWithPeriod } from '@/lib/textUtils';

describe('textUtils', () => {
   describe('endWithPeriod', () => {
      it('returns empty string for empty input', () => {
         expect(endWithPeriod('')).toBe('');
         expect(endWithPeriod('   ')).toBe('');
      });

      it('adds a period when missing punctuation', () => {
         expect(endWithPeriod('Hello world')).toBe('Hello world.');
         expect(endWithPeriod('  Hello world  ')).toBe('Hello world.');
      });

      it('keeps existing punctuation', () => {
         expect(endWithPeriod('Hello.')).toBe('Hello.');
         expect(endWithPeriod('Hello!')).toBe('Hello!');
         expect(endWithPeriod('Hello?')).toBe('Hello?');
      });
   });

   describe('buildDisputeText', () => {
      it('joins evidence, alternatives, and usefulness into a paragraph', () => {
         const text = buildDisputeText({
            evidence: 'I missed the deadline',
            alternatives: 'I can ask for help',
            usefulness: 'It shows where I need support',
            energy: '',
         });

         expect(text).toBe(
            'I missed the deadline. I can ask for help. It shows where I need support.'
         );
      });
   });
});
