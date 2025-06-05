import React, { useState } from 'react';

const MathProblemSolver: React.FC = () => {
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem.trim()) {
      setError('Please enter a math problem');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Please log in to solve math problems');
        return;
      }

      const response = await fetch('/api/student/math-problem', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get math problem');
      }

      const data = await response.json();
      
      // For now, just show the generated problem
      // In the future, this will be interactive
      setSolution(`Generated problem: ${data.problem}\nAnswer: ${data.answer}\nExplanation: ${data.explanation}`);
    } catch (err) {
      setError('Failed to solve the problem. Please try again.');
      console.error('Math solver error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Math Problem Solver</h1>
      
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="math-problem" className="block text-sm font-medium text-gray-700 mb-1">
              Enter a math problem:
            </label>
            <input
              id="math-problem"
              type="text"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="e.g., 2 + 2, 5 * (3 + 4), solve for x: 2x + 3 = 7"
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? 'Solving...' : 'Solve'}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-red-600">{error}</p>}
      </form>

      {solution && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Solution</h2>
          <div className="prose max-w-none">
            <p>{solution}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MathProblemSolver;
