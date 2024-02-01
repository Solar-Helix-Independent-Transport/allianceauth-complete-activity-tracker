import Nav from "react-bootstrap/Nav";
import { LinkContainer } from "react-router-bootstrap";

export declare interface FleetNavItemProps {
  text: string;
  url: string;
  headerIcon?: string;
}

export function FleetNavItem({ text, url, headerIcon }: FleetNavItemProps) {
  return (
    <Nav.Item>
      <LinkContainer to={url}>
        <Nav.Link key={`NAV-FLEET-${text}`}>
          {headerIcon && <i className={`fas fa-fw ${headerIcon} me-1`}></i>}
          {text}
        </Nav.Link>
      </LinkContainer>
    </Nav.Item>
  );
}
