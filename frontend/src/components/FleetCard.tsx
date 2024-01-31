import React from "react";
import { Card } from "react-bootstrap";

export declare interface PortraitCardProps {
  children: React.ReactNode; // best, accepts everything React can render
  style?: React.CSSProperties; // to pass through style props
  bg?: string;
  border?: string;
  heading: string;
  isFetching?: boolean;
  headerIcon?: string;
  roundedImages?: string;
  character: undefined; //todo type from api?
}

export function PortraitCard({ children, character, style, bg, border }: PortraitCardProps) {
  return (
    <Card
      className="m-2"
      key={`panel ${character.character_name}`}
      style={style}
      bg={bg}
      border={border}
    >
      <Card.Img
        variant="top"
        src={`https://images.evetech.net/characters/${character}/portrait?size=256`}
      />
      {children}
    </Card>
  );
}
