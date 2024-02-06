import FleetHeader from "../components/FleetHeader";
import { ActiveFleetMenu } from "../components/menu/ActiveFleetMenu";
import { Outlet } from "react-router-dom";

const ActiveFleetPage = () => {
  return (
    <>
      <ActiveFleetMenu />
      <FleetHeader />
      <Outlet /> {/* Render the Children here */}
    </>
  );
};

export default ActiveFleetPage;
