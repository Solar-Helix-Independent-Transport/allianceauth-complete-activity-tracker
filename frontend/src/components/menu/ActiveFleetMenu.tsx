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
      <FleetNavItem text={"Status"} url={`/cat/active/${fleetID}/status`} />
      <FleetNavItem text={"Structure"} url={`/cat/active/${fleetID}/structure`} />
    </>,
    menuRoot
  );
};

export { ActiveFleetMenu };
