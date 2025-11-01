
// @google/genai-codex-fix: Updated import to use GoogleGenAI
import { GoogleGenAI } from "@google/genai";
import { StarSystem } from '../types';

// Per coding guidelines, API_KEY is assumed to be available in process.env.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSystemDescription = async (system: StarSystem): Promise<string> => {
  const prompt = `Generate a creative, detailed, and engaging description for a fictional star system in a sci-fi universe.

  System Name: ${system.name}
  Economy Type: ${system.economy}
  Government Type: ${system.government}
  Base Description: ${system.description}

  Expand on this information. Describe the main planets, the dominant culture, potential dangers, unique landmarks, and any interesting rumors or lore. Make it sound like an entry in a galactic travel guide or a pilot's briefing. Aim for 2-3 paragraphs.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    // Correctly extract the text from the response.
    return response.text;
  } catch (error) {
    console.error("Error generating system description:", error);
    return "Error communicating with the AI. The cosmic static is too strong.";
  }
};