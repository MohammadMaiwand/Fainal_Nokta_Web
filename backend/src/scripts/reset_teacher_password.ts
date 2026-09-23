import mongoose from 'mongoose';
import { config } from '../config/env';
import { User } from '../models/User';
import { comparePassword, hashPassword, pushPasswordHistory } from '../utils/password';

async function main() {
  await mongoose.connect(config.mongoUri);

  const email = 'a22@gmail.com';
  const newPassword = '12345678';
  const user = await User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } }).select(
    '+password +passwordHistory.hash email role status active'
  );

  if (!user) {
    console.log(JSON.stringify({ ok: false, message: 'User not found' }, null, 2));
    await mongoose.disconnect();
    process.exit(1);
  }

  const hashed = await hashPassword(newPassword);
  user.password = hashed;
  user.passwordHistory = pushPasswordHistory(user.passwordHistory as any, hashed) as any;
  user.status = 'active';
  user.active = true;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null as any;
  user.mustChangePassword = false;
  await user.save();

  const reloaded = await User.findById(user._id).select('+password');
  const passwordOk = await comparePassword(newPassword, String(reloaded?.password || ''));

  console.log(
    JSON.stringify(
      {
        ok: true,
        email: user.email,
        role: user.role,
        status: user.status,
        active: user.active,
        passwordOk
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
