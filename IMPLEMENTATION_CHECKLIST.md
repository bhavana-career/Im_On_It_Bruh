# IMPLEMENTATION CHECKLIST & NEXT STEPS

## Pre-Implementation Requirements

### Environment Variables Needed
```bash
# AI Services
GOOGLE_API_KEY=sk-...                    # Gemini API key
GEMINI_MODEL_STT=gemini-1.5-pro         # Or latest
GEMINI_MODEL_ANALYSIS=gemini-1.5-pro    # Or latest

# Video/Audio
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...

# Calendar
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...

# Email
SENDGRID_API_KEY=SG....
EMAIL_FROM=noreply@imonitbruh.app
FRONTEND_URL=https://yourdomain.com      # For email links

# Storage
LOCAL_STORAGE_DIR=./uploads
# OR
GOOGLE_DRIVE_API_KEY=...

# Database
MONGODB_URI=mongodb+srv://...

# Redis (for Bull queue)
REDIS_URL=redis://localhost:6379

# Auth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://yourdomain.com

# Optional
WHATSAPP_BUSINESS_ACCOUNT_ID=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
```

---

## PHASE 1: REAL AI INTEGRATION

### Step 1.1: Remove Mock Transcripts
**File:** `backend/src/integrations/gemini.client.ts`

**Tasks:**
- [ ] Remove `mockTranscript` constant
- [ ] Change development fallback: throw error instead of returning mock
- [ ] Verify GOOGLE_API_KEY check works correctly
- [ ] Test with real audio file

**Code Changes:**
```typescript
// OLD:
const mockTranscript = 'Mock Transcript: ...';
if (!isProd && (!apiKey || apiKey.startsWith('AQ.'))) {
  console.warn('Using mock transcript');
  return mockTranscript;  // ← REMOVE
}

// NEW:
if (!apiKey) {
  throw new Error('GOOGLE_API_KEY required for transcription');
}
if (apiKey.startsWith('AQ.')) {
  throw new Error('Invalid GOOGLE_API_KEY format (appears to be placeholder)');
}
```

### Step 1.2: Remove Mock Analysis
**File:** `backend/src/integrations/gemini.client.ts`

**Tasks:**
- [ ] Remove `mockOutput` constant
- [ ] Change development fallback: throw error instead of returning mock
- [ ] Ensure system instruction reaches Gemini API

**Code Changes:**
```typescript
// OLD:
const mockOutput: GeminiAnalysisOutput = { ... };
if (!isProd && (!apiKey || apiKey.startsWith('AQ.'))) {
  console.warn('Using mock analysis');
  return mockOutput;  // ← REMOVE
}

// NEW:
if (!apiKey) {
  throw new Error('GOOGLE_API_KEY required for analysis');
}
```

### Step 1.3: Implement Speaker Identification
**Files:** 
- `backend/src/jobs/aiProcessing.job.ts`
- `backend/src/integrations/gemini.client.ts`

**Tasks:**
- [ ] Extract speaker identities from MeetingParticipant records
- [ ] Pass speaker names to Gemini analysis prompt
- [ ] Update prompt to require speaker name matching
- [ ] Store speaker attribution in Task.createdFrom

**Code Pattern:**
```typescript
// In aiProcessing.job.ts:
const participants = await MeetingParticipant.find({ meetingId })
  .populate('userId', 'profileName email');

const speakerNames = participants.map(p => ({
  id: p.userId._id,
  name: p.userId.profileName,
  email: p.userId.email,
}));

// Pass to Gemini with enhanced prompt:
const analysis = await gemini.analyzeTranscript(rawTranscript, speakerNames);
```

### Step 1.4: Remove Mock Fallback in AIProcessing Job
**File:** `backend/src/jobs/aiProcessing.job.ts`

**Tasks:**
- [ ] Remove fallback mock transcript (lines 90-97)
- [ ] Throw error if audio transcription fails
- [ ] Log failure with details for debugging

