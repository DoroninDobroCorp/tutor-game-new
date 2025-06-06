import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
const MathProblemSolver = () => {
    const [problem, setProblem] = useState('');
    const [solution, setSolution] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const handleSubmit = async (e) => {
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
        }
        catch (err) {
            setError('Failed to solve the problem. Please try again.');
            console.error('Math solver error:', err);
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsxs("div", { className: "max-w-4xl mx-auto p-6", children: [_jsx("h1", { className: "text-2xl font-bold mb-6", children: "Math Problem Solver" }), _jsxs("form", { onSubmit: handleSubmit, className: "mb-8", children: [_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "math-problem", className: "block text-sm font-medium text-gray-700 mb-1", children: "Enter a math problem:" }), _jsx("input", { id: "math-problem", type: "text", value: problem, onChange: (e) => setProblem(e.target.value), placeholder: "e.g., 2 + 2, 5 * (3 + 4), solve for x: 2x + 3 = 7", className: "w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", disabled: isLoading })] }), _jsx("div", { children: _jsx("button", { type: "submit", disabled: isLoading, className: "px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50", children: isLoading ? 'Solving...' : 'Solve' }) })] }), error && _jsx("p", { className: "mt-2 text-red-600", children: error })] }), solution && (_jsxs("div", { className: "bg-white p-6 rounded-lg shadow-md", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Solution" }), _jsx("div", { className: "prose max-w-none", children: _jsx("p", { children: solution }) })] }))] }));
};
export default MathProblemSolver;
