import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth';
import { createError, createResponse } from '../../helpers/response';
import { profileImageUpload, buildProfileImageUrl, normalizeStoredProfileImage } from '../../middlewares/profileImageUpload';
import { User } from '../../models/User';
import { resolveHttpStatus } from '../../utils/httpErrors';

const router = Router();

router.post(
  '/profile-image',
  authenticate,
  authorize(['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'parent', 'owner']),
  profileImageUpload.single('profileImage'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json(createError('Profile image file is required'));
      }

      const storedPath = normalizeStoredProfileImage(buildProfileImageUrl(req.file.filename, { signed: false }));
      const signedUrl = buildProfileImageUrl(req.file.filename);
      const targetUserId = String(req.body.userId || req.user?.userId || '');

      if (targetUserId && targetUserId !== req.user?.userId && !['super_admin', 'admin', 'branch_manager'].includes(String(req.user?.role))) {
        return res.status(403).json(createError('Forbidden'));
      }

      if (targetUserId) {
        if (req.user?.canonicalRole === 'branch_manager' && req.user.branchId) {
          const targetUser = await User.findById(targetUserId).select('branchId').lean<Record<string, any>>();
          if (!targetUser || String(targetUser.branchId ?? '') !== String(req.user.branchId)) {
            return res.status(403).json(createError('Branch access denied'));
          }
        }
        await User.findByIdAndUpdate(targetUserId, { profileImage: storedPath });
      }

      return res.status(201).json(createResponse({ profileImage: signedUrl }, 'Profile image uploaded'));
    } catch (error) {
      return res.status(resolveHttpStatus(error)).json(createError(error instanceof Error ? error.message : 'Profile image upload failed'));
    }
  }
);

export const uploadsRouter = router;
