import fs from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import { env } from "./env";
import type { Dataset, DateRecord, Person, Swipe } from "./types";

export interface Store {
  getPerson(id: string): Promise<Person | null>;
  savePerson(p: Person): Promise<void>;
  listPeople(): Promise<Person[]>;
  getDate(id: string): Promise<DateRecord | null>;
  saveDate(d: DateRecord): Promise<void>;
  listDates(): Promise<DateRecord[]>;
  listSwipes(): Promise<Swipe[]>;
  saveSwipes(s: Swipe[]): Promise<void>;
}

const swipeKey = (s: Swipe) => `${s.from}|${s.to}`;

export class FileStore implements Store {
  constructor(private dir: string) {
    fs.mkdirSync(path.join(dir, "people"), { recursive: true });
    fs.mkdirSync(path.join(dir, "dates"), { recursive: true });
  }
  private read<T>(file: string): T | null {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8")) as T;
    } catch {
      return null;
    }
  }
  async getPerson(id: string) {
    return this.read<Person>(path.join(this.dir, "people", `${id}.json`));
  }
  async savePerson(p: Person) {
    fs.writeFileSync(path.join(this.dir, "people", `${p.id}.json`), JSON.stringify(p));
  }
  async listPeople() {
    const d = path.join(this.dir, "people");
    return fs
      .readdirSync(d)
      .filter((f) => f.endsWith(".json"))
      .map((f) => this.read<Person>(path.join(d, f)))
      .filter((x): x is Person => !!x);
  }
  async getDate(id: string) {
    return this.read<DateRecord>(path.join(this.dir, "dates", `${id}.json`));
  }
  async saveDate(dr: DateRecord) {
    fs.writeFileSync(path.join(this.dir, "dates", `${dr.id}.json`), JSON.stringify(dr));
  }
  async listDates() {
    const d = path.join(this.dir, "dates");
    return fs
      .readdirSync(d)
      .filter((f) => f.endsWith(".json"))
      .map((f) => this.read<DateRecord>(path.join(d, f)))
      .filter((x): x is DateRecord => !!x);
  }
  async listSwipes() {
    const m = this.read<Record<string, Swipe>>(path.join(this.dir, "swipes.json")) ?? {};
    return Object.values(m);
  }
  async saveSwipes(list: Swipe[]) {
    const file = path.join(this.dir, "swipes.json");
    const m = this.read<Record<string, Swipe>>(file) ?? {};
    for (const s of list) m[swipeKey(s)] = s;
    fs.writeFileSync(file, JSON.stringify(m));
  }
}

export class RedisStore implements Store {
  private r: Redis;
  constructor(url: string, token: string) {
    this.r = new Redis({ url, token });
  }
  async getPerson(id: string) {
    return (await this.r.get<Person>(`wm:person:${id}`)) ?? null;
  }
  async savePerson(p: Person) {
    await this.r.set(`wm:person:${p.id}`, p);
    await this.r.sadd("wm:people", p.id);
  }
  async listPeople() {
    const ids = await this.r.smembers("wm:people");
    if (!ids.length) return [];
    const rows = await this.r.mget<(Person | null)[]>(...ids.map((i) => `wm:person:${i}`));
    return rows.filter((x): x is Person => !!x);
  }
  async getDate(id: string) {
    return (await this.r.get<DateRecord>(`wm:date:${id}`)) ?? null;
  }
  async saveDate(d: DateRecord) {
    await this.r.set(`wm:date:${d.id}`, d);
    await this.r.sadd("wm:dates", d.id);
  }
  async listDates() {
    const ids = await this.r.smembers("wm:dates");
    if (!ids.length) return [];
    const rows = await this.r.mget<(DateRecord | null)[]>(...ids.map((i) => `wm:date:${i}`));
    return rows.filter((x): x is DateRecord => !!x);
  }
  async listSwipes() {
    const m = (await this.r.hgetall<Record<string, Swipe>>("wm:swipes")) ?? {};
    return Object.values(m);
  }
  async saveSwipes(list: Swipe[]) {
    if (!list.length) return;
    const obj: Record<string, Swipe> = {};
    for (const s of list) obj[swipeKey(s)] = s;
    await this.r.hset("wm:swipes", obj);
  }
}

let _live: Store | null = null;
export function liveStore(): Store {
  if (_live) return _live;
  const url = env.redisUrl();
  const token = env.redisToken();
  if (url && token) _live = new RedisStore(url, token);
  else if (process.env.VERCEL) _live = new FileStore("/tmp/wm-live");
  else _live = new FileStore(path.join(process.cwd(), "data", "live"));
  return _live;
}

let _demo: Dataset | null = null;
export function loadDemo(): Dataset {
  if (_demo) return _demo;
  try {
    _demo = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "demo.json"), "utf8")) as Dataset;
  } catch {
    _demo = { people: [], swipes: [], dates: [] };
  }
  return _demo;
}

export type Pool = "demo" | "live";

export async function getPool(pool: Pool): Promise<Dataset> {
  const demo = loadDemo();
  if (pool === "demo") return demo;
  const s = liveStore();
  const [people, dates, swipes] = await Promise.all([s.listPeople(), s.listDates(), s.listSwipes()]);
  const pm = new Map(demo.people.map((p) => [p.id, p]));
  for (const p of people) pm.set(p.id, p);
  const dm = new Map(demo.dates.map((d) => [d.id, d]));
  for (const d of dates) dm.set(d.id, d);
  const sm = new Map(demo.swipes.map((x) => [swipeKey(x), x]));
  for (const x of swipes) sm.set(swipeKey(x), x);
  return { people: [...pm.values()], dates: [...dm.values()], swipes: [...sm.values()] };
}

export async function findPerson(id: string): Promise<Person | null> {
  const live = await liveStore().getPerson(id);
  if (live) return live;
  return loadDemo().people.find((p) => p.id === id) ?? null;
}

export async function findDate(id: string): Promise<DateRecord | null> {
  const live = await liveStore().getDate(id);
  if (live) return live;
  return loadDemo().dates.find((d) => d.id === id) ?? null;
}
