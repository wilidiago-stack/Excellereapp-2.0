import {genkit, z} from "genkit";
import {googleAI} from "@genkit-ai/google-genai";
import {onCallGenkit} from "firebase-functions/https";
import {defineSecret} from "firebase-functions/params";

const apiKey = defineSecret("GOOGLE_GENAI_API_KEY");

/**
 * Initialize telemetry safely.
 */
async function startTelemetry() {
  try {
    // Dynamic load to avoid build-time type errors
    const modulePath = "@genkit-ai/firebase";
    const m = await import(modulePath);
    if (m && typeof m.enableFirebaseTelemetry === "function") {
      m.enableFirebaseTelemetry();
    }
  } catch (e) {
    // Optional
  }
}

startTelemetry();

const ai = genkit({
  plugins: [googleAI()],
});

const menuSuggestionFlow = ai.defineFlow({
  name: "menuSuggestionFlow",
  inputSchema: z.string().describe("A restaurant theme").default("seafood"),
  outputSchema: z.string(),
  streamSchema: z.string(),
}, async (subject, {sendChunk}) => {
  const {response, stream} = ai.generateStream({
    model: googleAI.model("gemini-2.5-flash"),
    prompt: `Suggest an item for the menu of a ${subject} restaurant`,
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
