import { components } from "../../api/CatApi";
import { kickMember } from "../../api/Methods";
import { useFleetId } from "../../hooks/useFleetId";
import { EditFleetObjectCollapse } from "./utils/EditFleetObjectCollapse";
import { Draggable, DraggableStyle } from "@hello-pangea/dnd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CSSProperties } from "react";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/esm/OverlayTrigger";
import Tooltip from "react-bootstrap/esm/Tooltip";

export declare interface FleetMemberProps {
  character: components["schemas"]["SnapshotCharacter"];
  icon?: string;
  index: number;
  updating?: boolean;
  editable?: boolean;
}

const getItemStyle = (
  isDragging: boolean,
  draggableStyle: DraggableStyle | undefined
): CSSProperties => ({
  userSelect: "none",
  background: isDragging ? "rgba(74,74,74,50)" : undefined,
  ...draggableStyle,
});

export function FleetMember({ character, icon, index, updating, editable }: FleetMemberProps) {
  const id = `${character.character.character_id}`;
  const fleetId = useFleetId();
  const queryClient = useQueryClient();

  const kickMutation = useMutation({
    mutationFn: () => kickMember(fleetId, character.character.character_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getFleetStructure", fleetId] });
    },
  });

  return (
    <Draggable key={id} draggableId={id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
          className="d-flex align-items-center"
          key={id}
        >
          {updating ? (
            <i className="mx-1 fas fa-fw fa-arrows-rotate fa-spin"></i>
          ) : (
            icon && (
              <span>
                <i className={`mx-1 fas fa-fw ${icon}`}></i>
              </span>
            )
          )}
          <img
            src={`https://images.evetech.net/characters/${character.character.character_id}/portrait?size=32`}
            alt={character.character.character_name}
          />
          <img
            src={`https://images.evetech.net/types/${character.ship.id}/icon?size=32`}
            alt={character.ship.name}
          />
          <h5 className="m-0 mx-2">{character.character.character_name}</h5>
          <span>({character.ship.name})</span>
          <span className=" mx-2 m-0 ms-auto">
            {character.main ? (
              <span className="text-muted small">
                {`${character.main.character_name} (${character.main.corporation_ticker}) [${character.main.alliance_ticker}]`}
              </span>
            ) : (
              <span className="badge bg-danger">No Main</span>
            )}
          </span>

          <span className="m-0">{character.system.name}</span>
          <span className="m-0">({character.distance})</span>
          <span className="m-0 mx-2">
            {!character.takes_fleet_warp && (
              <OverlayTrigger
                placement={"left"}
                overlay={<Tooltip id={`tooltip-warp-${id}`}>Exempted From Fleet Warp</Tooltip>}
              >
                <i className={`fas fa-arrow-right-to-bracket text-danger`}></i>
              </OverlayTrigger>
            )}
          </span>
          {editable && (
            <EditFleetObjectCollapse
              variant={undefined}
              id={`edit-${id}`}
              icon={"fa-ellipsis-vertical"}
            >
              <div className="d-flex flex-row me-2">
                <Button
                  variant={kickMutation.isError ? "danger" : "outline-danger"}
                  size={"sm"}
                  disabled={kickMutation.isPending}
                  onClick={() => kickMutation.mutate()}
                >
                  <i
                    className={`fas ${kickMutation.isPending ? "fa-spinner fa-spin" : "fa-trash"}`}
                  ></i>
                </Button>
              </div>
            </EditFleetObjectCollapse>
          )}
        </div>
      )}
    </Draggable>
  );
}
