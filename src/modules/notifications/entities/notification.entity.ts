import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { NotificationSourceType, NotificationType } from '../enums/notification.enums';

@Entity('notifications')
@Index('UQ_notifications_operation_key', ['operationKey'], { unique: true })
@Index('UQ_notifications_application_event_id', ['applicationEventId'], { unique: true })
@Index('IX_notifications_source', ['sourceType', 'sourceId'])
export class NotificationEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier', name: 'application_event_id' })
  applicationEventId!: string;

  @Column({ type: 'varchar', length: 128, name: 'operation_key' })
  operationKey!: string;

  @Column({ type: 'varchar', length: 32, name: 'source_type' })
  sourceType!: NotificationSourceType;

  @Column({ type: 'uniqueidentifier', name: 'source_id' })
  sourceId!: string;

  @Column({ type: 'varchar', length: 64, name: 'notification_type' })
  notificationType!: NotificationType;

  @Column({ type: 'nvarchar', length: 200 })
  title!: string;

  @Column({ type: 'nvarchar', length: 500 })
  snippet!: string;

  @Column({ type: 'nvarchar', length: 500, name: 'action_url' })
  actionUrl!: string;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;
}
