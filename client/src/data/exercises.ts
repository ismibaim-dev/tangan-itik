// The exercise library. Seeded into the exercises table on startup (upserted by slug),
// so editing an entry here updates existing databases too.
//
// Doses are conservative starting points drawn from common carpal tunnel home programmes.
// They are not a substitute for a programme set by the user's own clinician.

export type ExerciseCategory = 'nerve_glide' | 'tendon_glide' | 'mobility' | 'stretch' | 'strength';

export interface ExerciseSeed {
  slug: string;
  name: string;
  category: ExerciseCategory;
  phase: 1 | 2 | 3;
  summary: string;
  steps: string[];
  sets: number;
  reps: number;
  holdSeconds: number;
  cue: string;
  restSeconds: number;
  equipment?: string;
  caution?: string;
}

export const exerciseSeeds: ExerciseSeed[] = [
  // Phase 1: calm symptoms and keep the nerve and tendons moving.
  {
    slug: 'median-nerve-glide',
    name: 'Median nerve glide',
    category: 'nerve_glide',
    phase: 1,
    summary: 'Moves the median nerve gently through the carpal tunnel to ease tingling and stiffness.',
    steps: [
      'Make a loose fist with your wrist straight and thumb resting over your fingers.',
      'Open your fingers straight, keeping the thumb close to the side of your hand.',
      'Bend your wrist back, keeping the fingers straight.',
      'Move your thumb out to the side, away from your palm.',
      'Turn your forearm so your palm faces up.',
      'If comfortable, use the other hand to ease the thumb back a little further.',
    ],
    sets: 1,
    reps: 5,
    holdSeconds: 18,
    cue: 'Glide through',
    restSeconds: 10,
    caution: 'Move slowly. A mild pulling feeling is fine; stop if tingling builds or lingers afterwards.',
  },
  {
    slug: 'tendon-glides',
    name: 'Tendon glides',
    category: 'tendon_glide',
    phase: 1,
    summary: 'Five hand shapes that help the finger tendons slide smoothly past each other.',
    steps: [
      'Start with your fingers straight and together, wrist neutral.',
      'Hook fist: bend the top two finger joints, keeping the knuckles straight.',
      'Full fist: curl into a fist with your thumb on the outside.',
      'Tabletop: bend at the knuckles only, fingers straight like a table.',
      'Straight fist: bend the knuckles and middle joints, fingertips touching the palm base.',
      'Hold each shape for about 3 seconds before moving to the next.',
    ],
    sets: 1,
    reps: 5,
    holdSeconds: 15,
    cue: 'Flow through shapes',
    restSeconds: 10,
  },
  {
    slug: 'finger-fan',
    name: 'Finger fan',
    category: 'mobility',
    phase: 1,
    summary: 'Spreads the fingers to open the palm and reduce the urge to grip.',
    steps: [
      'Rest your forearm on a table, palm down.',
      'Spread your fingers as wide as is comfortable.',
      'Hold, then let the fingers relax together.',
    ],
    sets: 1,
    reps: 8,
    holdSeconds: 5,
    cue: 'Spread',
    restSeconds: 10,
  },
  {
    slug: 'thumb-touches',
    name: 'Thumb touches',
    category: 'mobility',
    phase: 1,
    summary: 'Touch the thumb to each fingertip to keep the thumb moving freely.',
    steps: [
      'Hold your hand up with fingers relaxed.',
      'Touch your thumb tip to your index fingertip, making an "O".',
      'Move on to the middle, ring and little fingers in turn.',
      'Work back to the index finger. That is one round.',
    ],
    sets: 1,
    reps: 5,
    holdSeconds: 6,
    cue: 'One round',
    restSeconds: 10,
  },
  {
    slug: 'wrist-circles',
    name: 'Wrist circles',
    category: 'mobility',
    phase: 1,
    summary: 'Slow, pain-free circles that keep the wrist from stiffening.',
    steps: [
      'Hold your forearm steady, hand relaxed in a loose fist.',
      'Draw slow, smooth circles with your knuckles.',
      'Do half the reps clockwise, half anticlockwise.',
    ],
    sets: 1,
    reps: 10,
    holdSeconds: 4,
    cue: 'Circle slowly',
    restSeconds: 10,
  },

  // Phase 2: restore flexibility around the wrist.
  {
    slug: 'wrist-flexor-stretch',
    name: 'Wrist flexor stretch',
    category: 'stretch',
    phase: 2,
    summary: 'Stretches the muscles on the palm side of the forearm.',
    steps: [
      'Hold your arm out in front, elbow straight and palm facing up.',
      'With your other hand, gently ease your fingers down and back toward you.',
      'Stop at a mild stretch in the forearm. Hold, then release slowly.',
    ],
    sets: 1,
    reps: 3,
    holdSeconds: 20,
    cue: 'Hold the stretch',
    restSeconds: 10,
    caution: 'Stretch should feel mild. Ease off if it brings on numbness or tingling.',
  },
  {
    slug: 'wrist-extensor-stretch',
    name: 'Wrist extensor stretch',
    category: 'stretch',
    phase: 2,
    summary: 'Stretches the muscles on the back of the forearm.',
    steps: [
      'Hold your arm out in front, elbow straight and palm facing down.',
      'With your other hand, gently bend your wrist down so the fingers point to the floor.',
      'Stop at a mild stretch. Hold, then release slowly.',
    ],
    sets: 1,
    reps: 3,
    holdSeconds: 20,
    cue: 'Hold the stretch',
    restSeconds: 10,
  },
  {
    slug: 'prayer-stretch',
    name: 'Prayer stretch',
    category: 'stretch',
    phase: 2,
    summary: 'A two-handed stretch for the wrists and palms.',
    steps: [
      'Press your palms together in front of your chest, fingers pointing up.',
      'Keeping the palms together, slowly lower your hands toward your waist.',
      'Stop when you feel a mild stretch under the forearms. Hold.',
    ],
    sets: 1,
    reps: 3,
    holdSeconds: 15,
    cue: 'Hold the stretch',
    restSeconds: 10,
    caution: 'This position bends the wrist back. Skip it if it reproduces your tingling.',
  },
  {
    slug: 'thumb-stretch',
    name: 'Thumb extension stretch',
    category: 'stretch',
    phase: 2,
    summary: 'Opens the web space and stretches the muscles at the base of the thumb.',
    steps: [
      'Rest your hand on a table, palm up.',
      'With your other hand, gently ease the thumb away from the index finger.',
      'Hold at a mild stretch across the base of the thumb.',
    ],
    sets: 1,
    reps: 3,
    holdSeconds: 15,
    cue: 'Hold the stretch',
    restSeconds: 10,
  },

  // Phase 3: rebuild grip and pinch strength.
  {
    slug: 'putty-grip',
    name: 'Putty squeeze',
    category: 'strength',
    phase: 3,
    summary: 'Builds grip strength with soft therapy putty or a stress ball.',
    steps: [
      'Hold soft putty or a stress ball in your palm.',
      'Squeeze with all your fingers at about half effort.',
      'Hold, then relax your grip fully.',
    ],
    sets: 2,
    reps: 10,
    holdSeconds: 3,
    cue: 'Squeeze',
    restSeconds: 30,
    equipment: 'Soft therapy putty or stress ball',
    caution: 'Use the softest putty you have. Stop if squeezing brings on tingling.',
  },
  {
    slug: 'pinch-strengthening',
    name: 'Pinch strengthening',
    category: 'strength',
    phase: 3,
    summary: 'Strengthens the thumb and fingertips for fine tasks like buttons and keys.',
    steps: [
      'Roll the putty into a small ball.',
      'Pinch it between your thumb and index fingertip.',
      'Release and repeat, moving to a new finger every few reps.',
    ],
    sets: 2,
    reps: 10,
    holdSeconds: 3,
    cue: 'Pinch',
    restSeconds: 30,
    equipment: 'Soft therapy putty',
  },
  {
    slug: 'finger-extension-band',
    name: 'Finger extension with band',
    category: 'strength',
    phase: 3,
    summary: 'Balances grip work by strengthening the muscles that open the hand.',
    steps: [
      'Place a light rubber band around your fingertips and thumb.',
      'Slowly open your fingers against the band.',
      'Hold briefly, then let the fingers come back together with control.',
    ],
    sets: 2,
    reps: 10,
    holdSeconds: 3,
    cue: 'Open',
    restSeconds: 30,
    equipment: 'Light rubber band',
  },
  {
    slug: 'wrist-curls',
    name: 'Light wrist curls',
    category: 'strength',
    phase: 3,
    summary: 'Gently loads the forearm muscles to support the wrist.',
    steps: [
      'Rest your forearm on a table with the wrist over the edge, palm up.',
      'Hold a light weight, such as a small water bottle (0.5 kg or less).',
      'Slowly curl the wrist up, then lower it with control.',
      'For the second set, turn your palm down and repeat.',
    ],
    sets: 2,
    reps: 10,
    holdSeconds: 3,
    cue: 'Curl and lower',
    restSeconds: 30,
    equipment: 'Light weight (0.5 kg water bottle)',
    caution: 'Keep the movement slow and small. Stop if pain rises above a mild ache.',
  },
];
