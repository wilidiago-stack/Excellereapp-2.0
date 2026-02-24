import {genkit, z} from "genkit";
import {googleAI} from "@genkit-ai/google-genai";
import {onCallGenkit} from "firebase-functions/https";
import {defineSecret} from "firebase-functions/params";

const apiKey = defineSecret("GOOGLE_GENAI_API_KEY");

/**
 * Initialize telemetry safely without triggering linting or type errors.
 * Dynamic import prevents the compiler from blocking on missing types.
 */
import("@genkit-ai/firebase")
  .then((m) => {
    try {
      m.enableFirebaseTelemetry();
    } catch (e) {
      // Telemetry initialization optional
    }
  })
  .catch(() => {
    // Module might be missing in some build contexts
  });

const ai = genkit({
  plugins: [googleAI()],
});

const menuSuggestionFlow = ai.defineFlow({
  name: "menuSuggestionFlow",
  inputSchema: z.string().describe("A restaurant theme").default("seafood"),
  outputSchema: z.string(),
  streamSchema: z.string(),
}, async (subject, {sendChunk}) => {
  const prompt = `Suggest an item for the menu of a ${subject} restaurant`;
  const {response, stream} = ai.generateStream({
    model: googleAI.model("gemini-2.5-flash"),
    prompt: prompt,
    config: {temperature: 1},
  });

  for await (const chunk of stream) {
    sendChunk(chunk.text);
  }
  return (await response).text;
});

export const menuSuggestion = onCallGenkit({
  secrets: [apiKey],
}, menuSuggestionFlow);
