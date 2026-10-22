export type SourceName = "linkedin" | "instagram";
export type Evidence = { source: SourceName; ref: string };
export type Trait = {
  label: string;
  detail: string;
  evidence: Evidence[];
  confidence: "high" | "medium" | "low";
};

export type LinkedInData = {
  url: string;
  fullName: string;
  headline: string;
  about: string;
  location: string;
  photo?: string;
  followers?: number;
  connections?: number;
  experience: { title: string; company: string; duration: string; description: string }[];
  education: { school: string; degree: string; field: string; period: string }[];
  skills: string[];
  certifications: string[];
  languages: string[];
  volunteering: string[];
  honors: string[];
  projects: string[];
  publications: string[];
};

export type InstagramPost = {
  id: string;
  url: string;
  caption: string;
  hashtags: string[];
  alt: string;
  location?: string;
  likes: number;
  comments: number;
  timestamp: string;
  type: string;
  image?: string;
};

export type InstagramData = {
  url: string;
  username: string;
  fullName: string;
  bio: string;
  externalUrl?: string;
  followers: number;
  following: number;
  postsCount: number;
  verified: boolean;
  category?: string;
  avatar?: string;
  posts: InstagramPost[];
};

export type SourceData = { linkedin: LinkedInData; instagram: InstagramData };

export type BigFiveKey = "openness" | "conscientiousness" | "extraversion" | "agreeableness" | "emotional_stability";

export type Analysis = {
  tagline: string;
  summary: string;
  readingLog: { source: SourceName; item: string; note: string }[];
  needs: Trait[];
  hobbies: Trait[];
  interests: Trait[];
  values: Trait[];
  lifestyle: Trait[];
  personality: { trait: BigFiveKey; score: number; why: string }[];
  communicationStyle: string;
  career: string;
  greenFlags: string[];
  friction: string[];
  conversationHooks: string[];
  dateIdeas: string[];
  brief: {
    voice: string;
    lookingFor: string[];
    mustCheck: string[];
    dealbreakers: string[];
    highlights: string[];
  };
};

export type PersonStatus = "scraping" | "scraped" | "analyzing" | "analyzed" | "screened" | "ready" | "error";

export type Person = {
  id: string;
  name: string;
  linkedinUrl: string;
  instagramUrl: string;
  liSlug: string;
  igUser: string;
  avatar?: string;
  headline?: string;
  location?: string;
  status: PersonStatus;
  error?: string;
  apify?: { liRunId?: string; igRunId?: string };
  source?: SourceData;
  analysis?: Analysis;
  dateIds?: string[];
  createdAt: number;
  origin: "demo" | "live";
};

export type Swipe = { from: string; to: string; score: number; reason: string };

export type DateTurn = {
  speaker: string;
  message: string;
  thought: string;
  interest: number;
  checked?: string[];
};

export type Debrief = {
  personId: string;
  scores: { chemistry: number; values: number; lifestyle: number; interests: number; goals: number };
  overall: number;
  verdict: "second_date" | "friends" | "pass";
  bestMoment: string;
  concern: string;
  noteToHuman: string;
};

export type DateRecord = {
  id: string;
  a: string;
  b: string;
  venue: string;
  venueWhy: string;
  turns: DateTurn[];
  debriefs: Debrief[];
  status: "pending" | "talking" | "debrief" | "done" | "error";
  maxTurns: number;
  createdAt: number;
  origin: "demo" | "live";
  error?: string;
};

export type Dataset = { people: Person[]; swipes: Swipe[]; dates: DateRecord[]; generatedAt?: number };
