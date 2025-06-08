import React, { useState } from 'react';
import { useGetMathProblemQuery, useSubmitAnswerMutation } from '../../app/api/apiSlice';

const MathProblemSolver: React.FC = () => {
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  
  // Get a math problem with refetch function
  const { 
    data: mathProblem, 
    isLoading: isLoadingProblem, 
    error: problemError,
    refetch: refetchProblem 
  } = useGetMathProblemQuery(
    { difficulty: 'medium' },
    { refetchOnMountOrArgChange: true }
  );
  
  // Mutation for submitting answers
  const [submitAnswer, { isLoading: isSubmitting }] = useSubmitAnswerMutation();
  
  const handleGetNewProblem = () => {
    setUserAnswer('');
    setIsCorrect(null);
    setShowSolution(false);
    refetchProblem();
  };
  
  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || !mathProblem) return;
    
    try {
      const result = await submitAnswer({
        problemId: mathProblem.id,
        answer: parseFloat(userAnswer)
      }).unwrap();
      
      setIsCorrect(result.correct);
      if (!result.correct) {
        setShowSolution(true);
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      // Error handling would go here
    }
  };

  // Show loading state
  if (isLoadingProblem) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Math Problem Solver</h2>
        <p className="mb-4">Loading math problems...</p>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mt-4"></div>
      </div>
    );
  }
  
  // Show error state
  if (problemError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Failed to load math problem. Please try again later.
              </p>
              <button
                onClick={handleGetNewProblem}
                className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main content - show the math problem
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Math Problem Solver</h1>
      
      {mathProblem && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Problem</h2>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {mathProblem.difficulty?.charAt(0).toUpperCase() + mathProblem.difficulty?.slice(1) || 'Medium'}
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                {mathProblem.topic || 'Math'}
              </span>
            </div>
          </div>
          
          <div className="prose max-w-none mb-6">
            <p className="text-lg">{mathProblem.question}</p>
          </div>
          
          <form onSubmit={handleSubmitAnswer} className="space-y-4">
            <div>
              <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-1">
                Your Answer
              </label>
              <input
                type="number"
                id="answer"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                placeholder="Enter your answer"
                disabled={isSubmitting || isCorrect === true}
                step="any"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={!userAnswer.trim() || isSubmitting || isCorrect === true}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Checking...' : 'Submit Answer'}
              </button>
              
              <button
                type="button"
                onClick={handleGetNewProblem}
                className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                New Problem
              </button>
            </div>
          </form>
          
          {isCorrect === true && (
            <div className="mt-4 p-4 bg-green-50 rounded-md">
              <p className="text-green-800 font-medium">✓ Correct! Well done!</p>
            </div>
          )}
          
          {showSolution && isCorrect === false && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-md">
              <p className="text-yellow-800 font-medium">
                Not quite right. The correct answer is: {mathProblem.answer}
              </p>
              {mathProblem.explanation && (
                <div className="mt-2 text-yellow-700">
                  <p className="font-medium">Explanation:</p>
                  <p>{mathProblem.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MathProblemSolver;
