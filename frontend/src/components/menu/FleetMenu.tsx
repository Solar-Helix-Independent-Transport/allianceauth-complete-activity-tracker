import { FleetNavItem } from "./FleetNavItem";
import ReactDOM from "react-dom";
import { useParams } from "react-router-dom";

const menuRoot = document.getElementById("nav-left");

const FleetMenu = () => {
  console.log("Menu!");
  const { fleetID } = useParams();
  if (!menuRoot) {
    return <></>;
  }
  return ReactDOM.createPortal(
    <>
      <FleetNavItem text={" "} url={`/cat`} headerIcon="fa-circle-left" />
      <FleetNavItem text={"Status"} url={`/cat/${fleetID}/status`} />
      <FleetNavItem text={"Structure"} url={`/cat/${fleetID}/structure`} />
    </>,
    menuRoot
  );
};

export { FleetMenu };
