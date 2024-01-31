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
import { Character, EveName, Snapshot } from "./data-contracts";
import { HttpClient, RequestParams } from "./http-client";

export class Cat<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags Search
   * @name AacatApiSystemSearch
   * @summary System Search
   * @request POST:/cat/api/search/system/
   * @secure
   */
  aacatApiSystemSearch = (
    query: {
      /** Search Text */
      search_text: string;
      /**
       * Limit
       * @default 10
       */
      limit?: number;
    },
    params: RequestParams = {}
  ) =>
    this.request<EveName[], any>({
      path: `/cat/api/search/system/`,
      method: "POST",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Search
   * @name AacatApiConstellationSearch
   * @summary Constellation Search
   * @request POST:/cat/api/search/constellation/
   * @secure
   */
  aacatApiConstellationSearch = (
    query: {
      /** Search Text */
      search_text: string;
      /**
       * Limit
       * @default 10
       */
      limit?: number;
    },
    params: RequestParams = {}
  ) =>
    this.request<EveName[], any>({
      path: `/cat/api/search/constellation/`,
      method: "POST",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Search
   * @name AacatApiRegionSearch
   * @summary Region Search
   * @request POST:/cat/api/search/region/
   * @secure
   */
  aacatApiRegionSearch = (
    query: {
      /** Search Text */
      search_text: string;
      /**
       * Limit
       * @default 10
       */
      limit?: number;
    },
    params: RequestParams = {}
  ) =>
    this.request<EveName[], any>({
      path: `/cat/api/search/region/`,
      method: "POST",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Search
   * @name AacatApiGroupSearch
   * @summary Group Search
   * @request POST:/cat/api/search/auth/group/
   * @secure
   */
  aacatApiGroupSearch = (
    query: {
      /** Search Text */
      search_text: string;
      /**
       * Limit
       * @default 10
       */
      limit?: number;
    },
    params: RequestParams = {}
  ) =>
    this.request<any[], any>({
      path: `/cat/api/search/auth/group/`,
      method: "POST",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Search
   * @name AacatApiCharacterSearch
   * @summary Character Search
   * @request POST:/cat/api/search/auth/character/
   * @secure
   */
  aacatApiCharacterSearch = (
    query: {
      /** Search Text */
      search_text: string;
      /**
       * Limit
       * @default 10
       */
      limit?: number;
    },
    params: RequestParams = {}
  ) =>
    this.request<Character[], any>({
      path: `/cat/api/search/auth/character/`,
      method: "POST",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Track any fleeets currently being run by the logged in user.
   *
   * @tags Tracking
   * @name AacatApiTrackMe
   * @summary Track Me
   * @request POST:/cat/api/fleets/track
   * @secure
   */
  aacatApiTrackMe = (params: RequestParams = {}) =>
    this.request<Character[], string>({
      path: `/cat/api/fleets/track`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Track the fleet being run by the character_id, if they are in a fleet.
   *
   * @tags Tracking
   * @name AacatApiTrackCharacter
   * @summary Track Character
   * @request POST:/cat/api/fleets/{character_id}/track
   * @secure
   */
  aacatApiTrackCharacter = (characterId: number, params: RequestParams = {}) =>
    this.request<Character, string>({
      path: `/cat/api/fleets/${characterId}/track`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Stop Tracking a fleet.
   *
   * @tags Tracking
   * @name AacatApiEndFleet
   * @summary End Fleet
   * @request POST:/cat/api/fleets/{fleet_id}/end
   * @secure
   */
  aacatApiEndFleet = (fleetId: number, params: RequestParams = {}) =>
    this.request<any[], string>({
      path: `/cat/api/fleets/${fleetId}/end`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Restart any fleet tasks that may have failed.
   *
   * @tags Tracking
   * @name AacatApiRestartFleetTasks
   * @summary Restart Fleet Tasks
   * @request POST:/cat/api/fleets/{fleet_id}/restart
   * @secure
   */
  aacatApiRestartFleetTasks = (fleetId: number, params: RequestParams = {}) =>
    this.request<any[], string>({
      path: `/cat/api/fleets/${fleetId}/restart`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Show all actively tracked fleets
   *
   * @tags Stats
   * @name AacatApiGetFleetsActive
   * @summary Get Fleets Active
   * @request GET:/cat/api/fleets/active/
   * @secure
   */
  aacatApiGetFleetsActive = (
    query?: {
      /**
       * Limit
       * @default 50
       */
      limit?: number;
    },
    params: RequestParams = {}
  ) =>
    this.request<any[], any>({
      path: `/cat/api/fleets/active/`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Show a list of previously tracked fleets
   *
   * @tags Stats
   * @name AacatApiGetFleetsRecent
   * @summary Get Fleets Recent
   * @request GET:/cat/api/fleets/recent/
   * @secure
   */
  aacatApiGetFleetsRecent = (
    query?: {
      /**
       * Days Look Back
       * @default 14
       */
      days_look_back?: number;
    },
    params: RequestParams = {}
  ) =>
    this.request<any[], any>({
      path: `/cat/api/fleets/recent/`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Provide teh most recent snapshot of a fleet
   *
   * @tags Stats
   * @name AacatApiGetFleetRecentSnapshot
   * @summary Get Fleet Recent Snapshot
   * @request GET:/cat/api/fleets/{fleet_id}/snapshot
   * @secure
   */
  aacatApiGetFleetRecentSnapshot = (fleetId: number, params: RequestParams = {}) =>
    this.request<Snapshot, any>({
      path: `/cat/api/fleets/${fleetId}/snapshot`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Provide the most recent snapshot of a fleet grouped by ship types etc.
   *
   * @tags Stats
   * @name AacatApiGetFleetStats
   * @summary Get Fleet Stats
   * @request GET:/cat/api/fleets/{fleet_id}/stats
   * @secure
   */
  aacatApiGetFleetStats = (fleetId: number, params: RequestParams = {}) =>
    this.request<any[], any>({
      path: `/cat/api/fleets/${fleetId}/stats`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Provide the rolling changes of a fleets comp in the time period
   *
   * @tags Stats
   * @name AacatApiGetFleetTimeDiff
   * @summary Get Fleet Time Diff
   * @request GET:/cat/api/fleets/{fleet_id}/time_diff/{minutes}
   * @secure
   */
  aacatApiGetFleetTimeDiff = (fleetId: number, minutes: number, params: RequestParams = {}) =>
    this.request<any[], any>({
      path: `/cat/api/fleets/${fleetId}/time_diff/${minutes}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Provide the rolling changes of a fleets members in the time period
   *
   * @tags Stats
   * @name AacatApiGetFleetTimeDiffMains
   * @summary Get Fleet Time Diff Mains
   * @request GET:/cat/api/fleets/{fleet_id}/time_diff/{minutes}/mains
   * @secure
   */
  aacatApiGetFleetTimeDiffMains = (fleetId: number, minutes: number, params: RequestParams = {}) =>
    this.request<object, any>({
      path: `/cat/api/fleets/${fleetId}/time_diff/${minutes}/mains`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Provide an overview of fleet members who have left/joined late
   *
   * @tags Stats
   * @name AacatApiGetFleetCharacterChanges
   * @summary Get Fleet Character Changes
   * @request GET:/cat/api/fleets/{fleet_id}/character_changes
   * @secure
   */
  aacatApiGetFleetCharacterChanges = (fleetId: number, params: RequestParams = {}) =>
    this.request<object, any>({
      path: `/cat/api/fleets/${fleetId}/character_changes`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Get the fleet id a character is in.
   *
   * @tags Search
   * @name AacatApiGetFleetIdFromCharacterId
   * @summary Get Fleet Id From Character Id
   * @request GET:/cat/api/fleets/{character_id}/fleet_id
   * @secure
   */
  aacatApiGetFleetIdFromCharacterId = (characterId: number, params: RequestParams = {}) =>
    this.request<number, string>({
      path: `/cat/api/fleets/${characterId}/fleet_id`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Get the fleet settigns and MOTD
   *
   * @tags Actions
   * @name AacatApiGetFleetDetails
   * @summary Get Fleet Details
   * @request GET:/cat/api/fleets/{fleet_id}/details
   * @secure
   */
  aacatApiGetFleetDetails = (fleetId: number, params: RequestParams = {}) =>
    this.request<object, string>({
      path: `/cat/api/fleets/${fleetId}/details`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Update fleet Free move and MOTD
   *
   * @tags Actions
   * @name AacatApiPutFleetDetails
   * @summary Put Fleet Details
   * @request PUT:/cat/api/fleets/{fleet_id}/details
   * @secure
   */
  aacatApiPutFleetDetails = (
    fleetId: number,
    query?: {
      /** Free Move */
      free_move?: boolean;
      /** Motd */
      motd?: string;
    },
    params: RequestParams = {}
  ) =>
    this.request<object, string>({
      path: `/cat/api/fleets/${fleetId}/details`,
      method: "PUT",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Kick character from fleet
   *
   * @tags Actions
   * @name AacatApiKickFleetMember
   * @summary Kick Fleet Member
   * @request DELETE:/cat/api/fleets/{fleet_id}/kick/{character_id}
   * @secure
   */
  aacatApiKickFleetMember = (fleetId: number, characterId: number, params: RequestParams = {}) =>
    this.request<string, string>({
      path: `/cat/api/fleets/${fleetId}/kick/${characterId}`,
      method: "DELETE",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Invite a character to fleet
   *
   * @tags Actions
   * @name AacatApiInviteFleetMember
   * @summary Invite Fleet Member
   * @request POST:/cat/api/fleets/{fleet_id}/invite/{character_id}
   * @secure
   */
  aacatApiInviteFleetMember = (fleetId: number, characterId: number, params: RequestParams = {}) =>
    this.request<string, string>({
      path: `/cat/api/fleets/${fleetId}/invite/${characterId}`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Move a character in fleet If a character is moved to the `fleet_commander` role, **neither** `wing_id` or `squad_id` should be specified. If a character is moved to the `wing_commander` role, **only** `wing_id` should be specified. If a character is moved to the `squad_commander` role, **both** `wing_id` and `squad_id` should be specified. If a character is moved to the `squad_member` role, **both** `wing_id` and `squad_id` should be specified.
   *
   * @tags Actions
   * @name AacatApiMoveFleetMember
   * @summary Move Fleet Member
   * @request PUT:/cat/api/fleets/{fleet_id}/move/{character_id}
   * @secure
   */
  aacatApiMoveFleetMember = (
    fleetId: number,
    characterId: number,
    query: {
      /** FleetRoles */
      role: "fleet_commander" | "wing_commander" | "squad_commander" | "squad_member ";
      /** Squad Id */
      squad_id?: number;
      /** Wing Id */
      wing_id?: number;
    },
    params: RequestParams = {}
  ) =>
    this.request<string, string>({
      path: `/cat/api/fleets/${fleetId}/move/${characterId}`,
      method: "PUT",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Get the fleet hierarchy
   *
   * @tags Structure
   * @name AacatApiGetFleetStructure
   * @summary Get Fleet Structure
   * @request GET:/cat/api/fleets/{fleet_id}/structure
   * @secure
   */
  aacatApiGetFleetStructure = (fleetId: number, params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/cat/api/fleets/${fleetId}/structure`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * @description Create a wing in a fleet
   *
   * @tags Structure
   * @name AacatApiCreateWing
   * @summary Create Wing
   * @request POST:/cat/api/fleets/{fleet_id}/wing
   * @secure
   */
  aacatApiCreateWing = (fleetId: number, params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/cat/api/fleets/${fleetId}/wing`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * @description Delete a Wing in a fleet
   *
   * @tags Structure
   * @name AacatApiDeleteWing
   * @summary Delete Wing
   * @request DELETE:/cat/api/fleets/{fleet_id}/wing/{wing_id}
   * @secure
   */
  aacatApiDeleteWing = (fleetId: number, wingId: number, params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/cat/api/fleets/${fleetId}/wing/${wingId}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * @description Rename a Wing in a fleet
   *
   * @tags Structure
   * @name AacatApiRenameWing
   * @summary Rename Wing
   * @request PUT:/cat/api/fleets/{fleet_id}/wing/{wing_id}
   * @secure
   */
  aacatApiRenameWing = (
    fleetId: number,
    wingId: number,
    query: {
      /** Name */
      name: string;
    },
    params: RequestParams = {}
  ) =>
    this.request<void, any>({
      path: `/cat/api/fleets/${fleetId}/wing/${wingId}`,
      method: "PUT",
      query: query,
      secure: true,
      ...params,
    });
  /**
   * @description Create a wing in a fleet
   *
   * @tags Structure
   * @name AacatApiCreateSquad
   * @summary Create Squad
   * @request POST:/cat/api/fleets/{fleet_id}/wing/{wing_id}/squad
   * @secure
   */
  aacatApiCreateSquad = (fleetId: number, wingId: number, params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/cat/api/fleets/${fleetId}/wing/${wingId}/squad`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * @description Delete a Squad in a fleet
   *
   * @tags Structure
   * @name AacatApiDeleteSquad
   * @summary Delete Squad
   * @request DELETE:/cat/api/fleets/{fleet_id}/squad/{squad_id}
   * @secure
   */
  aacatApiDeleteSquad = (fleetId: number, squadId: number, params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/cat/api/fleets/${fleetId}/squad/${squadId}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * @description Rename a Wing in a fleet
   *
   * @tags Structure
   * @name AacatApiRenameSquad
   * @summary Rename Squad
   * @request PUT:/cat/api/fleets/{fleet_id}/squad/{squad_id}
   * @secure
   */
  aacatApiRenameSquad = (
    fleetId: number,
    squadId: number,
    query: {
      /** Name */
      name: string;
    },
    params: RequestParams = {}
  ) =>
    this.request<void, any>({
      path: `/cat/api/fleets/${fleetId}/squad/${squadId}`,
      method: "PUT",
      query: query,
      secure: true,
      ...params,
    });
}
