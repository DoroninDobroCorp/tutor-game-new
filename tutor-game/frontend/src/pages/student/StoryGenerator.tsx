import { useState, useEffect } from 'react';
import { useGenerateStorySnippetMutation } from '../../features/lesson/lessonApi';

const StoryGenerator = () => {
  const [topic, setTopic] = useState('');
  const [story, setStory] = useState('');
  const [error, setError] = useState('');
  
  const [generateStory, { isLoading, error: apiError }] = useGenerateStorySnippetMutation();
  
  // Clear error when topic changes
  useEffect(() => {
    if (apiError) {
      setError('Failed to generate story. Please try again.');
    } else {
      setError('');
    }
  }, [apiError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setError('');
    
    try {
      const result = await generateStory({
        prompt: topic,
        ageGroup: 'elementary',
        subject: 'general',
        lessonId: 'temporary-lesson-id' // Add a default lesson ID or get it from props
      } as any).unwrap();
      
      if (result) {
        // Adjust based on the actual API response structure
        const storyContent = (result as any).content || JSON.stringify(result);
        setStory(storyContent);
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || 'Failed to generate story. Please try again.';
      setError(errorMessage);
      console.error('Story generation error:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Story Generator</h1>
      
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="story-topic" className="block text-sm font-medium text-gray-700 mb-1">
              Story Topic
            </label>
            <input
              id="story-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a topic for your story..."
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-75"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isLoading || !topic.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : 'Generate Story'}
            </button>
            {isLoading && (
              <p className="text-sm text-gray-600">This may take a moment...</p>
            )}
          </div>
        </div>
        {error && <p className="mt-2 text-red-600">{error}</p>}
      </form>

      {story && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Your Story</h2>
          <p className="whitespace-pre-line">{story}</p>
        </div>
      )}
    </div>
  );
};

export default StoryGenerator;
