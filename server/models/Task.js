const mongoose = require('mongoose');

const taskSchema = mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['todo', 'doing', 'done'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium', 
    },
    dueDate: { type: Date },
    tags: [{ type: String }], 
    
   
    checklist: [
      {
        text: String,
        isDone: { type: Boolean, default: false }
      }
    ],

   
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        createdAt: { type: Date, default: Date.now }
      }
    ],

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    assignedTo: { 
       type: mongoose.Schema.Types.ObjectId, 
       ref: 'User' 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);