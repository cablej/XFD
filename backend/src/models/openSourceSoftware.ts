import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  BeforeInsert,
  Index
} from 'typeorm';
import { Organization } from './organization';

@Entity()
@Index(['url'], { unique: true })
@Index(['createdAt'])
@Index(['updatedAt'])
export class OpenSourceSoftware extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  url: string;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({
    type: 'jsonb',
    default: {}
  })
  hipcheckResults: object;

  @ManyToMany(() => Organization, (organization) => organization.openSourceSoftware)
  organizations: Organization[];

  @BeforeInsert()
  setNameFromUrl() {
    if (this.url) {
      const urlParts = this.url.split('/');
      this.name = urlParts[urlParts.length - 1];
    }
  }
}
  