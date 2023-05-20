/**
 * Data helper classes for uploading.
 *
 * Custom types are used to stay bound to the underlying format provided
 * by meter-core while modifying (or removing) information.
 */
import log from "electron-log";
import * as Data from "meter-core/logger/data";
import { BossNotDeadException, MissingGearScoreException, NoBossEntityException, NoLocalPlayerException, UploaderException } from "./exceptions";

//#region Custom types

export type Entity = Omit<
  Data.EntityState,
  | "name"
  | "skills"
  | "hits"
  | "damageDealtDebuffedBy"
  | "damageDealtBuffedBy"
  | "damagePreventedWithShieldOnOthersBy"
  | "damagePreventedByShieldBy"
  | "shieldDoneBy"
  | "shieldReceivedBy"
> & {
  name?: string;
  skills: CustomSkill[];
  hits: Hits;
  damageDealtDebuffedBy: { [key: number]: number };
  damageDealtBuffedBy: { [key: number]: number };
  damagePreventedWithShieldOnOthersBy: { [key: number]: number };
  damagePreventedByShieldBy: { [key: number]: number };
  shieldDoneBy: { [key: number]: number };
  shieldReceivedBy: { [key: number]: number };
  isLocalPlayer: boolean;
};

export type Skill = Omit<
  Data.EntitySkills,
  "hits" | "damageDealtDebuffedBy" | "damageDealtBuffedBy" | "name"
> & {
  hits: Hits;
  damageDealtDebuffedBy: { [key: number]: number };
  damageDealtBuffedBy: { [key: number]: number };
};

export type Hits = Omit<Data.Hits, "hitsBuffedBy" | "hitsDebuffedBy"> & {
  hitsBuffedBy: { [key: number]: number };
  hitsDebuffedBy: { [key: number]: number };
};

export type DamageStatistics = Omit<
  Data.DamageStatistics,
  | "totalDamageDealt" // Don't keep, calculate ourselves later
  | "topDamageDealt" // Don't keep, calculate ourselves later
  | "debuffs"
  | "buffs"
  | "effectiveShieldingBuffs"
  | "appliedShieldingBuffs"
> & {
  debuffs: { [key: number]: StatusEffect };
  buffs: { [key: number]: StatusEffect };
  effectiveShieldingBuffs: { [key: number]: StatusEffect };
  appliedShieldingBuffs: { [key: number]: StatusEffect };
};

export type StatusEffect = Omit<Data.StatusEffect, "source"> & {
  source: StatusEffectSource;
};

export type StatusEffectSource = Omit<
  Data.StatusEffectSource,
  "name" | "desc" | "skill"
> & {
  skill?: EffectSkill;
};

export type EffectSkill = {
  id: number;
  classid: number;
  icon: string;
  summonids?: number[];
  summonsourceskill?: number;
  sourceskill?: number;
};

//#endregion

//#region Custom Classes

/**
 * The initially received {@link Data.GameState} is converted to remove some
 * unnecessary data and to convert {@link Map} objects prior to stringify.
 *
 * The removed data is mostly string game data (names, descriptions, etc.), which the
 * frontend is tasked with applying based on its own localization files (from meter-data).
 *
 * Primarily done to slim down the data sent and save bandwidth/storage costs.
 */
export class Upload {
  startedOn: number;
  lastCombatPacket: number;
  fightStartedOn: number;
  localPlayer: string; // Id of the local player, originally the name
  currentBoss: string; // Id of the current boss
  entities: CustomEntity[];
  damageStatistics: CustomDamageStatistics;

  constructor(state: Data.GameState) {
    if (!state.currentBoss) throw new NoBossEntityException();

    // Sometimes the boss is not present in entities, but is being tracked as
    // the current boss, so we need to add it to the entities list for handling
    // to properly pick it up.
    const inEntities = state.entities.get(state.currentBoss.name);
    if (!inEntities) state.entities.set(state.currentBoss.name, state.currentBoss);

    this.currentBoss = state.currentBoss.id;
    this.startedOn = state.startedOn;
    this.lastCombatPacket = state.lastCombatPacket;
    this.fightStartedOn = state.fightStartedOn;
    this.localPlayer = state.localPlayer;
    this.entities = this.handleEntities(state.entities); // Remove garbage entities
    this.damageStatistics = new CustomDamageStatistics(state.damageStatistics);
  }

