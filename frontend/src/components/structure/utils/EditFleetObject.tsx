import React, { useState } from "react";
import { ButtonProps } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Fade from "react-bootstrap/Fade";

export declare interface EditFleetObjectProps {
  id: string;
  variant?: ButtonProps["variant"];
  icon?: string;
}

export function EditFleetObject({
  id,
  children,
  icon = "fa-edit",
  variant = "secondary",
}: React.PropsWithChildren<EditFleetObjectProps>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="d-flex align-items-center">
      <Fade in={open}>
        <div id={id}>{children}</div>
      </Fade>
      <div>
        <Button
          variant={variant}
          size={"sm"}
          onClick={() => setOpen(!open)}
          aria-controls={id}
          aria-expanded={open}
        >
          <i className={`fas ${icon}`}></i>
        </Button>
      </div>
    </div>
  );
}
