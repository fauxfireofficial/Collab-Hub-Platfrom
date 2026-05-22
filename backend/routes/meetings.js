import express from 'express';
import Meeting from '../models/Meeting.js';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Helper to check for conflicts
const hasMeetingConflict = async (userId1, userId2, startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  // Check if either user is booked in an accepted meeting during this interval
  const conflict = await Meeting.findOne({
    status: 'accepted',
    $or: [
      { organizer: userId1 },
      { invitee: userId1 },
      { organizer: userId2 },
      { invitee: userId2 }
    ],
    $and: [
      { startTime: { $lt: end } },
      { endTime: { $gt: start } }
    ]
  });

  return conflict;
};

// @route   POST /api/meetings/schedule
// @desc    Schedule a new meeting
router.post('/schedule', auth, async (req, res) => {
  const { title, description, inviteeId, startTime, endTime } = req.body;
  try {
    const invitee = await User.findById(inviteeId);
    if (!invitee) {
      return res.status(404).json({ message: 'Invitee user not found' });
    }

    // Check time conflict for organizer or invitee
    const conflict = await hasMeetingConflict(req.user.id, inviteeId, startTime, endTime);
    if (conflict) {
      return res.status(409).json({ 
        message: 'Conflict detected: Either you or the invitee has an overlapping meeting during this time slot.',
        conflict 
      });
    }

    // Generate unique video room URL for this meeting
    const roomId = uuidv4();
    const roomUrl = `/video-call/${roomId}`;

    const meeting = new Meeting({
      title,
      description,
      organizer: req.user.id,
      invitee: inviteeId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: 'pending',
      roomUrl
    });

    await meeting.save();
    res.status(201).json(meeting);
  } catch (error) {
    console.error('Schedule meeting error:', error);
    res.status(500).json({ message: 'Server error scheduling meeting' });
  }
});

// @route   GET /api/meetings
// @desc    Get all meetings for the current user
router.get('/', auth, async (req, res) => {
  try {
    const meetings = await Meeting.find({
      $or: [
        { organizer: req.user.id },
        { invitee: req.user.id }
      ]
    })
    .populate('organizer', 'name email avatarUrl startupName')
    .populate('invitee', 'name email avatarUrl startupName')
    .sort({ startTime: 1 });

    res.json(meetings);
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ message: 'Server error retrieving meetings' });
  }
});

// @route   PUT /api/meetings/:id
// @desc    Accept/reject meeting invitation
router.put('/:id', auth, async (req, res) => {
  const { status } = req.body;
  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status update' });
  }

  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Check if the user is the invitee
    if (meeting.invitee.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized to update this meeting request' });
    }

    if (status === 'accepted') {
      // Re-verify conflicts at time of acceptance
      const conflict = await hasMeetingConflict(meeting.organizer, meeting.invitee, meeting.startTime, meeting.endTime);
      if (conflict) {
        return res.status(409).json({ 
          message: 'Conflict detected: A meeting has already been booked in this slot.',
          conflict 
        });
      }
    }

    meeting.status = status;
    await meeting.save();
    res.json(meeting);
  } catch (error) {
    console.error('Update meeting status error:', error);
    res.status(500).json({ message: 'Server error updating meeting' });
  }
});

export default router;
