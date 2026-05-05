import { Table, Column, PrimaryKey, AutoIncrement, Model } from "../../src";

@Table("users")
export class User extends Model {
  @PrimaryKey()
  @AutoIncrement()
  @Column({ type: "INTEGER", nullable: false })
  id!: number;

  @Column({ type: "TEXT", nullable: false })
  name!: string;

  @Column({ type: "TEXT", nullable: false })
  email!: string;

  @Column({ type: "INTEGER", nullable: true })
  age!: number;

  @Column({ type: "BOOLEAN", default: true })
  isActive!: boolean;

  @Column({ type: "DATE" })
  createdAt!: Date;

  @Column({ type: "DATE" })
  updatedAt!: Date;
}
