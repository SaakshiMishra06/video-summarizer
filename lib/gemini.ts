import { GoogleGenAI } from '@google/genai';
import { VideoSummary, ChatMessage, StudyMaterial } from '../types';

// Initialize the Google GenAI SDK
const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates a structured summary from a video transcript using Gemini 1.5 Flash.
 */
export async function generateVideoSummary(transcript: string, videoTitle: string): Promise<Omit<VideoSummary, 'id' | 'video_id' | 'created_at'>> {
  const ai = getAI();

  const prompt = `
You are an expert video summarizer and content creator. Analyze the following transcript of a video titled "${videoTitle}" and generate a highly detailed and structured response.

TRANSCRIPT:
"""
${transcript}
"""

Please generate a structured JSON object containing:
1. "short_summary": A concise 2-3 sentence overview of the video's core message.
2. "detailed_summary": A deep, multi-paragraph, professional explanation of the content.
3. "bullet_points": An array of at least 5 detailed bullet-point notes summarizing key explanations.
4. "key_insights": An array of at least 3 high-value, actionable take-aways or core learnings.
5. "chapters": An array of timestamp-based chapters. Each chapter must have:
   - "timestamp": A string in "MM:SS" or "HH:MM:SS" format (estimate logical chapter breaks based on flow, starting from "00:00").
   - "timeInSeconds": The estimated timestamp converted to total number of seconds.
   - "title": A descriptive chapter title.
   - "description": A 1-2 sentence description of what is covered in this chapter.
6. "linkedin_post": A premium, highly engaging LinkedIn post based on the summary. Include a hook, bullet points, and relevant hashtags.
7. "twitter_thread": An array of 3-5 tweets making up a cohesive, high-retention Twitter/X thread summarizing the key concepts.

You MUST respond with a valid JSON object ONLY. Do not wrap the JSON in triple backticks or markdown, or return anything else. The JSON must exactly match the structure requested above.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const responseText = response.text?.trim();
    if (!responseText) {
      throw new Error('Received empty response from Gemini API');
    }

    // Parse response as JSON
    const parsedData = JSON.parse(responseText);
    return {
      short_summary: parsedData.short_summary || '',
      detailed_summary: parsedData.detailed_summary || '',
      bullet_points: parsedData.bullet_points || [],
      key_insights: parsedData.key_insights || [],
      chapters: parsedData.chapters || [],
      linkedin_post: parsedData.linkedin_post || '',
      twitter_thread: parsedData.twitter_thread || [],
    };
  } catch (error) {
    console.error('Error generating summary from Gemini:', error);
    throw new Error(`Gemini summary generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Responds to a user message regarding a transcript in a context-aware chat.
 */
export async function chatWithTranscript(
  transcript: string,
  messageHistory: ChatMessage[],
  newMessage: string
): Promise<string> {
  const ai = getAI();

  const systemInstruction = `
You are "VidBrief AI Chatbot", a helpful and intelligent AI assistant. 
Your task is to answer user questions about the video transcript provided below.
Provide accurate, thorough, and concise answers based ONLY on the transcript context. If the answer cannot be reasonably inferred from the transcript, politely let the user know that this information is not covered in the video, but try to be as helpful as possible based on the content that IS in the video.

VIDEO TRANSCRIPT CONTEXT:
"""
${transcript}
"""
`;

  // Map history to Gemini's format: contents: [{role: 'user'|'model', parts: [{text: ...}]}]
  // Note: in Gemini SDK, assistant is 'model' and user is 'user'
  const contents = messageHistory.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  // Append new user message
  contents.push({
    role: 'user',
    parts: [{ text: newMessage }],
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents as any, // Cast to any to handle type compatibility if needed
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text?.trim() || "I'm sorry, I couldn't formulate a response. Please try asking again.";
  } catch (error) {
    console.error('Error in Gemini Chat:', error);
    throw new Error(`Gemini chat failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generates student-friendly study materials (flashcards, MCQs, revision notes)
 * from a video transcript using Gemini 2.5 Flash.
 */
export async function generateStudyMaterials(
  transcript: string,
  videoTitle: string
): Promise<Omit<StudyMaterial, 'id' | 'video_id' | 'created_at'>> {
  const ai = getAI();

  const prompt = `
You are an expert educational content creator and teacher. Based on the following video transcript titled "${videoTitle}", generate comprehensive study materials for students.

TRANSCRIPT:
"""
${transcript}
"""

Generate a JSON object with EXACTLY this structure:
{
  "flashcards": [
    { "question": "...", "answer": "..." }
    // Generate 8 to 12 flashcards covering key concepts
  ],
  "quiz": [
    {
      "question": "...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "explanation": "Why this is correct and why others are wrong"
    }
    // Generate 6 to 8 MCQ questions of varying difficulty
  ],
  "revision_notes": {
    "overview": "A 3-4 sentence high-level overview of the entire topic for quick revision.",
    "sections": [
      {
        "title": "Section title",
        "content": "A detailed paragraph explaining this section.",
        "bullets": ["Key point 1", "Key point 2", "Key point 3"]
      }
      // Generate 3-5 logical sections based on the video content
    ],
    "keyTerms": [
      { "term": "Term name", "definition": "Clear, simple definition of this term" }
      // Generate 5-8 important key terms with definitions
    ]
  }
}

IMPORTANT:
- correctAnswerIndex is zero-based (0 = first option, 1 = second option, etc.)
- Make flashcards concise: questions should be short and answers should be 1-2 sentences
- Make MCQs challenging but fair — include plausible distractors
- Revision notes should be thorough and suitable for exam preparation
- Respond with VALID JSON ONLY. No markdown, no code blocks, no extra text.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const responseText = response.text?.trim();
    if (!responseText) {
      throw new Error('Received empty response from Gemini API');
    }

    const parsed = JSON.parse(responseText);
    return {
      flashcards: parsed.flashcards || [],
      quiz: parsed.quiz || [],
      revision_notes: parsed.revision_notes || { overview: '', sections: [], keyTerms: [] },
    };
  } catch (error) {
    console.error('Error generating study materials from Gemini:', error);
    throw new Error(`Study material generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
