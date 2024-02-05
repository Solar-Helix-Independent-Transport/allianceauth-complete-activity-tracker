import { Droppable } from "@hello-pangea/dnd";
import React from "react";

export declare interface FleetDroppableProps {
  id: number | string;
}

const getListStyle = (isDraggingOver: boolean) => ({
  background: isDraggingOver ? "rgba(66, 74, 82,50)" : undefined,
});

export function FleetDroppable({ id, children }: React.PropsWithChildren<FleetDroppableProps>) {
  return (
    <Droppable key={id} droppableId={`${id}`}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          style={getListStyle(snapshot.isDraggingOver)}
          {...provided.droppableProps}
        >
          {children}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}
