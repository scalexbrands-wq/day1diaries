const { extractInsightTags, extractHighlight } = require('./certificateInsights')
const { render } = require('./emailRender')

// Rule-based tribute copy, keyed by gift category — no LLM call, same
// approach as the existing certificate "AI insights". Each category has
// five tribute "kinds" the sender can pick between in the wizard. Lines
// use {{name}}/{{storyTitle}}/{{company}} tokens rendered via the
// existing emailRender.render().
const CATEGORY_TRIBUTES = {
  birthday: {
    short: 'Happy birthday, {{name}}! Here\'s to another year of stories worth telling.',
    long: 'Happy birthday, {{name}}! Your story, "{{storyTitle}}", is a reminder of how far you\'ve come. Here\'s to another year of growth, courage, and stories worth telling.',
    motivational: 'Another year, another chapter. {{name}}, the best is still ahead of you.',
    careerNote: 'Your journey at {{company}} is just one chapter in a much bigger story — happy birthday!',
    memorySummary: 'A birthday tribute built from a story that captures exactly who {{name}} is.',
  },
  sweet_memories: {
    short: '{{name}}, this story always brings back the best memories.',
    long: 'Some memories deserve to be revisited. "{{storyTitle}}" is one of those for {{name}} — a reminder of a moment worth holding onto.',
    motivational: 'The best memories are the ones that remind us how far we\'ve come, {{name}}.',
    careerNote: 'From {{company}} to here — what a journey it\'s been, {{name}}.',
    memorySummary: 'A keepsake built from a memory worth never forgetting.',
  },
  surprise_moment: {
    short: 'Surprise, {{name}}! Someone wanted you to know your story matters.',
    long: 'Surprise, {{name}}! Your story, "{{storyTitle}}", inspired someone enough to turn it into this tribute, just for you.',
    motivational: 'Sometimes the best surprises remind us how much our story means to someone else.',
    careerNote: 'Your work at {{company}} hasn\'t gone unnoticed, {{name}} — surprise!',
    memorySummary: 'An unexpected tribute, built from a story that deserved one.',
  },
  long_time_no_see: {
    short: 'It\'s been a while, {{name}} — but your story stuck with us.',
    long: 'It\'s been too long, {{name}}. Reading "{{storyTitle}}" again reminded us why we never forgot you.',
    motivational: 'Distance and time fade — but stories like yours don\'t, {{name}}.',
    careerNote: 'Wherever {{company}} has taken you, we\'re glad your story is still here.',
    memorySummary: 'A reconnection, built around the story that brought us back together.',
  },
  career_milestone: {
    short: 'Huge congratulations on this milestone, {{name}}!',
    long: 'From "{{storyTitle}}" to this milestone — {{name}}, your journey at {{company}} keeps proving what we always knew.',
    motivational: 'Every milestone is built on days like the one you wrote about, {{name}}.',
    careerNote: 'This is just the beginning of what {{name}} will achieve at {{company}}.',
    memorySummary: 'A tribute to a career milestone, rooted in the story that started it all.',
  },
  achievement_recognition: {
    short: '{{name}}, this achievement deserves to be celebrated properly.',
    long: 'Your story, "{{storyTitle}}", showed the foundation — this achievement shows the result. Congratulations, {{name}}.',
    motivational: 'Recognition like this doesn\'t happen by accident, {{name}} — you earned it.',
    careerNote: 'Your contributions at {{company}} deserve to be celebrated, and recognized.',
    memorySummary: 'A formal recognition, built from the story that set it in motion.',
  },
  story_contributor: {
    short: 'Thank you for sharing your story, {{name}} — it matters more than you know.',
    long: '"{{storyTitle}}" is exactly the kind of story that helps the next person feel less alone on their Day 1. Thank you, {{name}}.',
    motivational: 'Every story shared makes the community a little stronger, {{name}}.',
    careerNote: 'Your experience at {{company}} is now part of someone else\'s roadmap.',
    memorySummary: 'A thank-you, built for someone who chose to share their story.',
  },
  graduation: {
    short: 'Congratulations on this new chapter, {{name}}!',
    long: 'From "{{storyTitle}}" to graduation — {{name}}, this is proof that every first step matters.',
    motivational: 'Graduation isn\'t an ending, {{name}} — it\'s the next first day.',
    careerNote: 'Wherever {{company}} or your next step takes you, this story will always be where it started.',
    memorySummary: 'A graduation tribute, built around the story that came before it.',
  },
  first_job: {
    short: 'Congratulations on your first job, {{name}}!',
    long: 'Your story, "{{storyTitle}}", captured the nerves and excitement of Day 1 at {{company}} perfectly. Congratulations, {{name}}.',
    motivational: 'The first job is the hardest one to start, and {{name}} did it with courage.',
    careerNote: 'Welcome to the working world, {{name}} — {{company}} is lucky to have you.',
    memorySummary: 'A celebration of a first job, built from the story that captured Day 1.',
  },
  work_anniversary: {
    short: 'Happy work anniversary, {{name}}! 🎉',
    long: 'From "{{storyTitle}}" on Day 1 to today — {{name}}, look how far you\'ve come at {{company}}.',
    motivational: 'Every anniversary is proof of consistency, {{name}} — and that\'s rare.',
    careerNote: '{{company}} is better with {{name}} on the team. Happy anniversary!',
    memorySummary: 'A work-anniversary tribute, built around the story that started it all.',
  },
}

const TRIBUTE_KIND_LABELS = {
  short: 'Short Tribute',
  long: 'Long Tribute',
  motivational: 'Motivational Message',
  careerNote: 'Career Appreciation Note',
  memorySummary: 'Memory Summary',
}

function generateTribute(categoryKey, kind, variables) {
  const category = CATEGORY_TRIBUTES[categoryKey] || CATEGORY_TRIBUTES.sweet_memories
  const template = category[kind] || category.short
  return render(template, variables)
}

function listTributeOptions(categoryKey, variables) {
  return Object.entries(TRIBUTE_KIND_LABELS).map(([kind, label]) => ({
    kind, label, text: generateTribute(categoryKey, kind, variables),
  }))
}

module.exports = {
  CATEGORY_TRIBUTES, TRIBUTE_KIND_LABELS,
  generateTribute, listTributeOptions,
  extractInsightTags, extractHighlight,
}
