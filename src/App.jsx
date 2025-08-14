import React, { useState } from 'react';


// Main App component for the Field Health Scanner
const App = () => {
    // State variables to manage the application's data and UI
    const [selectedImage, setSelectedImage] = useState(null); // Stores the base64 encoded image
    const [problemDescription, setProblemDescription] = useState(''); // Stores the AI's diagnosis
    const [suggestedSolutions, setSuggestedSolutions] = useState(''); // Stores the AI's suggested solutions
    const [loading, setLoading] = useState(false); // Indicates if an AI process is ongoing
    const [error, setError] = useState(''); // Stores any error messages

    /**
     * Handles the image file selection.
     * Reads the selected file and converts it to a base64 string for API submission.
     * @param {Object} event - The change event from the file input.
     */
    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Check if the file type is an image
            if (!file.type.startsWith('image/')) {
                setError('Please upload an image file (e.g., JPEG, PNG).');
                setSelectedImage(null);
                setProblemDescription('');
                setSuggestedSolutions('');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                // Remove the "data:image/jpeg;base64," prefix to get raw base64 data
                const base64String = reader.result.split(',')[1];
                setSelectedImage(base64String);
                setError(''); // Clear any previous errors
                setProblemDescription(''); // Clear previous results
                setSuggestedSolutions('');
            };
            reader.onerror = () => {
                setError('Failed to read image file.');
                setSelectedImage(null);
            };
            reader.readAsDataURL(file); // Read the file as a data URL
        } else {
            setSelectedImage(null);
            setProblemDescription('');
            setSuggestedSolutions('');
            setError('');
        }
    };

    /**
     * Calls the Gemini Vision API to analyze the image and identify the problem.
     * @param {string} base64ImageData - The base64 encoded image data.
     * @returns {Promise<string>} - A promise that resolves with the problem description.
     */
    const callGeminiVision = async (base64ImageData) => {
        const prompt = "Analyze this image of a farm field or plant. Describe any visible damage, disease, pest infestation, or nutrient deficiency. Be specific about the visual symptoms and potential causes.";
        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });

        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: "image/jpeg", // Assuming JPEG, but could be dynamic based on file.type
                                data: base64ImageData
                            }
                        }
                    ]
                }
            ],
        };

        const apiKey = import.meta.env.VITE_API_KEY; // API key will be provided by the Canvas environment
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Gemini Vision API error:", errorData);
                throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
            }

            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                return result.candidates[0].content.parts[0].text;
            } else {
                throw new Error("No valid response from Gemini Vision API.");
            }
        } catch (err) {
            console.error("Error calling Gemini Vision API:", err);
            throw new Error(`Failed to analyze image: ${err.message}`);
        }
    };

    /**
     * Calls the Gemini Text API to suggest solutions based on the identified problem.
     * @param {string} problem - The problem description from the vision model.
     * @returns {Promise<string>} - A promise that resolves with the suggested solutions.
     */
    const callGeminiText = async (problem) => {
        const prompt = `Based on the following plant/field problem: "${problem}", suggest specific types of fertilizers, pesticides, or other remedies that could cure this damage. Also, mention any general advice for prevention or management. Provide a concise list of recommendations.`;
        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });

        const payload = { contents: chatHistory };
        const apiKey = import.meta.env.VITE_API_KEY; // API key will be provided by the Canvas environment
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Gemini Text API error:", errorData);
                throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
            }

            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                return result.candidates[0].content.parts[0].text;
            } else {
                throw new Error("No valid response from Gemini Text API.");
            }
        } catch (err) {
            console.error("Error calling Gemini Text API:", err);
            throw new Error(`Failed to get solutions: ${err.message}`);
        }
    };

    /**
     * Handles the form submission, triggering the AI analysis.
     */
    const handleSubmit = async () => {
        if (!selectedImage) {
            setError('Please select an image to scan.');
            return;
        }

        setLoading(true);
        setError('');
        setProblemDescription('');
        setSuggestedSolutions('');

        try {
            // Step 1: Get problem description from vision model
            const problem = await callGeminiVision(selectedImage);
            setProblemDescription(problem);

            // Step 2: Get suggested solutions from text model
            const solutions = await callGeminiText(problem);
            setSuggestedSolutions(solutions);

        } catch (err) {
            setError(err.message);
            setProblemDescription('Could not diagnose the problem.');
            setSuggestedSolutions('Could not suggest solutions.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4 font-inter">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-green-200">
                <h1 className="text-4xl font-extrabold text-center text-green-800 mb-6">
                    <span className="inline-block mr-2">🌿</span>
                    Farm Health Scanner
                </h1>
                <p className="text-center text-gray-600 mb-8">
                    Upload an image of your field or plant to diagnose issues and get solutions.
                </p>

                {/* Image Upload Section */}
                <div className="mb-6 bg-green-50 p-4 rounded-xl border border-green-200">
                    <label htmlFor="image-upload" className="block text-lg font-semibold text-green-700 mb-3 cursor-pointer">
                        Upload Plant/Field Image:
                    </label>
                    <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-gray-700
                                   file:mr-4 file:py-2 file:px-4
                                   file:rounded-full file:border-0
                                   file:text-sm file:font-semibold
                                   file:bg-green-200 file:text-green-700
                                   hover:file:bg-green-300 cursor-pointer"
                    />
                    {selectedImage && (
                        <div className="mt-4 text-center">
                            <img
                                src={`data:image/jpeg;base64,${selectedImage}`}
                                alt="Selected Preview"
                                className="max-w-full h-48 object-contain rounded-lg shadow-md mx-auto border border-gray-200"
                            />
                        </div>
                    )}
                </div>

                {/* Scan Button */}
                <button
                    onClick={handleSubmit}
                    disabled={loading || !selectedImage}
                    className={`w-full py-3 px-6 rounded-xl text-white font-bold text-lg transition-all duration-300
                                ${loading || !selectedImage
                                    ? 'bg-green-300 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 transform hover:scale-105 shadow-lg'
                                }`}
                >
                    {loading ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Scanning...
                        </span>
                    ) : (
                        'Scan Field'
                    )}
                </button>

                {/* Error Message Display */}
                {error && (
                    <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl" role="alert">
                        <p className="font-bold">Error:</p>
                        <p>{error}</p>
                    </div>
                )}

                {/* Results Section */}
                {(problemDescription || suggestedSolutions) && !loading && (
                    <div className="mt-8 pt-6 border-t border-green-200">
                        <h2 className="text-2xl font-bold text-green-800 mb-4">Diagnosis & Solutions</h2>

                        {problemDescription && (
                            <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-200">
                                <h3 className="text-xl font-semibold text-blue-700 mb-2">Problem Identified:</h3>
                                <p className="text-gray-800 whitespace-pre-wrap">{problemDescription}</p>
                            </div>
                        )}

                        {suggestedSolutions && (
                            <div className="mb-6 bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                                <h3 className="text-xl font-semibold text-yellow-700 mb-2">Suggested Solutions:</h3>
                                <p className="text-gray-800 whitespace-pre-wrap">{suggestedSolutions}</p>
                            </div>
                        )}

                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                            <h3 className="text-xl font-semibold text-purple-700 mb-2">Where to Buy:</h3>
                            <p className="text-gray-800">
                                For nearby locations to purchase the recommended fertilizers or pesticides, please search online using the product names (e.g., "Buy [Product Name] near me") or consult your local agricultural supply stores.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