  isTypedEntity(entity: Data.EntityState): boolean {
    return entity.isBoss || entity.isPlayer || (entity.isEsther ?? false);
  }

  getType(entity: Data.EntityState): string {
    if (entity.isBoss) return "boss";
    if (entity.isPlayer) return "player";
    if (entity.isEsther) return "esther";
    return "unknown";
  }

  handleEntities(entities: Map<string, Data.EntityState>): CustomEntity[] {
    let bosses = 0;
    const handled: CustomEntity[] = [];
    for (const [, value] of entities) {
      if (!this.isTypedEntity(value)) {
        log.debug("Skipping entity", value.name, value.id, this.getType(value))
        continue;
      }
      if (value.id === this.currentBoss && value.currentHp > 0) throw new BossNotDeadException();
      if (value.isPlayer && value.gearScore === 0) throw new MissingGearScoreException();
      if (value.isBoss) bosses++;

      handled.push(new CustomEntity(value, value.name === this.localPlayer));
      log.debug("Handled entity", value.name ?? value.npcId, value.id, this.getType(value))
    }
    if (bosses === 0) throw new NoBossEntityException();

    const handledLocalPlayer = handled.find((e) => e.isLocalPlayer);
    if (!handledLocalPlayer) throw new NoLocalPlayerException();

    return handled;
  }
}

export class CustomEntity implements Entity {
  isLocalPlayer: boolean;
  lastUpdate: number;
  id: string;
  npcId: number;
  name?: string;
  classId: number;
  partyId?: string;
  isBoss: boolean;
  isPlayer: boolean;
  isEsther: boolean;
  icon?: string;
  isDead: boolean;
  deaths: number;
  deathTime: number;
  gearScore: number;
  currentHp: number;
  maxHp: number;
  damageDealt: number;
  damageDealtDebuffedBySupport: number;
  damageDealtBuffedBySupport: number;
  healingDone: number;
  shieldDone: number;
  damageTaken: number;
  shieldReceived: number;
  damagePreventedWithShieldOnOthers: number;
  damagePreventedByShield: number;
  skills: CustomSkill[];
  hits: Hits;
  damageDealtDebuffedBy: { [key: number]: number };
  damageDealtBuffedBy: { [key: number]: number };
  damagePreventedWithShieldOnOthersBy: { [key: number]: number };
  damagePreventedByShieldBy: { [key: number]: number };
  shieldDoneBy: { [key: number]: number };
  shieldReceivedBy: { [key: number]: number };

  constructor(entity: Data.EntityState, isLocalPlayer: boolean) {
    this.isLocalPlayer = isLocalPlayer;
    this.lastUpdate = entity.lastUpdate;
    this.id = entity.id;
    this.npcId = entity.npcId;
    if (entity.isPlayer) this.name = entity.name; // Don't need non-player names
    this.classId = entity.classId;
    this.partyId = entity.partyId;
    this.isBoss = entity.isBoss;
    this.isPlayer = entity.isPlayer;
    this.isEsther = entity.isEsther ?? false;
    if (entity.icon && entity.icon !== "") this.icon = entity.icon;
    this.isDead = entity.isDead;
    this.deaths = entity.deaths;
    this.deathTime = entity.deathTime;
    this.gearScore = entity.gearScore;
    this.currentHp = entity.currentHp;
    this.maxHp = entity.maxHp;
    this.damageDealt = entity.damageDealt;
    this.damageDealtDebuffedBySupport = entity.damageDealtDebuffedBySupport;
    this.damageDealtBuffedBySupport = entity.damageDealtBuffedBySupport;
    this.healingDone = entity.healingDone;
    this.shieldDone = entity.shieldDone;
    this.damageTaken = entity.damageTaken;
    this.shieldReceived = entity.shieldReceived;
    this.damagePreventedWithShieldOnOthers =
      entity.damagePreventedWithShieldOnOthers;
    this.damagePreventedByShield = entity.damagePreventedByShield;

    // TODO: Remove skills from non-players?
    this.skills = Array.from(entity.skills.values()).map(
      (skill) => new CustomSkill(skill)
    );
    this.hits = new CustomHits(entity.hits);
    this.damageDealtDebuffedBy = Object.fromEntries(
      entity.damageDealtDebuffedBy
    );
    this.damageDealtBuffedBy = Object.fromEntries(entity.damageDealtBuffedBy);
    this.damagePreventedWithShieldOnOthersBy = Object.fromEntries(
      entity.damagePreventedWithShieldOnOthersBy
    );
    this.damagePreventedByShieldBy = Object.fromEntries(
      entity.damagePreventedByShieldBy
    );
    this.shieldDoneBy = Object.fromEntries(entity.shieldDoneBy);
    this.shieldReceivedBy = Object.fromEntries(entity.shieldReceivedBy);
  }
}

