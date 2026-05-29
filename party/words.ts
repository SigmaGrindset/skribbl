// Word bank for the drawer's choices. Kept intentionally simple & drawable.
// Easy nouns most people can sketch in ~80 seconds.

export const WORDS: string[] = [
  // animals
  "cat", "dog", "elephant", "giraffe", "penguin", "octopus", "snake", "shark",
  "butterfly", "spider", "horse", "rabbit", "turtle", "owl", "bee", "frog",
  "dolphin", "lion", "monkey", "crab", "snail", "whale", "fox", "bat",
  // food
  "pizza", "burger", "banana", "apple", "icecream", "donut", "cake", "carrot",
  "sandwich", "hotdog", "popcorn", "cheese", "egg", "cookie", "watermelon",
  "pineapple", "strawberry", "coffee", "fries", "sushi",
  // objects
  "guitar", "umbrella", "clock", "camera", "ladder", "scissors", "hammer",
  "key", "candle", "balloon", "glasses", "lamp", "bucket", "anchor", "magnet",
  "telescope", "compass", "envelope", "battery", "lightbulb", "toothbrush",
  "backpack", "kite", "drum", "trumpet",
  // nature / places
  "mountain", "rainbow", "volcano", "island", "river", "cloud", "tree",
  "flower", "cactus", "mushroom", "sun", "moon", "star", "snowman", "fire",
  "waterfall", "tornado", "beach", "forest", "desert",
  // transport
  "car", "bicycle", "airplane", "rocket", "train", "boat", "helicopter",
  "submarine", "tractor", "scooter", "skateboard", "hot air balloon",
  // buildings / things
  "house", "castle", "lighthouse", "bridge", "windmill", "tent", "igloo",
  "pyramid", "church", "barn",
  // body / clothes
  "eye", "hand", "foot", "tooth", "heart", "brain", "hat", "shoe", "sock",
  "glove", "crown", "tie", "boot",
  // misc fun
  "robot", "ghost", "dragon", "wizard", "alien", "pirate", "ninja", "clown",
  "mermaid", "vampire", "dinosaur", "unicorn", "snowflake", "treasure",
  "skeleton", "zombie", "superhero", "knight",
  // tech
  "computer", "phone", "headphones", "keyboard", "mouse", "printer", "robot arm",
  // sports
  "soccer ball", "basketball", "tennis", "skis", "surfboard", "boxing glove",
];

/** Pick `count` distinct random words. */
export function pickWords(count: number, exclude: Set<string> = new Set()): string[] {
  const pool = WORDS.filter((w) => !exclude.has(w));
  const chosen: string[] = [];
  const used = new Set<number>();
  while (chosen.length < count && used.size < pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    if (used.has(i)) continue;
    used.add(i);
    chosen.push(pool[i]);
  }
  return chosen;
}
