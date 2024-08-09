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
@Index(['url', 'name'], { unique: true })
@Index(['createdAt'])
@Index(['updatedAt'])
export class OpenSourceProject extends BaseEntity {
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

  @ManyToMany(
    () => Organization,
    (organization) => organization.openSourceProjects
  )
  organizations: Organization[];

  @BeforeInsert()
  setNameFromUrl() {
    if (this.url) {
      const match = this.url.match(/https:\/\/github.com\/(.+)/);
      if (match && match[1]) {
        this.name = match[1];
      }
    }
  }
}
