import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';

@Entity('announcement_user_states')
@Index('UQ_announcement_user_states', ['announcementId', 'userId'], { unique: true })
@Index('IX_announcement_user_states_user', ['userId', 'readAt'])
export class AnnouncementUserStateEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier', name: 'announcement_id' })
  announcementId!: string;

  @Column({ type: 'uniqueidentifier', name: 'user_id' })
  userId!: string;

  @Column({ type: 'datetime2', name: 'first_seen_at', nullable: true })
  firstSeenAt!: Date | null;

  @Column({ type: 'datetime2', name: 'read_at', nullable: true })
  readAt!: Date | null;

  @Column({ type: 'datetime2', name: 'dismissed_at', nullable: true })
  dismissedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updated_at' })
  updatedAt!: Date;
}
