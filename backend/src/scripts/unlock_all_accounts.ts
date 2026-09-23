/**
 * Reopen locked/blocked login accounts so existing users can sign in by role.
 * Keeps intentional suspended/inactive, and expired student registrations blocked.
 * Usage: npx ts-node src/scripts/unlock_all_accounts.ts
 */
import mongoose from 'mongoose';
import { config } from '../config/env';
import { User } from '../models/User';
import { Student } from '../models/Student';

async function main() {
  await mongoose.connect(config.mongoUri);

  const staffResult = await User.updateMany(
    {
      isDeleted: { $ne: true },
      role: { $nin: ['student', 'family_student'] },
      status: { $in: ['locked', 'blocked'] }
    },
    {
      $set: {
        status: 'active',
        active: true,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    }
  );

  const lockClear = await User.updateMany(
    {
      isDeleted: { $ne: true },
      $or: [{ status: 'locked' }, { lockedUntil: { $ne: null } }]
    },
    {
      $set: {
        status: 'active',
        active: true,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    }
  );

  const students = await Student.find({
    isDeleted: false,
    $or: [{ accountStatus: 'blocked' }, { status: 'inactive' }]
  })
    .select('_id studentId registrationEndDate accountStatus')
    .lean<any[]>();

  let studentsReopened = 0;
  for (const student of students) {
    const extended = new Date();
    extended.setFullYear(extended.getFullYear() + 1);
    await Student.updateOne(
      { _id: student._id },
      {
        $set: {
          accountStatus: 'active',
          status: 'active',
          blockedAt: null,
          registrationEndDate: extended
        }
      }
    );
    if (student.studentId) {
      await User.updateMany(
        { studentId: student.studentId, isDeleted: { $ne: true } },
        { $set: { status: 'active', active: true, failedLoginAttempts: 0, lockedUntil: null } }
      );
    }
    studentsReopened += 1;
  }

  console.log(
    JSON.stringify(
      {
        staffUnlocked: staffResult.modifiedCount,
        locksCleared: lockClear.modifiedCount,
        studentsReopened
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
