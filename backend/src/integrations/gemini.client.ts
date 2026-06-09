import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY || '';
const isProd = process.env.NODE_ENV === 'production';
const allowMockAI = process.env.ALLOW_MOCK_AI === 'true';
const genAI = new GoogleGenerativeAI(apiKey);

export interface GeminiAnalysisOutput {
  summary: string;
  discussionTopics: string[];
  decisions: string[];
  outcomes: string[];
  audioQualityScore: number; // 0 to 100
  rawAssignments: Array<{
    description: string;
    extractedAssigneeName?: string;
    confidence: number;
    deadline?: string; // ISO date string
    suggestedDependsOnTitle?: string;
  }>;
}

export class GeminiClient {
  private modelSTT = 'gemini-1.5-pro';
  private modelAnalysis = 'gemini-1.5-pro';

  constructor() {
    if (!apiKey) {
      const msg = '[GeminiClient] GOOGLE_API_KEY is not defined.';
      if (isProd) {
        console.error(`${msg} Production requires a valid GOOGLE_API_KEY for Gemini generative & STT integrations.`);
        throw new Error('Gemini integration unavailable: GOOGLE_API_KEY missing in production');
      } else if (!allowMockAI) {
        console.error(`${msg} Development mode requires either a valid GOOGLE_API_KEY or ALLOW_MOCK_AI=true to permit mock data.`);
        throw new Error('Gemini integration unavailable: GOOGLE_API_KEY missing and ALLOW_MOCK_AI not enabled');
      } else {
        console.warn(`${msg} ALLOW_MOCK_AI=true — mock outputs will be used for development purposes only.`);
      }
    }
  }

  /**
   * Transcribe audio buffer using Gemini 1.5 Pro.
   */
  async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
    // Validate API key availability
    if (!apiKey) {
      const msg = '[GeminiClient] GOOGLE_API_KEY is missing. Cannot transcribe audio.';
      if (allowMockAI && !isProd) {
        const mockTranscript = 'Mock Transcript: [Visualizing mockup meeting transcription.]\nAdmin: Hello team, let\'s launch the CatchUp dashboard.\nDeveloper: Yes, I am working on the backend schem[...]';
        console.warn(`${msg} ALLOW_MOCK_AI=true — returning mock transcript for development only.`);
        return mockTranscript;
      }
      console.error(msg);
      throw new Error('Gemini transcription failed: GOOGLE_API_KEY missing');
    }

    if (apiKey.startsWith('AQ.')) {
      const msg = '[GeminiClient] GOOGLE_API_KEY appears to be a placeholder (AQ.*). Cannot transcribe audio.';
      if (allowMockAI && !isProd) {
        const mockTranscript = 'Mock Transcript: [Visualizing mockup meeting transcription.]\nAdmin: Hello team, let\'s launch the CatchUp dashboard.\nDeveloper: Yes, I am working on the backend schem[...]';
        console.warn(`${msg} ALLOW_MOCK_AI=true — returning mock transcript for development only.`);
        return mockTranscript;
      }
      console.error(msg);
      throw new Error('Gemini transcription failed: GOOGLE_API_KEY is not configured');
    }

