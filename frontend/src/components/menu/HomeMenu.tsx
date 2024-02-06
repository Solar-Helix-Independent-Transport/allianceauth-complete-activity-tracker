import { FleetNavItem } from "./FleetNavItem";
import ReactDOM from "react-dom";

const menuRoot = document.getElementById("nav-left");

const HomeMenu = () => {
  if (!menuRoot) {
    return <></>;
  }
  return ReactDOM.createPortal(
    <>
      <FleetNavItem text={"Active"} url={`/cat/active`} />
      <FleetNavItem text={"Recent"} url={`/cat/recent`} />
    </>,
    menuRoot
  );
};

export { HomeMenu };
