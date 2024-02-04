import { getCatApi } from "../../api/Api";
import { components, operations } from "../../api/CatApi";
import { FleetDroppable } from "./FleetDroppable";
import { FleetMember } from "./FleetMember";
import { FleetWing } from "./FleetWing";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

export declare interface FleetProps {
  fleet: components["schemas"]["FleetStructure"];
}

async function moveMember(fleet_id: number, character_id: number, role: string) {
  const { PUT } = getCatApi();

  const roleData = role.split("-");

  const fleetRole = roleData[0] as components["schemas"]["FleetRoles"];

  const fleetWing = roleData[1];

  const fleetSquad = roleData[2];

  const query: operations["aacat_api_move_fleet_member"]["parameters"]["query"] = {
    role: fleetRole,
  };

  if (fleetSquad) {
    query.squad_id = +fleetSquad;
  }

  if (fleetWing) {
    query.wing_id = +fleetWing;
  }

  const { data, error } = await PUT("/cat/api/fleets/{fleet_id}/move/{character_id}", {
    params: {
      path: { fleet_id: fleet_id, character_id: character_id },
      query: query,
    },
  });

  if (error) {
    console.log(error);
  } else {
    console.log(data);
  }
}

export function Fleet({ fleet }: FleetProps) {
  const { fleetID } = useParams();
  const queryClient = useQueryClient();

  async function handleDragEnd(result: DropResult) {
    console.log(fleetID, result);
    if (result.destination && fleetID) {
      await moveMember(+fleetID, +result.draggableId, result.destination.droppableId);
      queryClient.invalidateQueries({
        queryKey: ["getFleetStructure", fleetID],
      });
    }
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="d-flex flex-column" key={`fleet`}>
        <FleetDroppable id={"fleet_commander"}>
          {fleet.commander ? (
            <FleetMember character={fleet.commander} icon="fa-star" index={0} />
          ) : (
            <span>
              <i className={`mx-1 fas fa-fw fa-star`}></i> No Commander
            </span>
          )}
        </FleetDroppable>
        <div className="ms-4">
          {fleet.wings?.map((wing: components["schemas"]["FleetWing"]) => {
            return (
              <>
                <FleetWing wing={wing} />
              </>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}
