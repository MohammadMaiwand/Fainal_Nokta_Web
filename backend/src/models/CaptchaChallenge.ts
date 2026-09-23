import mongoose from 'mongoose';

const captchaChallengeSchema = new mongoose.Schema(
  {
    challengeId: { type: String, required: true, unique: true, index: true },
    answerHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, index: true },
    consumedAt: { type: Date, default: null, index: true },
    failedAttempts: { type: Number, default: 0 },
    ipAddress: { type: String, default: '', trim: true, index: true },
    userAgent: { type: String, default: '', trim: true }
  },
  {
    collection: 'captcha_challenges',
    timestamps: true,
    minimize: false,
    versionKey: false
  }
);

captchaChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CaptchaChallenge =
  mongoose.models.CaptchaChallenge ?? mongoose.model('CaptchaChallenge', captchaChallengeSchema);
