import {z} from 'zod';
import {AppError} from '../domain/errors.ts';

const boundarySchema=z.strictObject({v:z.literal(1),at:z.iso.datetime({precision:6}).refine(value=>!value.startsWith('0000-')),id:z.uuid()});
type Boundary=z.infer<typeof boundarySchema>;
// Opaque position only. No actor, authorization, expiry or database-row lookup.
export function notificationCursor(boundary:Boundary):string{return Buffer.from(JSON.stringify(boundary)).toString('base64url')}
export function parseNotificationCursor(cursor:string):Boundary{
 try{
  if(cursor.length<1||cursor.length>256||!/^[A-Za-z0-9_-]+$/.test(cursor))throw Error();
  const bytes=Buffer.from(cursor,'base64url');if(bytes.toString('base64url')!==cursor)throw Error();
  return boundarySchema.parse(JSON.parse(bytes.toString('utf8')));
 }catch{throw new AppError('NOTIFICATION_CURSOR_INVALID',400)}
}
