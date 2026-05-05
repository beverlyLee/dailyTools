import { Table, Column, PrimaryKey, AutoIncrement, Model } from "../../src";

@Table("posts")
export class Post extends Model {
  @PrimaryKey()
  @AutoIncrement()
  @Column({ type: "INTEGER", nullable: false })
  id!: number;

  @Column({ type: "TEXT", nullable: false })
  title!: string;

  @Column({ type: "TEXT" })
  content!: string;

  @Column({ type: "INTEGER", nullable: false })
  userId!: number;

  @Column({ type: "DATE" })
  createdAt!: Date;

  @Column({ type: "DATE" })
  updatedAt!: Date;
}
