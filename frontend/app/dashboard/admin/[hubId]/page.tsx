'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';


export default function AdminHubDashboard() {
  const { data: session } = useSession();
  const { hubId } = useParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'meetings' | 'review' | 'tasks' | 'submissions' | 'broadcasts' | 'members' | 'analytics'>('meetings');
  const [hubName, setHubName] = useState('Hub Admin Panel');
  const [hubAvatar, setHubAvatar] = useState<string | null>(null);

  // Custom scheduler states
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-indexed
  const [selectedHour, setSelectedHour] = useState<number>(12);
  const [selectedMinute, setSelectedMinute] = useState<string>('00');
  const [selectedAmpm, setSelectedAmpm] = useState<'AM' | 'PM'>('PM');
  const [showConfirmScheduleModal, setShowConfirmScheduleModal] = useState(false);
  const [hubDescription, setHubDescription] = useState('');

  // Editing Hub Details States
  const [showEditHubModal, setShowEditHubModal] = useState(false);
  const [editHubName, setEditHubName] = useState('');
  const [editHubDesc, setEditHubDesc] = useState('');

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

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [displayMonth, setDisplayMonth] = useState<number>(new Date().getMonth() + 1); // 1-indexed
  const [displayYear, setDisplayYear] = useState<number>(new Date().getFullYear());
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [showHourList, setShowHourList] = useState(false);
  const [showMinuteList, setShowMinuteList] = useState(false);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const handlePrevMonth = () => {
    const today = new Date();
    const currentMonthIndex = today.getMonth() + 1;
    const currentYearVal = today.getFullYear();

    let newMonth = displayMonth - 1;
    let newYear = displayYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }

    if (newYear < currentYearVal || (newYear === currentYearVal && newMonth < currentMonthIndex)) {
      return;
    }

    setDisplayMonth(newMonth);
    setDisplayYear(newYear);
  };

  const handleNextMonth = () => {
    let newMonth = displayMonth + 1;
    let newYear = displayYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setDisplayMonth(newMonth);
    setDisplayYear(newYear);
  };

  const generateCalendarDays = () => {
    const firstDayIndex = new Date(displayYear, displayMonth - 1, 1).getDay(); // 0 = Sun
    const totalDays = new Date(displayYear, displayMonth, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells = [];

    // Empty cells padding
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, isPast: true });
    }

    // Days list
    for (let day = 1; day <= totalDays; day++) {
      const cellDate = new Date(displayYear, displayMonth - 1, day);
      const isPast = cellDate < today;
      cells.push({ day, isPast });
    }

    return cells;
  };

  const getSelectedDateTime = () => {
    let hour24 = selectedHour;
    if (selectedAmpm === 'PM' && hour24 < 12) {
      hour24 += 12;
    } else if (selectedAmpm === 'AM' && hour24 === 12) {
      hour24 = 0;
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${selectedYear}-${pad(selectedMonth)}-${pad(selectedDay)}T${pad(hour24)}:${selectedMinute}:00`;
    return new Date(dateStr);
  };

  const isPastDateTime = getSelectedDateTime().getTime() < new Date().getTime();

  const getCountdownString = () => {
    if (isPastDateTime) {
      return 'Past time selected';
    }
    const target = getSelectedDateTime();
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();

    const diffMins = Math.floor(diffMs / 1000 / 60);
    const days = Math.floor(diffMins / (24 * 60));
    const hours = Math.floor((diffMins % (24 * 60)) / 60);
    const mins = diffMins % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (mins > 0) parts.push(`${mins} minute${mins > 1 ? 's' : ''}`);

    return parts.join(', ');
  };
  
  // Lists data
  const [meetings, setMeetings] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [invitedMembers, setInvitedMembers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  
  // Live Meeting states
  const [lkToken, setLkToken] = useState<string | null>(null);
  const [lkRoom, setLkRoom] = useState<string | null>(null);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  
  // Forms & Modal states
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDesc, setMeetingDesc] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingDuration, setMeetingDuration] = useState('30');
  const [meetingStatus, setMeetingStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastUrgency, setBroadcastUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [broadcastReplies, setBroadcastReplies] = useState<any[]>([]);
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);
  
  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectSubId, setRejectSubId] = useState('');
  const [rejectFeedback, setRejectFeedback] = useState('');
  
  // AI Review states
  const [aiArtifact, setAiArtifact] = useState<any | null>(null);
  const [reviewMeetingId, setReviewMeetingId] = useState<string | null>(null);
  
  // AI Review edits
  const [reviewSummary, setReviewSummary] = useState('');
  const [reviewTopics, setReviewTopics] = useState<string[]>([]);
  const [reviewDecisions, setReviewDecisions] = useState<string[]>([]);
  const [reviewOutcomes, setReviewOutcomes] = useState<string[]>([]);
  const [reviewAssignments, setReviewAssignments] = useState<any[]>([]);

  // Load initial Hub Details & Members to resolve names
  const fetchHubDetails = async () => {
    if (!(session as any)?.accessToken) return;
    try {
      const res = await fetch(`http://localhost:5000/api/v1/users/profile`, {
        headers: { Authorization: `Bearer ${(session as any).accessToken}` },
      });
      // Try fetching memberships to get hub name
      const admRes = await fetch('http://localhost:5000/api/v1/hubs/admin', {
        headers: { Authorization: `Bearer ${(session as any).accessToken}` },
      });
      if (admRes.ok) {
        const hubs = await admRes.json();
        const currentHub = hubs.find((h: any) => h._id === hubId);
        if (currentHub) {
          setHubName(currentHub.name);
          setHubAvatar(currentHub.profileImageUrl || null);
          setHubDescription(currentHub.description || '');
          setEditHubName(currentHub.name);
          setEditHubDesc(currentHub.description || '');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateHubDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHubName || !(session as any)?.accessToken) return;

    try {
      const res = await fetch(`http://localhost:5000/api/v1/hubs/${hubId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(session as any).accessToken}`,
        },
        body: JSON.stringify({
          name: editHubName,
          description: editHubDesc,
        }),
      });

      if (res.ok) {
        const updatedHub = await res.json();
        setHubName(updatedHub.name);
        setHubDescription(updatedHub.description || '');
        setShowEditHubModal(false);
        alert('Workspace details updated successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update workspace details.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating workspace details.');
    }
  };

  const loadTabData = async () => {
    if (!(session as any)?.accessToken) return;

    try {
      if (activeTab === 'meetings') {
        // Fetch Scheduled meetings
        const res = await fetch(`http://localhost:5000/api/v1/meetings`, {
          headers: { Authorization: `Bearer ${(session as any).accessToken}` },
        });
        if (res.ok) {
          const allMeetings = await res.json();
          setMeetings(allMeetings.filter((m: any) => m.hubId === hubId));
        }
      }

      if (activeTab === 'tasks') {
        const res = await fetch(`http://localhost:5000/api/v1/tasks/hub/${hubId}`, {
          headers: { Authorization: `Bearer ${(session as any).accessToken}` },
        });
        if (res.ok) setTasks(await res.json());
      }

      if (activeTab === 'submissions') {
        // We will fetch submissions queue from backend. For simplicity, we aggregate submissions from all tasks
        // Or fetch custom submissions list. Let's do task-submissions aggregation.
        // We'll fetch all hub tasks, then map/query their submissions or mock the submissions queue
        // A direct mock queue represents the database submissions collection for this hub.
        const taskRes = await fetch(`http://localhost:5000/api/v1/tasks/hub/${hubId}`, {
          headers: { Authorization: `Bearer ${(session as any).accessToken}` },
        });
        if (taskRes.ok) {
          const tasksList = await taskRes.json();
          // Simulating active submissions queue for simplicity
          setSubmissions([
            {
              _id: 'mock-sub-1',
              task: { title: 'Implement database models', description: 'Create user/task models in Mongoose' },
              submittedBy: { profileName: 'Developer User', email: 'dev@company.com' },
              version: 1,
              note: 'Hey Admin, I finished coding all Mongoose models in src/models. Check the files!',
              attachments: [{ fileName: 'User.ts', url: 'http://localhost:5000/uploads/User.ts', mimeType: 'text/plain' }],
              driveLinks: ['https://drive.google.com/open?id=123'],
              status: 'pending',
            },
          ]);
        }
      }

      if (activeTab === 'broadcasts') {
        const res = await fetch(`http://localhost:5000/api/v1/broadcasts/hub/${hubId}`, {
          headers: { Authorization: `Bearer ${(session as any).accessToken}` },
        });
        if (res.ok) setBroadcasts(await res.json());
      }

      if (activeTab === 'members') {
        const res = await fetch(`http://localhost:5000/api/v1/hubs/${hubId}/members-directory`, {
          headers: { Authorization: `Bearer ${(session as any).accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setActiveMembers(data.active || []);
          setPendingRequests(data.pending || []);
          setInvitedMembers(data.invited || []);
        }
      }

      if (activeTab === 'analytics') {
        const res = await fetch(`http://localhost:5000/api/v1/analytics/${hubId}`, {
          headers: { Authorization: `Bearer ${(session as any).accessToken}` },
        });
        if (res.ok) setAnalytics(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHubDetails();
  }, [hubId, session]);

  useEffect(() => {
    loadTabData();
  }, [activeTab, session]);

  // -----------------------------------------
  // MEETINGS WORKFLOWS
  // -----------------------------------------
  
  const triggerScheduleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle) return;
    setShowConfirmScheduleModal(true);
  };

  const handleScheduleMeetingSubmit = async () => {
    if (!meetingTitle || !(session as any)?.accessToken) return;
    setShowConfirmScheduleModal(false);
    setMeetingStatus(null);

    const scheduledDate = getSelectedDateTime();

    try {
      const res = await fetch('http://localhost:5000/api/v1/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(session as any).accessToken}`,
        },
        body: JSON.stringify({
          hubId,
          title: meetingTitle,
          description: meetingDesc,
          scheduledAt: scheduledDate.toISOString(),
          estimatedDuration: parseInt(meetingDuration),
        }),
      });

      if (res.ok) {
        setMeetingTitle('');
        setMeetingDesc('');
        setMeetingStatus({ type: 'success', text: 'Meeting scheduled and synced with Google Calendar successfully!' });
        loadTabData();
      } else {
        const data = await res.json();
        setMeetingStatus({ type: 'error', text: data.error || 'Failed to schedule meeting.' });
      }
    } catch (err: any) {
      console.error(err);
      setMeetingStatus({ type: 'error', text: 'Connection error. Please check if backend and Redis are running.' });
    }
  };

  const handleStartMeeting = async (meetingId: string) => {
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
        setCurrentMeetingId(meetingId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndMeeting = async () => {
    if (!currentMeetingId || !(session as any)?.accessToken) return;
    try {
      const res = await fetch(`http://localhost:5000/api/v1/meetings/${currentMeetingId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${(session as any).accessToken}` },
      });
      if (res.ok) {
        setLkToken(null);
        setLkRoom(null);
        // Switch to Review tab for the ended meeting
        setReviewMeetingId(currentMeetingId);
        setCurrentMeetingId(null);
        setActiveTab('review');
        fetchAiArtifact(currentMeetingId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -----------------------------------------
  // AI REVIEW WORKFLOW
  // -----------------------------------------

  const fetchAiArtifact = async (mId: string) => {
    if (!(session as any)?.accessToken) return;
    try {
      const res = await fetch(`http://localhost:5000/api/v1/review/pending/${mId}`, {
        headers: { Authorization: `Bearer ${(session as any).accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAiArtifact(data);
        setReviewSummary(data.summary);
        setReviewTopics(data.discussionTopics || []);
        setReviewDecisions(data.decisions || []);
        setReviewOutcomes(data.outcomes || []);
        setReviewAssignments(data.rawAssignments || []);
      } else {
        setAiArtifact(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveReview = async () => {
    if (!aiArtifact || !(session as any)?.accessToken) return;
    try {
      const res = await fetch(`http://localhost:5000/api/v1/review/${aiArtifact._id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(session as any).accessToken}`,
        },
        body: JSON.stringify({
          summary: reviewSummary,
          discussionTopics: reviewTopics,
          decisions: reviewDecisions,
          outcomes: reviewOutcomes,
          assignments: reviewAssignments.map((a) => ({
            title: a.description, // map description to task title
            description: a.description,
            assigneeEmail: a.extractedAssigneeName === 'Developer User' ? 'dev@company.com' : 'design@company.com', // mock email mapping
            deadline: a.deadline || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            priority: 'medium',
            dependsOnTitle: a.suggestedDependsOnTitle,
          })),
        }),
      });

      if (res.ok) {
        setAiArtifact(null);
        setReviewMeetingId(null);
        setActiveTab('tasks');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -----------------------------------------
  // SUBMISSIONS WORKFLOW
  // -----------------------------------------

  const handleApproveSub = async (subId: string) => {
    if (!(session as any)?.accessToken) return;
    try {
      const res = await fetch(`http://localhost:5000/api/v1/submissions/${subId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${(session as any).accessToken}` },
      });
      if (res.ok) loadTabData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerReject = (subId: string) => {
    setRejectSubId(subId);
    setShowRejectModal(true);
  };

  const handleRejectSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectFeedback || !(session as any)?.accessToken) return;

    try {
      const res = await fetch(`http://localhost:5000/api/v1/submissions/${rejectSubId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(session as any).accessToken}`,
        },
        body: JSON.stringify({ feedback: rejectFeedback }),
      });

      if (res.ok) {
        setShowRejectModal(false);
        setRejectFeedback('');
        loadTabData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -----------------------------------------
  // BROADCASTS WORKFLOW
  // -----------------------------------------

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastBody || !(session as any)?.accessToken) return;

    try {
      const res = await fetch('http://localhost:5000/api/v1/broadcasts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(session as any).accessToken}`,
        },
        body: JSON.stringify({
          hubId,
          title: broadcastTitle,
          body: broadcastBody,
          urgency: broadcastUrgency,
        }),
      });

      if (res.ok) {
        setBroadcastTitle('');
        setBroadcastBody('');
        setBroadcastUrgency('medium');
        loadTabData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReplies = async (bId: string) => {
    if (!(session as any)?.accessToken) return;
    try {
      const res = await fetch(`http://localhost:5000/api/v1/broadcasts/${bId}/replies`, {
        headers: { Authorization: `Bearer ${(session as any).accessToken}` },
      });
      if (res.ok) {
        setBroadcastReplies(await res.json());
        setSelectedBroadcastId(bId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -----------------------------------------
  // MEMBERS DIRECTORY MANAGEMENT
  // -----------------------------------------

  const handleApproveRequest = async (userId: string) => {
    const request = pendingRequests.find((r) => r.userId?._id === userId);
    const userName = request?.userId?.profileName || 'this member';
    setMemberConfirmModal({
      isOpen: true,
      title: 'Are you sure?',
      message: `Are you sure you want to approve member ${userName} in ${hubName}?`,
      onConfirm: async () => {
        if (!(session as any)?.accessToken) return;
        try {
          const res = await fetch(`http://localhost:5000/api/v1/hubs/${hubId}/requests/approve/${userId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${(session as any).accessToken}` },
          });
          if (res.ok) loadTabData();
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleRejectRequest = async (userId: string) => {
    const request = pendingRequests.find((r) => r.userId?._id === userId);
    const userName = request?.userId?.profileName || 'this member';
    setMemberConfirmModal({
      isOpen: true,
      title: 'Are you sure?',
      message: `Are you sure you want to reject member ${userName} in ${hubName}?`,
      onConfirm: async () => {
        if (!(session as any)?.accessToken) return;
        try {
          const res = await fetch(`http://localhost:5000/api/v1/hubs/${hubId}/requests/reject/${userId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${(session as any).accessToken}` },
          });
          if (res.ok) loadTabData();
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleRevokeInvitation = async (userId: string) => {
    const invite = invitedMembers.find((i) => i.userId?._id === userId);
    const userName = invite?.userId?.profileName || invite?.userId?.email || 'this member';
    setMemberConfirmModal({
      isOpen: true,
      title: 'Are you sure?',
      message: `Are you sure you want to revoke invitation for member ${userName} from ${hubName}?`,
      onConfirm: async () => {
        if (!(session as any)?.accessToken) return;
        try {
          const res = await fetch(`http://localhost:5000/api/v1/hubs/${hubId}/invite/revoke/${userId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${(session as any).accessToken}` },
          });
          if (res.ok) loadTabData();
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleResendInvitation = async (userId: string) => {
    const invite = invitedMembers.find((i) => i.userId?._id === userId);
    const userName = invite?.userId?.profileName || invite?.userId?.email || 'this member';
    setMemberConfirmModal({
      isOpen: true,
      title: 'Are you sure?',
      message: `Are you sure you want to resend invitation to member ${userName} in ${hubName}?`,
      onConfirm: async () => {
        if (!(session as any)?.accessToken) return;
        try {
          const res = await fetch(`http://localhost:5000/api/v1/hubs/${hubId}/invite/resend/${userId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${(session as any).accessToken}` },
          });
          if (res.ok) {
            setInviteStatus({ type: 'success', text: 'Invitation resent successfully!' });
            loadTabData();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handlePromoteToAdmin = async (userId: string) => {
    const member = activeMembers.find((m) => m.userId?._id === userId);
    const userName = member?.userId?.profileName || 'this member';
    setMemberConfirmModal({
      isOpen: true,
      title: 'Are you sure?',
      message: `Are you sure you want to make admin member ${userName} in ${hubName}?`,
      onConfirm: async () => {
        if (!(session as any)?.accessToken) return;
        try {
          const res = await fetch(`http://localhost:5000/api/v1/hubs/${hubId}/promote/${userId}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${(session as any).accessToken}` },
          });
          if (res.ok) loadTabData();
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleRemoveMember = async (userId: string) => {
    const member = activeMembers.find((m) => m.userId?._id === userId);
    const userName = member?.userId?.profileName || 'this member';
    setMemberConfirmModal({
      isOpen: true,
      title: 'Are you sure?',
      message: `Are you sure you want to delete member ${userName} from ${hubName}?`,
      onConfirm: async () => {
        if (!(session as any)?.accessToken) return;
        try {
          const res = await fetch(`http://localhost:5000/api/v1/hubs/${hubId}/remove/${userId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${(session as any).accessToken}` },
          });
          if (res.ok) loadTabData();
        } catch (err) {
          console.error(err);
        }
      }
    });
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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !(session as any)?.accessToken) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch(`http://localhost:5000/api/v1/hubs/${hubId}/avatar`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${(session as any).accessToken}`,
        },
        body: formData,
      });

      if (res.ok) {
        const updatedHub = await res.json();
        setHubAvatar(updatedHub.profileImageUrl || null);
        alert('Workspace avatar updated successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update avatar.');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading avatar.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-border">
        <div className="flex items-center gap-4">
          {/* Workspace Logo with hover upload */}
          <div className="relative group cursor-pointer w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-800 to-indigo-900 border-2 border-primary/20 flex items-center justify-center text-xl font-bold text-white shadow-md">
            {hubAvatar ? (
              <img src={`http://localhost:5000${hubAvatar}`} alt={hubName} className="w-full h-full object-cover" />
            ) : (
              <span>{hubName.charAt(0).toUpperCase()}</span>
            )}
            
            {/* Edit overlay */}
            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer">
              <i className="ti ti-pencil text-white text-base" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              {/* Tooltip */}
              <span className="absolute bottom-[-35px] left-1/2 -translate-x-1/2 bg-card border border-border text-foreground text-[10px] px-2.5 py-1 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50">
                Upload a new workspace avatar
              </span>
            </label>
          </div>
          
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Admin Workspace</span>
            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-2xl font-extrabold tracking-tight">{hubName}</h1>
              <button 
                type="button"
                onClick={() => {
                  setEditHubName(hubName);
                  setEditHubDesc(hubDescription);
                  setShowEditHubModal(true);
                }} 
                className="p-1 rounded bg-secondary hover:bg-opacity-80 text-muted-foreground hover:text-foreground cursor-pointer transition-all flex items-center justify-center"
                title="Edit workspace details"
              >
                <i className="ti ti-pencil text-sm" />
              </button>
            </div>
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
        {(['meetings', 'review', 'tasks', 'submissions', 'broadcasts', 'members', 'analytics'] as const).map((tab) => (
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

      {/* LiveKit Host Meeting Overlay */}
      {lkToken && lkRoom && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="h-14 bg-card border-b border-border px-6 flex items-center justify-between">
            <span className="font-bold text-sm">Meeting Host Mode: {lkRoom}</span>
            <button
              onClick={handleEndMeeting}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-opacity-90 text-white font-bold text-xs cursor-pointer"
            >
              End Meeting & Analyze
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

      {/* Confirmation Modal for Scheduling Meeting */}
      {showConfirmScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-md p-6 rounded-2xl bg-card border border-border shadow-2xl flex flex-col gap-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl">
                <i className="ti ti-help" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground animate-pulse">Are you sure?</h2>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">You are about to schedule a new meeting with the following details:</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/50 border border-border flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground uppercase font-bold text-[10px]">Title:</span>
                <span className="font-semibold text-foreground">{meetingTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground uppercase font-bold text-[10px]">Scheduled For:</span>
                <span className="font-semibold text-foreground">
                  {selectedDay} {months[selectedMonth - 1]} at {selectedHour}:{selectedMinute} {selectedAmpm}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-border pt-2.5 mt-1 text-primary">
                <span className="uppercase font-bold text-[10px]">Starts In:</span>
                <span className="font-bold">{getCountdownString()}</span>
              </div>
            </div>

            <div className="flex justify-center gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={handleScheduleMeetingSubmit}
                className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-all cursor-pointer shadow-md"
              >
                Yes, Schedule
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmScheduleModal(false)}
                className="px-4 py-2.5 rounded-lg bg-secondary text-foreground text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Hub Details Modal */}
      {showEditHubModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-md p-6 rounded-2xl bg-card border border-border shadow-2xl relative flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setShowEditHubModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center"
            >
              <i className="ti ti-x text-lg" />
            </button>

            <h2 className="text-lg font-bold">Edit Workspace Details</h2>

            <form onSubmit={handleUpdateHubDetails} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Workspace Name</label>
                <input
                  type="text"
                  required
                  value={editHubName}
                  onChange={(e) => setEditHubName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Description / Content</label>
                <textarea
                  required
                  rows={4}
                  value={editHubDesc}
                  onChange={(e) => setEditHubDesc(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Workspace Avatar</label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-purple-800 to-indigo-900 flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0 border border-border">
                    {hubAvatar ? (
                      <img src={`http://localhost:5000${hubAvatar}`} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span>{editHubName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary file:cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditHubModal(false)}
                  className="px-4 py-2.5 rounded-lg bg-secondary text-foreground text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 text-xs transition-all cursor-pointer shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
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

      {/* Rejection Feedback Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-md p-6 rounded-2xl bg-card border border-border shadow-2xl">
            <h2 className="text-lg font-bold mb-4">Reject Submission</h2>
            <form onSubmit={handleRejectSub} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Revision Feedback</label>
                <textarea
                  required
                  rows={4}
                  value={rejectFeedback}
                  onChange={(e) => setRejectFeedback(e.target.value)}
                  placeholder="Explain why this submission requires revision..."
                  className="w-full p-3 rounded-xl border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none transition-all text-xs"
                />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB CONTENT */}
      
      {/* 1. MEETINGS TAB */}
      {activeTab === 'meetings' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Scheduling form */}
          <div className="md:col-span-1 p-6 rounded-2xl bg-card border border-border flex flex-col gap-4">
            <h2 className="font-bold text-base mb-2">Schedule Meeting</h2>
            {meetingStatus && (
              <div className={`p-3 text-xs rounded-xl border ${
                meetingStatus.type === 'success'
                  ? 'bg-green-500/10 text-green-500 border-green-500/20'
                  : 'bg-red-500/10 text-red-600 border-red-500/20'
              }`}>
                {meetingStatus.text}
              </div>
            )}
            <form onSubmit={triggerScheduleConfirm} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Title</label>
                <input
                  type="text"
                  required
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="E.g. CatchUp App Dev Session"
                  className="w-full p-2.5 rounded-lg border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Description</label>
                <textarea
                  rows={2}
                  value={meetingDesc}
                  onChange={(e) => setMeetingDesc(e.target.value)}
                  placeholder="Outline topics..."
                  className="w-full p-2.5 rounded-lg border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none text-xs"
                />
              </div>

              {/* Collapsible Date & Time Picker Selector */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Date & Time</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowDateTimePicker(!showDateTimePicker);
                    setShowHourList(false);
                    setShowMinuteList(false);
                  }}
                  className="w-full p-2.5 rounded-lg border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none text-xs font-semibold text-left flex justify-between items-center cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <i className="ti ti-calendar text-primary" />
                    {selectedDay} {months[selectedMonth - 1]} {selectedYear} at {selectedHour}:{selectedMinute} {selectedAmpm}
                  </span>
                  <i className={`ti ti-chevron-down transition-transform duration-200 ${showDateTimePicker ? 'rotate-180' : ''}`} />
                </button>

                {showDateTimePicker && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => {
                        setShowDateTimePicker(false);
                        setShowHourList(false);
                        setShowMinuteList(false);
                      }}
                    />
                    <div className="absolute bottom-[102%] left-0 right-0 mb-1.5 rounded-xl border border-border bg-card shadow-2xl p-3.5 z-20 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      
                      {/* Literal Visual Calendar Grid */}
                      <div className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-muted/40">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs font-bold text-foreground">
                            {months[displayMonth - 1]} {displayYear}
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handlePrevMonth}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                              disabled={
                                displayYear === new Date().getFullYear() &&
                                displayMonth === new Date().getMonth() + 1
                              }
                            >
                              <i className="ti ti-chevron-left text-xs" />
                            </button>
                            <button
                              type="button"
                              onClick={handleNextMonth}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <i className="ti ti-chevron-right text-xs" />
                            </button>
                          </div>
                        </div>

                        {/* Day Labels */}
                        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-muted-foreground uppercase border-b border-border/50 pb-1">
                          <span>Su</span>
                          <span>Mo</span>
                          <span>Tu</span>
                          <span>We</span>
                          <span>Th</span>
                          <span>Fr</span>
                          <span>Sa</span>
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {generateCalendarDays().map((cell, idx) => {
                            if (cell.day === null) {
                              return <div key={`empty-${idx}`} className="w-8 h-8" />;
                            }

                            const isSelected =
                              selectedDay === cell.day &&
                              selectedMonth === displayMonth &&
                              selectedYear === displayYear;

                            return (
                              <button
                                key={`day-${cell.day}`}
                                type="button"
                                onClick={() => {
                                  if (!cell.isPast) {
                                    setSelectedDay(cell.day as number);
                                    setSelectedMonth(displayMonth);
                                    setSelectedYear(displayYear);
                                  }
                                }}
                                disabled={cell.isPast}
                                className={`w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground font-extrabold shadow-md'
                                    : cell.isPast
                                    ? 'opacity-20 text-muted-foreground cursor-not-allowed'
                                    : 'hover:bg-muted text-foreground'
                                }`}
                              >
                                {cell.day}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Digital Clock Picker */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Select Time</label>
                        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/30">
                          <div className="flex items-center gap-1 flex-1">
                            {/* Hour Custom Dropdown */}
                            <div className="relative flex-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowHourList(!showHourList);
                                  setShowMinuteList(false);
                                }}
                                className="w-full p-1.5 rounded-lg border border-border bg-card text-center text-xs font-semibold focus:ring-1 focus:ring-primary focus:outline-none flex justify-between items-center px-2 cursor-pointer"
                              >
                                <span className="flex-1 text-center">{selectedHour}</span>
                                <i className={`ti ti-chevron-down text-[9px] transition-transform duration-200 ${showHourList ? 'rotate-180' : ''}`} />
                              </button>
                              {showHourList && (
                                <>
                                  <div className="fixed inset-0 z-30" onClick={() => setShowHourList(false)} />
                                  <div className="absolute bottom-[110%] left-0 right-0 bg-card border border-border rounded-xl shadow-2xl overflow-y-auto max-h-40 z-40 p-1 flex flex-col gap-0.5 custom-scrollbar">
                                    {Array.from({ length: 12 }).map((_, idx) => {
                                      const h = idx + 1;
                                      const isSelected = selectedHour === h;
                                      return (
                                        <button
                                          key={h}
                                          type="button"
                                          onClick={() => {
                                            setSelectedHour(h);
                                            setShowHourList(false);
                                          }}
                                          className={`w-full py-1 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                            isSelected
                                              ? 'bg-primary text-primary-foreground'
                                              : 'hover:bg-primary/10 text-foreground hover:text-primary'
                                          }`}
                                        >
                                          {h}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>

                            <span className="font-bold text-xs text-muted-foreground px-0.5">:</span>

                            {/* Minute Custom Dropdown */}
                            <div className="relative flex-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowMinuteList(!showMinuteList);
                                  setShowHourList(false);
                                }}
                                className="w-full p-1.5 rounded-lg border border-border bg-card text-center text-xs font-semibold focus:ring-1 focus:ring-primary focus:outline-none flex justify-between items-center px-2 cursor-pointer"
                              >
                                <span className="flex-1 text-center">{selectedMinute}</span>
                                <i className={`ti ti-chevron-down text-[9px] transition-transform duration-200 ${showMinuteList ? 'rotate-180' : ''}`} />
                              </button>
                              {showMinuteList && (
                                <>
                                  <div className="fixed inset-0 z-30" onClick={() => setShowMinuteList(false)} />
                                  <div className="absolute bottom-[110%] left-0 right-0 bg-card border border-border rounded-xl shadow-2xl overflow-y-auto max-h-40 z-40 p-1 flex flex-col gap-0.5 custom-scrollbar">
                                    {['00', '15', '30', '45'].map((m) => {
                                      const isSelected = selectedMinute === m;
                                      return (
                                        <button
                                          key={m}
                                          type="button"
                                          onClick={() => {
                                            setSelectedMinute(m);
                                            setShowMinuteList(false);
                                          }}
                                          className={`w-full py-1 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                            isSelected
                                              ? 'bg-primary text-primary-foreground'
                                              : 'hover:bg-primary/10 text-foreground hover:text-primary'
                                          }`}
                                        >
                                          {m}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex bg-muted p-1 rounded-lg border border-border">
                            <button
                              type="button"
                              onClick={() => setSelectedAmpm('AM')}
                              className={`px-3 py-1 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
                                selectedAmpm === 'AM'
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              AM
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedAmpm('PM')}
                              className={`px-3 py-1 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
                                selectedAmpm === 'PM'
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              PM
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Error warning inside dropdown popover */}
                      {isPastDateTime && (
                        <div className="p-2.5 rounded-lg border border-red-500/20 bg-red-500/10 text-[10px] text-red-500 font-semibold text-center flex items-center justify-center gap-1.5 animate-pulse">
                          <i className="ti ti-alert-triangle" />
                          Time selected is in the past!
                        </div>
                      )}

                    </div>
                  </>
                )}
              </div>

              {/* Countdown / Validation Warning */}
              {isPastDateTime ? (
                <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-xs text-red-500 font-semibold text-center mt-1 flex items-center justify-center gap-1.5 animate-pulse">
                  <i className="ti ti-alert-triangle text-sm" />
                  Cannot schedule meetings in the past!
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-primary font-semibold text-center mt-1">
                  <i className="ti ti-clock-hour-4 mr-1.5" />
                  Starts in: {getCountdownString()}
                </div>
              )}

              <button
                type="submit"
                disabled={isPastDateTime}
                className={`w-full py-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer mt-2 ${
                  isPastDateTime
                    ? 'bg-secondary text-muted-foreground cursor-not-allowed opacity-50'
                    : 'bg-primary text-primary-foreground hover:opacity-90 shadow-md'
                }`}
              >
                Schedule & Sync
              </button>
            </form>
          </div>

          {/* Meetings List */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <h2 className="font-bold text-base">Meetings Schedule</h2>
            {meetings.length === 0 ? (
              <p className="text-xs text-muted-foreground">No meetings scheduled. Create one on the left!</p>
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
                    {m.status === 'scheduled' ? (
                      <button
                        onClick={() => handleStartMeeting(m._id)}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 font-bold text-xs cursor-pointer"
                      >
                        Start Host Room
                      </button>
                    ) : m.status === 'processing' ? (
                      <span className="text-xs font-bold text-orange-500 uppercase">Processing AI...</span>
                    ) : (
                      <button
                        onClick={() => {
                          setReviewMeetingId(m._id);
                          setActiveTab('review');
                          fetchAiArtifact(m._id);
                        }}
                        className="px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-opacity-80 font-bold text-xs cursor-pointer"
                      >
                        Review Output
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. AI REVIEW TAB */}
      {activeTab === 'review' && (
        <div className="flex flex-col gap-6">
          <div className="p-4 rounded-xl bg-secondary flex items-center justify-between">
            <span className="text-xs font-bold">AI Draft Verification Panel</span>
            {!aiArtifact && (
              <span className="text-xs text-muted-foreground">Select a completed meeting on the Meetings tab to review.</span>
            )}
          </div>

          {aiArtifact && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Left editable blocks */}
              <div className="md:col-span-2 flex flex-col gap-6">
                
                {/* Summary */}
                <div className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-3">
                  <h3 className="font-bold text-sm uppercase text-muted-foreground">Meeting Summary</h3>
                  <textarea
                    rows={4}
                    value={reviewSummary}
                    onChange={(e) => setReviewSummary(e.target.value)}
                    className="w-full p-3 rounded-lg border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none text-xs"
                  />
                </div>

                {/* Topics, Decisions, Outcomes */}
                <div className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-6">
                  <div>
                    <h3 className="font-bold text-sm uppercase text-muted-foreground mb-3">Key Decisions</h3>
                    <div className="flex flex-col gap-2">
                      {reviewDecisions.map((decision, idx) => (
                        <input
                          key={idx}
                          type="text"
                          value={decision}
                          onChange={(e) => {
                            const newDec = [...reviewDecisions];
                            newDec[idx] = e.target.value;
                            setReviewDecisions(newDec);
                          }}
                          className="w-full p-2.5 rounded-lg border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none text-xs"
                        />
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Right tasks assignment block */}
              <div className="md:col-span-1 p-6 rounded-2xl bg-card border border-border flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm uppercase text-muted-foreground">Extracted Assignments</h3>
                </div>

                <div className="flex flex-col gap-4">
                  {reviewAssignments.map((a, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-muted/50 border border-border flex flex-col gap-3">
                      
                      {/* Confidence Badge */}
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Task #{idx+1}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          a.confidence < 0.75 ? 'bg-orange-500/10 text-orange-500 border border-orange-500/30' : 'bg-green-500/10 text-green-500'
                        }`}>
                          {Math.round(a.confidence * 100)}% Confidence
                        </span>
                      </div>

                      <input
                        type="text"
                        value={a.description}
                        onChange={(e) => {
                          const newAss = [...reviewAssignments];
                          newAss[idx].description = e.target.value;
                          setReviewAssignments(newAss);
                        }}
                        className="w-full p-2.5 rounded-lg border border-border bg-card focus:ring-1 focus:ring-primary focus:outline-none text-xs font-semibold"
                      />

                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground">Assignee Name</label>
                        <input
                          type="text"
                          value={a.extractedAssigneeName || ''}
                          onChange={(e) => {
                            const newAss = [...reviewAssignments];
                            newAss[idx].extractedAssigneeName = e.target.value;
                            setReviewAssignments(newAss);
                          }}
                          className="w-full p-2 rounded-lg border border-border bg-card text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      </div>

                      {a.suggestedDependsOnTitle && (
                        <div className="text-[10px] text-orange-500 bg-orange-500/5 p-2 rounded border border-orange-500/10">
                          <strong>Blocker:</strong> Depends on &ldquo;{a.suggestedDependsOnTitle}&rdquo;
                        </div>
                      )}

                    </div>
                  ))}
                </div>

                <button
                  onClick={handleApproveReview}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 text-xs transition-all cursor-pointer shadow-lg glow-hover mt-4"
                >
                  Approve and Distribute
                </button>
              </div>

            </div>
          )}
        </div>
      )}

      {/* 3. TASKS TAB */}
      {activeTab === 'tasks' && (
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">Active Tasks</h2>
          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tasks created yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((task) => (
                <div key={task._id} className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-lg border ${
                        task.status === 'blocked'
                          ? 'bg-red-500/5 text-red-500 border-red-500/10'
                          : task.status === 'completed'
                          ? 'bg-green-500/5 text-green-500 border-green-500/10'
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {task.status}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">Assignee: {task.assigneeId?.profileName}</span>
                    </div>
                    <h3 className="font-bold text-sm text-foreground">{task.title}</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{task.description}</p>
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-border pt-4 mt-4 text-xs">
                    <span className="text-red-500 font-bold">Due: {new Date(task.deadline).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. SUBMISSIONS TAB */}
      {activeTab === 'submissions' && (
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">Submissions Queue</h2>
          {submissions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No submissions pending review.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {submissions.map((sub) => (
                <div key={sub._id} className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-4">
                  <div className="flex justify-between items-start pb-3 border-b border-border">
                    <div>
                      <span className="text-xs text-primary font-bold">Pending Review</span>
                      <h3 className="font-bold text-sm mt-1">{sub.task.title}</h3>
                    </div>
                    <span className="text-xs text-muted-foreground">Submitted by: {sub.submittedBy.profileName}</span>
                  </div>

                  <p className="text-xs leading-relaxed text-foreground bg-muted p-4 rounded-xl">{sub.note}</p>

                  {/* Attachments */}
                  {sub.attachments && sub.attachments.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Attachments</span>
                      <div className="flex gap-2">
                        {sub.attachments.map((file: any, idx: number) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-opacity-80 text-xs font-semibold flex items-center gap-1.5"
                          >
                            <i className="ti ti-paperclip text-sm" />
                            {file.fileName}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Drive Links */}
                  {sub.driveLinks && sub.driveLinks.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Google Drive Link</span>
                      <a
                        href={sub.driveLinks[0]}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                      >
                        <i className="ti ti-brand-google-drive text-sm" />
                        {sub.driveLinks[0]}
                      </a>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 justify-end pt-3 border-t border-border mt-2">
                    <button
                      onClick={() => handleTriggerReject(sub._id)}
                      className="px-4 py-2 rounded-lg bg-secondary hover:bg-opacity-80 text-foreground text-xs font-bold cursor-pointer"
                    >
                      Reject with Feedback
                    </button>
                    <button
                      onClick={() => handleApproveSub(sub._id)}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-xs font-bold cursor-pointer shadow-md"
                    >
                      Approve Submission
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. BROADCASTS TAB */}
      {activeTab === 'broadcasts' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Creator form */}
          <div className="md:col-span-1 p-6 rounded-2xl bg-card border border-border flex flex-col gap-4">
            <h2 className="font-bold text-base mb-2">Compose Broadcast</h2>
            <form onSubmit={handleSendBroadcast} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Subject</label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Important Project Update"
                  className="w-full p-2.5 rounded-lg border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Message</label>
                <textarea
                  required
                  rows={4}
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  placeholder="Write message details..."
                  className="w-full p-2.5 rounded-lg border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Urgency</label>
                <select
                  value={broadcastUrgency}
                  onChange={(e) => setBroadcastUrgency(e.target.value as any)}
                  className="w-full p-2.5 rounded-lg border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none text-xs"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 text-xs transition-all cursor-pointer"
              >
                Send Broadcast
              </button>
            </form>
          </div>

          {/* Broadcasts Inbox / History */}
          <div className="md:col-span-2 flex flex-col gap-6">
            <h2 className="font-bold text-base">Broadcast History & Replies</h2>
            
            <div className="flex flex-col gap-4">
              {broadcasts.map((b) => (
                <div key={b._id} className="p-5 rounded-xl bg-card border border-border flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm">{b.title}</h3>
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">{b.urgency}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{b.body}</p>
                  
                  <div className="flex justify-end pt-2 border-t border-border">
                    <button
                      onClick={() => fetchReplies(b._id)}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                    >
                      View Replies <i className="ti ti-arrow-right" />
                    </button>
                  </div>

                  {/* Private replies threads list */}
                  {selectedBroadcastId === b._id && (
                    <div className="mt-3 bg-muted p-4 rounded-xl border border-border flex flex-col gap-3">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground pb-2 border-b border-border">Private Member Replies</div>
                      {broadcastReplies.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground">No replies yet.</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {broadcastReplies.map((r) => (
                            <div key={r._id} className="text-xs p-2 rounded bg-card border border-border">
                              <span className="font-bold block">{r.memberId.profileName}</span>
                              <p className="text-muted-foreground mt-0.5">{r.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. MEMBERS TAB */}
      {activeTab === 'members' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Invitation Form */}
          <div className="md:col-span-1 p-6 rounded-2xl bg-card border border-border flex flex-col gap-4">
            <h2 className="font-bold text-base mb-2">Invite Member</h2>
            {inviteStatus && (
              <div className={`p-3 text-xs rounded-xl border ${
                inviteStatus.type === 'success'
                  ? 'bg-green-500/10 text-green-500 border-green-500/20'
                  : 'bg-red-500/10 text-red-600 border-red-500/20'
              }`}>
                {inviteStatus.text}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!inviteEmail || !(session as any)?.accessToken) return;
                setMemberConfirmModal({
                  isOpen: true,
                  title: 'Are you sure?',
                  message: `Are you sure you want to invite member ${inviteEmail} to ${hubName}?`,
                  onConfirm: async () => {
                    setInviteStatus(null);
                    try {
                      const res = await fetch(`http://localhost:5000/api/v1/hubs/${hubId}/invite`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${(session as any).accessToken}`,
                        },
                        body: JSON.stringify({ email: inviteEmail }),
                      });
                      if (res.ok) {
                        setInviteEmail('');
                        setInviteStatus({ type: 'success', text: 'Invitation sent successfully!' });
                        loadTabData();
                      } else {
                        const data = await res.json();
                        setInviteStatus({ type: 'error', text: data.error || 'Failed to send invitation.' });
                      }
                    } catch (err: any) {
                      console.error(err);
                      setInviteStatus({ type: 'error', text: 'Connection error. Please check if backend and Redis are running.' });
                    }
                  }
                });
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="member@company.com"
                  className="w-full p-2.5 rounded-lg border border-border bg-muted focus:ring-1 focus:ring-primary focus:outline-none text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 text-xs transition-all cursor-pointer"
              >
                Send Invite
              </button>
            </form>
          </div>

          {/* Members Lists */}
          <div className="md:col-span-2 flex flex-col gap-6">
            
            {/* 1. Join Requests */}
            <div className="flex flex-col gap-3">
              <h2 className="font-bold text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                Join Requests ({pendingRequests.length})
              </h2>
              {pendingRequests.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 bg-secondary/35 border border-border rounded-xl">No pending join requests.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {pendingRequests.map((m) => (
                    <div key={m._id} className="p-4 rounded-xl bg-card border border-border flex items-center justify-between shadow-sm">
                      <div>
                        <h3 className="font-bold text-sm">{m.userId?.profileName || 'Anonymous'}</h3>
                        <p className="text-xs text-muted-foreground">{m.userId?.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRejectRequest(m.userId?._id)}
                          className="px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-opacity-80 font-bold text-xs cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveRequest(m.userId?._id)}
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 font-bold text-xs cursor-pointer"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Sent Invitations */}
            <div className="flex flex-col gap-3 mt-2">
              <h2 className="font-bold text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Sent Invitations ({invitedMembers.length})
              </h2>
              {invitedMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 bg-secondary/35 border border-border rounded-xl">No unaccepted invitations.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {invitedMembers.map((m) => (
                    <div key={m._id} className="p-4 rounded-xl bg-card border border-border flex items-center justify-between shadow-sm">
                      <div>
                        <h3 className="font-bold text-sm">{m.userId?.profileName || m.userId?.email}</h3>
                        <p className="text-xs text-muted-foreground">{m.userId?.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRevokeInvitation(m.userId?._id)}
                          className="px-3 py-1.5 rounded-lg bg-red-600/10 text-red-500 hover:bg-red-600/20 font-bold text-xs cursor-pointer"
                        >
                          Revoke
                        </button>
                        <button
                          onClick={() => handleResendInvitation(m.userId?._id)}
                          className="px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-opacity-80 font-bold text-xs cursor-pointer"
                        >
                          Resend Invite
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Active Directory */}
            <div className="flex flex-col gap-3 mt-2">
              <h2 className="font-bold text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Active Directory ({activeMembers.length})
              </h2>
              {activeMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 bg-secondary/35 border border-border rounded-xl">No active members in this directory.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeMembers.map((m) => (
                    <div key={m._id} className="p-4 rounded-xl bg-card border border-border flex items-center justify-between shadow-sm">
                      <div>
                        <h3 className="font-bold text-sm">{m.userId?.profileName}</h3>
                        <p className="text-xs text-muted-foreground">{m.userId?.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-secondary text-foreground capitalize">
                          {m.role}
                        </span>
                        {m.role === 'member' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePromoteToAdmin(m.userId?._id)}
                              className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-semibold text-[10px] uppercase cursor-pointer"
                            >
                              Make Admin
                            </button>
                            <button
                              onClick={() => handleRemoveMember(m.userId?._id)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-600/10 text-red-500 hover:bg-red-600/20 font-semibold text-[10px] uppercase cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 7. ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="flex flex-col gap-6">
          <h2 className="font-bold text-base">Hub Metrics Overview</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-card border border-border">
              <span className="text-xs text-muted-foreground uppercase font-bold">Total Members</span>
              <div className="text-3xl font-extrabold mt-2 text-foreground">{analytics?.membersCount || 0}</div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border">
              <span className="text-xs text-muted-foreground uppercase font-bold">Task Completion</span>
              <div className="text-3xl font-extrabold mt-2 text-primary">{analytics?.tasks?.completionRate || 0}%</div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border">
              <span className="text-xs text-muted-foreground uppercase font-bold">Meeting Attendance</span>
              <div className="text-3xl font-extrabold mt-2 text-foreground">{analytics?.meetings?.averageAttendanceRate || 0}%</div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border">
              <span className="text-xs text-muted-foreground uppercase font-bold">Overdue Tasks</span>
              <div className="text-3xl font-extrabold mt-2 text-foreground">{analytics?.tasks?.overdue || 0}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
