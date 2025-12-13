const { mongoose } = require('./db');

const messageSchema = new mongoose.Schema({
  socket_id: { 
    type: String, 
    required: true,
    index: true 
  },
  message: { 
    type: String, 
    required: true,
    maxlength: 5000 // Prevent abuse
  },
  messageType: {
    type: String,
    enum: ['user', 'system', 'join', 'leave'],
    default: 'user'
  },
  roomId: {
    type: String,
    default: 'global',
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true // Index for sorting
  }
}, {
  timestamps: true, // Adds updatedAt automatically
  toJSON: {
    transform: function (doc, ret) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Compound index for efficient queries
messageSchema.index({ roomId: 1, createdAt: -1 });

// TTL index - auto-delete messages older than 30 days (optional)
// messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Virtual for formatted date
messageSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toISOString();
});

// Static method for fetching recent messages
messageSchema.statics.getRecentMessages = async function(roomId = 'global', limit = 50) {
  return this.find({ roomId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;