**Code Changes:**
```typescript
// OLD:
if (!rawTranscript) {
  rawTranscript = `Mock transcript...`;
}

// NEW:
if (!rawTranscript) {
  throw new Error('Failed to generate transcript from meeting recording. No audio available or transcription service failed.');
}
```

### Step 1.5: Test with Real Audio
**Tasks:**
- [ ] Generate test meeting recording (5-10 min)
- [ ] Upload to storage
- [ ] Run AI processing job
- [ ] Verify transcript contains actual meeting content
- [ ] Verify speaker names are correct
- [ ] Verify assignments attributed to correct speakers

---

## PHASE 2: SESSION PERSISTENCE

### Step 2.1: Extend JWT Expiry
**File:** `backend/src/services/auth.service.ts`

**Tasks:**
- [ ] Change JWT_EXPIRY from '7d' to '30d'
- [ ] Add optional JWT_REFRESH_EXPIRY = '90d'

**Code:**
```typescript
const JWT_EXPIRY = process.env.JWT_EXPIRY || '30d';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '90d';
```

### Step 2.2: Implement Refresh Token Mechanism
**File:** `backend/src/services/auth.service.ts`

**Tasks:**
- [ ] Add refreshToken method
- [ ] Store refresh token in database (new RefreshToken collection)
- [ ] Implement token refresh endpoint

**New Endpoint:**
```
POST /api/v1/auth/refresh
Body: { refreshToken }
Response: { token, refreshToken }
```

### Step 2.3: Update NextAuth Configuration
**File:** `frontend/app/api/auth/[...nextauth]/route.ts`

**Tasks:**
- [ ] Add sessionMaxAge: 30 * 24 * 60 * 60 (30 days)
- [ ] Add JWT token refresh logic in jwt callback
- [ ] Add error handling for expired tokens

**Code:**
```typescript
export const authOptions: NextAuthOptions = {
  providers: [...],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = AuthService.issueToken(user);
        token.refreshToken = AuthService.issueRefreshToken(user);
      }
      
      // Auto-refresh if within 5 days of expiry
      if (token.exp && Date.now() > token.exp - 5 * 24 * 60 * 60 * 1000) {
        // Call refresh endpoint
      }
      
      return token;
    },
  },
  sessionMaxAge: 30 * 24 * 60 * 60,  // 30 days
};
```

### Step 2.4: Test Session Persistence
**Tasks:**
- [ ] Login and verify session
- [ ] Close browser completely
- [ ] Reopen browser 
- [ ] Verify session still active
- [ ] Wait 7+ days (or simulate)
- [ ] Verify session still active with refresh
- [ ] Test after 30 days (should require re-login or refresh)

---

## PHASE 3: ARCHIVE PASSWORD SYSTEM

### Step 3.1: Create Archive Password Endpoints
**File:** `backend/src/api/v1/router.ts`

**New Endpoints:**
```typescript
// Set archive password (immediately after Hub creation)
POST /api/v1/hubs/:hubId/archive-pin
  Body: { password: string, confirmPassword: string }
  Auth: Admin only
  Response: { success, message }

// Check if password is set
GET /api/v1/hubs/:hubId/archive-pin-status
  Auth: Any hub member
  Response: { requiresPin: boolean }

// Unlock archive
POST /api/v1/archive/unlock
  Body: { hubId, pin }
  Response: { accessToken: jwt_with_archive_permission }

// Get archived records
GET /api/v1/archive/:hubId/records
  Auth: Bearer token with archive permission
  Response: [MeetingArchive records]
```

### Step 3.2: Update Hub Model
**File:** `backend/src/models/Hub.ts`

**Tasks:**
- [ ] Add archivePinSet: boolean
- [ ] Add archivePinCreatedAt: Date

**Schema Update:**
```typescript
archivePin: { type: String, select: false },
archivePinSet: { type: Boolean, default: false },
archivePinCreatedAt: { type: Date, select: false },
```

### Step 3.3: Implement Archive Access Control
**File:** `backend/src/services/hub.service.ts` (new method)

