import { Student, Goal, Badge, Story, GeneratedImage, RoadmapEntry } from '@prisma/client';

export interface StudentWithRelations extends Student {
  goal: Goal | null;
  roadmaps: RoadmapEntry[];
  badges: Badge[];
  stories: StoryWithImages[];
  images: GeneratedImage[];
}

export interface StoryWithImages extends Story {
  images: GeneratedImage[];
}

export interface TeacherWithStudents {
  id: string;
  userId: string;
  students: StudentWithRelations[];
}

// Type guard for teacher with students
export const isTeacherWithStudents = (teacher: any): teacher is TeacherWithStudents => {
  return teacher && 
         typeof teacher === 'object' && 
         'students' in teacher && 
         Array.isArray(teacher.students);
};

// Type guard for student with relations
export const isStudentWithRelations = (student: any): student is StudentWithRelations => {
  return student && 
         typeof student === 'object' && 
         'goal' in student &&
         'roadmaps' in student &&
         'badges' in student &&
         'stories' in student;
};
