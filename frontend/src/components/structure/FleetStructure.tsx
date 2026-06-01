import { components } from "../../api/CatApi";
import { addWing, getFleetStructure, moveMember } from "../../api/Methods";
import { useFleetId } from "../../hooks/useFleetId";
import { FleetMember } from "./FleetMember";
import { FleetWing } from "./FleetWing";
import { EditFleetObjectCollapse } from "./utils/EditFleetObjectCollapse";
import { FleetDroppable } from "./utils/FleetDroppable";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Form } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import ProgressBar from "react-bootstrap/ProgressBar";
import OverlayTrigger from "react-bootstrap/esm/OverlayTrigger";
import Tooltip from "react-bootstrap/esm/Tooltip";

type Structure = components["schemas"]["FleetStructure"];
type SnapshotChar = components["schemas"]["SnapshotCharacter"];

function moveCharacterInStructure(
  structure: Structure,
  charId: number,
  destination: string
): Structure {
  const next: Structure = JSON.parse(JSON.stringify(structure));

  let char: SnapshotChar | null = null;

  if (next.commander?.character.character_id === charId) {
    char = next.commander;
    next.commander = null;
  }

  if (!char) {
    outer: for (const wing of next.wings ?? []) {
      if (wing.commander?.character.character_id === charId) {
        char = wing.commander;
        wing.commander = null;
        break;
      }
      for (const squad of wing.squads ?? []) {
        if (squad.commander?.character.character_id === charId) {
          char = squad.commander;
          squad.commander = null;
          break outer;
        }
        const idx =
          squad.characters?.findIndex((c) => c.character.character_id === charId) ?? -1;
        if (idx !== -1) {
          char = squad.characters![idx];
          squad.characters!.splice(idx, 1);
          break outer;
        }
      }
    }
  }

  if (!char) return structure;

  const parts = destination.split("-");
  const role = parts[0];
  const wingId = parts[1] !== undefined ? +parts[1] : null;
  const squadId = parts[2] !== undefined ? +parts[2] : null;

  if (role === "fleet_commander") {
    next.commander = char;
  } else if (role === "wing_commander" && wingId !== null) {
    const wing = next.wings?.find((w) => w.wing_id === wingId);
    if (wing) wing.commander = char;
  } else if (role === "squad_commander" && wingId !== null && squadId !== null) {
    const wing = next.wings?.find((w) => w.wing_id === wingId);
    const squad = wing?.squads?.find((s) => s.squad_id === squadId);
    if (squad) squad.commander = char;
  } else if (role === "squad_member" && wingId !== null && squadId !== null) {
    const wing = next.wings?.find((w) => w.wing_id === wingId);
    const squad = wing?.squads?.find((s) => s.squad_id === squadId);
    if (squad) {
      if (!squad.characters) squad.characters = [];
      squad.characters.push(char);
    }
  }

  return next;
}

export function Fleet() {
  const fleetId = useFleetId();
  const [updatingCharacters, setUpdatingCharacters] = useState<Array<number>>([]);
  const [keepUpdating, setKeepUpdating] = useState<boolean>(false);
  const [optimisticData, setOptimisticData] = useState<Structure | null>(null);

  const queryClient = useQueryClient();

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["getFleetStructure", fleetId],
    queryFn: async () => {
      const result = await getFleetStructure(fleetId);
      setUpdatingCharacters([]);
      setOptimisticData(null);
      return result;
    },
    refetchInterval: keepUpdating ? 5000 : false,
    enabled: keepUpdating,
  });

  const displayData = optimisticData ?? data;

  const addWingMutation = useMutation({
    mutationFn: () => addWing(fleetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getFleetStructure", fleetId] });
    },
  });

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;

    const charId = +result.draggableId;
    const destination = result.destination.droppableId;

    setUpdatingCharacters((prev) => [...prev, charId]);
    if (displayData) {
      setOptimisticData(moveCharacterInStructure(displayData, charId, destination));
    }

    await moveMember(fleetId, charId, destination);
    queryClient.invalidateQueries({ queryKey: ["getFleetStructure", fleetId] });
  }

  return (
    <Card className="m-1">
      <Card.Body>
        <div className="d-flex flex-row align-items-center">
          <h5 className="me-auto">Fleet Structure</h5>

          <Form.Label className="me-1 mb-0 text-muted small">Live</Form.Label>
          <Form.Check
            type="switch"
            id="live-update-switch"
            checked={keepUpdating}
            onChange={(e) => setKeepUpdating(e.target.checked)}
          />

          {!keepUpdating && (
            <Button
              variant={""}
              size={"sm"}
              className="mx-1"
              onClick={() => refetch()}
            >
              <i className="fa fa-refresh" aria-hidden="true"></i>
            </Button>
          )}

          <div>
            {displayData?.editable && (
              <EditFleetObjectCollapse variant={undefined} id={`edit-fleet`} icon={"fa-bars"}>
                <div className="d-flex flex-row me-2">
                  <OverlayTrigger
                    placement={"left"}
                    overlay={<Tooltip id={`tooltip-fleet-wing`}>Add Wing</Tooltip>}
                  >
                    <Button
                      className="ms-2"
                      variant={addWingMutation.isError ? "danger" : ""}
                      size={"sm"}
                      disabled={addWingMutation.isPending}
                      onClick={() => addWingMutation.mutate()}
                    >
                      <i
                        className={`fas ${
                          addWingMutation.isPending ? "fa-spinner fa-spin" : "fa-plus"
                        }`}
                      ></i>
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
              style={{ height: "2px", opacity: ".25" }}
              variant={"light"}
              className={`${isFetching ? "" : "fleet-refetch-countdown"}`}
              animated={isFetching}
              striped={isFetching}
            />
          </div>
          <>
            {displayData && (
              <div className="d-flex flex-column">
                <FleetDroppable id={"fleet_commander"}>
                  {displayData.commander ? (
                    <FleetMember
                      character={displayData.commander}
                      updating={updatingCharacters.includes(
                        displayData.commander?.character.character_id
                      )}
                      icon="fa-star"
                      index={0}
                      editable={displayData.editable}
                    />
                  ) : (
                    <span>
                      <i className={`mx-1 fas fa-fw fa-star`}></i> No Commander
                    </span>
                  )}
                </FleetDroppable>
                <div className="ms-4">
                  {displayData.wings?.map((wing: components["schemas"]["FleetWing"]) => (
                    <FleetWing
                      key={wing.wing_id}
                      wing={wing}
                      updating={updatingCharacters}
                      editable={displayData.editable}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        </DragDropContext>
      </Card.Body>
    </Card>
  );
}