    try {
      const model = genAI.getGenerativeModel({ model: this.modelSTT });

      const audioPart = {
        inlineData: {
          data: audioBuffer.toString('base64'),
          mimeType,
        },
      };

      const prompt = 'Transcribe the following meeting audio. Identify speakers by voice/context where possible (e.g., Speaker 1, Speaker 2) and produce a detailed raw transcript.';

      const result = await model.generateContent([prompt, audioPart]);
      const response = await result.response;
      const text = response.text();
      
      if (!text) {
        throw new Error('Gemini API returned empty transcription response');
      }
      
      return text;
    } catch (error) {
      console.error('[GeminiClient] Speech-to-Text transcription failed:', error);
      throw new Error('Gemini transcription failed: ' + (error as any)?.message || String(error));
    }
  }

  /**
   * Analyze meeting transcript and extract structured tasks/decisions.
   */
  async analyzeTranscript(
    transcript: string,
    memberNames: string[]
  ): Promise<GeminiAnalysisOutput> {
    // Validate API key availability
    if (!apiKey) {
      const msg = '[GeminiClient] GOOGLE_API_KEY is missing. Cannot analyze transcript.';
      if (allowMockAI && !isProd) {
        const mockOutput: GeminiAnalysisOutput = {
          summary: 'The team discussed the launch of the CatchUp dashboard, including backend schema development and landing page animations.',
          discussionTopics: ['CatchUp Dashboard Launch', 'Backend Schema', 'Landing Page Animations'],
          decisions: ['Integrate backend by Thursday', 'Finish landing page by tomorrow'],
          outcomes: ['Assigned task for landing page to Designer', 'Assigned task for backend to Developer'],
          audioQualityScore: 92,
          rawAssignments: [
            {
              description: 'Finish landing page animations',
              extractedAssigneeName: memberNames[0] || 'Designer',
              confidence: 0.9,
              deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            },
            {
              description: 'Develop backend schemas and models',
              extractedAssigneeName: memberNames[1] || 'Developer',
              confidence: 0.85,
              deadline: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(),
              suggestedDependsOnTitle: 'Finish landing page animations',
            },
          ],
        };
        console.warn(`${msg} ALLOW_MOCK_AI=true — returning mock analysis for development only.`);
        return mockOutput;
      }
      console.error(msg);
      throw new Error('Gemini analysis failed: GOOGLE_API_KEY missing');
    }

    if (apiKey.startsWith('AQ.')) {
      const msg = '[GeminiClient] GOOGLE_API_KEY appears to be a placeholder (AQ.*). Cannot analyze transcript.';
      if (allowMockAI && !isProd) {
        const mockOutput: GeminiAnalysisOutput = {
          summary: 'The team discussed the launch of the CatchUp dashboard, including backend schema development and landing page animations.',
          discussionTopics: ['CatchUp Dashboard Launch', 'Backend Schema', 'Landing Page Animations'],
          decisions: ['Integrate backend by Thursday', 'Finish landing page by tomorrow'],
          outcomes: ['Assigned task for landing page to Designer', 'Assigned task for backend to Developer'],
          audioQualityScore: 92,
          rawAssignments: [
            {
              description: 'Finish landing page animations',
              extractedAssigneeName: memberNames[0] || 'Designer',
              confidence: 0.9,
              deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            },
            {
              description: 'Develop backend schemas and models',
              extractedAssigneeName: memberNames[1] || 'Developer',
              confidence: 0.85,
              deadline: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(),
              suggestedDependsOnTitle: 'Finish landing page animations',
            },
          ],
        };
        console.warn(`${msg} ALLOW_MOCK_AI=true — returning mock analysis for development only.`);
        return mockOutput;
      }
      console.error(msg);
      throw new Error('Gemini analysis failed: GOOGLE_API_KEY is not configured');
    }

    try {
      const model = genAI.getGenerativeModel({
        model: this.modelAnalysis,
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const systemInstruction = `
        You are an AI meeting analyst. Analyze the following meeting transcript.
        The active team members in this hub are: ${JSON.stringify(memberNames)}.
        
        Extract and evaluate the following:
        1. Executive summary: Provide a generic high-level description of what transpired (e.g. pros/cons, general topics discussed, atmosphere/outcome) and do NOT mention the specific assignment details verbatim. 
        2. Discussion Topics (ordered list of topics).
        3. Decisions Made (explicit decisions).
        4. Outcomes (results or agreements reached).
        5. Audio Quality and Speech Clarity Score (\"audioQualityScore\"):
           Evaluate the quality of the meeting audio and the clarity of speech (pronunciation/English clarity/completeness). Return an integer score between 0 and 100, where 100 is perfect signal and 0 is unintelligible audio.
        6. Action items / Assignments: 
           - For each action item, match it to a team member in the member list by their name.
           - Fuzzy Name Matching: If a first name or partial name is mentioned in the transcript (e.g., \"Amruta\" or \"Bhavana\"), you MUST match and resolve it to their full name from the active member list provided.
           - Extract the deadline as an ISO string based on verbal dates (e.g. \"by tomorrow\", \"by Friday\"). 
           - Set a confidence score between 0.0 and 1.0 based on how clear the assignment and deadline are.
           - Identify if the task depends on another task (i.e. \"suggestedDependsOnTitle\" should name the other task's description/title).
 
        Return the data strictly in the following JSON format:
        {
          "summary": "string",
          "discussionTopics": ["string"],
          "decisions": ["string"],
          "outcomes": ["string"],
          "audioQualityScore": number,
          "rawAssignments": [
            {
              "description": "string",
              "extractedAssigneeName": "string (MUST use resolved full name from active member list)",
              "confidence": number,
              "deadline": "string (ISO Date)",
              "suggestedDependsOnTitle": "string"
            }
          ]
        }
      `;

      const result = await model.generateContent([
        systemInstruction,
        `Meeting Transcript:\n${transcript}`,
      ]);

      const response = await result.response;
      const jsonText = response.text();

      if (!jsonText) {
        throw new Error('Gemini API returned empty analysis response');
      }

      return JSON.parse(jsonText) as GeminiAnalysisOutput;
    } catch (error) {
      console.error('[GeminiClient] Transcript analysis failed:', error);
      throw new Error('Gemini analysis failed: ' + (error as any)?.message || String(error));
    }
  }
}
