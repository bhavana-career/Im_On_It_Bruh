import mongoose, { Schema, Document } from 'mongoose';

export interface ITaskDependency extends Document {
  taskId: mongoose.Types.ObjectId;
  dependsOnTaskId: mongoose.Types.ObjectId;
  hubId: mongoose.Types.ObjectId;
}

const TaskDependencySchema = new Schema<ITaskDependency>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    dependsOnTaskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    hubId: { type: Schema.Types.ObjectId, ref: 'Hub', required: true },
  },
  { timestamps: true }
);

TaskDependencySchema.index({ taskId: 1, dependsOnTaskId: 1 }, { unique: true });

export default mongoose.models.TaskDependency || mongoose.model<ITaskDependency>('TaskDependency', TaskDependencySchema);
