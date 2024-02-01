import { FleetMenu } from "../components/menu/FleetMenu";
import { Outlet } from "react-router-dom";

const FleetPage = () => {
  return (
    <>
      <FleetMenu />
      <Outlet /> {/* Render the Children here */}
    </>
  );
};

export default FleetPage;
