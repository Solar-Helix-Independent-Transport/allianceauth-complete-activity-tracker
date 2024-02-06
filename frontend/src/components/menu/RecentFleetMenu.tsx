import { FleetNavItem } from "./FleetNavItem";
import ReactDOM from "react-dom";
import { useParams } from "react-router-dom";

const menuRoot = document.getElementById("nav-left");

const RecentFleetMenu = () => {
  const { fleetID } = useParams();
  if (!menuRoot) {
    return <></>;
  }
  return ReactDOM.createPortal(
    <>
      <div className="vr mx-4"></div>
      <FleetNavItem text={"Status"} url={`/cat/recent/${fleetID}/status`} />
    </>,
    menuRoot
  );
};

export { RecentFleetMenu };