**Tasks:**
- [ ] Add setArchivePin(hubId, password, admin)
- [ ] Add verifyArchivePin(hubId, pin) → returns access token
- [ ] Use bcrypt for PIN hashing

**Code Pattern:**
```typescript
import bcrypt from 'bcrypt';

async setArchivePin(hubId: string, password: string, adminId: string) {
  const hub = await Hub.findById(hubId);
  if (!hub) throw new Error('Hub not found');
  
  // Verify requester is admin
  const membership = await HubMembership.findOne({ hubId, userId: adminId, role: 'admin' });
  if (!membership) throw new Error('Only admins can set archive PIN');
  
  // Check if PIN already set
  if (hub.archivePinSet) {
    throw new Error('Archive PIN already set and cannot be changed');
  }
  
  // Hash and save
  const hashedPin = await bcrypt.hash(password, 10);
  hub.archivePin = hashedPin;
  hub.archivePinSet = true;
  hub.archivePinCreatedAt = new Date();
  await hub.save();
  
  return { success: true, message: 'Archive PIN set successfully' };
}

async verifyArchivePin(hubId: string, pin: string) {
  const hub = await Hub.findById(hubId).select('+archivePin');
  if (!hub || !hub.archivePinSet) {
    throw new Error('Archive PIN not configured for this hub');
  }
  
  const isValid = await bcrypt.compare(pin, hub.archivePin);
  if (!isValid) {
    throw new Error('Invalid PIN');
  }
  
  // Issue temporary access token
  const token = jwt.sign(
    { hubId, archiveAccess: true },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  return { accessToken: token };
}
```

### Step 3.4: Create Archive Password Modal
**File:** `frontend/components/ArchivePasswordModal.tsx` (new)

**Tasks:**
- [ ] Create modal component
- [ ] Password + Confirm Password inputs
- [ ] Warning text (see requirements)
- [ ] Submit handler

**Component Template:**
```typescript
export function ArchivePasswordModal({ 
  hubId, 
  isOpen, 
  onComplete 
}: ArchivePasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      await fetch(`/api/v1/hubs/${hubId}/archive-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmPassword: confirm }),
      });
      
      onComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-md">
        <h2 className="text-xl font-bold mb-4">Set Archive Password</h2>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6 text-sm text-yellow-800">
          ⚠️ <strong>Important:</strong> Once this archive password is created, it cannot be changed. If you forget this password, archived records cannot be recovered. Please store it safely.
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password inputs */}
          {/* Button */}
        </form>
      </div>
    </div>
  );
}
```

### Step 3.5: Show Modal After Hub Creation
**File:** `frontend/app/dashboard/admin/[hubId]/page.tsx`

**Tasks:**
- [ ] Detect new Hub (check archivePinSet flag)
- [ ] Show ArchivePasswordModal on first load
- [ ] Don't show again after password set

**Hook:**
```typescript
useEffect(() => {
  if (hubData && !hubData.archivePinSet) {
    setShowArchivePasswordModal(true);
  }
}, [hubData]);
```

### Step 3.6: Create Archive Viewer Component
**File:** `frontend/components/ArchiveViewer.tsx` (new)

**Tasks:**
- [ ] PIN unlock input
- [ ] List of archived records
- [ ] Search/filter
- [ ] Download/export options

---

## PHASE 4: MEETING LIST FILTERING

### Step 4.1: Add Filter Endpoints
**File:** `backend/src/api/v1/router.ts`

**New Endpoints:**
```typescript
GET /api/v1/hubs/:hubId/meetings/upcoming
GET /api/v1/hubs/:hubId/meetings/past  
GET /api/v1/hubs/:hubId/meetings/processing
```

### Step 4.2: Update Meeting Service
**File:** `backend/src/services/meeting.service.ts`

**New Methods:**
```typescript
async getUpcomingMeetings(hubId: string) {
  return Meeting.find({
    hubId,
    status: { $in: ['scheduled'] },
    scheduledAt: { $gte: new Date() }
  }).sort({ scheduledAt: 1 });
}