export class CustomSkill implements Skill {
  id: number;
  icon: string | undefined;
  damageDealt: number;
  damageDealtDebuffedBySupport: number;
  damageDealtBuffedBySupport: number;
  maxDamage: number;
  hits: Hits;
  breakdown: Data.Breakdown[];
  damageDealtDebuffedBy: { [key: number]: number };
  damageDealtBuffedBy: { [key: number]: number };

  constructor(skill: Data.EntitySkills) {
    this.id = skill.id;
    this.icon = skill.icon;
    this.damageDealt = skill.damageDealt;
    this.damageDealtDebuffedBySupport = skill.damageDealtDebuffedBySupport;
    this.damageDealtBuffedBySupport = skill.damageDealtBuffedBySupport;
    this.maxDamage = skill.maxDamage;
    this.hits = new CustomHits(skill.hits);
    this.breakdown = skill.breakdown;
    this.damageDealtDebuffedBy = Object.fromEntries(
      skill.damageDealtDebuffedBy
    );
    this.damageDealtBuffedBy = Object.fromEntries(skill.damageDealtBuffedBy);
  }

  reassignBreakdownTarget(previous: string, updated: string) {
    this.breakdown.forEach((b) => {
      if (b.targetEntity === previous) {
        b.targetEntity = updated;
      }
    });
  }
}

export class CustomHits implements Hits {
  casts: number;
  total: number;
  crit: number;
  backAttack: number;
  totalBackAttack: number;
  frontAttack: number;
  totalFrontAttack: number;
  counter: number;
  hitsDebuffedBySupport: number;
  hitsBuffedBySupport: number;
  hitsBuffedBy: { [key: number]: number };
  hitsDebuffedBy: { [key: number]: number };

  constructor(hits: Data.Hits) {
    this.casts = hits.casts;
    this.total = hits.total;
    this.crit = hits.crit;
    this.backAttack = hits.backAttack;
    this.totalBackAttack = hits.totalBackAttack;
    this.frontAttack = hits.frontAttack;
    this.totalFrontAttack = hits.totalFrontAttack;
    this.counter = hits.counter;
    this.hitsDebuffedBySupport = hits.hitsDebuffedBySupport;
    this.hitsBuffedBySupport = hits.hitsBuffedBySupport;
    this.hitsBuffedBy = Object.fromEntries(hits.hitsBuffedBy);
    this.hitsDebuffedBy = Object.fromEntries(hits.hitsDebuffedBy);
  }
}

export class CustomDamageStatistics implements DamageStatistics {
  totalDamageDealt: number;
  topDamageDealt: number;
  totalDamageTaken: number;
  topDamageTaken: number;
  totalHealingDone: number;
  topHealingDone: number;
  totalShieldDone: number;
  topShieldDone: number;
  debuffs: CustomStatusEffect[];
  buffs: CustomStatusEffect[];
  topShieldGotten: number;
  totalEffectiveShieldingDone: number;
  topEffectiveShieldingDone: number;
  topEffectiveShieldingUsed: number;
  effectiveShieldingBuffs: CustomStatusEffect[];
  appliedShieldingBuffs: CustomStatusEffect[];

