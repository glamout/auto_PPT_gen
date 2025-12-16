
import { GoogleGenAI, Type } from "@google/genai";
import { PresentationPlan, Language, SlideData, Provider, LogEntry } from "../types";

// Helper function to safely get API key
const getApiKey = (providedKey?: string) => {
  if (providedKey) return providedKey;
  const key = process.env.API_KEY;
  if (!key) {
    // We allow empty key here because Zenmux might be selected, 
    // or key is provided via UI. 
    // But if we actually need it for Google SDK and it's missing, SDK will throw.
    return ""; 
  }
  return key;
};

export const generateSlidePlan = async (
  contextText: string,
  slideCount: number,
  urlInputs: string[],
  outputLanguage: Language,
  styleInput?: string,
  requirementsInput?: string,
  provider: Provider = 'google',
  apiKey: string = '',
  addLog?: (entry: LogEntry) => void
): Promise<PresentationPlan> => {
  
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

  // --- ZENMUX PROVIDER ---
  if (provider === 'zenmux') {
    // Manually construct the JSON schema description to mimic the behavior of Google's responseSchema
    const jsonSchemaDescription = `
    RESPONSE FORMAT INSTRUCTIONS:
    You MUST respond with a valid JSON object strictly following this schema:
    {
      "type": "object",
      "properties": {
        "topic": { "type": "string", "description": "The main topic/title of the presentation in ${outputLanguage}" },
        "slides": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string", "description": "Unique ID for the slide, e.g., 'slide-1'" },
              "title": { "type": "string", "description": "Slide Headline in ${outputLanguage}" },
              "bullets": { 
                "type": "array", 
                "items": { "type": "string" },
                "description": "Detailed key points for the slide in ${outputLanguage}" 
              },
              "visualNote": { "type": "string", "description": "Detailed description of the ideal image/graphic for this slide in ${outputLanguage}" }
            },
            "required": ["id", "title", "bullets", "visualNote"]
          }
        }
      },
      "required": ["topic", "slides"]
    }
    `;

    const messages = [
      { role: 'system', content: systemInstruction + "\n\n" + jsonSchemaDescription },
      { role: 'user', content: prompt }
    ];

    addLog?.({
      timestamp: new Date().toISOString(),
      type: 'request',
      url: '/api/zenmux/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { model: 'google/gemini-2.5-flash', messages: messages, response_format: { type: "json_object" } }
    });

    try {
      const resp = await fetch('/api/zenmux/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages,
          response_format: { type: "json_object" }
        })
      });

      const data = await resp.json();
      addLog?.({
        timestamp: new Date().toISOString(),
        type: 'response',
        response: data
      });

      if (!resp.ok) {
        throw new Error(data.error?.message || 'Zenmux API Error');
      }

      let content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("No content in Zenmux response");

      // Clean Markdown code blocks
      if (content.includes('```json')) {
        content = content.split('```json')[1].split('```')[0].trim();
      } else if (content.includes('```')) {
        content = content.split('```')[1].split('```')[0].trim();
      }

      const parsed = JSON.parse(content) as PresentationPlan;
      parsed.style = styleInput;
      parsed.requirements = requirementsInput;
      if (!parsed.slides) throw new Error("Invalid JSON structure from Zenmux");
      parsed.slides.forEach(s => s.selectedImageIds = []);
      return parsed;

    } catch (error) {
      console.error("Zenmux Generation Error:", error);
      addLog?.({ timestamp: new Date().toISOString(), type: 'error', message: String(error) });
      return createFallbackPlan(slideCount, outputLanguage, styleInput);
    }
  }

  // --- GOOGLE PROVIDER (DEFAULT) ---
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  
  try {
    addLog?.({
        timestamp: new Date().toISOString(),
        type: 'request',
        message: 'Calling Google Gemini 2.5 Flash via SDK'
    });

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

    addLog?.({
        timestamp: new Date().toISOString(),
        type: 'response',
        message: 'Google SDK Response received'
    });

    if (response.text) {
        const parsed = JSON.parse(response.text) as PresentationPlan;
        parsed.style = styleInput;
        parsed.requirements = requirementsInput;
        parsed.slides.forEach(s => s.selectedImageIds = []);
        return parsed;
    }
    throw new Error("Empty response from AI");

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    addLog?.({ timestamp: new Date().toISOString(), type: 'error', message: String(error) });
    return createFallbackPlan(slideCount, outputLanguage, styleInput);
  }
};

