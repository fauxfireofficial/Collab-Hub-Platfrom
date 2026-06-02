import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, Video, User as UserIcon, Plus, Check, X, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format, isAfter, isBefore } from 'date-fns';

interface MeetingPartner {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  startupName?: string;
}

interface Meeting {
  id: string;
  title: string;
  description: string;
  organizer: MeetingPartner;
  invitee: MeetingPartner;
  startTime: string;
  endTime: string;
  status: 'pending' | 'accepted' | 'rejected';
  roomUrl: string;
}

export const MeetingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [partners, setPartners] = useState<MeetingPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Schedule Form State
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [inviteeId, setInviteeId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMeetings();
    fetchPartners();
  }, [user]);

  const fetchMeetings = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/meetings');
      setMeetings(response.data);
    } catch (error) {
      console.error('Failed to load meetings:', error);
      toast.error('Could not load meetings list.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const targetRole = user?.role === 'entrepreneur' ? 'investors' : 'entrepreneurs';
      const response = await api.get(`/users/${targetRole}`);
      setPartners(response.data);
    } catch (error) {
      console.error('Failed to load connection partners:', error);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Combine date and time
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    if (isBefore(endDateTime, startDateTime)) {
      toast.error('End time must be after start time.');
      setIsSubmitting(false);
      return;
    }

    try {
      await api.post('/meetings/schedule', {
        title,
        description,
        inviteeId,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString()
      });
      
      toast.success('Meeting request sent successfully!');
      // Reset form
      setTitle('');
      setDescription('');
      setInviteeId('');
      setDate('');
      setStartTime('');
      setEndTime('');
      setShowScheduleForm(false);
      
      // Refresh meetings list
      fetchMeetings();
    } catch (error: any) {
      console.error('Failed to schedule meeting:', error);
      const msg = error.response?.data?.message || 'Failed to schedule meeting.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (meetingId: string, status: 'accepted' | 'rejected') => {
    try {
      await api.put(`/meetings/${meetingId}`, { status });
      toast.success(`Meeting reservation ${status}!`);
      fetchMeetings();
    } catch (error: any) {
      console.error('Failed to update meeting status:', error);
      const msg = error.response?.data?.message || 'Error updating status.';
      toast.error(msg);
    }
  };

  const handleCancelMeeting = async (meetingId: string) => {
    if (window.confirm(t('Are you sure you want to cancel this meeting?'))) {
      try {
        await api.delete(`/meetings/${meetingId}`);
        toast.success(t('Meeting cancelled successfully!'));
        fetchMeetings();
      } catch (error: any) {
        console.error('Failed to cancel meeting:', error);
        const msg = error.response?.data?.message || 'Error cancelling meeting.';
        toast.error(msg);
      }
    }
  };

  if (!user) return null;

  const upcomingMeetings = meetings.filter(m => isAfter(new Date(m.startTime), new Date()) && m.status !== 'rejected');
  const pastMeetings = meetings.filter(m => isBefore(new Date(m.startTime), new Date()) || m.status === 'rejected');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Meetings & Calendar')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('Schedule connections and jump into WebRTC video calls')}</p>
        </div>
        
        <Button 
          leftIcon={<Plus size={18} />}
          onClick={() => setShowScheduleForm(!showScheduleForm)}
        >
          {showScheduleForm ? t('Hide Scheduler') : t('Schedule Meeting')}
        </Button>
      </div>

      {showScheduleForm && (
        <Card className="max-w-2xl border-primary-100">
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Book a Time Slot')}</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {user.role === 'entrepreneur' ? t('Select Investor') : t('Select Startup Partner')}
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                    value={inviteeId}
                    onChange={(e) => setInviteeId(e.target.value)}
                    required
                  >
                    <option value="">-- {t('Choose Partner')} --</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.startupName ? `(${p.startupName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label={t('Meeting Title')}
                  placeholder={t('e.g. Pitch Deck Review')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  fullWidth
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label={t('Date')}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  fullWidth
                />
                <Input
                  label={t('Start Time')}
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  fullWidth
                />
                <Input
                  label={t('End Time')}
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  fullWidth
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Agenda / Description')}</label>
                <textarea
                  className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-md px-3 py-2 text-sm focus:ring-primary-500"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('Describe what we will talk about...')}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setShowScheduleForm(false)}>
                  {t('Cancel')}
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  {t('Request Booking')}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Main lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Upcoming Scheduled Meetings')}</h2>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <p className="text-center py-4 text-gray-500">{t('Loading your calendar...')}</p>
              ) : upcomingMeetings.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {upcomingMeetings.map(meeting => {
                    const isOrganizer = meeting.organizer.id === user.id;
                    const partner = isOrganizer ? meeting.invitee : meeting.organizer;
                    const startTimeDate = new Date(meeting.startTime);
                    
                    return (
                      <div key={meeting.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-primary-50 rounded-lg text-primary-600">
                            <CalendarIcon size={24} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{meeting.title}</h3>
                            <p className="text-sm text-gray-500">{meeting.description || t('No description provided.')}</p>
                            
                            <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500 items-center">
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                {format(startTimeDate, 'PPp')}
                              </span>
                              <span className="flex items-center gap-1">
                                <UserIcon size={14} />
                                {t('With')} {partner?.name} {partner?.startupName ? `(${partner.startupName})` : ''}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap justify-end">
                          {/* Display Status Badge */}
                          {meeting.status === 'pending' && (
                            <Badge variant="warning">{t('Pending Approval')}</Badge>
                          )}
                          {meeting.status === 'accepted' && (
                            <Badge variant="success">{t('Confirmed')}</Badge>
                          )}

                          {/* Action controls for the invitee if pending */}
                          {!isOrganizer && meeting.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="primary" 
                                className="p-2"
                                onClick={() => handleUpdateStatus(meeting.id, 'accepted')}
                                title={t('Accept Invitation')}
                              >
                                <Check size={16} />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="p-2 text-error-600 hover:bg-error-50"
                                onClick={() => handleUpdateStatus(meeting.id, 'rejected')}
                                title={t('Reject Invitation')}
                              >
                                <X size={16} />
                              </Button>
                            </div>
                          )}

                          {/* Action controls for the organizer if pending */}
                          {isOrganizer && meeting.status === 'pending' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-error-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-800"
                              onClick={() => handleCancelMeeting(meeting.id)}
                            >
                              {t('Cancel')}
                            </Button>
                          )}

                          {/* Action controls for accepted meetings */}
                          {meeting.status === 'accepted' && (
                            <div className="flex gap-2">
                              <Link to={meeting.roomUrl}>
                                <Button size="sm" leftIcon={<Video size={16} />}>
                                  {t('Join Meeting')}
                                </Button>
                              </Link>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-error-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-800"
                                onClick={() => handleCancelMeeting(meeting.id)}
                              >
                                {t('Cancel')}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle size={32} className="mx-auto text-gray-400 mb-2" />
                  <p>{t('No upcoming meetings scheduled.')}</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* History / Rejected Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Past & Cancelled Meetings')}</h2>
            </CardHeader>
            <CardBody>
              {pastMeetings.length > 0 ? (
                <div className="space-y-3">
                  {pastMeetings.map(meeting => {
                    const isOrganizer = meeting.organizer.id === user.id;
                    const partner = isOrganizer ? meeting.invitee : meeting.organizer;
                    const startTimeDate = new Date(meeting.startTime);

                    return (
                      <div key={meeting.id} className="p-3 bg-gray-50 dark:bg-gray-950/40 rounded-lg text-xs space-y-1 border border-gray-100 dark:border-gray-800/80">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200 truncate">{meeting.title}</h4>
                          <span className="capitalize text-gray-500 dark:text-gray-400">
                            {meeting.status === 'rejected' ? (
                              <span className="text-error-600 dark:text-red-400 font-semibold">{t('Declined')}</span>
                            ) : (
                              t('Completed')
                            )}
                          </span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">{format(startTimeDate, 'PPp')}</p>
                        <p className="text-gray-650 dark:text-gray-300 font-medium">{t('With')} {partner?.name}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">{t('No past meetings found.')}</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
