import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';

@Entity('notification_recipients')
@Index('UQ_notification_recipients_notification_user', ['notificationId', 'recipientUserId'], {
  unique: true,
})
@Index('IX_notification_recipients_inbox', ['recipientUserId', 'isRead', 'createdAt'])
@Index('IX_notification_recipients_user_created', ['recipientUserId', 'createdAt'])
export class NotificationRecipientEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier', name: 'notification_id' })
  notificationId!: string;

  @Column({ type: 'uniqueidentifier', name: 'recipient_user_id' })
  recipientUserId!: string;

  @Column({ type: 'bit', name: 'is_read', default: false })
  isRead!: boolean;

  @Column({ type: 'datetime2', name: 'read_at', nullable: true })
  readAt!: Date | null;

  @Column({ type: 'bit', name: 'is_dismissed', default: false })
  isDismissed!: boolean;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updated_at' })
  updatedAt!: Date;
}
