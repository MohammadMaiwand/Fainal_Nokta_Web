import mongoose from 'mongoose';
import { config } from '../config/env';
import { Role } from '../models/Role';

async function main() {
  await mongoose.connect(config.mongoUri);
  const role = await Role.findOneAndUpdate(
    { slug: 'student', isDeleted: false },
    { $addToSet: { permissionKeys: 'RESOURCE_VIEW' } },
    { new: true }
  );
  console.log(
    JSON.stringify(
      {
        updated: Boolean(role),
        hasResourceView: Boolean(role?.permissionKeys?.includes('RESOURCE_VIEW'))
      },
      null,
      2
    )
  );
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
