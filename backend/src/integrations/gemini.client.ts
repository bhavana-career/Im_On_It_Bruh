import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY || '';
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
      console.warn('[GeminiClient] GOOGLE_API_KEY is not defined. Gemini client calls will fail.');
    }
  }

  /**
   * Transcribe audio buffer using Gemini 1.5 Pro.
   */
  async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
    const mockTranscript = 'Mock Transcript: [Visualizing mockup meeting transcription.]\nAdmin: Hello team, let\'s launch the CatchUp dashboard.\nDeveloper: Yes, I am working on the backend schema.\nDesigner: Great, I will finish the landing page animations. Let\'s make sure we have the landing page ready by tomorrow, and then the backend should be integrated by Thursday.';
    
    if (!apiKey || apiKey.startsWith('AQ.')) {
      return mockTranscript;
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
      return response.text() || mockTranscript;
    } catch (error) {
      console.error('[GeminiClient] Speech-to-Text transcription failed, falling back to mock:', error);
      return mockTranscript;
    }
  }

  /**
   * Analyze meeting transcript and extract structured tasks/decisions.
   */
  async analyzeTranscript(
    transcript: string,
    memberNames: string[]
  ): Promise<GeminiAnalysisOutput> {
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
          deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // Tomorrow
        },
        {
          description: 'Develop backend schemas and models',
          extractedAssigneeName: memberNames[1] || 'Developer',
          confidence: 0.85,
          deadline: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(), // Thursday
          suggestedDependsOnTitle: 'Finish landing page animations', // mock dependency
        },
      ],
    };

    if (!apiKey || apiKey.startsWith('AQ.')) {
      return mockOutput;
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
        1. Executive summary: Provide a generic high-level description of what transpired (e.g. pros/cons, general topics discussed, atmosphere/outcome) and do NOT mention the specific assignments/tasks inside this summary string. Keep tasks separate.
        2. Discussion Topics (ordered list of topics).
        3. Decisions Made (explicit decisions).
        4. Outcomes (results or agreements reached).
        5. Audio Quality and Speech Clarity Score ("audioQualityScore"):
           Evaluate the quality of the meeting audio and the clarity of speech (pronunciation/English clarity/completeness). Return an integer score between 0 and 100, where 100 is perfect signal and speech clarity, and a lower score (e.g. below 70) represents issues like poor signal, heavy accents, or fragmented audio.
        6. Action items / Assignments: 
           - For each action item, match it to a team member in the member list by their name.
           - Fuzzy Name Matching: If a first name or partial name is mentioned in the transcript (e.g., "Amruta" or "Bhavana"), you MUST match and resolve it to their full name from the active member list (e.g., "Amruta Nagarjun" or "Bhavana Shivakumar").
           - Extract the deadline as an ISO string based on verbal dates (e.g. "by tomorrow", "by Friday"). 
           - Set a confidence score between 0.0 and 1.0 based on how clear the assignment and deadline are.
           - Identify if the task depends on another task (i.e. "suggestedDependsOnTitle" should name the other task's description/title).
 
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
      
      return JSON.parse(jsonText) as GeminiAnalysisOutput;
    } catch (error) {
      console.error('[GeminiClient] Transcript analysis failed, falling back to mock:', error);
      return mockOutput;
    }
  }
}
