import { components } from "../../api/CatApi";
import { addSquad, delWing, renameWing } from "../../api/Methods";
import { useFleetId } from "../../hooks/useFleetId";
import { FleetMember } from "./FleetMember";
import { FleetSquad } from "./FleetSquad";
import { EditFleetObjectCollapse } from "./utils/EditFleetObjectCollapse";
import { FleetDroppable } from "./utils/FleetDroppable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import OverlayTrigger from "react-bootstrap/esm/OverlayTrigger";
import Tooltip from "react-bootstrap/esm/Tooltip";

export declare interface WingProps {
  wing: components["schemas"]["FleetWing"];
  updating?: Array<number>;
  editable?: boolean;
}

export function FleetWing({ wing, updating, editable }: WingProps) {
  const id = `${wing.wing_id}`;
  const fleetId = useFleetId();
  const queryClient = useQueryClient();
  const [newName, setName] = useState<string>(wing.name ?? "Unknown");

  useEffect(() => {
    setName(wing.name ?? "Unknown");
  }, [wing.name]);

  const squadCounts = wing.squads?.reduce((p, squad) => {
    let sqmCount = squad.characters ? squad.characters.length : 0;
    if (squad.commander) sqmCount += 1;
    return p + sqmCount;
  }, 0);
  let memberCount = squadCounts ?? 0;
  if (wing.commander) memberCount += 1;

  const invalidateStructure = () =>
    queryClient.invalidateQueries({ queryKey: ["getFleetStructure", fleetId] });

  const renameMutation = useMutation({
    mutationFn: () => renameWing(fleetId, wing.wing_id, newName),
    onSuccess: invalidateStructure,
  });

  const addSquadMutation = useMutation({
    mutationFn: () => addSquad(fleetId, wing.wing_id),
    onSuccess: invalidateStructure,
  });

  const delWingMutation = useMutation({
    mutationFn: () => delWing(fleetId, wing.wing_id),
    onSuccess: invalidateStructure,
  });

  return (
    <div className="d-flex flex-column my-2" key={`squad${wing.wing_id}`}>
      <div className="d-flex flex-row align-items-center border-bottom" key={id}>
        <h5 className="m-1">{wing.name}</h5>
        <span className={`m-1 badge bg-${memberCount ? "info" : "secondary"}`}>
          {memberCount ? `${memberCount}` : "Empty"}
        </span>
        <div className="ms-auto">
          {editable && (
            <EditFleetObjectCollapse id={`edit-${id}`} icon={"fa-bars"}>
              <div className="d-flex align-items-center flex-row mx-2">
                <Form.Control
                  size="sm"
                  type="text"
                  value={newName}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={"New Name"}
                />
                <Button
                  variant={
                    renameMutation.isError
                      ? "danger"
                      : newName === wing.name
                      ? "success"
                      : "warning"
                  }
                  size={"sm"}
                  disabled={renameMutation.isPending}
                  onClick={() => renameMutation.mutate()}
                >
                  <i
                    className={`fas ${
                      renameMutation.isPending
                        ? "fa-spinner fa-spin"
                        : newName === wing.name
                        ? "fa-check"
                        : "fa-arrow-up-right-from-square"
                    }`}
                  ></i>
                </Button>
                <OverlayTrigger
                  placement={"left"}
                  overlay={<Tooltip id={`tooltip-add-squad-${id}`}>Add Squad</Tooltip>}
                >
                  <Button
                    className="ms-2"
                    variant={addSquadMutation.isError ? "danger" : ""}
                    size={"sm"}
                    disabled={addSquadMutation.isPending}
                    onClick={() => addSquadMutation.mutate()}
                  >
                    <i
                      className={`fas ${
                        addSquadMutation.isPending ? "fa-spinner fa-spin" : "fa-plus"
                      }`}
                    ></i>
                  </Button>
                </OverlayTrigger>
                {!memberCount && (
                  <OverlayTrigger
                    placement={"left"}
                    overlay={<Tooltip id={`tooltip-del-wing-${id}`}>Delete Wing</Tooltip>}
                  >
                    <Button
                      className="ms-2"
                      variant={delWingMutation.isError ? "danger" : "outline-danger"}
                      size={"sm"}
                      disabled={delWingMutation.isPending}
                      onClick={() => delWingMutation.mutate()}
                    >
                      <i
                        className={`fas ${
                          delWingMutation.isPending ? "fa-spinner fa-spin" : "fa-trash"
                        }`}
                      ></i>
                    </Button>
                  </OverlayTrigger>
                )}
              </div>
            </EditFleetObjectCollapse>
          )}
        </div>
      </div>
      <FleetDroppable id={`wing_commander-${id}`}>
        {wing.commander ? (
          <FleetMember
            character={wing.commander}
            updating={updating?.includes(wing.commander?.character.character_id)}
            icon="fa-star"
            index={0}
            editable={editable}
          />
        ) : (
          <span>
            <i className={`mx-1 fas fa-fw fa-star`}></i> No Commander
          </span>
        )}
      </FleetDroppable>
      <div className="ms-4">
        {wing.squads?.length ? (
          wing.squads.map((squad: components["schemas"]["FleetSquad"]) => (
            <FleetSquad
              key={squad.squad_id}
              squad={squad}
              wing_id={wing.wing_id}
              updating={updating}
              editable={editable}
            />
          ))
        ) : (
          <span>No Squads</span>
        )}
      </div>
    </div>
  );
}
