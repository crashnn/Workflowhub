const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Kime?
    message: { type: String, required: true }, // Ne oldu?
    type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    read: { type: Boolean, default: false }, // Okundu mu?
    link: { type: String } // Tıklayınca nereye gitsin?
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);