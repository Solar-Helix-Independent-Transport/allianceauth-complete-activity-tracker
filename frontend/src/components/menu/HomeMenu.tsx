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
      <div className="nav-item">
        <a className="nav-link" href="/cat/char/add">
          <i className="fas fa-plus fa-fw"></i>
        </a>
      </div>
    </>,
    menuRoot
  );
};

export { HomeMenu };
