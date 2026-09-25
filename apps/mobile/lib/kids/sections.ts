export type KidsSection = {
  id: string;
  emoji: string;
  title: string;
  titleTa: string;
  tagline: string;
  colors: readonly [string, string];
  /** What the section will cover — shown on its page until the activities are built. */
  topics: string[];
  ready?: boolean;
};

export const KIDS_SECTIONS: KidsSection[] = [
  { id: 'english', emoji: '📚', title: 'English', titleTa: 'ஆங்கிலம்', tagline: 'Letters, words & reading', colors: ['#2563eb', '#60a5fa'], topics: ['ABC phonics', 'Sight words', 'Spelling bee', 'Opposites', 'Read-along sentences'] },
  { id: 'maths', emoji: '🔢', title: 'Maths', titleTa: 'கணிதம்', tagline: 'Numbers, counting & shapes', colors: ['#7c3aed', '#a78bfa'], topics: ['Counting 1–100', 'Add & subtract', 'Times tables', 'Shapes around us', 'Money with ₹ coins'] },
  { id: 'science', emoji: '🔬', title: 'Science', titleTa: 'அறிவியல்', tagline: 'How things work', colors: ['#0d9488', '#5eead4'], topics: ['Plants & seeds', 'Animals and their homes', 'Water cycle', 'Our body', 'Magnets & light'] },
  { id: 'gk', emoji: '🌍', title: 'General Knowledge', titleTa: 'பொது அறிவு', tagline: 'Fun facts about everything', colors: ['#059669', '#34d399'], topics: ['India & Tamil Nadu', 'Flags & capitals', 'Famous people', 'Festivals', 'Did you know?'] },
  { id: 'stories', emoji: '📖', title: 'Stories', titleTa: 'கதைகள்', tagline: 'Tales with a lesson', colors: ['#db2777', '#f472b6'], topics: ['Panchatantra', 'Tenali Raman', 'Akbar & Birbal', 'Moral stories', 'Tamil folk tales'] },
  { id: 'conversations', emoji: '🗣️', title: 'Conversations', titleTa: 'உரையாடல்', tagline: 'Speak with confidence', colors: ['#0284c7', '#38bdf8'], topics: ['Greetings', 'At school', 'At the shop', 'Asking for help', 'English ↔ Tamil phrases'] },
  { id: 'games', emoji: '🎮', title: 'Games', titleTa: 'விளையாட்டுகள்', tagline: 'Play and learn', colors: ['#ea580c', '#fb923c'], topics: ['Word match', 'Number hunt', 'Spot the difference', 'Quiz time', 'Memory cards'] },
  { id: 'creativity', emoji: '🎨', title: 'Creativity', titleTa: 'படைப்பாற்றல்', tagline: 'Draw, colour & make', colors: ['#c026d3', '#e879f9'], topics: ['Colour mixing', 'Draw with shapes', 'Paper craft ideas', 'Make your own story', 'Kolam patterns'] },
  { id: 'brain-games', emoji: '🧠', title: 'Brain Games', titleTa: 'மூளை விளையாட்டு', tagline: 'Puzzles & riddles', colors: ['#4f46e5', '#818cf8'], topics: ['Riddles', 'Patterns', 'Odd one out', 'Logic puzzles', 'Tamil vidukathai'] },
  { id: 'rhymes', emoji: '🎵', title: 'Rhymes & Songs', titleTa: 'பாடல்கள்', tagline: 'Sing along', colors: ['#e11d48', '#fb7185'], topics: ['English nursery rhymes', 'Tamil rhymes', 'Action songs', 'Counting songs', 'Lullabies'] },
  { id: 'explore', emoji: '🌌', title: 'Explore the World', titleTa: 'உலகை ஆராய்வோம்', tagline: 'Space, oceans & more', colors: ['#1e3a8a', '#6366f1'], topics: ['Planets', 'Oceans', 'Jungles', 'Deserts', 'Dinosaurs'] },
  { id: 'bedtime', emoji: '🌙', title: 'Bedtime', titleTa: 'உறங்கும் நேரம்', tagline: 'Calm stories before sleep', colors: ['#312e81', '#7c3aed'], topics: [], ready: true },
];
