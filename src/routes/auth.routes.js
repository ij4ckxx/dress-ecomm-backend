import { Router } from 'express';
import { AuthController, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import {
  registerSchema,
  loginSchema,
  socialLoginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { uploadAvatarImage } from '../middlewares/upload.middleware.js';
import { validateImageExclusivity } from '../middlewares/imageExclusivity.js';

const router = Router();

// Public Authentication Endpoints (protected by IP rate limiter against brute-force attacks)
router.post(
  '/register',
  authLimiter,
  uploadAvatarImage,
  validateImageExclusivity({ fileFields: ['avatar', 'image'], urlField: 'avatarUrl', isMultiple: false }),
  validate(registerSchema),
  AuthController.register
);
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.post('/social-login', authLimiter, validate(socialLoginSchema), AuthController.socialLogin);
router.post('/logout', AuthController.logout);
router.post('/refresh', validate(refreshTokenSchema), AuthController.refreshToken);

// Password Recovery Flow
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

// Protected Verification Endpoint
router.get('/me', authenticate, AuthController.getMe);

export default router;
