// Weekly symptom check, adapted from the symptom severity scale of the Boston Carpal
// Tunnel Questionnaire (Levine et al., 1993). Eleven items scored 1 (none) to 5 (worst);
// the score is their mean. Used here to track change over time, not to diagnose.

const severity = ['None', 'Mild', 'Moderate', 'Severe', 'Very severe'];
const nightly = ['Never', 'Once', '2 or 3 times', '4 or 5 times', 'More than 5 times'];

export const ASSESSMENT_QUESTIONS: { id: number; text: string; options: string[] }[] = [
  { id: 1, text: 'How bad is the hand or wrist pain you have at night?', options: severity },
  {
    id: 2,
    text: 'Over the past two weeks, how often did hand or wrist pain wake you in a typical night?',
    options: nightly,
  },
  { id: 3, text: 'How much hand or wrist pain do you usually have during the day?', options: severity },
  {
    id: 4,
    text: 'How often do you get hand or wrist pain during the day?',
    options: ['Never', 'Once or twice a day', '3 to 5 times a day', 'More than 5 times a day', 'All the time'],
  },
  {
    id: 5,
    text: 'When daytime pain comes on, how long does it usually last?',
    options: ['I have no daytime pain', 'Under 10 minutes', '10 to 60 minutes', 'Over an hour', 'All day'],
  },
  { id: 6, text: 'How much numbness (loss of feeling) do you have in your hand?', options: severity },
  { id: 7, text: 'How much weakness do you have in your hand or wrist?', options: severity },
  { id: 8, text: 'How much tingling do you have in your hand?', options: severity },
  { id: 9, text: 'How bad is numbness or tingling at night?', options: severity },
  {
    id: 10,
    text: 'Over the past two weeks, how often did numbness or tingling wake you in a typical night?',
    options: nightly,
  },
  {
    id: 11,
    text: 'How hard is it to grip and use small objects such as keys or pens?',
    options: ['No difficulty', 'A little difficulty', 'Moderate difficulty', 'Severe difficulty', 'Very severe difficulty'],
  },
];

export function scoreAssessment(answers: number[]): number {
  const mean = answers.reduce((sum, value) => sum + value, 0) / answers.length;
  return Math.round(mean * 100) / 100;
}

export function severityBand(score: number): string {
  if (score <= 1) return 'No symptoms';
  if (score < 2) return 'Mild';
  if (score < 3) return 'Moderate';
  if (score < 4) return 'Severe';
  return 'Very severe';
}
