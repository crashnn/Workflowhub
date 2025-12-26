const mongoose = require('mongoose');

const projectSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
   
    collaborators: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            role: { 
                type: String, 
                enum: ['editor', 'viewer'], 
                default: 'viewer' 
            }
        }
    ],
    
    inviteCode: { type: String, unique: true },
    dueDate: { type: Date },
    color: { type: String, default: 'blue' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);