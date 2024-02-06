import { HomeMenu } from "../components/menu/HomeMenu";
import { Outlet } from "react-router-dom";

const IndexPage = () => {
  return (
    <>
      <HomeMenu />
      <Outlet /> {/* Render the Children here */}
    </>
  );
};

export default IndexPage;
