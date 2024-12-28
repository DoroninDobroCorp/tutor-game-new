import React from 'react';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PlanningPage from './components/PlanningPage';
import LearningPage from './components/LearningPage';
import ExercisesPage from './components/ExercisesPage';
import StudentPage from './components/StudentPage';
import ApprovedPlansPage from './components/ApprovedPlansPage';

function App() {
  return (
    <ChakraProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ApprovedPlansPage />} />
          <Route path="/create" element={<PlanningPage />} />
          <Route path="/learn/:planId" element={<LearningPage />} />
          <Route path="/teacher/plan/:planId" element={<PlanningPage />} />
          <Route path="/teacher/exercises/:planId/:topicId" element={<ExercisesPage />} />
          <Route path="/student/plan/:planId" element={<StudentPage />} />
          <Route path="/student/plan/:planId/topic/:topicId" element={<StudentPage />} />
        </Routes>
      </Router>
    </ChakraProvider>
  );
}

export default App;
