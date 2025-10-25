import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  MENTION = 'mention',
  FOLLOW = 'follow',
  GROUP_INVITE = 'group_invite',
  GROUP_REMOVAL = 'group_removal',
  CHAT_REMOVAL = 'chat_removal',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column('text')
  message: string;

  @Column({ nullable: true })
  fromUserId: string;

  @Column({ nullable: true })
  postId: string;

  @Column({ nullable: true })
  groupId: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;
}