const createFallbackPlan = (slideCount: number, outputLanguage: Language, styleInput?: string): PresentationPlan => {
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

/**
 * Generates the final slide image using gemini-3-pro-image-preview (Nano Banana Pro) or fallback.
 * It combines the slide structure (text) and any user-provided reference images (array).
 */
export const generateFinalSlideImage = async (
  slide: SlideData, 
  style: string,
  userImageBase64s?: string[],
  provider: Provider = 'google',
  apiKey: string = '',
  addLog?: (entry: LogEntry) => void
): Promise<string> => {
  
  const imageCount = userImageBase64s?.length || 0;
  
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
       ${imageCount === 1 ? "Integrate the single provided image seamlessly (e.g., as a hero image, full background with overlay, or split layout). The provided images must be clearly displayed in the page layout." : ""}
       ${imageCount > 1 ? "Arrange the provided images artistically (e.g., a neat grid, a collage, or distributed across the layout). Ensure they balance well with the text. The provided images must be clearly displayed in the page layout." : ""}
       IMPORTANT: If provided, the user images MUST be visible in the final design.
    
    Output: A single high-quality presentation slide image.
  `;

  const parts: any[] = [];
  
  if (userImageBase64s && userImageBase64s.length > 0) {
    userImageBase64s.forEach(base64 => {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg', 
            data: base64.split(',')[1] 
          }
        });
    });
  }

  parts.push({ text: textPrompt });

  // --- ZENMUX PROVIDER ---
  if (provider === 'zenmux') {
      const payload = {
        apiKey, 
        model: 'google/gemini-3-pro-image-preview',
        contents: [{ role: 'user', parts }],
        generationConfig: {
            imageConfig: {
                aspectRatio: "16:9",
                imageSize: "4K"
            }
        }
    };
    
    addLog?.({
      timestamp: new Date().toISOString(),
      type: 'request',
      url: '/api/zenmux/vertex-ai/v1/models/google/gemini-3-pro-image-preview:generateContent',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { ...payload, apiKey: '***' }
    });

    try {
        const resp = await fetch('/api/zenmux/vertex-ai/v1/models/google/gemini-3-pro-image-preview:generateContent', {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${apiKey}`
             },
             body: JSON.stringify({
                contents: [{ role: 'user', parts }],
                generationConfig: {
                    imageConfig: {
                        aspectRatio: "16:9",
                        imageSize: "4K"
                    }
                }
             })
        });
        
        const data = await resp.json();
        addLog?.({
              timestamp: new Date().toISOString(),
              type: 'response',
              response: data
          });

        if (!resp.ok) throw new Error(data.error?.message || 'Zenmux Image API Error');
        
        // Handle Zenmux response format (supporting both potential formats)
        let b64 = '';
        if (data.imageBase64) {
            b64 = data.imageBase64;
        } else if (data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
            b64 = data.candidates[0].content.parts[0].inlineData.data;
        } else if (data.candidates?.[0]?.content?.parts) {
            // Check for raw image bytes in parts if not in inlineData structure
            // Sometimes providers might return it differently or nested
            const parts = data.candidates[0].content.parts;
            for (const p of parts) {
                if (p.inlineData && p.inlineData.data) {
                    b64 = p.inlineData.data;
                    break;
                }
            }
        }
        
        if (!b64) {
             console.error("Zenmux Response missing image data:", JSON.stringify(data));
             throw new Error("No image data found in Zenmux response");
        }
        
        return `data:image/png;base64,${b64}`;
    } catch (e) {
        addLog?.({ timestamp: new Date().toISOString(), type: 'error', message: String(e) });
        throw e;
    }
  }

  // --- GOOGLE PROVIDER (DEFAULT) ---
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });

  // Helper to try generation
  const tryGenerate = async (modelName: string) => {
    return await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "4K" // High quality for text legibility
        }
      }
    });
  };

  try {
    addLog?.({ timestamp: new Date().toISOString(), type: 'request', message: 'Calling Google Gemini 3 Pro' });
    
    // 1. Try High Quality Model
    console.log("Attempting generation with gemini-3-pro-image-preview...");
    const response = await tryGenerate('gemini-3-pro-image-preview');

    addLog?.({ timestamp: new Date().toISOString(), type: 'response', message: 'Google Gemini 3 Pro Success' });

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");

  } catch (error: any) {
    console.warn("Primary model failed, checking for fallback...", error);
    addLog?.({ timestamp: new Date().toISOString(), type: 'error', message: `Primary model failed: ${error}` });
    
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
             addLog?.({ timestamp: new Date().toISOString(), type: 'error', message: `Fallback failed: ${fallbackError}` });
             throw fallbackError; // Throw original or fallback error
        }
    }

    // Re-throw original error if it wasn't handled by fallback
    throw error;
  }
};
