import React, { useState } from "react";

const App = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [mimeType, setMimeType] = useState("");
    const [problemDescription, setProblemDescription] = useState("");
    const [suggestedSolutions, setSuggestedSolutions] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                setError("Please upload an image file (JPEG, PNG, etc).");
                setSelectedImage(null);
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result.split(",")[1];
                setSelectedImage(base64String);
                setMimeType(file.type);
                setError("");
                setProblemDescription("");
                setSuggestedSolutions("");
            };
            reader.readAsDataURL(file);
        }
    };

    const callGeminiVision = async (base64ImageData) => {
        const prompt =
            "Analyze this image of a farm field or plant. Describe any visible damage, disease, pest infestation, or nutrient deficiency.";

        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType, data: base64ImageData } },
                    ],
                },
            ],
        };

        const apiKey = import.meta.env.VITE_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Image analysis failed");
        const data = await res.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    };

    const callGeminiText = async (problem) => {
        const prompt = `Based on the following plant/field problem: "${problem}", suggest specific remedies, fertilizers, pesticides, and prevention tips.`;

        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
        const apiKey = import.meta.env.VITE_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Solution generation failed");
        const data = await res.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    };

    const handleSubmit = async () => {
        if (!selectedImage) {
            setError("Please select an image to scan.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const problem = await callGeminiVision(selectedImage);
            setProblemDescription(problem.replace(/\*/g, "").trim());
            const solutions = await callGeminiText(problem);
            setSuggestedSolutions(solutions.replace(/\*/g, "").trim());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderBulletPoints = (text) =>
        text
            .split(/\r?\n|•|-/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, idx) => <li key={idx}>{line}</li>);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 font-inter">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-4xl mx-auto border border-green-200">
                <h1 className="text-4xl font-extrabold text-center text-green-800 mb-6">
                    🌿 Farm Health Scanner
                </h1>
                <p className="text-center text-gray-600 mb-8">
                    Upload an image of your field or plant to diagnose issues and get solutions.
                </p>

                {/* Upload Section */}
                <div className="mb-6 bg-green-50 p-4 rounded-xl border border-green-200">
                    <label
                        htmlFor="image-upload"
                        className="block text-lg font-semibold text-green-700 mb-3 cursor-pointer"
                    >
                        Upload Plant/Field Image:
                    </label>
                    <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-green-200 file:text-green-700 hover:file:bg-green-300"
                    />
                    {selectedImage && (
                        <div className="mt-4 text-center">
                            <img
                                src={`data:${mimeType};base64,${selectedImage}`}
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
                    className={`w-full py-3 px-6 rounded-xl text-white font-bold text-lg transition-all duration-300 ${loading || !selectedImage
                            ? "bg-green-300 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700 transform hover:scale-105 shadow-lg cursor-pointer"
                        }`}
                >
                    {loading ? "Scanning..." : "Scan Field"}
                </button>

                {/* Error Message */}
                {error && (
                    <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl">
                        <p className="font-bold">Error:</p>
                        <p>{error}</p>
                    </div>
                )}

                {/* Results */}
                {(problemDescription || suggestedSolutions) && !loading && (
                    <div className="mt-8 pt-6 border-t border-green-200">
                        <h2 className="text-2xl font-bold text-green-800 mb-4">
                            Diagnosis & Solutions
                        </h2>

                        {/* Changed from grid-cols-2 to flex-col for vertical stacking */}
                        <div className="flex flex-col gap-6">
                            {problemDescription && (
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                    <h3 className="text-xl font-semibold text-blue-700 mb-2">
                                        Problem Identified:
                                    </h3>
                                    <ul className="list-disc pl-5 text-gray-800 space-y-1">
                                        {renderBulletPoints(problemDescription)}
                                    </ul>
                                </div>
                            )}

                            {suggestedSolutions && (
                                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                                    <h3 className="text-xl font-semibold text-yellow-700 mb-2">
                                        Suggested Solutions:
                                    </h3>
                                    <ul className="list-disc pl-5 text-gray-800 space-y-1">
                                        {renderBulletPoints(suggestedSolutions)}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Where to Buy */}
                        <div className="mt-6 bg-purple-50 p-4 rounded-xl border border-purple-200">
                            <h3 className="text-xl font-semibold text-purple-700 mb-2">
                                Where to Buy:
                            </h3>
                            <p className="text-gray-800">
                                Search online (e.g., "Buy [Product Name] near me") or visit local
                                agricultural stores for recommended products.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
