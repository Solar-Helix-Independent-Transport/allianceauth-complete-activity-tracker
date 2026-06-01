import { FleetNavItem } from "./FleetNavItem";
import ReactDOM from "react-dom";
import { useParams } from "react-router-dom";

const menuRoot = document.getElementById("nav-left");

const ActiveFleetMenu = () => {
  const { fleetID } = useParams();
  if (!menuRoot) {
    return <></>;
  }
  return ReactDOM.createPortal(
    <>
      <div className="vr"></div>
      <FleetNavItem text={"Structure"} url={`/cat/active/${fleetID}/structure`} />
      <FleetNavItem text={"Snapshot"} url={`/cat/active/${fleetID}/snapshot`} />
      <FleetNavItem text={"Status"} url={`/cat/active/${fleetID}/status`} />
    </>,
    menuRoot
  );
};

export { ActiveFleetMenu };