async getPastMeetings(hubId: string, limit = 10) {
  return Meeting.find({
    hubId,
    status: { $in: ['completed', 'ended'] },
    scheduledAt: { $lt: new Date() }
  }).sort({ scheduledAt: -1 }).limit(limit);
}

async getProcessingMeetings(hubId: string) {
  return Meeting.find({
    hubId,
    status: { $in: ['active', 'processing'] }
  });
}
```

### Step 4.3: Update Frontend Meetings Display
**Tasks:**
- [ ] Add tabs: "Upcoming", "Past", "Processing"
- [ ] Default to "Upcoming"
- [ ] Lazy load "Past" (only show last 10)
- [ ] Hide "Processing" until any exist

---

## PHASE 5: EMAIL URL FIX

### Step 5.1: Add FRONTEND_URL to .env
```bash
FRONTEND_URL=http://localhost:3000  # dev
FRONTEND_URL=https://yourdomain.com # prod
```

### Step 5.2: Update SendGrid Templates
**File:** `backend/src/integrations/sendgrid.client.ts`

**Changes:**
```typescript
// Line 155: Task email
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
<a href="${frontendUrl}/dashboard" ...>

// All email templates:
// Search for hardcoded URLs and replace with env variable
```

### Step 5.3: Add Meeting Reminder .ics Attachment
**File:** `backend/src/services/meeting.service.ts`

**Tasks:**
- [ ] Call buildMeetingInviteAttachment() for reminders
- [ ] Attach to reminder email

---

## Testing Checklist

### Unit Tests
- [ ] AI service with mock (maintain dev speed)
- [ ] Archive PIN hashing
- [ ] Meeting filtering logic
- [ ] Task dependency resolution

### Integration Tests
- [ ] End-to-end meeting flow: schedule → join → end → process → review → approve
- [ ] Speaker identification in analysis
- [ ] Archive PIN setup and verification
- [ ] Email template rendering

### Manual Tests
- [ ] Session persists across browser restart
- [ ] Archive password prevents access without PIN
- [ ] Meeting list shows only upcoming
- [ ] Email links work in production
- [ ] Speaker names appear in assignment descriptions

---

## Deployment Checklist

- [ ] All environment variables configured
- [ ] MongoDB indexes verified
- [ ] Redis running and accessible
- [ ] SendGrid account verified
- [ ] Gemini API quota sufficient
- [ ] LiveKit server running
- [ ] Google Calendar credentials valid
- [ ] Backup of production database
- [ ] Rollback plan if issues occur
- [ ] Monitoring and alerting configured

---

## Success Criteria

### Phase 1 Complete When:
- ✓ Real Gemini transcription working
- ✓ Real Gemini analysis working  
- ✓ Speaker names extracted from LiveKit
- ✓ Tasks assigned to correct speakers
- ✓ No mock fallbacks returning data

### Phase 2 Complete When:
- ✓ JWT expires 30 days instead of 7 days
- ✓ Session persists across browser restart
- ✓ Laptop restart doesn't require re-login
- ✓ Session extends on activity

### Phase 3 Complete When:
- ✓ Archive password required after Hub creation
- ✓ Modal shown immediately after create
- ✓ Archive inaccessible without PIN
- ✓ PIN cannot be reset/changed

### Phase 4 Complete When:
- ✓ Meetings list filtered by status
- ✓ Upcoming meetings shown by default
- ✓ Past meetings accessible separately
- ✓ Processing meetings hidden until active

### Phase 5 Complete When:
- ✓ Email links work in production
- ✓ .ics attachments in reminders
- ✓ All email templates use correct URLs

---

## Notes

- Each phase should be fully tested before moving to next
- Backwards compatibility may break - plan accordingly
- Consider feature flags for gradual rollout
- Monitor logs closely during first week of production
- Keep this checklist updated as work progresses
