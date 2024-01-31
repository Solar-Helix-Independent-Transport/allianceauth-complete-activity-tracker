/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/** EveName */
export interface EveName {
  /** Id */
  id: number;
  /** Name */
  name: string;
  /** Cat */
  cat?: string | null;
}

/** Character */
export interface Character {
  /** Character Name */
  character_name: string;
  /** Character Id */
  character_id: number;
  /** Corporation Id */
  corporation_id: number;
  /** Corporation Name */
  corporation_name: string;
  /** Alliance Id */
  alliance_id?: number | null;
  /** Alliance Name */
  alliance_name?: string | null;
}

/** Snapshot */
export interface Snapshot {
  /**
   * Time
   * @format date-time
   */
  time: string;
  /** Snapshot */
  snapshot: SnapshotCharacter[];
}

/** SnapshotCharacter */
export interface SnapshotCharacter {
  character: Character;
  main?: Character | null;
  system: EveName;
  ship: EveName;
  /** Role */
  role: string;
  /**
   * Join Time
   * @format date-time
   */
  join_time: string;
  /** Distance */
  distance: number;
}

/** FleetRoles */
export enum FleetRoles {
  FleetCommander = "fleet_commander",
  WingCommander = "wing_commander",
  SquadCommander = "squad_commander",
  SquadMember = "squad_member ",
}
