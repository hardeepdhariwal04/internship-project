import React, { useState, useEffect } from "react";
import "./App.css";
import { Link } from "react-router-dom";
import { Configuration, OpenAIApi } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BeatLoader } from "react-spinners";

const ResponseAnswer = () => {
  const [formData, setFormData] = useState({
    inputType: "translation", // Default input type
    toLanguage: "Spanish",
    message: "",
  });
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const googleGenAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY);
  const configuration = new Configuration({
    apiKey: import.meta.env.VITE_OPENAI_KEY,
  });
  const openai = new OpenAIApi(configuration);

  const models = [
    "gpt-3.5-turbo",
    "gpt-4",
    "gpt-4-turbo",
    "gemini-1.5-pro-001",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-002",
    "gemini-1.5-pro-002",
    "deepl",
  ];

  const supportedLanguages = {
    deepl: [
      "Arabic", "Bulgarian", "Chinese (Simplified)", "Chinese (Traditional)", "Czech", "Danish",
      "Dutch", "English", "Estonian", "Finnish", "French", "German", "Greek", "Hungarian",
      "Indonesian", "Italian", "Japanese", "Korean", "Latvian", "Lithuanian", "Norwegian",
      "Polish", "Portuguese", "Romanian", "Russian", "Slovak", "Slovenian", "Spanish",
      "Swedish", "Thai", "Turkish", "Ukrainian", "Vietnamese",
    ],
  };

  const saveFeedback = async (model, type, response, rating) => {
    try {
      const res = await fetch("https://your-vercel-app-url/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, type, response, rating }),
      });

      if (!res.ok) {
        throw new Error(`Failed to save feedback: ${res.statusText}`);
      }

      console.log("Feedback saved successfully.");
    } catch (error) {
      console.error("Error saving feedback:", error);
    }
  };

  const translateOrAnswer = async (model, message, toLang) => {
    try {
      const prompt =
        formData.inputType === "translation"
          ? `Translate the text: "${message}" into ${toLang}`
          : `Answer the question: "${message}" in ${toLang}`;

      const api = model.startsWith("gpt") ? openai : googleGenAI;

      if (model.startsWith("gemini")) {
        const genAIModel = googleGenAI.getGenerativeModel({ model });
        const result = await genAIModel.generateContent(prompt);
        return { type: formData.inputType === "translation" ? "translation" : "answer", response: result.response.text() };
      }

      const response = await api.createChatCompletion({
        model,
        messages: [{ role: "user", content: prompt }],
      });

      return {
        type: formData.inputType === "translation" ? "translation" : "answer",
        response: response.data.choices[0].message.content.trim(),
      };
    } catch (error) {
      console.error(`Error with ${model}:`, error);
      return { type: "error", response: `Error fetching response from ${model}` };
    }
  };

  const handleTranslateOrAnswer = async () => {
    const { inputType, toLanguage, message } = formData;

    if (!message || (inputType === "translation" && !toLanguage)) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setIsLoading(true);
    setResponses([]);

    try {
      const results = await Promise.all(
        models.map((m) => translateOrAnswer(m, message, toLanguage))
      );

      const formattedResponses = models.map((m, i) => ({
        model: m,
        type: results[i]?.type,
        response: results[i]?.response,
        rating: null,
        rank: null,
      }));

      setResponses(formattedResponses);
    } catch (error) {
      console.error("Error processing request:", error);
      setError("An error occurred while processing your request.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRatingChange = (index, value) => {
    const updatedResponses = [...responses];
    updatedResponses[index].rating = parseInt(value, 10) || null;

    const { model, type, response } = updatedResponses[index];
    if (updatedResponses[index].rating) {
      saveFeedback(model, type, response, updatedResponses[index].rating);
    }

    const rankedResponses = [...updatedResponses].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    rankedResponses.forEach((res, idx) => (res.rank = idx + 1));

    setResponses(rankedResponses);
  };

  return (
    <div className="container">
      <Link to="/" className="back-link">
        Back to Translation
      </Link>

      <h1>AI Translation & QA App</h1>

      <form onSubmit={(e) => e.preventDefault()}>
        <div className="input-type">
          <label>
            <input
              type="radio"
              name="inputType"
              value="translation"
              checked={formData.inputType === "translation"}
              onChange={(e) => setFormData({ ...formData, inputType: e.target.value })}
            />
            Translation
          </label>
          <label>
            <input
              type="radio"
              name="inputType"
              value="question"
              checked={formData.inputType === "question"}
              onChange={(e) => setFormData({ ...formData, inputType: e.target.value })}
            />
            Question
          </label>
        </div>

        <textarea
          name="message"
          placeholder={
            formData.inputType === "translation"
              ? "Enter text to translate..."
              : "Enter your question..."
          }
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        ></textarea>

        {formData.inputType === "translation" && (
          <select
            name="toLanguage"
            value={formData.toLanguage}
            onChange={(e) => setFormData({ ...formData, toLanguage: e.target.value })}
          >
            {supportedLanguages.deepl.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        )}

        {error && <div className="error">{error}</div>}
        <button onClick={handleTranslateOrAnswer}>Submit</button>
      </form>

      {isLoading ? (
        <BeatLoader size={12} color={"red"} />
      ) : (
        responses.length > 0 && (
          <table className="response-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Type</th>
                <th>Response</th>
                <th>Rating (1-10)</th>
                <th>Rank</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((response, index) => (
                <tr key={index}>
                  <td>{response.model}</td>
                  <td>{response.type}</td>
                  <td>{response.response}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={response.rating || ""}
                      onChange={(e) => handleRatingChange(index, e.target.value)}
                    />
                  </td>
                  <td>{response.rank || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
};

export default ResponseAnswer;
