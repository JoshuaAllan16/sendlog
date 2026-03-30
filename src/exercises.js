// exercises.js
// Add new exercises here or create new groups.
// Each exercise has: name (required), description (optional)

export const EXERCISES = [
  {
    group: "Fingerboard & Hangboard",
    exercises: [
      { name: "Dead Hangs", description: "Open hand or half crimp, both arms" },
      { name: "Max Hangs", description: "Heavy load, short duration (7–10s)" },
      { name: "Repeaters", description: "7s on / 3s off, multiple sets" },
      { name: "One-Arm Hangs", description: "Assisted or unassisted single-arm hangs" },
      { name: "Offset Hangs", description: "One hand higher than the other" },
      { name: "Pinch Hangs", description: "Pinch grip training on wooden block" },
      { name: "Sloper Hangs", description: "Sloper grip training" },
      { name: "3-Finger Drag", description: "Index, middle, ring fingers — full crimp avoided" },
    ],
  },
  {
    group: "Campus Board",
    exercises: [
      { name: "Double Dynos", description: "Match rungs with both hands simultaneously" },
      { name: "Laddering", description: "Up one rung at a time, alternating hands" },
      { name: "Bumping", description: "Skip a rung, catching with same hand" },
      { name: "Lock-offs", description: "Hold a rung at 90° elbow for max time" },
    ],
  },
  {
    group: "Pull Strength",
    exercises: [
      { name: "Pull-ups", description: "Full range of motion, controlled descent" },
      { name: "Chin-ups", description: "Supinated grip pull-ups" },
      { name: "Weighted Pull-ups", description: "Add weight via belt or vest" },
      { name: "One-Arm Pull-up Negatives", description: "Slow descent on one arm" },
      { name: "Archer Pull-ups", description: "Side-to-side pull-ups to build one-arm strength" },
      { name: "Typewriters", description: "Traverse side to side at the top of a pull-up" },
      { name: "Rows", description: "Horizontal pull — barbell, ring, or TRX" },
      { name: "Lock-offs", description: "Hold static mid-pull position for time" },
    ],
  },
  {
    group: "Push Strength (Antagonist)",
    exercises: [
      { name: "Push-ups", description: "Standard or elevated for increased range" },
      { name: "Dips", description: "Chest dips or tricep dips" },
      { name: "Overhead Press", description: "Dumbbell or barbell" },
      { name: "Bench Press", description: "Barbell or dumbbell flat or incline" },
      { name: "Tricep Extensions", description: "Cable, dumbbell, or band" },
      { name: "Face Pulls", description: "External rotation and rear delt work" },
    ],
  },
  {
    group: "Core",
    exercises: [
      { name: "Plank", description: "Hold for time — standard or side plank" },
      { name: "Hollow Body Hold", description: "Arms overhead, lower back pressed to floor" },
      { name: "L-Sit", description: "Legs horizontal, on parallettes or floor" },
      { name: "Dead Bug", description: "Opposite arm/leg extension with neutral spine" },
      { name: "Ab Wheel Rollouts", description: "From knees or standing" },
      { name: "Leg Raises", description: "Hanging or lying, control the descent" },
      { name: "Russian Twists", description: "Weighted or bodyweight rotational core" },
      { name: "Toes to Bar", description: "Hanging from a bar, raise toes to meet hands" },
    ],
  },
  {
    group: "Wrist & Forearm (Antagonist)",
    exercises: [
      { name: "Wrist Extensions", description: "Dumbbell or band — counters crimping" },
      { name: "Wrist Curls", description: "Dumbbell palm-up curls" },
      { name: "Pronation & Supination", description: "Rotate forearm with light dumbbell" },
      { name: "Theraband Exercises", description: "Full antagonist protocol with a band" },
      { name: "Finger Extensions", description: "Rubber band on fingers, spread apart" },
    ],
  },
  {
    group: "Lower Body",
    exercises: [
      { name: "Squats", description: "Bodyweight or weighted" },
      { name: "Lunges", description: "Forward, reverse, or lateral" },
      { name: "Step-ups", description: "Onto a box or bench" },
      { name: "Hip Thrusts", description: "Glute activation and strength" },
      { name: "Calf Raises", description: "Single or double leg" },
      { name: "Bulgarian Split Squats", description: "Rear foot elevated for balance and range" },
    ],
  },
  {
    group: "Flexibility & Mobility",
    exercises: [
      { name: "Hip Flexor Stretch", description: "Kneeling lunge stretch" },
      { name: "Hip Rotation", description: "Pigeon pose or figure-four" },
      { name: "Hamstring Stretch", description: "Standing or seated forward fold" },
      { name: "Shoulder Stretch", description: "Cross-body or overhead tricep stretch" },
      { name: "Wrist & Finger Stretches", description: "Extend, flex, and rotate" },
      { name: "Thoracic Rotation", description: "Seated or quadruped thoracic twist" },
      { name: "Hip 90/90 Stretch", description: "Both hips at 90° to open hip rotators" },
    ],
  },
  {
    group: "Cardio & Conditioning",
    exercises: [
      { name: "Running", description: "Steady state or intervals" },
      { name: "Cycling", description: "Stationary or outdoor" },
      { name: "Jump Rope", description: "Single jumps, double-unders, intervals" },
      { name: "Rowing Machine", description: "500m intervals or steady state" },
      { name: "Burpees", description: "Full body conditioning" },
      { name: "Box Jumps", description: "Explosive lower body power" },
    ],
  },
];
