import type { JwtAccessPayload } from '@restaurantos/types';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: JwtAccessPayload;
}
