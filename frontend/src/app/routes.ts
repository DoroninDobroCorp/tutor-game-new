// Centralized route constants and builders

// Root
export const routeHome = '/';

// Auth
export const routeLogin = '/login';
export const routeRegister = '/register';

// Student
export const routeStudentRoot = '/student';
export const routeStudentDashboard = '/student';
export const routeStudentAdventure = '/student/adventure';
export const routeStudentStories = '/student/stories';
export const routeStudentAchievements = '/student/achievements';
export const routeStudentChat = '/student/chat';
export const routeStudentStory = (goalId: string) => `/student/story/${goalId}`;
export const routeStudentGoalCompleted = (goalId: string) => `/student/goal/${goalId}/completed`;
export const routeStudentGoalDiagnostic = (goalId: string) => `/student/goal/${goalId}/diagnostic`;

// Teacher
export const routeTeacherRoot = '/teacher';
export const routeTeacherDashboard = '/teacher';
export const routeTeacherGoals = '/teacher/goals';
export const routeTeacherCreateGoal = '/teacher/create-goal';
export const routeTeacherGoalEdit = (goalId: string) => `/teacher/goals/${goalId}/edit`;
export const routeTeacherStudents = '/teacher/students';
export const routeTeacherAchievements = '/teacher/achievements';
export const routeTeacherChat = '/teacher/chat';
