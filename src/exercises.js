// exercises.js — Add exercises here or create new muscle groups.
// tags: "reps" = set/rep tracking, "weight" = weight per set, "timer" = countdown timer

export const EXERCISES = [
  {
    group: "Fingerboard & Hangboard",
    exercises: [
      { name: "Dead Hangs",        description: "Open hand or half crimp, both arms",             tags: ["timer"] },
      { name: "Max Hangs",         description: "Heavy load, short duration (7–10s)",             tags: ["timer", "weight"] },
      { name: "Repeaters",         description: "7s on / 3s off, multiple sets",                  tags: ["timer"] },
      { name: "One-Arm Hangs",     description: "Assisted or unassisted single-arm hangs",        tags: ["timer"] },
      { name: "Offset Hangs",      description: "One hand higher than the other",                 tags: ["timer"] },
      { name: "Pinch Hangs",       description: "Pinch grip on wooden block",                     tags: ["timer"] },
      { name: "Sloper Hangs",      description: "Sloper grip training",                           tags: ["timer"] },
      { name: "3-Finger Drag",     description: "Index, middle, ring fingers",                    tags: ["timer"] },
    ],
  },
  {
    group: "Campus Board",
    exercises: [
      { name: "Double Dynos",      description: "Match rungs with both hands simultaneously",     tags: ["reps"] },
      { name: "Laddering",         description: "Up one rung at a time, alternating hands",       tags: ["reps"] },
      { name: "Bumping",           description: "Skip a rung, catching with same hand",           tags: ["reps"] },
      { name: "Lock-offs",         description: "Hold a rung at 90° elbow for max time",         tags: ["timer"] },
    ],
  },
  {
    group: "Pull Strength",
    exercises: [
      { name: "Pull-ups",               description: "Full range of motion, controlled descent",  tags: ["reps"] },
      { name: "Chin-ups",               description: "Supinated grip pull-ups",                   tags: ["reps"] },
      { name: "Weighted Pull-ups",      description: "Add weight via belt or vest",               tags: ["reps", "weight"] },
      { name: "One-Arm Pull-up Negatives", description: "Slow descent on one arm",               tags: ["reps"] },
      { name: "Archer Pull-ups",        description: "Side-to-side to build one-arm strength",   tags: ["reps"] },
      { name: "Typewriters",            description: "Traverse side to side at the top",         tags: ["reps"] },
      { name: "Rows",                   description: "Horizontal pull — barbell, ring, or TRX",  tags: ["reps", "weight"] },
      { name: "Lock-off Hold",          description: "Static mid-pull position for time",        tags: ["timer"] },
    ],
  },
  {
    group: "Push Strength (Antagonist)",
    exercises: [
      { name: "Push-ups",          description: "Standard or elevated for increased range",       tags: ["reps"] },
      { name: "Dips",              description: "Chest dips or tricep dips",                      tags: ["reps"] },
      { name: "Overhead Press",    description: "Dumbbell or barbell",                            tags: ["reps", "weight"] },
      { name: "Bench Press",       description: "Barbell or dumbbell flat or incline",            tags: ["reps", "weight"] },
      { name: "Tricep Extensions", description: "Cable, dumbbell, or band",                       tags: ["reps", "weight"] },
      { name: "Face Pulls",        description: "External rotation and rear delt work",           tags: ["reps", "weight"] },
    ],
  },
  {
    group: "Core",
    exercises: [
      { name: "Plank",             description: "Hold for time — standard or side",               tags: ["timer"] },
      { name: "Hollow Body Hold",  description: "Arms overhead, lower back pressed to floor",     tags: ["timer"] },
      { name: "L-Sit",             description: "Legs horizontal, on parallettes or floor",       tags: ["timer"] },
      { name: "Dead Bug",          description: "Opposite arm/leg extension, neutral spine",      tags: ["reps"] },
      { name: "Ab Wheel Rollouts", description: "From knees or standing",                         tags: ["reps"] },
      { name: "Leg Raises",        description: "Hanging or lying, control the descent",          tags: ["reps"] },
      { name: "Russian Twists",    description: "Weighted or bodyweight rotational core",         tags: ["reps"] },
      { name: "Toes to Bar",       description: "Raise toes to meet hands while hanging",        tags: ["reps"] },
    ],
  },
  {
    group: "Wrist & Forearm (Antagonist)",
    exercises: [
      { name: "Wrist Extensions",       description: "Dumbbell or band — counters crimping",     tags: ["reps"] },
      { name: "Wrist Curls",            description: "Dumbbell palm-up curls",                   tags: ["reps"] },
      { name: "Pronation & Supination", description: "Rotate forearm with light dumbbell",       tags: ["reps"] },
      { name: "Theraband Exercises",    description: "Full antagonist protocol with a band",     tags: ["reps"] },
      { name: "Finger Extensions",      description: "Rubber band on fingers, spread apart",     tags: ["reps"] },
    ],
  },
  {
    group: "Lower Body",
    exercises: [
      { name: "Squats",                  description: "Bodyweight or weighted",                   tags: ["reps"] },
      { name: "Lunges",                  description: "Forward, reverse, or lateral",             tags: ["reps"] },
      { name: "Step-ups",                description: "Onto a box or bench",                      tags: ["reps"] },
      { name: "Hip Thrusts",             description: "Glute activation and strength",            tags: ["reps", "weight"] },
      { name: "Calf Raises",             description: "Single or double leg",                     tags: ["reps"] },
      { name: "Bulgarian Split Squats",  description: "Rear foot elevated for balance and range", tags: ["reps", "weight"] },
    ],
  },
  {
    group: "Flexibility & Mobility",
    exercises: [
      { name: "Hip Flexor Stretch",  description: "Kneeling lunge stretch",                      tags: ["timer"] },
      { name: "Hip Rotation",        description: "Pigeon pose or figure-four",                  tags: ["timer"] },
      { name: "Hamstring Stretch",   description: "Standing or seated forward fold",             tags: ["timer"] },
      { name: "Shoulder Stretch",    description: "Cross-body or overhead tricep stretch",       tags: ["timer"] },
      { name: "Wrist & Finger Stretches", description: "Extend, flex, and rotate",              tags: ["timer"] },
      { name: "Thoracic Rotation",   description: "Seated or quadruped thoracic twist",          tags: ["timer"] },
      { name: "Hip 90/90 Stretch",   description: "Both hips at 90° to open hip rotators",      tags: ["timer"] },
    ],
  },
  {
    group: "Cardio & Conditioning",
    exercises: [
      { name: "Running",       description: "Steady state or intervals",              tags: ["timer"] },
      { name: "Cycling",       description: "Stationary or outdoor",                  tags: ["timer"] },
      { name: "Jump Rope",     description: "Single jumps, double-unders, intervals", tags: ["timer"] },
      { name: "Rowing Machine",description: "500m intervals or steady state",         tags: ["timer"] },
      { name: "Burpees",       description: "Full body conditioning",                 tags: ["reps"] },
      { name: "Box Jumps",     description: "Explosive lower body power",             tags: ["reps"] },
    ],
  },
];
