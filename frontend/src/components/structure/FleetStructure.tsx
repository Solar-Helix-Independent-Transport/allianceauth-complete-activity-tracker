import { getCatApi } from "../../api/Api";
import { components, operations } from "../../api/CatApi";
import { FleetMember } from "./FleetMember";
import { FleetWing } from "./FleetWing";
import { EditFleetObjectCollapse } from "./utils/EditFleetObjectCollapse";
import { FleetDroppable } from "./utils/FleetDroppable";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import ProgressBar from "react-bootstrap/ProgressBar";
import OverlayTrigger from "react-bootstrap/esm/OverlayTrigger";
import Tooltip from "react-bootstrap/esm/Tooltip";
// import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

async function addWing(fleet_id: number) {
  const { POST } = getCatApi();

  const { data, error } = await POST("/cat/api/fleets/{fleet_id}/wing", {
    params: {
      path: { fleet_id: fleet_id },
    },
  });

  if (error) {
    console.log(error);
  } else {
    console.log(data);
  }
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

async function getFleetStructure(fleetID: number) {
  const { GET } = getCatApi();

  const { data, error } = await GET("/cat/api/fleets/{fleet_id}/structure", {
    params: {
      path: { fleet_id: fleetID },
    },
  });
  if (error) {
    console.log(error);
  } else {
    //console.log("COMP:", data);
    return data;
  }
}

export function Fleet() {
  const { fleetID } = useParams();
  const [updatingCharacters, setUpdatingCharacters] = useState<Array<number>>([]);

  // const queryClient = useQueryClient();

  const { data, isFetching } = useQuery({
    queryKey: ["getFleetStructure", fleetID],
    queryFn: async () => {
      const data = await getFleetStructure(fleetID ? +fleetID : 0);
      setUpdatingCharacters([]);
      return data;
    },
    refetchInterval: 6000,
  });

  async function handleDragEnd(result: DropResult) {
    console.log(fleetID, result);
    if (result.destination && fleetID) {
      await moveMember(+fleetID, +result.draggableId, result.destination.droppableId);
      setUpdatingCharacters(updatingCharacters.concat(+result.draggableId));
      // queryClient.invalidateQueries({
      //   queryKey: ["getFleetStructure", fleetID],
      // });
    }
  }

  return (
    <Card className="m-4 ">
      <Card.Body>
        <div className="d-flex flex-row align-items-center">
          <h5>Fleet Structure</h5>
          <div className="ms-auto">
            <EditFleetObjectCollapse variant={undefined} id={`edit-fleet`} icon={"fa-bars"}>
              <div className="d-flex flex-row me-2">
                <OverlayTrigger
                  placement={"left"}
                  overlay={<Tooltip id={`tooltip-fleet-wing`}>Add Wing</Tooltip>}
                >
                  <Button
                    className="ms-2"
                    variant={""}
                    size={"sm"}
                    onClick={() => {
                      addWing(fleetID ? +fleetID : 0);
                    }}
                  >
                    <i className={`fas fa-plus`}></i>
                  </Button>
                </OverlayTrigger>
              </div>
            </EditFleetObjectCollapse>
          </div>
        </div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className={"my-2 w-100"}>
            <ProgressBar
              now={100}
              style={{ height: "1px", opacity: ".25" }}
              variant={"light"}
              className={`${isFetching ? "" : "fleet-refetch-countdown"}`}
              animated={isFetching}
              striped={isFetching}
            />
          </div>
          <>
            {data && (
              <div className="d-flex flex-column" key={`fleet`}>
                <FleetDroppable id={"fleet_commander"}>
                  {data.commander ? (
                    <FleetMember
                      character={data.commander}
                      updating={updatingCharacters.includes(data.commander?.character.character_id)}
                      icon="fa-star"
                      index={0}
                    />
                  ) : (
                    <span>
                      <i className={`mx-1 fas fa-fw fa-star`}></i> No Commander
                    </span>
                  )}
                </FleetDroppable>
                <div className="ms-4">
                  {data.wings?.map((wing: components["schemas"]["FleetWing"]) => {
                    return (
                      <>
                        <FleetWing wing={wing} updating={updatingCharacters} />
                      </>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        </DragDropContext>
      </Card.Body>
    </Card>
  );
}
