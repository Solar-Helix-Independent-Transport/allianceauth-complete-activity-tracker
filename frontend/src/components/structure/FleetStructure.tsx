import { components } from "../../api/CatApi";
import { addWing, getFleetStructure, moveMember } from "../../api/Methods";
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
    <Card className="m-1">
      <Card.Body>
        <div className="d-flex flex-row align-items-center">
          <h5>Fleet Structure</h5>
          <div className="ms-auto">
            {data?.editable && (
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
            )}
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
                      editable={data.editable}
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
                        <FleetWing
                          wing={wing}
                          updating={updatingCharacters}
                          editable={data.editable}
                        />
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
