import { components } from "../../api/CatApi";
import { delSquad, renameSquad } from "../../api/Methods";
import { useFleetId } from "../../hooks/useFleetId";
import { FleetMember } from "./FleetMember";
import { EditFleetObjectCollapse } from "./utils/EditFleetObjectCollapse";
import { FleetDroppable } from "./utils/FleetDroppable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import OverlayTrigger from "react-bootstrap/esm/OverlayTrigger";
import Tooltip from "react-bootstrap/esm/Tooltip";

export declare interface SquadProps {
  wing_id: number;
  squad: components["schemas"]["FleetSquad"];
  updating?: Array<number>;
  editable?: boolean;
}

export function FleetSquad({ squad, wing_id, updating, editable }: SquadProps) {
  const id = `${wing_id}-${squad.squad_id}`;
  const fleetId = useFleetId();
  const queryClient = useQueryClient();
  const [newName, setName] = useState<string>(squad.name ?? "Unknown");

  useEffect(() => {
    setName(squad.name ?? "Unknown");
  }, [squad.name]);

  let memberCount = squad.characters ? squad.characters.length : 0;
  if (squad.commander) memberCount += 1;

  const invalidateStructure = () =>
    queryClient.invalidateQueries({ queryKey: ["getFleetStructure", fleetId] });

  const renameMutation = useMutation({
    mutationFn: () => renameSquad(fleetId, squad.squad_id, newName),
    onSuccess: invalidateStructure,
  });

  const delSquadMutation = useMutation({
    mutationFn: () => delSquad(fleetId, squad.squad_id),
    onSuccess: invalidateStructure,
  });

  return (
    <div className="d-flex flex-column my-2" key={id}>
      <div className="d-flex flex-row align-items-center border-bottom" key={id}>
        <h5 className="m-1">{squad.name}</h5>
        <span className={`m-1 badge bg-${memberCount ? "info" : "secondary"}`}>
          {memberCount ? `${memberCount}` : "Empty"}
        </span>
        <div className="ms-auto">
          {editable && (
            <EditFleetObjectCollapse id={`edit-${id}`} icon={"fa-bars"}>
              <div className="d-flex flex-row mx-2">
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
                      : newName === squad.name
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
                        : newName === squad.name
                        ? "fa-check"
                        : "fa-arrow-up-right-from-square"
                    }`}
                  ></i>
                </Button>
                {!memberCount && (
                  <OverlayTrigger
                    placement={"left"}
                    overlay={<Tooltip id={`tooltip-del-squad-${id}`}>Delete Squad</Tooltip>}
                  >
                    <Button
                      className="ms-2"
                      variant={delSquadMutation.isError ? "danger" : "outline-danger"}
                      size={"sm"}
                      disabled={delSquadMutation.isPending}
                      onClick={() => delSquadMutation.mutate()}
                    >
                      <i
                        className={`fas ${
                          delSquadMutation.isPending ? "fa-spinner fa-spin" : "fa-trash"
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
      <FleetDroppable id={`squad_commander-${id}`}>
        {squad.commander ? (
          <FleetMember
            character={squad.commander}
            updating={updating?.includes(squad.commander?.character.character_id)}
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
        <FleetDroppable id={`squad_member-${id}`}>
          {squad.characters?.length ? (
            squad.characters.map(
              (char: components["schemas"]["SnapshotCharacter"], index: number) => (
                <FleetMember
                  key={char.character.character_id}
                  character={char}
                  index={index}
                  updating={updating?.includes(char.character.character_id)}
                  editable={editable}
                />
              )
            )
          ) : (
            <span className="">
              <i className="far fa-fw fa-question"></i>No Members
            </span>
          )}
        </FleetDroppable>
      </div>
    </div>
  );
}
