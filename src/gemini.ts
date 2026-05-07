import { GoogleGenAI, ThinkingLevel } from "@google/genai";

// Initialization according to gemini-api skill
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Shayari {
  text: string;
  poet: string;
  meanings: Record<string, string>;
  musicSuggestion: string;
  videoConcept: string;
  tags: string[];
}

export async function* generateShayariStream(moodOrPreference: string, excludeList: string[] = []): AsyncGenerator<Shayari[]> {
  const prompt = `Act as an expert Hindi/Urdu Shayari Assistant. 
    User preference/mood: "${moodOrPreference}"
    
    ${excludeList.length > 0 ? `CRITICAL CONSTRAINT: You MUST NOT generate any of the following shayaris (exact or very similar):
    ${excludeList.slice(-20).join('\n---\n')}
    
    This is for a "Next Page" feature, so provide entirely DIFFERENT and FRESH content.` : ''}
    
    Generate exactly 4 UNIQUE, deep, soulful, and poetic shayaris (2-line or 4-line) in Hindi (Devanagari).
    
    For each shayari:
    1. Detect mood (Ishq, Dard, etc).
    2. Poet name (Classic or Modern AI).
    3. Dictionary of 2-3 difficult words -> simple meanings.
    4. Music vibe and a short cinematic video concept.
    
    IMPORTANT: Provide ONLY the JSON array. Output MUST be valid JSON. No conversational text.
    Use high-quality poetic standards. Ensure diversity in themes.`;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-1.5-flash", // Using 1.5 Flash for maximum speed and stability
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.9, // Higher temperature for more creative/diverse shayaris
      }
    });

    let accumulatedText = "";

    for await (const chunk of responseStream) {
      accumulatedText += chunk.text || "";
      
      // Try to yield as soon as we have a partial but valid array of objects
      try {
        const lastIndex = accumulatedText.lastIndexOf('}');
        if (lastIndex !== -1) {
          const partial = accumulatedText.substring(0, lastIndex + 1) + ']';
          const cleaned = partial.startsWith('[') ? partial : '[' + partial.substring(partial.indexOf('{'));
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed) && parsed.length > 0) {
            yield parsed;
          }
        }
      } catch (e) {
        // Continue accumulating
      }
    }

    // Final clean yield
    const finalClean = accumulatedText.trim();
    if (finalClean.startsWith('[') && finalClean.endsWith(']')) {
      try {
        yield JSON.parse(finalClean);
      } catch (e) {
        console.error("Final parse failed", e);
      }
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    yield [];
  }
}
