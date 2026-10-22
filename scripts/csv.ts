import fs from "fs";
import { liSlug, igUsername } from "../lib/links";

export type Row = { name: string; linkedin: string; instagram: string; gender: string; slug: string; igUser: string };

export function readPeopleCsv(file: string): Row[] {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.trim());
  return lines.slice(1).map((l) => {
    const [name, linkedin, instagram, gender] = l.split(",").map((s) => s.trim());
    return { name, linkedin, instagram, gender: gender || "", slug: liSlug(linkedin)!, igUser: igUsername(instagram)! };
  });
}
