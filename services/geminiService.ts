

import { GoogleGenAI, Type } from "@google/genai";
import { PresentationPlan, Language, SlideData } from "../types";

// Helper function to safely get API key
const getApiKey = () => {
  const key = process.env.API_KEY;
  if (!key) {
    console.error("API_KEY is missing from environment variables");
    throw new Error("API configuration error");
  }
  return key;
};

export const generateSlidePlan = async (
  contextText: string,
  slideCount: number,
  urlInputs: string[],
  outputLanguage: Language,
  styleInput?: string,
  requirementsInput?: string
): Promise<PresentationPlan> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  let promptContext = contextText;
  
  if (urlInputs.length > 0) {
    promptContext += `\n\nAlso consider information from these URLs if you can access general knowledge about them (if not, ignore): ${urlInputs.join(', ')}`;
  }

  const langInstruction = outputLanguage === 'zh' 
    ? "You MUST generate the content in Simplified Chinese (简体中文). Translate source content if necessary." 
    : "You MUST generate the content in English.";

  const userReqs = requirementsInput ? `USER'S SPECIAL REQUIREMENTS FOR ANALYSIS & STRUCTURE: "${requirementsInput}"\n(Please STRICTLY follow these requirements when analyzing the content and structuring the slides.)` : "";
  const userStyle = styleInput ? `TARGET PRESENTATION STYLE: "${styleInput}"\n(Keep this style in mind when writing the visual notes.)` : "";

  const systemInstruction = `
    You are an elite Research Analyst and Senior Presentation Strategist.
    Your goal is to conduct a deep-dive analysis of the provided source materials and synthesize a comprehensive, high-density presentation plan.

    The user wants exactly ${slideCount} slides.

    ${userReqs}

    ${userStyle}

    CRITICAL REQUIREMENTS FOR CONTENT QUALITY:
    1. **Deep & Insightful**: Do not just summarize. Extract specific data points, quotes, nuances, and key arguments. The content should demonstrate a thorough understanding of the source material.
    2. **Rich & Detailed**: Avoid vague bullet points. Each bullet point should be a full, substantial sentence that conveys specific information, reasoning, or evidence. 
    3. **Structured Narrative**: Organize the slides logically to tell a cohesive story.
    4. **Visual Strategy**: The 'visualNote' must be descriptive and specific to help a designer create the exact slide visual (e.g., "A split-screen comparison showing the old process vs. the new automated workflow," not just "Comparison").

    ${langInstruction}
  `;

  const prompt = `
    Analyze the following content and create a professional presentation plan with ${slideCount} slides in ${outputLanguage === 'zh' ? 'Chinese' : 'English'}.
    
    Ensure the content is rich, detailed, and directly derived from the source material.

    Content:
    ${promptContext.substring(0, 500000)} 
    (Content truncated to fit context if necessary)
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING, description: `The main topic/title of the presentation in ${outputLanguage}` },
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Unique ID for the slide, e.g., 'slide-1'" },
                  title: { type: Type.STRING, description: `Slide Headline in ${outputLanguage}` },
                  bullets: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: `Detailed key points for the slide in ${outputLanguage}` 
                  },
                  visualNote: { type: Type.STRING, description: `Detailed description of the ideal image/graphic for this slide in ${outputLanguage}` }
                },
                required: ["id", "title", "bullets", "visualNote"]
              }
            }
          },
          required: ["topic", "slides"]
        }
      }
    });

    if (response.text) {
        const parsed = JSON.parse(response.text) as PresentationPlan;
        // Inject user style/requirements into the plan object so they persist
        parsed.style = styleInput;
        parsed.requirements = requirementsInput;
        // Ensure selectedImageIds is initialized
        parsed.slides.forEach(s => s.selectedImageIds = []);
        return parsed;
    }
    throw new Error("Empty response from AI");

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    // Fallback if JSON parsing fails or API errors
    return {
      topic: outputLanguage === 'zh' ? "生成的演示文稿" : "Generated Presentation",
      style: styleInput,
      slides: Array.from({ length: slideCount }).map((_, i) => ({
        id: `slide-${i}`,
        title: `${outputLanguage === 'zh' ? '幻灯片' : 'Slide'} ${i + 1}`,
        bullets: [
            outputLanguage === 'zh' ? "内容生成失败。" : "Content generation failed.", 
            outputLanguage === 'zh' ? "请手动编辑。" : "Please edit manually."
        ],
        visualNote: "Placeholder",
        selectedImageIds: []
      }))
    };
  }
};

/**
 * Generates the final slide image using gemini-3-pro-image-preview (Nano Banana Pro) or fallback.
 * It combines the slide structure (text) and any user-provided reference images (array).
 */
export const generateFinalSlideImage = async (
  slide: SlideData, 
  style: string,
  userImageBase64s?: string[]
): Promise<string> => {
  // Always instantiate a new client to ensure the latest API key from aistudio is used
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const imageCount = userImageBase64s?.length || 0;
  
  // Explicit instruction to strictly follow text content and style, with multi-image handling
  const textPrompt = `
    Design a professional, high-end presentation slide (16:9 Aspect Ratio).
    
    STRICT CONTENT REQUIREMENTS (DO NOT HALLUCINATE TEXT):
    - Slide Title: "${slide.title}"
    - Key Points to Display: ${slide.bullets.join('; ')}
    
    DESIGN & VISUAL REQUIREMENTS:
    - Target Visual Style: "${style || 'Modern, Corporate, High-Definition'}"
    - Visual Description/Layout Hint: ${slide.visualNote}
    
    Design Guidelines:
    1. **Layout**: Create a balanced, aesthetically pleasing composition. Do not simply list text. Use modern layout techniques (split screen, card overlay, typographic focus).
    2. **Style Adherence**: You MUST strictly adhere to the "Target Visual Style" defined above.
    3. **Text Rendering**: Render the TITLE clearly. Render the Key Points legibly if they fit; if there is too much text, summarize it visually or use distinct headers. 
    4. **Image Integration**: 
       ${imageCount > 0 ? `I have provided ${imageCount} specific images for this slide.` : "No user images provided. Generate a custom illustration/graphic based on the Visual Description."}
       ${imageCount === 1 ? "Integrate the single provided image seamlessly (e.g., as a hero image, full background with overlay, or split layout)." : ""}
       ${imageCount > 1 ? "Arrange the provided images artistically (e.g., a neat grid, a collage, or distributed across the layout). Ensure they balance well with the text." : ""}
       IMPORTANT: If provided, the user images MUST be visible in the final design.
    
    Output: A single high-quality presentation slide image.
  `;

  const parts: any[] = [];
  
  // Add all user images to the prompt
  if (userImageBase64s && userImageBase64s.length > 0) {
    userImageBase64s.forEach(base64 => {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg', // Assuming jpeg/png, API handles standard types
            data: base64.split(',')[1] // Remove data URL header
          }
        });
    });
  }

  parts.push({ text: textPrompt });

  // Helper to try generation
  const tryGenerate = async (modelName: string) => {
    return await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "2K" // High quality for text legibility
        }
      }
    });
  };

  try {
    // 1. Try High Quality Model
    console.log("Attempting generation with gemini-3-pro-image-preview...");
    const response = await tryGenerate('gemini-3-pro-image-preview');

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");

  } catch (error: any) {
    console.warn("Primary model failed, checking for fallback...", error);
    
    const errorMsg = error?.message || error?.toString() || "";
    
    if (errorMsg.includes("permission") || errorMsg.includes("403") || errorMsg.includes("not found")) {
        console.log("Falling back to gemini-2.5-flash-image...");
        try {
            // Re-instantiate AI just in case
            const fallbackResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image', // Nano Banana
                contents: { parts },
                config: {
                     imageConfig: {
                        aspectRatio: "16:9"
                     }
                }
            });
             for (const part of fallbackResponse.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        } catch (fallbackError) {
             console.error("Fallback generation failed:", fallbackError);
             throw fallbackError; // Throw original or fallback error
        }
    }

    // Re-throw original error if it wasn't handled by fallback
    throw error;
  }
};
