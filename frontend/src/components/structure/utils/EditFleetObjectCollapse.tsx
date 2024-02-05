import React, { useState } from "react";
import { ButtonProps, Collapse } from "react-bootstrap";
import Button from "react-bootstrap/Button";

export declare interface EditFleetObjectProps {
  id: string;
  variant?: ButtonProps["variant"];
  icon?: string;
}

export function EditFleetObjectCollapse({
  id,
  children,
  icon = "fa-edit",
  variant = "",
}: React.PropsWithChildren<EditFleetObjectProps>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="d-flex align-items-center">
      <Collapse dimension="width" in={open}>
        <div id={id}>{children}</div>
      </Collapse>
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
