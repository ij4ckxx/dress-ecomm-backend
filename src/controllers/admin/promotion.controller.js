import {
  getPromotionsService,
  getPromotionByIdService,
  createPromotionService,
  updatePromotionService,
  togglePromotionStatusService,
  deletePromotionService,
} from '../../services/admin/promotion.service.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

export const getPromotions = async (req, res, next) => {
  try {
    const result = await getPromotionsService({ query: req.query });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Promotions fetched successfully',
      data: result.promotions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getPromotionById = async (req, res, next) => {
  try {
    const promo = await getPromotionByIdService(req.params.id);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Promotion details fetched successfully',
      data: promo,
    });
  } catch (error) {
    next(error);
  }
};

export const createPromotion = async (req, res, next) => {
  try {
    const hasFile = Boolean(req.file);
    const hasUrl = Boolean(
      req.body.backgroundImage &&
      typeof req.body.backgroundImage === 'string' &&
      req.body.backgroundImage.trim() !== ''
    );

    if (hasFile && hasUrl) {
      return sendError(res, {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Conflicting image input: Please provide either an image file upload OR a backgroundImage URL, not both.',
        error: {
          code: 'IMAGE_INPUT_CONFLICT',
          details: [
            {
              field: 'backgroundImage',
              message: 'Cannot accept both an image file upload and backgroundImage URL simultaneously.',
            },
          ],
        },
      });
    }

    const promo = await createPromotionService({
      promoData: req.body,
      file: req.file,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: `Promotion '${promo.title}' created successfully`,
      data: promo,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePromotion = async (req, res, next) => {
  try {
    const hasFile = Boolean(req.file);
    const hasUrl = Boolean(
      req.body.backgroundImage &&
      typeof req.body.backgroundImage === 'string' &&
      req.body.backgroundImage.trim() !== ''
    );

    if (hasFile && hasUrl) {
      return sendError(res, {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Conflicting image input: Please provide either an image file upload OR a backgroundImage URL, not both.',
        error: {
          code: 'IMAGE_INPUT_CONFLICT',
          details: [
            {
              field: 'backgroundImage',
              message: 'Cannot accept both an image file upload and backgroundImage URL simultaneously.',
            },
          ],
        },
      });
    }

    const updated = await updatePromotionService({
      promoId: req.params.id,
      promoData: req.body,
      file: req.file,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: `Promotion '${updated.title}' updated successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const togglePromotionStatus = async (req, res, next) => {
  try {
    const updated = await togglePromotionStatusService({
      promoId: req.params.id,
      isActive: req.body.isActive,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: `Promotion status set to ${updated.isActive ? 'Active' : 'Inactive'}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePromotion = async (req, res, next) => {
  try {
    const result = await deletePromotionService(req.params.id);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
