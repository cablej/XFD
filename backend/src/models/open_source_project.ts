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
import { PackageURL } from 'packageurl-js';

@Entity()
@Index('IDX_PURL_UNIQUE', ['purl'], { unique: true })
@Index(['createdAt'])
@Index(['updatedAt'])
export class OpenSourceProject extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // TO-DO: add validation function to verify string is a valid purl
  @Column()
  purl: string;

  @Column({ nullable: true })
  parentRepo: string;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastScannedAt: Date;

  @Column({ type: 'int', default: 7 })
  scanFrequency: number;

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
    if (this.purl) {
      this.name = PackageURL.fromString(this.purl)['name'];
    }
  }
}