  constructor(damageStatistics: Data.DamageStatistics) {
    this.totalDamageDealt = damageStatistics.totalDamageDealt;
    this.topDamageDealt = damageStatistics.topDamageDealt;
    this.totalDamageTaken = damageStatistics.totalDamageTaken;
    this.topDamageTaken = damageStatistics.topDamageTaken;
    this.totalHealingDone = damageStatistics.totalHealingDone;
    this.topHealingDone = damageStatistics.topHealingDone;
    this.totalShieldDone = damageStatistics.totalShieldDone;
    this.topShieldDone = damageStatistics.topShieldDone;

    this.debuffs = [];
    damageStatistics.debuffs.forEach((value, key) =>
      this.debuffs.push(new CustomStatusEffect(key, value))
    );

    this.buffs = [];
    damageStatistics.buffs.forEach((value, key) =>
      this.buffs.push(new CustomStatusEffect(key, value))
    );

    this.topShieldGotten = damageStatistics.topShieldGotten;
    this.totalEffectiveShieldingDone =
      damageStatistics.totalEffectiveShieldingDone;
    this.topEffectiveShieldingDone = damageStatistics.topEffectiveShieldingDone;
    this.topEffectiveShieldingUsed = damageStatistics.topEffectiveShieldingUsed;

    this.effectiveShieldingBuffs = [];
    damageStatistics.effectiveShieldingBuffs.forEach((value, key) =>
      this.effectiveShieldingBuffs.push(new CustomStatusEffect(key, value))
    );

    this.appliedShieldingBuffs = [];
    damageStatistics.appliedShieldingBuffs.forEach((value, key) =>
      this.appliedShieldingBuffs.push(new CustomStatusEffect(key, value))
    );
  }
}

export class CustomStatusEffect implements StatusEffect {
  id: number;
  target: Data.StatusEffectTarget;
  category: "buff" | "debuff";
  buffcategory: string;
  bufftype: Data.StatusEffectBuffTypeFlags;
  uniquegroup: number;
  source: StatusEffectSource;

  constructor(id: number, statusEffect: Data.StatusEffect) {
    this.id = id;
    this.target = statusEffect.target;
    this.category = statusEffect.category;
    this.buffcategory = statusEffect.buffcategory;
    this.bufftype = statusEffect.bufftype;
    this.uniquegroup = statusEffect.uniquegroup;
    this.source = new CustomStatusEffectSource(statusEffect.source);
  }
}

export class CustomStatusEffectSource implements StatusEffectSource {
  icon: string;
  setname?: string;
  skill?: CustomEffectSkill;

  constructor(statusEffectSource: Data.StatusEffectSource) {
    this.icon = statusEffectSource.icon;
    this.setname = statusEffectSource.setname;
    if (statusEffectSource.skill)
      this.skill = new CustomEffectSkill(statusEffectSource.skill);
  }
}

export class CustomEffectSkill implements EffectSkill {
  id: number;
  classid: number;
  icon: string;
  summonids?: number[];
  summonsourceskill?: number;
  sourceskill?: number;

  constructor(effectSkill: EffectSkill) {
    this.id = effectSkill.id;
    this.classid = effectSkill.classid;
    this.icon = effectSkill.icon;
    this.summonids = effectSkill.summonids;
    this.summonsourceskill = effectSkill.summonsourceskill;
    this.sourceskill = effectSkill.sourceskill;
  }
}

//#endregion

//#region Uploader Helpers
export enum UploadStatus {
  SUCCESS = 0,
  IGNORED = 1,
  ERROR = 2,
}

export class UploadResult {
  code: UploadStatus;
  id?: string;
  error?: UploaderException;

  constructor(result: string | UploaderException) {
    if (result instanceof UploaderException) {
      this.code = result.notify ? UploadStatus.ERROR : UploadStatus.IGNORED;
      this.error = result
    } else {
      this.code = UploadStatus.SUCCESS;
      this.id = result;
    }
  }
}
//#endregion
