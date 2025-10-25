import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { Group } from '../../groups/entities/group.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column({ type: 'text', nullable: true })
  markdown: string;

  @Column({ type: 'simple-array', nullable: true })
  images: string[];

  @Column({ type: 'simple-array', nullable: true })
  taggedUserIds: string[];

  @Column({ default: false })
  isAnonymous: boolean;

  @Column({ type: 'jsonb', default: {} })
  reactions: Record<string, string[]>; // { emoji: [userId1, userId2] }

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column()
  authorId: string;

  @ManyToOne(() => Group, (group) => group.posts, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column({ nullable: true })
  groupId: string;

  @OneToMany(() => Comment, (comment) => comment.post, { cascade: true })
  comments: Comment[];

  @ManyToMany(() => User)
  @JoinTable({ name: 'post_shares' })
  sharedBy: User[];

  @ManyToMany(() => User)
  @JoinTable({ name: 'post_tagged_users' })
  taggedUsers: User[];
}