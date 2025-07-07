import { useState } from 'react';

const MathProblemSolver = () => {
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  
  // Mock data for math problems
  const mockMathProblems = [
    {
      id: '1',
      question: 'What is 2 + 2?',
      answer: '4',
      explanation: 'Adding 2 and 2 gives us 4.',
      difficulty: 'easy',
      topic: 'Math'
    },
    {
      id: '2',
      question: 'What is 5 * 7?',
      answer: '35',
      explanation: 'Multiplying 5 by 7 gives us 35.',
      difficulty: 'medium',
      topic: 'Math'
    },
    {
      id: '3',
      question: 'What is 100 / 4?',
      answer: '25',
      explanation: 'Dividing 100 by 4 gives us 25.',
      difficulty: 'hard',
      topic: 'Math'
    }
  ];

  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const mathProblem = mockMathProblems[currentProblemIndex];
  const isLoadingProblem = false;
  const isSubmitting = false;

  const refetchProblem = () => {
    // Cycle through problems
    setCurrentProblemIndex((prevIndex) => (prevIndex + 1) % mockMathProblems.length);
    setUserAnswer('');
    setIsCorrect(null);
    setShowSolution(false);
  };
  
  const handleGetNewProblem = () => {
    setUserAnswer('');
    setIsCorrect(null);
    setShowSolution(false);
    refetchProblem();
  };
  
  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;
    
    // Simple validation against mock data
    const isAnswerCorrect = userAnswer.trim() === mathProblem.answer;
    setIsCorrect(isAnswerCorrect);
    setShowSolution(true);
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
  
  // Main content

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
