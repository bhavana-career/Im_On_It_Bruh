'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';


export default function MemberHubDashboard() {
  const { data: session } = useSession();
  const { hubId } = useParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'tasks' | 'meetings' | 'calendar' | 'broadcasts' | 'notifications'>('tasks');
  const [hubName, setHubName] = useState('Hub Member View');
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [hubAvatar, setHubAvatar] = useState<string | null>(null);
  const [hubDescription, setHubDescription] = useState('');

  // Custom Member Confirmation Modal state
  const [memberConfirmModal, setMemberConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Lists
  const [tasks, setTasks] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Live Meeting
  const [lkToken, setLkToken] = useState<string | null>(null);
  const [lkRoom, setLkRoom] = useState<string | null>(null);

  // Submission Form Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitTaskId, setSubmitTaskId] = useState('');
  const [submitNote, setSubmitNote] = useState('');
  const [submitDriveLink, setSubmitDriveLink] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Broadcast replies
  const [replyMessage, setReplyMessage] = useState<Record<string, string>>({});

  const checkMembershipStatus = async () => {
    if (!(session as any)?.accessToken) return;
    try {
      const res = await fetch(`http://localhost:5000/api/v1/hubs/${hubId}/membership-status`, {
        headers: { Authorization: `Bearer ${(session as any).accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMembershipStatus(data.status);
        setHubName(data.name || 'Hub Member View');
        setHubAvatar(data.profileImageUrl || null);
        setHubDescription(data.description || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadTabData = async () => {
    if (!(session as any)?.accessToken) return;

    try {
      if (activeTab === 'tasks') {
        const res = await fetch(`http://localhost:5000/api/v1/tasks/user/${hubId}`, {
          headers: { Authorization: `Bearer ${(session as any).accessToken}` },
        });
        if (res.ok) setTasks(await res.json());
      }

      if (activeTab === 'meetings') {
        const res = await fetch(`http://localhost:5000/api/v1/meetings`, {
          headers: { Authorization: `Bearer ${(session as any).accessToken}` },
        });
        if (res.ok) {
          const allMeetings = await res.json();
          setMeetings(allMeetings.filter((m: any) => m.hubId === hubId && m.status !== 'ended'));
        }
      }

      if (activeTab === 'calendar') {
        const res = await fetch(`http://localhost:5000/api/v1/calendar/${hubId}`, {
          headers: { Authorization: `Bearer ${(session as any).accessToken}` },
        });
        if (res.ok) setCalendarEvents(await res.json());
      }

      if (activeTab === 'broadcasts') {
        const res = await fetch(`http://localhost:5000/api/v1/broadcasts/hub/${hubId}`, {
          headers: { Authorization: `Bearer ${(session as any).accessToken}` },
        });
        if (res.ok) setBroadcasts(await res.json());
      }

      if (activeTab === 'notifications') {
        const res = await fetch(`http://localhost:5000/api/v1/notifications`, {
          headers: { Authorization: `Bearer ${(session as any).accessToken}` },
        });
        if (res.ok) setNotifications(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (session) {
      checkMembershipStatus();
    }
  }, [hubId, session]);

  useEffect(() => {
    loadTabData();
  }, [activeTab, session]);

  // -----------------------------------------
  // MEETINGS JOIN
  // -----------------------------------------

  const handleJoinMeeting = async (meetingId: string) => {
    if (!(session as any)?.accessToken) return;
    try {
      const res = await fetch(`http://localhost:5000/api/v1/meetings/${meetingId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${(session as any).accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLkToken(data.token);
        setLkRoom(data.liveKitRoomId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -----------------------------------------
  // SUBMISSIONS SUBMIT
  // -----------------------------------------

  const handleTriggerSubmit = (taskId: string) => {
    setSubmitTaskId(taskId);
    setShowSubmitModal(true);
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(session as any)?.accessToken || !submitTaskId) return;

    setSubmitLoading(true);

    try {
      const formData = new FormData();
      formData.append('note', submitNote);
      if (submitDriveLink) {
        formData.append('driveLinks', JSON.stringify([submitDriveLink]));
      }
      if (selectedFile) {
        formData.append('attachments', selectedFile);
      }

      const res = await fetch(`http://localhost:5000/api/v1/submissions/${submitTaskId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(session as any).accessToken}`,
        },
        body: formData,
      });

      if (res.ok) {
        setShowSubmitModal(false);
        setSubmitNote('');
        setSubmitDriveLink('');
        setSelectedFile(null);
        loadTabData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  // -----------------------------------------
  // BROADCAST PRIVATE REPLY
  // -----------------------------------------

  const handleSendReply = async (broadcastId: string) => {
    const message = replyMessage[broadcastId];
    if (!message || !(session as any)?.accessToken) return;

    try {
      const res = await fetch(`http://localhost:5000/api/v1/broadcasts/${broadcastId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(session as any).accessToken}`,
        },
        body: JSON.stringify({ message }),
      });

      if (res.ok) {
        setReplyMessage((prev) => ({ ...prev, [broadcastId]: '' }));
        alert('Private reply sent successfully to Hub Admin.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeaveHub = async () => {
    const userName = session?.user?.name || 'you';
    setMemberConfirmModal({
      isOpen: true,
      title: 'Are you sure?',
      message: `Are you sure you want to leave member ${userName} from ${hubName}?`,
      onConfirm: async () => {
        if (!(session as any)?.accessToken || !session?.user) return;
        try {
          const res = await fetch(`http://localhost:5000/api/v1/hubs/${hubId}/remove/${(session.user as any).id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${(session as any).accessToken}` },
          });
          if (res.ok) {
            router.push('/dashboard');
          } else {
            const data = await res.json();
            alert(data.error || 'Failed to leave the hub.');
          }
        } catch (err) {
          console.error(err);
          alert('Error leaving the hub.');
        }
      }
    });
  };

  if (loadingStatus) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <i className="ti ti-loader animate-spin text-4xl text-primary" />
          <span className="text-xs font-semibold text-muted-foreground">Verifying access credentials...</span>
        </div>
      </div>
    );
  }

  const handleRequestJoin = async () => {
    if (!(session as any)?.accessToken) return;
    setMemberConfirmModal({
      isOpen: true,
      title: 'Are you sure?',
      message: `Are you sure you want to request to join ${hubName}?`,
      onConfirm: async () => {
        setLoadingStatus(true);
        try {
          const params = new URLSearchParams(window.location.search);
          const inviteMethod = params.get('inviteMethod') || 'direct';

          const res = await fetch(`http://localhost:5000/api/v1/hubs/${hubId}/join`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${(session as any).accessToken}`,
            },
            body: JSON.stringify({ inviteMethod }),
          });
          if (res.ok) {
            await checkMembershipStatus();
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingStatus(false);
        }
      }
    });
  };

  if (membershipStatus === 'pending' || membershipStatus === 'invited') {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-6">
        <div className="w-full max-w-lg p-8 rounded-2xl bg-card border border-border shadow-xl flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center text-3xl animate-pulse">
            <i className="ti ti-hourglass-low" />
          </div>
          <div>
            <span className="text-xs uppercase font-extrabold text-orange-500 tracking-wider">Requested</span>
            <h1 className="text-xl font-bold mt-2 text-foreground">Requested</h1>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed max-w-sm">
              Your request to join the private workspace <strong>&ldquo;{hubName}&rdquo;</strong> is currently pending administrator approval.
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-sm">
              Once approved, you will have immediate access to meetings, tasks, and team resources.
            </p>
          </div>
          <div className="flex gap-3 mt-2 w-full max-w-xs justify-center">
            <button
              onClick={() => checkMembershipStatus()}
              className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-opacity-80 text-foreground font-bold text-xs cursor-pointer flex items-center gap-2"
            >
              <i className="ti ti-refresh" /> Check Status
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-all cursor-pointer shadow-md"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (membershipStatus === 'none' || membershipStatus === 'removed' || membershipStatus === 'revoked') {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-6">
        <div className="w-full max-w-lg p-8 rounded-2xl bg-card border border-border shadow-xl flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 rounded-full bg-red-600/10 text-red-500 flex items-center justify-center text-3xl">
            <i className="ti ti-lock" />
          </div>
          <div>
            <span className="text-xs uppercase font-extrabold text-red-500 tracking-wider">Access Restricted</span>
            <h1 className="text-xl font-bold mt-2 text-foreground">Private Space</h1>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed max-w-sm">
              You are not currently a member of the workspace <strong>&ldquo;{hubName}&rdquo;</strong>.
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-sm">
              This space requires permission to join. Click below to submit a join request.
            </p>
          </div>
          <div className="flex gap-3 mt-2 w-full max-w-xs justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-opacity-80 text-foreground font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleRequestJoin}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <i className="ti ti-door-enter" /> Request Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-800 to-indigo-900 border-2 border-primary/20 flex items-center justify-center text-xl font-bold text-white shadow-md">
            {hubAvatar ? (
              <img src={`http://localhost:5000${hubAvatar}`} alt={hubName} className="w-full h-full object-cover" />
            ) : (
              <span>{hubName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Member Workspace</span>
            <h1 className="text-2xl font-extrabold tracking-tight mt-1">{hubName}</h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">{hubDescription}</p>
          </div>
        </div>

        <button
          onClick={handleLeaveHub}
          className="px-4 py-2 rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600/20 font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <i className="ti ti-logout" /> Leave Group
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-px overflow-x-auto">
        {(['tasks', 'meetings', 'calendar', 'broadcasts', 'notifications'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* LiveKit Join overlay */}
      {lkToken && lkRoom && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="h-14 bg-card border-b border-border px-6 flex items-center justify-between">
            <span className="font-bold text-sm">Live Meeting Call: {lkRoom}</span>
            <button
              onClick={() => {
                setLkToken(null);
                setLkRoom(null);
              }}
              className="px-4 py-2 rounded-xl bg-secondary hover:bg-opacity-90 text-foreground font-bold text-xs cursor-pointer"
            >
              Leave Room
            </button>
          </div>
          <div className="flex-1">
            <LiveKitRoom
              video={true}
              audio={true}
              token={lkToken}
              serverUrl="wss://catchup-2rfd0yk1.livekit.cloud"
              data-lk-theme="default"
              style={{ height: '100%' }}
            >
              <VideoConference />
            </LiveKitRoom>
          </div>
        </div>
      )}

      {/* Submit Work Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-md p-6 rounded-2xl bg-card border border-border shadow-2xl">
            <h2 className="text-lg font-bold mb-4">Submit Task Deliverables</h2>
            <form onSubmit={handleSubmitWork} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Work Note</label>
                <textarea
                  required
                  rows={3}
                  value={submitNote}
                  onChange={(e) => setSubmitNote(e.target.value)}
                  placeholder="Explain what has been completed..."
                  className="w-full p-3 rounded-xl border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none transition-all text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Google Drive Link (optional)</label>
                <input
                  type="url"
                  value={submitDriveLink}
                  onChange={(e) => setSubmitDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full p-3 rounded-xl border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none transition-all text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Upload File (optional)</label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary file:cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 text-xs transition-all cursor-pointer shadow-md"
                >
                  {submitLoading ? <i className="ti ti-loader animate-spin" /> : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB CONTENTS */}

      {/* 1. TASKS TAB */}
      {activeTab === 'tasks' && (
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">My Assigned Tasks</h2>
          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tasks assigned to you in this hub.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((task) => (
                <div key={task._id} className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-lg border ${
                        task.status === 'blocked'
                          ? 'bg-red-500/5 text-red-500 border-red-500/10'
                          : task.status === 'completed' || task.status === 'approved'
                          ? 'bg-green-500/5 text-green-500 border-green-500/10'
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {task.status}
                      </span>
                      <span className="text-xs font-bold text-red-500">Due: {new Date(task.deadline).toLocaleDateString()}</span>
                    </div>

                    <h3 className="font-bold text-sm text-foreground">{task.title}</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{task.description}</p>
                    
                    {/* Blocker Dependencies warnings */}
                    {task.dependencies && task.dependencies.length > 0 && (
                      <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/10 flex flex-col gap-1 text-[10px] text-red-500">
                        <strong className="uppercase">Unresolved Blockers:</strong>
                        {task.dependencies.map((dep: any) => (
                          <div key={dep._id} className="flex justify-between">
                            <span>- {dep.title}</span>
                            <span className="font-bold uppercase">({dep.status})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {task.status !== 'completed' && task.status !== 'approved' && (
                    <button
                      onClick={() => handleTriggerSubmit(task._id)}
                      disabled={task.status === 'blocked'}
                      className={`w-full py-2.5 mt-5 rounded-lg font-bold text-xs transition-all cursor-pointer text-center ${
                        task.status === 'blocked'
                          ? 'bg-secondary text-muted-foreground cursor-not-allowed opacity-55'
                          : 'bg-primary text-primary-foreground hover:opacity-90 shadow-md'
                      }`}
                    >
                      Submit Work
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. MEETINGS TAB */}
      {activeTab === 'meetings' && (
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">Active & Upcoming Meetings</h2>
          {meetings.length === 0 ? (
            <p className="text-xs text-muted-foreground">No meetings scheduled for this hub.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {meetings.map((m) => (
                <div key={m._id} className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm">{m.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(m.scheduledAt).toLocaleString()} ({m.estimatedDuration} mins)
                    </p>
                  </div>
                  {m.status === 'active' ? (
                    <button
                      onClick={() => handleJoinMeeting(m._id)}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 font-bold text-xs cursor-pointer shadow-md"
                    >
                      Join Live Room
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Scheduled</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. CALENDAR TAB */}
      {activeTab === 'calendar' && (
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">Hub Timeline Calendar</h2>
          
          <div className="p-6 rounded-2xl bg-card border border-border">
            {/* Simple Mock Calendar Grid to prevent dependencies issues and match aesthetics */}
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <span className="font-bold text-sm">June 2026</span>
              <div className="flex gap-4 text-xs font-semibold uppercase">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Meetings</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Deadlines</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Completed</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {calendarEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No scheduled timeline events.</p>
              ) : (
                calendarEvents.map((evt) => (
                  <div key={evt.id} className="p-3 rounded-lg border border-border flex items-center gap-4">
                    <span className={`w-3 h-3 rounded-full ${
                      evt.color === 'blue' ? 'bg-blue-500' : evt.color === 'green' ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                    <div className="text-xs font-bold">{evt.title}</div>
                    <div className="text-xs text-muted-foreground ml-auto">
                      {new Date(evt.start).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. BROADCASTS TAB */}
      {activeTab === 'broadcasts' && (
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">Broadcasts From Admins</h2>
          {broadcasts.length === 0 ? (
            <p className="text-xs text-muted-foreground">No broadcasts received.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {broadcasts.map((b) => (
                <div key={b._id} className="p-5 rounded-2xl bg-card border border-border flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm text-foreground">{b.title}</h3>
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">{b.urgency}</span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground leading-relaxed">{b.body}</p>

                  {/* Private Reply composer */}
                  <div className="mt-3 border-t border-border pt-4 flex gap-3">
                    <input
                      type="text"
                      value={replyMessage[b._id] || ''}
                      onChange={(e) => setReplyMessage((prev) => ({ ...prev, [b._id]: e.target.value }))}
                      placeholder="Reply privately to admin..."
                      className="flex-1 p-2 rounded-lg border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none text-xs"
                    />
                    <button
                      onClick={() => handleSendReply(b._id)}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-all cursor-pointer"
                    >
                      Send Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">Activity Alerts Feed</h2>
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground">No alerts history available.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.map((n) => (
                <div key={n._id} className="p-3.5 rounded-xl border border-border bg-card text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold block text-foreground">{n.title}</span>
                    <p className="text-muted-foreground mt-0.5">{n.message}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reusable Custom Confirmation Modal */}
      {memberConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-md p-6 rounded-2xl bg-card border border-border shadow-2xl flex flex-col gap-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl">
                <i className="ti ti-help" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{memberConfirmModal.title}</h2>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">{memberConfirmModal.message}</p>
              </div>
            </div>

            <div className="flex justify-center gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => {
                  memberConfirmModal.onConfirm();
                  setMemberConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-all cursor-pointer shadow-md"
              >
                Sure
              </button>
              <button
                type="button"
                onClick={() => setMemberConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 rounded-lg bg-secondary text-foreground text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
