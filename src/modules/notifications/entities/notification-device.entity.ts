import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import {
  NotificationDevicePlatform,
  NotificationDeviceProvider,
} from '../enums/notification.enums';

@Entity('notification_devices')
@Index('UQ_notification_devices_token', ['token'], { unique: true })
@Index('IX_notification_devices_user_active', ['userId', 'isActive'])
export class NotificationDeviceEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 16 })
  platform!: NotificationDevicePlatform;

  @Column({ type: 'varchar', length: 16 })
  provider!: NotificationDeviceProvider;

  @Column({ type: 'varchar', length: 500 })
  token!: string;

  @Column({ type: 'bit', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 32, name: 'app_version', nullable: true })
  appVersion!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  locale!: string | null;

  @Column({ type: 'datetime2', name: 'last_seen_at' })
  lastSeenAt!: Date;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updated_at' })
  updatedAt!: Date;
}
