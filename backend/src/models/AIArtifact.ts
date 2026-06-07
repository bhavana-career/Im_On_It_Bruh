import mongoose, { Schema, Document } from 'mongoose';

export interface IAIArtifact extends Document {
  meetingId: mongoose.Types.ObjectId;
  hubId: mongoose.Types.ObjectId;
  geminiModelVersion: string;
  promptVersion: string;
  status: 'pending' | 'approved' | 'rejected';
  summary: string;
  discussionTopics: string[];
  decisions: string[];
  outcomes: string[];
  audioQualityScore: number;
  rawAssignments: Array<{
    description: string;
    extractedAssigneeName?: string;
    confidence: number;
    deadline?: Date;
    suggestedDependsOnTitle?: string; // Dependency extraction helper
  }>;
  rawTranscript: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  generationMetadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AIArtifactSchema = new Schema<IAIArtifact>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true },
    hubId: { type: Schema.Types.ObjectId, ref: 'Hub', required: true },
    geminiModelVersion: { type: String, required: true },
    promptVersion: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    summary: { type: String, required: true },
    discussionTopics: [{ type: String }],
    decisions: [{ type: String }],
    outcomes: [{ type: String }],
    audioQualityScore: { type: Number, default: 100 },
    rawAssignments: [
      {
        description: { type: String, required: true },
        extractedAssigneeName: { type: String },
        confidence: { type: Number, default: 1.0 },
        deadline: { type: Date },
        suggestedDependsOnTitle: { type: String },
      },
    ],
    rawTranscript: { type: String, required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    generationMetadata: { type: Schema.Types.Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.models.AIArtifact || mongoose.model<IAIArtifact>('AIArtifact', AIArtifactSchema);
