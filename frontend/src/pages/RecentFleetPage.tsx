import { RecentFleetMenu } from "../components/menu/RecentFleetMenu";
import { Outlet } from "react-router-dom";

const RecentFleetPage = () => {
  return (
    <>
      <RecentFleetMenu />
      <Outlet /> {/* Render the Children here */}
    </>
  );
};

export default RecentFleetPage;
