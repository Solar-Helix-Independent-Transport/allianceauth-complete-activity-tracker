import { getCatApi } from "../api/Api";
import { components, operations } from "./CatApi";

export async function performTrackFleetRequest(characterID: number) {
  const { POST } = getCatApi();
  const { data, error } = await POST("/cat/api/fleets/{character_id}/track", {
    params: { path: { character_id: characterID } },
  });
  if (error) throw error;
  return data;
}

export async function getActiveFleetList() {
  const { GET } = getCatApi();
  const { data, error } = await GET("/cat/api/fleets/active/");
  if (error) throw error;
  return data;
}

export async function postInviteMember(fleetID: number, characterID: number) {
  const { POST } = getCatApi();
  const { data, error } = await POST("/cat/api/fleets/{fleet_id}/invite/{character_id}", {
    params: { path: { character_id: characterID, fleet_id: fleetID } },
  });
  if (error) throw error;
  return data;
}

export async function postRenameFleet(fleetID: number, name: string) {
  const { POST } = getCatApi();
  const { data, error } = await POST("/cat/api/fleets/{fleet_id}/name", {
    params: { path: { fleet_id: fleetID }, query: { name } },
  });
  if (error) throw error;
  return data;
}

export async function getActiveFleetDetails(fleetID: number) {
  const { GET } = getCatApi();
  const { data, error } = await GET("/cat/api/fleets/{fleet_id}/details", {
    params: { path: { fleet_id: fleetID } },
  });
  if (error) throw error;
  return data;
}

export async function getRecentFleetList() {
  const { GET } = getCatApi();
  const { data, error } = await GET("/cat/api/fleets/recent/");
  if (error) throw error;
  return data;
}

export async function performCharacterSearchRequest(searchText: string) {
  const { POST } = getCatApi();
  const { data, error } = await POST("/cat/api/search/auth/character/", {
    params: { query: { search_text: searchText, limit: 10 } },
  });
  if (error) {
    return [];
  }
  return (
    data?.map((d: components["schemas"]["Character"]) => ({
      label: `${d.character_name} (${d.corporation_name}) [${d.alliance_name}]`,
      value: d.character_id,
    })) ?? []
  );
}

export async function kickMember(fleetID: number, characterID: number) {
  const { DELETE } = getCatApi();
  const { error } = await DELETE("/cat/api/fleets/{fleet_id}/kick/{character_id}", {
    params: { path: { fleet_id: fleetID, character_id: characterID } },
  });
  if (error) throw error;
}

export async function renameSquad(fleetID: number, squadID: number, newName: string) {
  const { PUT } = getCatApi();
  const query: operations["aacat_api_rename_squad"]["parameters"]["query"] = { name: newName };
  const { error } = await PUT("/cat/api/fleets/{fleet_id}/squad/{squad_id}", {
    params: { path: { fleet_id: fleetID, squad_id: squadID }, query },
  });
  if (error) throw error;
}

export async function delSquad(fleet_id: number, squadID: number) {
  const { DELETE } = getCatApi();
  const { error } = await DELETE("/cat/api/fleets/{fleet_id}/squad/{squad_id}", {
    params: { path: { fleet_id: fleet_id, squad_id: squadID } },
  });
  if (error) throw error;
}

export async function addWing(fleet_id: number) {
  const { POST } = getCatApi();
  const { error } = await POST("/cat/api/fleets/{fleet_id}/wing", {
    params: { path: { fleet_id: fleet_id } },
  });
  if (error) throw error;
}

export async function moveMember(fleet_id: number, character_id: number, role: string) {
  const { PUT } = getCatApi();

  const roleData = role.split("-");
  const fleetRole = roleData[0] as components["schemas"]["FleetRoles"];
  const fleetWing = roleData[1];
  const fleetSquad = roleData[2];

  const query: operations["aacat_api_move_fleet_member"]["parameters"]["query"] = {
    role: fleetRole,
  };
  if (fleetSquad) query.squad_id = +fleetSquad;
  if (fleetWing) query.wing_id = +fleetWing;

  const { error } = await PUT("/cat/api/fleets/{fleet_id}/move/{character_id}", {
    params: { path: { fleet_id: fleet_id, character_id: character_id }, query },
  });
  if (error) throw error;
}

export async function getFleetStructure(fleetID: number) {
  const { GET } = getCatApi();
  const { data, error } = await GET("/cat/api/fleets/{fleet_id}/structure", {
    params: { path: { fleet_id: fleetID } },
  });
  if (error) throw error;
  return data;
}

export async function renameWing(fleetID: number, wingID: number, newName: string) {
  const { PUT } = getCatApi();
  const query: operations["aacat_api_rename_wing"]["parameters"]["query"] = { name: newName };
  const { error } = await PUT("/cat/api/fleets/{fleet_id}/wing/{wing_id}", {
    params: { path: { fleet_id: fleetID, wing_id: wingID }, query },
  });
  if (error) throw error;
}

export async function addSquad(fleet_id: number, wingID: number) {
  const { POST } = getCatApi();
  const { error } = await POST("/cat/api/fleets/{fleet_id}/wing/{wing_id}/squad", {
    params: { path: { fleet_id: fleet_id, wing_id: wingID } },
  });
  if (error) throw error;
}

export async function delWing(fleet_id: number, wingID: number) {
  const { DELETE } = getCatApi();
  const { error } = await DELETE("/cat/api/fleets/{fleet_id}/wing/{wing_id}", {
    params: { path: { fleet_id: fleet_id, wing_id: wingID } },
  });
  if (error) throw error;
}

export interface ShipCount {
  name: string;
  count: number;
}

export async function getFleetComp(fleetID: number): Promise<ShipCount[]> {
  const { GET } = getCatApi();
  const { data, error } = await GET("/cat/api/fleets/{fleet_id}/stats", {
    params: { path: { fleet_id: fleetID } },
  });
  if (error) throw error;
  return (data ?? []) as ShipCount[];
}

export async function getFleetCharacterChanges(fleetID: number) {
  const { GET } = getCatApi();
  const { data, error } = await GET("/cat/api/fleets/{fleet_id}/character_changes", {
    params: { path: { fleet_id: fleetID } },
  });
  if (error) throw error;
  return data;
}
