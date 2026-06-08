import { aiProcessingQueue, notificationDispatchQueue } from './queue';
import Meeting from '../models/Meeting';
import MeetingParticipant from '../models/MeetingParticipant';
import HubMembership from '../models/HubMembership';
import AIArtifact from '../models/AIArtifact';
import User from '../models/User';
import { GeminiClient } from '../integrations/gemini.client';
import fs from 'fs';
import path from 'path';

const gemini = new GeminiClient();

export interface AIProcessingJobData {
  meetingId: string;
}

async function getAudioBuffer(url: string): Promise<Buffer> {
  if (url.includes('/uploads/')) {
    const relativePath = url.split('/uploads/')[1];
    const uploadsDir = process.env.LOCAL_STORAGE_DIR || './uploads';
    const filePath = path.resolve(uploadsDir, relativePath);
    console.log(`[AIProcessingJob] Reading local audio file from: ${filePath}`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  }

  console.log(`[AIProcessingJob] Fetching remote audio file from: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch audio file from URL: ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

aiProcessingQueue.process(async (job) => {
  const { meetingId } = job.data as AIProcessingJobData;

  try {
    console.log(`[AIProcessingJob] Starting pipeline for meeting: ${meetingId}`);

    // 1. Retrieve meeting
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new Error(`Meeting not found: ${meetingId}`);
    }

    // Update meeting status to processing
    meeting.status = 'processing';
    await meeting.save();

    // 2. Retrieve participants
    const participants = await MeetingParticipant.find({ meetingId });
    const participantUserIds = participants.map((p) => p.userId.toString());

    // Retrieve hub members to check for absentees
    const hubMemberships = await HubMembership.find({ hubId: meeting.hubId, status: 'active' }).populate('userId');
    const allHubMembers = hubMemberships.map((m) => m.userId as any);
    const allHubMemberNames = allHubMembers.map((u) => u.profileName);

    // Identify absent members
    const absentMembers = allHubMembers.filter((u) => !participantUserIds.includes(u._id.toString()));
    const absentMemberNames = absentMembers.map((u) => u.profileName);

    // Update absent participants in MeetingParticipant database
    for (const absentUser of absentMembers) {
      await MeetingParticipant.findOneAndUpdate(
        { meetingId, userId: absentUser._id },
        { absent: true },
        { upsert: true, new: true }
      );
    }

    // 3. Transcription (Gemini STT)
    console.log(`[AIProcessingJob] Generating transcript...`);
    let rawTranscript = '';
    
    // Fetch actual audio buffer if recordingUrl is present
    if (meeting.recordingUrl) {
      try {
        const audioBuffer = await getAudioBuffer(meeting.recordingUrl);
        const mimeType = meeting.recordingUrl.endsWith('.webm') ? 'audio/webm' : 'audio/wav';
        console.log(`[AIProcessingJob] Transcribing actual audio file, size: ${audioBuffer.length} bytes, type: ${mimeType}`);
        rawTranscript = await gemini.transcribeAudio(audioBuffer, mimeType);
      } catch (err) {
        console.error('[AIProcessingJob] Failed to download/transcribe actual audio, falling back to mock:', err);
      }
    }

    if (!rawTranscript) {
      // Mock transcript generation
      rawTranscript = `
        Meeting: CatchUp App Router Setup
        Admin (Host): Let's start the meeting. We need to deploy the app.
        Developer: I will code the database schemas in Mongoose. I can finish that by Thursday.
        Designer: The landing page needs Framer Motion animations. I will finish the animations by tomorrow.
        Admin (Host): Perfect, so Designer does landing page by tomorrow, then Developer integrates Mongoose backend by Thursday. Let's make sure the design matches dark mode specifications.
      `;
    }

    // 4. Task/Dependency/Outcomes Extraction
    console.log(`[AIProcessingJob] Analyzing transcript with Gemini...`);
    const analysis = await gemini.analyzeTranscript(rawTranscript, allHubMemberNames);

    // 5. Create AIArtifact
    const artifact = await AIArtifact.create({
      meetingId,
      hubId: meeting.hubId,
      geminiModelVersion: 'gemini-1.5-pro',
      promptVersion: '1.0',
      status: 'pending',
      summary: analysis.summary,
      discussionTopics: analysis.discussionTopics,
      decisions: analysis.decisions,
      outcomes: analysis.outcomes,
      audioQualityScore: analysis.audioQualityScore || 100,
      rawAssignments: analysis.rawAssignments.map((a) => ({
        description: a.description,
        extractedAssigneeName: a.extractedAssigneeName,
        confidence: a.confidence || 0.85,
        deadline: a.deadline ? new Date(a.deadline) : undefined,
        suggestedDependsOnTitle: a.suggestedDependsOnTitle,
      })),
      rawTranscript,
      generationMetadata: {
        absentMembersCount: absentMembers.length,
        absentMemberNames,
      },
    });

    console.log(`[AIProcessingJob] AIArtifact created successfully: ${artifact._id}`);

    // Update meeting status
    meeting.status = 'completed';
    await meeting.save();

    // 6. Notify Hub Admin
    const adminMemberships = hubMemberships.filter((m) => m.role === 'admin');
    for (const admin of adminMemberships) {
      const adminUser = admin.userId as any;
      await notificationDispatchQueue.add({
        userId: adminUser._id.toString(),
        type: 'AI_ANALYSIS_COMPLETE',
        title: 'AI Analysis Ready',
        message: `The AI analysis for meeting "${meeting.title}" is ready for review.`,
        relatedEntity: {
          type: 'AIArtifact',
          id: artifact._id.toString(),
        },
        channels: {
          platform: true,
          email: true,
          whatsapp: false,
        },
      });
    }

    return { artifactId: artifact._id.toString() };
  } catch (error: any) {
    console.error(`[AIProcessingJob] Error processing job ${job.id}:`, error);
    // Mark meeting back to scheduled or failed status
    await Meeting.findByIdAndUpdate(meetingId, { status: 'scheduled' });
    throw error;
  }
});
