const PREFER_NOT_TO_ANSWER = "Prefer not to answer";
const NO_PREFERENCE = "No preference";

const advisorQuestions = [
  {
    field: "gradeLevel",
    label: "Grade level",
    prompt: "What grade are you in?",
    options: ["9th", "10th", "11th", "12th", "Transfer", PREFER_NOT_TO_ANSWER],
  },
  {
    field: "gpa",
    label: "GPA",
    prompt: "What GPA should I use?",
    placeholder: "Example: 3.85",
    options: ["4.0+", "3.8", "3.6", "3.4", PREFER_NOT_TO_ANSWER],
  },
  {
    field: "gpaType",
    label: "GPA type",
    prompt: "Is that weighted or unweighted?",
    options: ["Unweighted", "Weighted", "Not sure", PREFER_NOT_TO_ANSWER],
  },
  {
    field: "sat",
    label: "SAT",
    prompt: "Do you have an SAT score?",
    placeholder: "Example: 1450",
    options: ["1550", "1500", "1450", "1400", "1350", PREFER_NOT_TO_ANSWER],
  },
  {
    field: "act",
    label: "ACT",
    prompt: "Do you have an ACT score?",
    placeholder: "Example: 33",
    options: ["35", "34", "32", "30", PREFER_NOT_TO_ANSWER],
  },
  {
    field: "intendedMajors",
    label: "Majors",
    prompt: "What majors are you considering?",
    placeholder: "Example: Computer Science, Economics",
    options: ["Computer Science", "Engineering", "Business", "Biology", "Undecided", PREFER_NOT_TO_ANSWER],
  },
  {
    field: "preferredRegions",
    label: "Regions",
    prompt: "Any preferred regions?",
    placeholder: "Example: California, Northeast, West Coast",
    options: ["California", "Northeast", "West Coast", "Midwest", "South", PREFER_NOT_TO_ANSWER],
  },
  {
    field: "preferredStates",
    label: "States",
    prompt: "Any specific states I should prioritize?",
    placeholder: "Example: CA, NY, MA",
    options: ["CA", "NY", "MA", "TX", "WA", PREFER_NOT_TO_ANSWER],
  },
  {
    field: "annualBudget",
    label: "Budget",
    prompt: "What annual budget should I use before financial aid?",
    placeholder: "Example: 45000",
    options: ["30000", "45000", "60000", "80000", PREFER_NOT_TO_ANSWER],
  },
  {
    field: "schoolSizePreference",
    label: "School size",
    prompt: "What school size do you prefer?",
    options: ["Small", "Medium", "Large", NO_PREFERENCE, PREFER_NOT_TO_ANSWER],
  },
  {
    field: "campusSettingPreference",
    label: "Campus setting",
    prompt: "What campus setting do you prefer?",
    options: ["Urban", "Suburban", "Rural", NO_PREFERENCE, PREFER_NOT_TO_ANSWER],
  },
  {
    field: "riskPreference",
    label: "List style",
    prompt: "What kind of list should I build?",
    options: ["Balanced", "More reaches", "More likely schools", "Mostly targets", PREFER_NOT_TO_ANSWER],
  },
  {
    field: "likedSchools",
    label: "Liked schools",
    prompt: "Any schools you already like?",
    placeholder: "Example: UC Irvine, Northeastern",
    options: ["UC Irvine", "Northeastern", "USC", "NYU", PREFER_NOT_TO_ANSWER],
  },
  {
    field: "dislikedSchools",
    label: "Avoid",
    prompt: "Any schools or school types you want to avoid?",
    placeholder: "Example: very rural campuses",
    options: ["Very rural", "Very large", "Too expensive", "Too far from home", PREFER_NOT_TO_ANSWER],
  },
  {
    field: "activitiesSummary",
    label: "Activities",
    prompt: "Anything important about activities, awards, background, or constraints?",
    placeholder: "Example: robotics, debate, first-gen, needs merit aid",
    options: ["Robotics", "Research", "Debate", "Varsity sports", "Needs merit aid", PREFER_NOT_TO_ANSWER],
  },
];

function publicAdvisorQuestions() {
  return advisorQuestions.map((question, index) => ({
    index,
    field: question.field,
    label: question.label,
    prompt: question.prompt,
    placeholder: question.placeholder || "",
    options: question.options,
  }));
}

module.exports = {
  NO_PREFERENCE,
  PREFER_NOT_TO_ANSWER,
  advisorQuestions,
  publicAdvisorQuestions,
};
