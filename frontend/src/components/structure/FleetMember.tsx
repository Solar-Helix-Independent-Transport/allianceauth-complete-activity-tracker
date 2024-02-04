import { components } from "../../api/CatApi";
import { Draggable, DraggableStyle } from "@hello-pangea/dnd";
import { CSSProperties } from "react";

export declare interface FleetMemberProps {
  character: components["schemas"]["SnapshotCharacter"];
  icon?: string;
  index: number;
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

export function FleetMember({ character, icon, index }: FleetMemberProps) {
  const id = `${character.character.character_id}`;

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
          {icon && (
            <span>
              <i className={`mx-1 fas fa-fw ${icon}`}></i>
            </span>
          )}
          <img
            src={`https://images.evetech.net/characters/${character.character.character_id}/portrait?size=32`}
          />
          <img src={`https://images.evetech.net/types/${character.ship.id}/icon?size=32`} />
          <h5 className="m-0 mx-2">{character.character.character_name}</h5>
          <span>({character.ship.name})</span>
          <span className="ms-auto">{character.system.name}</span>
          <span>({character.distance})</span>
        </div>
      )}
    </Draggable>
  );
}
