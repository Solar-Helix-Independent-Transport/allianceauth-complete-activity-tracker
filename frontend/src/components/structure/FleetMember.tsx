import { components } from "../../api/CatApi";
import { kickMember } from "../../api/Methods";
import { EditFleetObjectCollapse } from "./utils/EditFleetObjectCollapse";
import { Draggable, DraggableStyle } from "@hello-pangea/dnd";
import { CSSProperties } from "react";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/esm/OverlayTrigger";
import Tooltip from "react-bootstrap/esm/Tooltip";
import { useParams } from "react-router-dom";

export declare interface FleetMemberProps {
  character: components["schemas"]["SnapshotCharacter"];
  icon?: string;
  index: number;
  updating?: boolean;
}

const getItemStyle = (
  isDragging: boolean,
  draggableStyle: DraggableStyle | undefined
): CSSProperties => ({
  // some basic styles to make the items look a bit nicer
  userSelect: "none",

  // change background colour if dragging
  background: isDragging ? "rgba(74,74,74,50)" : undefined,

  // styles we need to apply on draggables
  ...draggableStyle,
});

export function FleetMember({ character, icon, index, updating }: FleetMemberProps) {
  const id = `${character.character.character_id}`;
  const { fleetID } = useParams();

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
          />
          <img src={`https://images.evetech.net/types/${character.ship.id}/icon?size=32`} />
          <h5 className="m-0 mx-2">{character.character.character_name}</h5>
          <span>({character.ship.name})</span>
          <span className="ms-auto">{character.system.name}</span>
          <span>({character.distance})</span>
          <span className="mx-2">
            <>
              {!character.takes_fleet_warp && (
                <OverlayTrigger
                  placement={"left"}
                  overlay={<Tooltip id={`tooltip-warp-${id}`}>Exempted From Fleet Warp</Tooltip>}
                >
                  <i className={`fas fa-arrow-right-to-bracket text-danger`}></i>
                </OverlayTrigger>
              )}
            </>
          </span>
          <EditFleetObjectCollapse
            variant={undefined}
            id={`edit-${id}`}
            icon={"fa-ellipsis-vertical"}
          >
            <div className="d-flex flex-row me-2">
              <Button
                variant={"danger"}
                size={"sm"}
                onClick={() => {
                  kickMember(fleetID ? +fleetID : 0, character.character.character_id);
                }}
              >
                <i className={`fas fa-trash`}></i>
              </Button>
            </div>
          </EditFleetObjectCollapse>
          {/* )} */}
        </div>
      )}
    </Draggable>
  );
}
