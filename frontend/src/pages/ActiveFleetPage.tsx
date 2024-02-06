import { ActiveFleetMenu } from "../components/menu/ActiveFleetMenu";
import { Outlet } from "react-router-dom";

const ActiveFleetPage = () => {
  return (
    <>
      <ActiveFleetMenu />
      <Outlet /> {/* Render the Children here */}
    </>
  );
};

export default ActiveFleetPage;
