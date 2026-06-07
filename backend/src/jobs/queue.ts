import Queue from 'bull';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

console.log(`[Queue] Connecting Bull to Redis at: ${redisUrl}`);

const processorsMap = new Map<string, Function>();

// Intercept Queue.prototype.process to capture registered job handlers
const originalProcess = Queue.prototype.process;
Queue.prototype.process = function (this: any, ...args: any[]) {
  const handler = args.find(arg => typeof arg === 'function');
  if (handler) {
    processorsMap.set(this.name, handler);
  }
  return originalProcess.apply(this, args as any);
};

// Intercept Queue.prototype.add to fallback to in-memory processing on Redis failure
const originalAdd = Queue.prototype.add;
Queue.prototype.add = async function (this: any, data: any, opts?: any) {
  try {
    // Attempt adding job to Redis using Bull's original method, raced with a timeout
    const addPromise = originalAdd.call(this, data, opts);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis Connection Timeout')), 150)
    );
    const job = await Promise.race([addPromise, timeoutPromise]);
    return job;
  } catch (err: any) {
    console.warn(`[Queue ${this.name}] Redis queue add failed or timed out: ${err.message}. Running handler in-memory fallback.`);
    
    // Asynchronous in-memory execution fallback
    const handler = processorsMap.get(this.name);
    if (handler) {
      const mockJob = {
        id: 'mock-job-' + Math.random().toString(36).substring(2, 9),
        data: data,
        progress: () => {},
        log: () => {},
      };
      
      // Execute the job handler out-of-band to prevent blocking the API request thread
      setTimeout(async () => {
        try {
          console.log(`[Queue ${this.name}] Starting in-memory fallback execution for job ${mockJob.id}`);
          const result = await handler(mockJob);
          console.log(`[Queue ${this.name}] Completed in-memory fallback job ${mockJob.id}. Result:`, result);
        } catch (jobErr) {
          console.error(`[Queue ${this.name}] In-memory fallback job ${mockJob.id} failed:`, jobErr);
        }
      }, 0);
      
      return mockJob as any;
    } else {
      console.error(`[Queue ${this.name}] No registered processor found for in-memory fallback!`);
      throw err;
    }
  }
};

export const aiProcessingQueue = new Queue('ai-processing', redisUrl);
export const deadlineMonitoringQueue = new Queue('deadline-monitoring', redisUrl);
export const reminderSchedulerQueue = new Queue('reminder-scheduler', redisUrl);
export const notificationDispatchQueue = new Queue('notification-dispatch', redisUrl);

// Enable queue logging
const logQueueEvents = (queueName: string, queue: Queue.Queue) => {
  queue.on('error', (error) => {
    // Suppress spamming ECONNREFUSED in console if we are using in-memory fallbacks
    if (error.message.includes('ECONNREFUSED')) {
      return;
    }
    console.error(`[Queue ${queueName}] Error:`, error);
  });
  queue.on('active', (job) => {
    console.log(`[Queue ${queueName}] Active job ${job.id}`);
  });
  queue.on('completed', (job, result) => {
    console.log(`[Queue ${queueName}] Completed job ${job.id}. Result:`, result);
  });
  queue.on('failed', (job, err) => {
    console.error(`[Queue ${queueName}] Failed job ${job.id}. Error:`, err);
  });
};

logQueueEvents('AI Processing', aiProcessingQueue);
logQueueEvents('Deadline Monitoring', deadlineMonitoringQueue);
logQueueEvents('Reminder Scheduler', reminderSchedulerQueue);
logQueueEvents('Notification Dispatch', notificationDispatchQueue);
