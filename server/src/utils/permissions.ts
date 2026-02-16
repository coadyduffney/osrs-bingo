import { EventDocument } from '../schemas/firestore.js';

/**
 * Check if a user is the event creator or an admin
 */
export function isEventCreatorOrAdmin(event: EventDocument, userId: string): boolean {
  return event.creatorId === userId || (event.adminUserIds || []).includes(userId);
}

/**
 * Check if a user is the event creator
 */
export function isEventCreator(event: EventDocument, userId: string): boolean {
  return event.creatorId === userId;
}
