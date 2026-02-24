'use server';
/**
 * @fileOverview Genkit Flow to process voice transcripts into structured daily report data.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DailyReportExtractionSchema = z.object({
  weather: z.object({
    conditions: z.string().describe('Sky conditions like sunny, rainy, etc.'),
    highTemp: z.number().describe('High temperature in Fahrenheit'),
    lowTemp: z.number().describe('Low temperature in Fahrenheit'),
    wind: z.number().describe('Wind speed in mph'),
  }).optional(),
  safetyStats: z.object({
    recordableIncidents: z.number().default(0),
    lightFirstAids: z.number().default(0),
    safetyMeeting: z.number().default(0),
    toolBoxTalks: z.number().default(0),
  }).optional(),
  manHours: z.array(z.object({
    contractorName: z.string().describe('Name of the company or contractor'),
    headcount: z.number(),
    hours: z.number(),
  })).optional(),
  activities: z.array(z.object({
    contractorName: z.string(),
    activity: z.string(),
    location: z.string().describe('Area of work like Level 1, Roof, etc.'),
  })).optional(),
  notes: z.array(z.string()).optional(),
});

export type DailyReportExtraction = z.infer<typeof DailyReportExtractionSchema>;

export async function processReportVoice(transcript: string): Promise<DailyReportExtraction> {
  return processReportVoiceFlow(transcript);
}

const processReportVoiceFlow = ai.defineFlow(
  {
    name: 'processReportVoiceFlow',
    inputSchema: z.string(),
    outputSchema: DailyReportExtractionSchema,
  },
  async (transcript) => {
    const { output } = await ai.generate({
      prompt: `You are an expert construction site administrator. 
      Extract structured data from the following voice transcript of a daily site report.
      
      Transcript: "${transcript}"
      
      Rules:
      1. Identify contractor names, headcount, and hours.
      2. Identify weather conditions and temperatures (Fahrenheit).
      3. Identify safety incidents or meetings mentioned.
      4. If a contractor name is mentioned but no hours are specified, assume 8 hours if headcount is present.
      5. Return ONLY the JSON structure.`,
      output: { schema: DailyReportExtractionSchema },
    });
    return output!;
  }
);
