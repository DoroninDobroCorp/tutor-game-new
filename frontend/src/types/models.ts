// frontend/src/types/models.ts

// --- Core Models ---

export type UserRole = 'student' | 'teacher';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
}

export interface StudentInfo {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
}

export interface StudentProfile extends User {
  learningGoals: LearningGoal[];
  // Add other student profile fields as they become available
}

// --- Goal, Section, and Lesson Models ---

export interface LearningGoal {
    id: string; 
    subject: string; 
    setting: string; 
    studentAge: number; 
    studentId: string;
    language: string;
    illustrationStyle: string;
    student: StudentInfo;
    sections: ContentSection[];
    characterPrompt?: string;
    characterImageUrl?: string | null;
    characterImageId?: string | null;
    characterGenId?: string | null;
}

export interface ContentSection {
    id: string;
    title: string;
    order: number;
    lessons: Lesson[];
}

export type LessonType = 'THEORY' | 'PRACTICE' | 'WITH_TEACHER' | 'CONTROL_WORK';

export interface Lesson {
    id:string;
    title: string;
    type: LessonType;
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED';
    order: number;
    content?: { blocks: any[] } | null;
    storyChapter?: StoryChapter | null;
    // This field is useful for frontend but not for API
    previousLesson?: Lesson | null; 
    performanceLogs?: PerformanceLog[];
}

// --- Story Models ---

export interface StoryChapter {
    id: string;
    teacherSnippetText: string | null;
    teacherSnippetImageUrl: string | null;
    teacherSnippetImagePrompt: string | null;
    teacherSnippetStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED';
    studentSnippetText: string | null;
    studentSnippetImageUrl: string | null;
}

export interface StoryChapterHistory extends StoryChapter {
    lesson: {
        title: string;
        order: number;
        section: {
            order: number;
        }
    };
}

// --- API & Other Models ---

export interface PerformanceLog {
    id:string;
    question?: string | null;
    answer: string;
    isCorrect: boolean | null;
    createdAt: string;
    blockIndex?: number | null;
    blockType?: string | null;
    lesson?: {
        title: string;
    };
}

export interface RoadmapProposal {
    chatResponse: string;
    roadmap: { sectionTitle: string; lessons: string[] }[];
}

export interface OldRoadmapProposal {
    sectionTitle: string;
    lessons: string[];
}

export interface SubmitLessonPayload {
  lessonId: string;
  studentResponseText: string;
  answers: string[];
}

// --- AI Chat Types ---
export interface AIAssessmentResponse {
    responseText: string;
    isSessionComplete: boolean;
    newQuestion: {
        content: string;
        type: 'practice';
    } | null;
}
