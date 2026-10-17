import { Router } from 'express';
import { AuthController, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Public Authentication Endpoints
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/refresh', validate(refreshTokenSchema), AuthController.refreshToken);

// Password Recovery Flow
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

// Protected Verification Endpoint
router.get('/me', authenticate, AuthController.getMe);

export default router;
